"""Offline regression checks. Fake responses are orchestration evidence, never live acceptance."""
import base64
import contextlib
import copy
import io
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.parse
import zlib

import pilot

ENV = dict(PILOT_CONFIRM_NONPRODUCTION='yes', CLOUDINARY_CLOUD_NAME='local-fixture-cloud',
           PILOT_EXPECTED_CLOUD_NAME='local-fixture-cloud', CLOUDINARY_API_KEY='SENTINEL_API_KEY',
           CLOUDINARY_API_SECRET='SENTINEL_API_SECRET',
           CLOUDINARY_AUTH_TOKEN_KEY='0123456789abcdef0123456789abcdef')


class Signer:
    def url(self, a, ttl):
        path = f"/{ENV['CLOUDINARY_CLOUD_NAME']}/{a['resource_type']}/authenticated/{a['public_id']}"
        if a['resource_type'] == 'image':
            path += '.png'
        return 'https://res.cloudinary.com' + path + '?__cld_token__=SENTINEL_FULL_TOKEN'


class Provider:
    """Narrow documented Upload/Admin contract double, with injectable failures."""
    def __init__(self):
        self.stored = {}
        self.calls = []
        self.fetch_status = None
        self.bad_destroy = False
        self.bad_inventory = False
        self.expired = False
        self.delivery_index = 0
        self.partial = False
        self.interrupt = False
        self.auth = 0
        self.bad_identity = False
        self.collision = False

    def request(self, method, url, fields=None, authenticated=False):
        self.calls.append((method, url, fields, authenticated))
        p = urllib.parse.urlsplit(url)
        path = p.path.split('/')
        result, status = {}, 200
        if not authenticated:
            rt, dt = path[2:4]
            mime = 'application/pdf' if rt == 'raw' else 'image/png'
            if dt == 'upload':
                status = 200
            elif not p.query or self.expired:
                status = 401
            else:
                # Sequence: raw mismatch/valid, image mismatch/valid, cross x2.
                self.auth += 1
                status = 200 if self.auth in (2, 4) else 403
            return self.fetch_status or status, {'Content-Type': mime,
                    'Content-Disposition': 'inline; filename="SENTINEL_API_SECRET"',
                    'X-Unsafe': 'SENTINEL_FULL_TOKEN', 'Cache-Control': 'private, SENTINEL_FULL_TOKEN',
                    'Content-Length': '123'}, b''
        rt, action = path[3:5]
        if action == 'upload' and method == 'POST':
            dt, pid = fields['type'], fields['public_id']
            assert fields['overwrite'] == 'false'
            assert pid.endswith('.pdf') if rt == 'raw' else not pid.endswith('.png')
            assert fields['file'].startswith('data:')
            self.stored[rt, dt, pid] = dict(public_id=pid, resource_type=rt, type=dt)
            if self.partial:
                raise pilot.SafetyError('synthetic ambiguous timeout')
            if self.interrupt:
                raise KeyboardInterrupt()
            result = self.stored[rt, dt, pid].copy()
            if self.bad_identity:
                result['public_id'] = 'outside/unsafe'
            if self.collision:
                result['existing'] = True
        elif action == 'destroy':
            assert method == 'POST'
            assert set(fields) == {'public_id', 'type', 'invalidate'}
            assert fields['invalidate'] == 'true'
            key = (rt, fields['type'], fields['public_id'])
            if self.bad_destroy:
                result = dict(error=dict(message='SENTINEL_API_SECRET SENTINEL_FULL_TOKEN'))
            else:
                result = dict(result='ok' if self.stored.pop(key, None) else 'not found')
        elif rt == 'resources':
            rt, dt = action, path[5]
            if len(path) > 6:
                key = rt, dt, urllib.parse.unquote('/'.join(path[6:]))
                if key in self.stored:
                    result = self.stored[key]
                else:
                    status, result = 404, dict(error=dict(message='not found'))
            else:
                prefix = urllib.parse.parse_qs(p.query)['prefix'][0]
                result = dict(resources=[v for (r, d, pid), v in self.stored.items()
                                         if r == rt and d == dt and pid.startswith(prefix)])
                if self.bad_inventory:
                    result = dict(error=dict(message='SENTINEL_API_SECRET'))
        else:
            raise AssertionError('unexpected API endpoint')
        return status, {}, json.dumps(result).encode()


