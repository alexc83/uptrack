import { describe, expect, it } from 'vitest';
import { safeHttpUrl } from './safe-url';

describe('safeHttpUrl', () => {
  it('accepts absolute http and https URLs', () => {
    expect(safeHttpUrl('https://res.cloudinary.com/x/raw/upload/a.pdf')).toBe('https://res.cloudinary.com/x/raw/upload/a.pdf');
    expect(safeHttpUrl('http://localhost/a.pdf')).toBe('http://localhost/a.pdf');
  });
  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', 'file:///etc/passwd', '//evil.test/a', '/relative', 'not a url', ''])('rejects %j', value => {
    expect(safeHttpUrl(value)).toBeNull();
  });
  it('rejects null and undefined', () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});
