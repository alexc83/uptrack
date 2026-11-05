"""Non-production pilot. All provider I/O passes through Transport; no endpoint overrides.

Tests inject an in-memory transport. Importing this module never opens a connection.
The manifest is a recovery journal, not authorization to delete arbitrary prefix matches.
"""
import base64
import contextlib
import json
import os
from pathlib import Path
import re
import signal
import struct
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib

HERE = Path(__file__).resolve().parent
COMBOS = [(r, d) for r in ('raw', 'image') for d in ('upload', 'authenticated')]


class SafetyError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise SafetyError(message)


def number(env, key, default, low, high):
    value = env.get(key, str(default))
    require(bool(re.fullmatch(r'[0-9]{1,4}', value)), key + ' must be an integer')
    n = int(value)
    require(low <= n <= high, key + ' out of range')
    return n


class Config:
    def __init__(self, env):
        require(env.get('PILOT_CONFIRM_NONPRODUCTION') == 'yes',
                'PILOT_CONFIRM_NONPRODUCTION must be exactly yes')
        for key in ('CLOUDINARY_CLOUD_NAME', 'PILOT_EXPECTED_CLOUD_NAME',
                    'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_AUTH_TOKEN_KEY'):
            require(bool(env.get(key, '').strip()), key + ' is required')
        self.cloud = env['CLOUDINARY_CLOUD_NAME']
        require(self.cloud == env['PILOT_EXPECTED_CLOUD_NAME'], 'cloud-name mismatch')
        require(bool(re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', self.cloud)), 'invalid cloud name')
        self.key, self.secret = env['CLOUDINARY_API_KEY'], env['CLOUDINARY_API_SECRET']
        require(':' not in self.key and not any(c in self.key + self.secret for c in '\r\n'),
                'invalid API credentials')
        require(bool(re.fullmatch(r'(?:[0-9a-fA-F]{2}){16,64}', env['CLOUDINARY_AUTH_TOKEN_KEY'])),
                'CLOUDINARY_AUTH_TOKEN_KEY must be a 16..64 byte hex token-auth key')
        self.ttl = number(env, 'PILOT_TTL_SECONDS', 60, 2, 3600)
        self.skew = number(env, 'PILOT_EXPIRY_SKEW_SECONDS', 15, 0, 300)
        self.prefix = env.get('PILOT_PREFIX', 'pilot')
        require(bool(re.fullmatch(r'pilot(?:/[a-zA-Z0-9_-]+)*', self.prefix)), 'invalid PILOT_PREFIX')
        require(len(self.prefix) <= 100, 'PILOT_PREFIX too long')
        require(env.get('PILOT_PREFLIGHT_ONLY', 'no') in ('yes', 'no'), 'invalid PILOT_PREFLIGHT_ONLY')
        self.offline = env.get('PILOT_PREFLIGHT_ONLY') == 'yes'
        self.state = env.get('PILOT_STATE_FILE')
        if self.state is not None:
            require(bool(self.state.strip()), 'invalid PILOT_STATE_FILE')


def assets(prefix, run):
    return [dict(resource_type=r, delivery_type=d,
                 public_id=f'{prefix}/{run}/{r}-{d}' + ('.pdf' if r == 'raw' else ''),
                 attempted=False) for r, d in COMBOS]


def validate_state(doc, config=None):
    require(isinstance(doc, dict) and set(doc) == {'version', 'cloud', 'prefix', 'run', 'assets'},
            'invalid state schema (legacy line state is deliberately rejected)')
    require(doc['version'] == 1 and re.fullmatch(r'[a-f0-9]{32}', doc['run'] or ''), 'invalid run identity')
    require(isinstance(doc['prefix'], str) and re.fullmatch(r'pilot(?:/[a-zA-Z0-9_-]+)*', doc['prefix']),
            'invalid state prefix')
    require(isinstance(doc['cloud'], str) and re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', doc['cloud']),
            'invalid state cloud')
    if config:
        require(doc['cloud'] == config.cloud and doc['prefix'] == config.prefix,
                'state cloud/prefix mismatch')
    expected = assets(doc['prefix'], doc['run'])
    require(isinstance(doc['assets'], list) and len(doc['assets']) == len(expected), 'invalid asset manifest')
    for actual, wanted in zip(doc['assets'], expected):
        require(isinstance(actual, dict) and set(actual) == set(wanted), 'invalid asset entry')
        require(type(actual['attempted']) is bool, 'invalid attempt marker')
        require(all(actual[k] == wanted[k] for k in wanted if k != 'attempted'),
                'state target outside exact run allowlist')
    return doc


def load_state(path, config=None):
    require(not path.is_symlink() and path.is_file(), 'state must be an existing regular file')
    require(path.stat().st_mode & 0o077 == 0, 'state must have owner-only permissions (chmod 600)')
    require(path.stat().st_size < 16384, 'state is too large')
    try:
        return validate_state(json.loads(path.read_text()), config)
    except (ValueError, TypeError, KeyError):
        raise SafetyError('invalid state contents') from None


def save_state(path, doc, new=False):
    validate_state(doc)
    # Exclusive creation prevents accidental truncation/reuse. Updates are atomic + fsynced.
    if new:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as out:
            json.dump(doc, out)
            out.flush()
            os.fsync(out.fileno())
    else:
        require(not path.is_symlink(), 'refusing symlink state')
        fd, tmp = tempfile.mkstemp(prefix='.pilot-state-', dir=path.parent)
        try:
            with os.fdopen(fd, 'w') as out:
                json.dump(doc, out)
                out.flush()
                os.fsync(out.fileno())
            os.replace(tmp, path)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
    directory = os.open(path.parent, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


@contextlib.contextmanager
def state_lock(path):
    import fcntl
    fd = os.open(str(path) + '.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        os.close(fd)


def fixtures():
    # A complete one-page PDF, including xref offsets, and a CRC-valid RGB PNG.
    pdf = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>',
               b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
               b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << >> >>',
               b'<< /Length 0 >>\nstream\nendstream']
    for i, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n')
    xref = len(pdf)
    pdf.extend(b'xref\n0 5\n0000000000 65535 f \n')
    for offset in offsets[1:]:
        pdf.extend(f'{offset:010} 00000 n \n'.encode())
    pdf.extend(f'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())

    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(b'\x00\x33\x99\xcc')) + chunk(b'IEND', b'')
    return {'raw': bytes(pdf), 'image': png}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Transport:
    """Fixed HTTPS hosts, no redirects/proxies; errors never interpolate URLs or provider bodies."""
    def __init__(self, config):
        self.config = config
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def request(self, method, url, fields=None, authenticated=False):
        parsed = urllib.parse.urlsplit(url)
        require(parsed.scheme == 'https' and parsed.netloc in ('api.cloudinary.com', 'res.cloudinary.com')
                and not parsed.fragment, 'refusing unexpected request origin')
        headers = {}
        if authenticated:
            require(parsed.netloc == 'api.cloudinary.com' and
                    parsed.path.startswith('/v1_1/' + self.config.cloud + '/'), 'invalid API origin')
            credential = f'{self.config.key}:{self.config.secret}'.encode()
            headers['Authorization'] = 'Basic ' + base64.b64encode(credential).decode()
        body = None
        if fields is not None:
            body = urllib.parse.urlencode(fields).encode()
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            response = self.opener.open(req, timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        except Exception:
            raise SafetyError('HTTP transport failed (details withheld)') from None
        with response:
            # Delivery response bodies are never retained or logged.
            body = response.read(1024 * 1024) if authenticated else b''
            return response.code, dict(response.headers), body


class Sdk:
    def __init__(self, work):
        self.work = Path(work)
        self.env = dict(os.environ)
        for key in ('JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS', 'CLOUDINARY_URL'):
            self.env.pop(key, None)
        cpfile = self.work / 'classpath'
        self.call([str(HERE.parents[1] / 'backend/mvnw'), '-o', '-q', 'dependency:build-classpath',
                   '-Dmdep.outputFile=' + str(cpfile)], cwd=HERE.parents[1] / 'backend')
        self.cp = str(self.work) + os.pathsep + cpfile.read_text().strip()
        self.call(['javac', '--release', '21', '-cp', self.cp, '-d', str(self.work),
                   str(HERE / 'AuthTokenUrlTool.java')])
        self.call(['java', '-cp', self.cp, 'AuthTokenUrlTool', '--self-test'])
        print('SDK self-test PASS (local signing only)')

    def call(self, argv, **kw):
        result = subprocess.run(argv, env=self.env, capture_output=True, text=True, **kw)
        require(result.returncode == 0, 'local SDK build/signing failed (output withheld; verify offline Maven cache/JDK)')
        return result.stdout.strip()

    def url(self, asset, ttl):
        return self.call(['java', '-cp', self.cp, 'AuthTokenUrlTool',
                          '--resource-type', asset['resource_type'], '--public-id', asset['public_id'],
                          '--duration', str(ttl)])


class Pilot:
    def __init__(self, config, transport, signer, path, doc, sleeper=time.sleep, clock=time.monotonic):
        self.c, self.transport, self.signer = config, transport, signer
        self.path, self.doc, self.sleep, self.clock = path, doc, sleeper, clock
        self.base = 'https://api.cloudinary.com/v1_1/' + config.cloud
        self.run_prefix = doc['prefix'] + '/' + doc['run'] + '/'

    def api(self, method, path, fields=None, allowed=(200,)):
        status, _, body = self.transport.request(method, self.base + path, fields, True)
        require(status in allowed, 'provider API returned unexpected HTTP status=' + str(status))
        try:
            result = json.loads(body)
        except (ValueError, TypeError):
            raise SafetyError('provider returned invalid JSON') from None
        require(isinstance(result, dict) and 'error' not in result, 'provider returned API error')
        return status, result

    def inventory(self):
        total = 0
        for rt, dt in COMBOS:
            cursor, seen = None, set()
            for _ in range(100):
                query = dict(prefix=self.run_prefix, max_results=500)
                if cursor:
                    query['next_cursor'] = cursor
                _, result = self.api('GET', f'/resources/{rt}/{dt}?' + urllib.parse.urlencode(query))
                resources = result.get('resources')
                require(isinstance(resources, list), 'inventory missing resources array')
                for item in resources:
                    require(isinstance(item, dict) and isinstance(item.get('public_id'), str)
                            and item['public_id'].startswith(self.run_prefix), 'invalid inventory identity')
                total += len(resources)
                cursor = result.get('next_cursor')
                if cursor is None:
                    break
                require(isinstance(cursor, str) and cursor and cursor not in seen, 'invalid/repeated inventory cursor')
                seen.add(cursor)
            else:
                raise SafetyError('inventory pagination limit reached')
        return total

    def upload(self, asset, data):
        # Journal BEFORE request: timeout/interruption may happen after the provider created it.
        asset['attempted'] = True
        save_state(self.path, self.doc)
        rt, dt, pid = (asset[k] for k in ('resource_type', 'delivery_type', 'public_id'))
        mime = 'application/pdf' if rt == 'raw' else 'image/png'
        fields = dict(file='data:' + mime + ';base64,' + base64.b64encode(data).decode(),
                      public_id=pid, type=dt, overwrite='false', unique_filename='false')
        _, result = self.api('POST', f'/{rt}/upload', fields)
        if result.get('existing') is True:
            asset['attempted'] = False
            save_state(self.path, self.doc)
            raise SafetyError('upload collision: existing asset left untouched; manual inventory review required')
        require(all(result.get(k) == v for k, v in
                    [('public_id', pid), ('resource_type', rt), ('type', dt)]),
                'upload identity mismatch/collision; manual resource investigation required')
        print('upload PASS: ' + rt + '/' + dt)

    def plain(self, asset, delivery_type=None):
        rt, dt, pid = (asset[k] for k in ('resource_type', 'delivery_type', 'public_id'))
        # Raw public IDs INCLUDE their extension. Image IDs do not; delivery adds format.
        path = pid + ('.png' if rt == 'image' else '')
        return f'https://res.cloudinary.com/{self.c.cloud}/{rt}/{delivery_type or dt}/v1/{path}'

    def fetch(self, label, url, success, asset=None):
        status, headers, _ = self.transport.request('GET', url)
        expected = (200,) if success else (401, 403, 404)
        print(label + ': HTTP ' + str(status))
        # Print only parsed header values from bounded vocabularies, never reflected free text.
        h = {k.lower(): v for k, v in headers.items()}
        mime = h.get('content-type', '').split(';')[0].lower()
        if mime in ('application/pdf', 'image/png', 'text/html', 'application/json'):
            print('  content-type=' + mime)
        disposition = h.get('content-disposition', '').split(';')[0].lower()
        if disposition in ('inline', 'attachment'):
            print('  content-disposition=' + disposition)
        length = h.get('content-length', '')
        if re.fullmatch(r'[0-9]{1,12}', length):
            print('  content-length=' + length)
        cache = h.get('cache-control', '')
        for directive in cache.lower().split(','):
            directive = directive.strip()
            if re.fullmatch(r'(?:public|private|no-store|no-cache|max-age=[0-9]{1,10})', directive):
                print('  cache-control=' + directive)
        require(status in expected, label + ' FAILED (unexpected HTTP status)')
        if success and asset:
            require(mime == ('application/pdf' if asset['resource_type'] == 'raw' else 'image/png'),
                    label + ' FAILED (unexpected content type)')

    def probe(self, asset, exists):
        rt, dt, pid = (asset[k] for k in ('resource_type', 'delivery_type', 'public_id'))
        if exists:
            _, result = self.api('GET', f'/resources/{rt}/{dt}/' + urllib.parse.quote(pid, safe=''))
        else:
            self.probe_absent(rt, dt, pid)
        if exists:
            require(all(result.get(k) == v for k, v in
                        [('public_id', pid), ('resource_type', rt), ('type', dt)]), 'existence probe identity mismatch')
        print('existence probe PASS: ' + rt + '/' + dt + (' present' if exists else ' absent'))

    def probe_absent(self, rt, dt, pid):
        status, _, _ = self.transport.request('GET', self.base + f'/resources/{rt}/{dt}/' +
                                               urllib.parse.quote(pid, safe=''), authenticated=True)
        require(status == 404, 'absence probe FAILED (expected HTTP 404)')
        return status, {}

    def destroy(self, asset):
        # Validate the complete manifest again at the destructive boundary.
        validate_state(self.doc, self.c)
        require(asset in self.doc['assets'] and asset['attempted'], 'refusing untracked deletion')
        rt, dt, pid = (asset[k] for k in ('resource_type', 'delivery_type', 'public_id'))
        _, result = self.api('POST', f'/{rt}/destroy', dict(public_id=pid, type=dt, invalidate='true'))
        value = result.get('result')
        require(value in ('ok', 'not found'), 'destroy FAILED (invalid result contract)')
        print('destroy: ' + rt + '/' + dt + ' result=' + value)
        return value

    def cleanup(self):
        old = {}
        try:
            for sig in (signal.SIGINT, signal.SIGTERM):
                old[sig] = signal.signal(sig, signal.SIG_IGN)
            return self._cleanup()
        finally:
            for sig, handler in old.items():
                signal.signal(sig, handler)

    def _cleanup(self):
        failed = False
        for asset in self.doc['assets']:
            if asset['attempted']:
                try:
                    self.destroy(asset)
                    self.probe(asset, False)
                except Exception:
                    failed = True
                    print('UNRESOLVED test-cloud resource: ' + asset['resource_type'] + '/' +
                          asset['delivery_type'] + ' ' + asset['public_id'], file=sys.stderr)
        try:
            total = self.inventory()
            print('post-run inventory: ' + str(total) + ' resource(s) under run prefix')
            require(total == 0, 'remaining run resources')
        except Exception:
            failed = True
            print('UNRESOLVED test-cloud inventory: cleanup could not be verified', file=sys.stderr)
        print('recovery state retained: ' + str(self.path))
        return not failed

    def run(self):
        require(self.inventory() == 0, 'run prefix is not empty; refusing uploads')
        for asset in self.doc['assets']:
            self.upload(asset, fixtures()[asset['resource_type']])
        authenticated = []
        for asset in self.doc['assets']:
            self.probe(asset, True)
            if asset['delivery_type'] == 'upload':
                self.fetch('public baseline ' + asset['resource_type'], self.plain(asset), True, asset)
                self.fetch('delivery-type mismatch ' + asset['resource_type'], self.signer.url(asset, self.c.ttl), False)
            else:
                self.fetch('unsigned denial ' + asset['resource_type'], self.plain(asset), False)
                started = self.clock()
                url = self.signer.url(asset, self.c.ttl)
                self.fetch('token before expiry ' + asset['resource_type'], url, True, asset)
                authenticated.append((asset, url, started))
        for index, (asset, url, _) in enumerate(authenticated):
            other = authenticated[1 - index][0]
            query = urllib.parse.urlsplit(url).query
            require(query and '__cld_token__=' in query, 'SDK URL missing AuthToken')
            self.fetch('cross-asset ACL denial ' + asset['resource_type'], self.plain(other) + '?' + query, False)
        for asset, url, started in authenticated:
            self.sleep(max(0, self.c.ttl + self.c.skew - (self.clock() - started)))
            self.fetch('token after expiry ' + asset['resource_type'], url, False)
            print('  elapsed seconds=' + str(round(self.clock() - started, 1)))
        for asset in self.doc['assets']:
            require(self.destroy(asset) == 'ok', 'first destroy must return ok')
            require(self.destroy(asset) == 'not found', 'repeated destroy must return not found')
            self.probe(asset, False)
        print('Automated matrix PASS; browser/CDN/application acceptance still PENDING OWNER')


def main(argv=None):
    args = sys.argv[1:] if argv is None else argv
    try:
        if len(args) == 2 and args[0] == '--validate-state':
            load_state(Path(args[1]))
            print('VALIDATE-STATE PASS (structural check only; not proof of provenance)')
            return 0
        require(args in ([], ['--cleanup-only']), 'usage: run-pilot.sh [--cleanup-only | --validate-state FILE]')
        c = Config(os.environ)
        print('Preflight PASS. Owner must separately verify non-production identity in Cloudinary console.')
        if args == ['--cleanup-only']:
            require(c.state and not c.offline, 'cleanup-only requires PILOT_STATE_FILE and preflight-only=no')
            path = Path(c.state)
            with state_lock(path):
                doc = load_state(path, c)
                return 0 if Pilot(c, Transport(c), None, path, doc).cleanup() else 1
        if c.state and not c.offline:
            require(not os.path.lexists(c.state), 'state already exists; choose a new file or use cleanup-only')
        with tempfile.TemporaryDirectory(prefix='uptrack-pilot-work-') as work:
            sdk = Sdk(work)
            fixtures()
            if c.offline:
                print('PREFLIGHT PASS: fixtures and SDK ready; no Cloudinary API calls')
                return 0
            run = uuid.uuid4().hex
            path = Path(c.state) if c.state else Path(tempfile.gettempdir()) / ('uptrack-pilot-' + run + '.json')
            doc = dict(version=1, cloud=c.cloud, prefix=c.prefix, run=run, assets=assets(c.prefix, run))
            with state_lock(path):
                save_state(path, doc, new=True)
                print('recovery state: ' + str(path))
                pilot = Pilot(c, Transport(c), sdk, path, doc)
                rc = 0
                try:
                    pilot.run()
                except (Exception, KeyboardInterrupt):
                    print('Pilot FAILED/interrupted (sensitive details withheld)', file=sys.stderr)
                    rc = 1
                finally:
                    if not pilot.cleanup():
                        rc = 1
                return rc
    except SafetyError as error:
        print('ABORT: ' + str(error), file=sys.stderr)
        return 2
    except Exception:
        print('ABORT: invalid state or unavailable local tooling (details withheld)', file=sys.stderr)
        return 2


if __name__ == '__main__':
    def interrupted(signum, frame):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupted)
    sys.exit(main())