class Tests(unittest.TestCase):
    def setUp(self):
        # Fail closed if any tested code tries real HTTP, including preflight regressions.
        self.socket_guard = patch.object(socket.socket, 'connect', side_effect=AssertionError('network forbidden'))
        self.socket_guard.start()
        self.addCleanup(self.socket_guard.stop)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'state.json'
        self.c = pilot.Config(ENV)
        self.doc = dict(version=1, cloud=self.c.cloud, prefix='pilot', run='a' * 32,
                        assets=pilot.assets('pilot', 'a' * 32))
        pilot.save_state(self.path, self.doc, new=True)
        self.provider = Provider()
        self.time = 0
        self.out = io.StringIO()
        self.capture = contextlib.ExitStack()
        self.capture.enter_context(contextlib.redirect_stdout(self.out))
        self.capture.enter_context(contextlib.redirect_stderr(self.out))
        self.addCleanup(self.capture.close)
        self.p = pilot.Pilot(self.c, self.provider, Signer(), self.path, self.doc,
                             sleeper=self.sleep, clock=lambda: self.time)

    def sleep(self, seconds):
        self.time += seconds
        self.provider.expired = True

    def test_preflight_required_and_invalid_values(self):
        for key in ENV:
            for missing in (True, False):
                env = ENV.copy()
                if missing:
                    env.pop(key)
                else:
                    env[key] = ''
                with self.subTest(key=key, missing=missing), self.assertRaises(pilot.SafetyError):
                    pilot.Config(env)
        for key, value in [('PILOT_CONFIRM_NONPRODUCTION', 'YES'),
                           ('PILOT_EXPECTED_CLOUD_NAME', 'Local-fixture-cloud'),
                           ('CLOUDINARY_CLOUD_NAME', '../bad'), ('PILOT_PREFIX', 'other'),
                           ('PILOT_PREFIX', 'pilot/../bad'), ('PILOT_TTL_SECONDS', 'x'),
                           ('PILOT_TTL_SECONDS', '0'), ('PILOT_TTL_SECONDS', '9999'),
                           ('PILOT_EXPIRY_SKEW_SECONDS', '-1'), ('PILOT_PREFLIGHT_ONLY', 'maybe'),
                           ('CLOUDINARY_AUTH_TOKEN_KEY', 'not-a-token-key')]:
            env = dict(ENV, **{key: value})
            with self.subTest(key=key, value=value), self.assertRaises(pilot.SafetyError):
                pilot.Config(env)

    def test_cli_gate_cannot_reach_transport_or_signer(self):
        for key in ENV:
            env = ENV.copy()
            env.pop(key)
            with patch.dict(os.environ, env, clear=True), patch.object(pilot, 'Transport') as transport, \
                    patch.object(pilot, 'Sdk') as sdk:
                self.assertEqual(pilot.main([]), 2)
                transport.assert_not_called()
                sdk.assert_not_called()
        with patch.dict(os.environ, dict(ENV, PILOT_EXPECTED_CLOUD_NAME='other'), clear=True), \
                patch.object(pilot, 'Transport') as transport:
            self.assertEqual(pilot.main([]), 2)
            transport.assert_not_called()

    def test_fixtures_are_valid(self):
        f = pilot.fixtures()
        pdf = f['raw']
        xref = int(pdf.split(b'startxref\n')[1].splitlines()[0])
        self.assertTrue(pdf[xref:].startswith(b'xref\n'))
        for i, line in enumerate(pdf[xref:].splitlines()[3:7], 1):
            offset = int(line.split()[0])
            self.assertTrue(pdf[offset:].startswith(f'{i} 0 obj'.encode()))
        png = f['image']
        self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
        at, kinds = 8, []
        while at < len(png):
            size = struct.unpack('!I', png[at:at + 4])[0]
            kind, data = png[at + 4:at + 8], png[at + 8:at + 8 + size]
            crc = struct.unpack('!I', png[at + 8 + size:at + 12 + size])[0]
            self.assertEqual(crc, zlib.crc32(kind + data))
            if kind == b'IDAT':
                self.assertEqual(len(zlib.decompress(data)), 4)
            kinds.append(kind)
            at += size + 12
        self.assertEqual(kinds, [b'IHDR', b'IDAT', b'IEND'])

    def test_complete_mock_matrix_and_redaction(self):
        self.p.run()
        self.assertTrue(self.p.cleanup())
        self.assertFalse(self.provider.stored)
        log = self.out.getvalue()
        for secret in ('SENTINEL_API_SECRET', 'SENTINEL_API_KEY', 'SENTINEL_FULL_TOKEN', ENV['CLOUDINARY_AUTH_TOKEN_KEY']):
            self.assertNotIn(secret, log)
        self.assertEqual(sum('/destroy' in c[1] for c in self.provider.calls), 12)
        self.assertEqual(sum(not c[3] for c in self.provider.calls), 12)

    def test_partial_upload_journaled_before_request_and_recovery(self):
        self.provider.partial = True
        with self.assertRaises(pilot.SafetyError):
            self.p.run()
        restored = pilot.load_state(self.path, self.c)
        self.assertTrue(restored['assets'][0]['attempted'])
        recovery = pilot.Pilot(self.c, self.provider, None, self.path, restored)
        self.assertTrue(recovery.cleanup())
        self.assertFalse(self.provider.stored)
        self.assertEqual(sum('/destroy' in c[1] for c in self.provider.calls), 1)

    def test_interrupted_upload_cleanup(self):
        self.provider.interrupt = True
        with self.assertRaises(KeyboardInterrupt):
            self.p.run()
        self.assertTrue(self.p.cleanup())
        self.assertFalse(self.provider.stored)

    def test_cleanup_failure_is_unresolved_retains_state(self):
        self.p.upload(self.doc['assets'][0], pilot.fixtures()['raw'])
        self.provider.bad_destroy = True
        self.assertFalse(self.p.cleanup())
        self.assertIn('UNRESOLVED test-cloud resource', self.out.getvalue())
        self.assertTrue(self.path.exists())
        self.assertTrue(pilot.load_state(self.path)['assets'][0]['attempted'])
        self.assertNotIn('SENTINEL_API_SECRET', self.out.getvalue())

    def test_inventory_errors_fail_closed(self):
        self.provider.bad_inventory = True
        self.assertFalse(self.p.cleanup())
        self.assertIn('UNRESOLVED test-cloud inventory', self.out.getvalue())

    def test_failure_status_stops_matrix_and_cleans(self):
        self.provider.fetch_status = 500
        with self.assertRaises(pilot.SafetyError):
            self.p.run()
        self.assertTrue(self.p.cleanup())

    def test_wrong_upload_identity_is_not_deleted(self):
        self.provider.bad_identity = True
        with self.assertRaises(pilot.SafetyError):
            self.p.run()
        self.p.cleanup()
        self.assertTrue(all(c[2]['public_id'].startswith('pilot/' + 'a' * 32 + '/')
                            for c in self.provider.calls if '/destroy' in c[1]))

    def test_tampered_state_and_untracked_delete_rejected(self):
        for key, value in [('public_id', 'pilot/other/existing.pdf'),
                           ('resource_type', 'video'), ('attempted', 'yes')]:
            doc = copy.deepcopy(self.doc)
            doc['assets'][0][key] = value
            with self.assertRaises(pilot.SafetyError):
                pilot.validate_state(doc, self.c)
        with self.assertRaises(pilot.SafetyError):
            self.p.destroy(self.doc['assets'][0])
        self.assertEqual(self.provider.calls, [])
        with self.assertRaises(pilot.SafetyError):
            pilot.validate_state(dict(self.doc, cloud='other'), self.c)

    def test_state_not_truncated_or_symlinked(self):
        original = self.path.read_bytes()
        with self.assertRaises(FileExistsError):
            pilot.save_state(self.path, self.doc, new=True)
        self.assertEqual(self.path.read_bytes(), original)
        link = Path(self.temp.name) / 'link'
        link.symlink_to(self.path)
        with self.assertRaises(pilot.SafetyError):
            pilot.load_state(link)
        self.path.chmod(0o644)
        with self.assertRaises(pilot.SafetyError):
            pilot.load_state(self.path)

    def test_paginated_inventory_and_repeated_cursor(self):
        calls = []
        def request(method, url, fields=None, authenticated=False):
            calls.append(url)
            query = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
            body = dict(resources=[])
            if len(calls) == 1:
                body['next_cursor'] = 'page2'
            return 200, {}, json.dumps(body).encode()
        self.p.transport = type('Pages', (), {'request': staticmethod(request)})()
        self.assertEqual(self.p.inventory(), 0)
        self.assertIn('next_cursor=page2', calls[1])
        self.assertEqual(len(calls), 5)
        self.p.transport.request = lambda *a, **kw: (200, {}, b'{"resources":[],"next_cursor":"repeat"}')
        with self.assertRaises(pilot.SafetyError):
            self.p.inventory()

    def test_transport_does_not_follow_redirects(self):
        self.assertIsNone(pilot.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.invalid'))
        t = pilot.Transport(self.c)
        with self.assertRaises(pilot.SafetyError):
            t.request('GET', 'https://other.invalid/secret', authenticated=True)
        with self.assertRaises(pilot.SafetyError):
            t.request('GET', 'https://res.cloudinary.com/secret', authenticated=True)

    def test_existing_upload_collision_never_deleted(self):
        self.provider.collision = True
        with self.assertRaises(pilot.SafetyError):
            self.p.run()
        self.assertFalse(self.p.cleanup())
        self.assertFalse(any('/destroy' in c[1] for c in self.provider.calls))
        self.assertFalse(pilot.load_state(self.path)['assets'][0]['attempted'])

    def test_state_lock_excludes_concurrent_recovery(self):
        with pilot.state_lock(self.path):
            with self.assertRaises(BlockingIOError):
                with pilot.state_lock(self.path):
                    self.fail('concurrent lock acquired')

    def test_cli_failure_cleans_and_recovery_exit_code(self):
        # Execute actual main/finally orchestration with the provider transport replaced.
        path = Path(self.temp.name) / 'main.json'
        env = dict(ENV, PILOT_STATE_FILE=str(path))
        self.provider.partial = True
        with patch.dict(os.environ, env, clear=True), patch.object(pilot, 'Sdk', return_value=Signer()), \
                patch.object(pilot, 'Transport', return_value=self.provider):
            self.assertEqual(pilot.main([]), 1)
            self.assertFalse(self.provider.stored)
            self.assertEqual(pilot.main(['--cleanup-only']), 0)
            self.provider.bad_inventory = True
            self.assertEqual(pilot.main(['--cleanup-only']), 1)
            self.assertEqual(pilot.main([]), 2)
        self.assertTrue(path.exists())

    def test_malformed_provider_json_and_destroy_contract(self):
        self.p.transport = type('BadJson', (), {'request': staticmethod(lambda *a, **k: (200, {}, b'not json'))})()
        with self.assertRaises(pilot.SafetyError):
            self.p.inventory()
        self.p.transport = type('BadResult', (), {'request': staticmethod(lambda *a, **k: (200, {}, b'{"result":"unexpected"}'))})()
        self.doc['assets'][0]['attempted'] = True
        with self.assertRaises(pilot.SafetyError):
            self.p.destroy(self.doc['assets'][0])

    def test_real_transport_serialization_without_socket(self):
        from email.message import Message
        from unittest.mock import Mock
        transport = pilot.Transport(self.c)
        headers = Message()
        headers['Content-Type'] = 'application/json'
        response = Mock(code=200, headers=headers)
        response.read.return_value = b'{"result":"ok"}'
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        transport.opener.open = Mock(return_value=response)
        fields = dict(public_id=self.doc['assets'][0]['public_id'], type='upload', invalidate='true')
        transport.request('POST', self.p.base + '/raw/destroy', fields, authenticated=True)
        request = transport.opener.open.call_args.args[0]
        self.assertEqual(request.method, 'POST')
        self.assertEqual(urllib.parse.parse_qs(request.data.decode())['public_id'], [fields['public_id']])
        self.assertEqual(request.get_header('Authorization'), 'Basic ' + base64.b64encode(
            (ENV['CLOUDINARY_API_KEY'] + ':' + ENV['CLOUDINARY_API_SECRET']).encode()).decode())
        self.assertEqual(transport.opener.open.call_args.kwargs['timeout'], 30)

    def test_offline_preflight_real_sdk(self):
        env = dict(ENV, PATH=os.environ['PATH'], HOME=os.environ['HOME'], PILOT_PREFLIGHT_ONLY='yes')
        with patch.dict(os.environ, env, clear=True), patch.object(pilot, 'Transport') as transport:
            self.assertEqual(pilot.main([]), 0)
            transport.assert_not_called()
        log = self.out.getvalue()
        self.assertIn('SDK self-test PASS', log)
        self.assertIn('no Cloudinary API calls', log)
        for value in (ENV['CLOUDINARY_API_KEY'], ENV['CLOUDINARY_API_SECRET'], ENV['CLOUDINARY_AUTH_TOKEN_KEY']):
            self.assertNotIn(value, log)



if __name__ == '__main__':
    unittest.main(verbosity=2)
