import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('security proxy', () => {
  it('issues a unique nonce CSP without allowing arbitrary inline scripts', () => {
    const response = proxy(new NextRequest('https://lumen.example/settings'));
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('generates a different nonce for every page request', () => {
    const first = proxy(new NextRequest('https://lumen.example/'));
    const second = proxy(new NextRequest('https://lumen.example/'));

    expect(first.headers.get('Content-Security-Policy')).not.toBe(
      second.headers.get('Content-Security-Policy'),
    );
  });
});
