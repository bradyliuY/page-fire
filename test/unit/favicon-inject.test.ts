import { describe, it, expect } from 'vitest'
import { injectFaviconLinks } from '../../src/http/serve.js'

const PLAIN = '<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body><p>hi</p></body></html>'

describe('injectFaviconLinks', () => {
  it('injects the favicon family + theme-color before </head>', () => {
    const result = injectFaviconLinks(PLAIN)
    expect(result).toContain('rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"')
    expect(result).toContain('rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png"')
    expect(result).toContain('rel="shortcut icon" href="/favicon.ico"')
    expect(result).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"')
    expect(result).toContain('name="theme-color" content="#0a0a0b"')
    // Injected into <head>, before the original </head>
    expect(result.indexOf('rel="icon"')).toBeLessThan(result.indexOf('</head>'))
    expect(result.indexOf('</head>')).toBeLessThan(result.indexOf('<body>'))
  })

  it('does not override a page that already declares its own icon link', () => {
    const html = '<!doctype html><html><head><link rel="icon" href="/my-icon.svg"></head><body></body></html>'
    expect(injectFaviconLinks(html)).toBe(html)
  })

  it('recognizes single-quoted rel attributes', () => {
    const html = `<!doctype html><html><head><link rel='shortcut icon' href='/own.ico'></head><body></body></html>`
    expect(injectFaviconLinks(html)).toBe(html)
  })

  it('does not duplicate an existing theme-color', () => {
    const html = '<!doctype html><html><head><meta name="theme-color" content="#ff0000"></head><body></body></html>'
    const result = injectFaviconLinks(html)
    expect(result).toContain('name="theme-color" content="#ff0000"')
    expect((result.match(/theme-color/g) ?? []).length).toBe(1)
    expect(result).toContain('rel="shortcut icon"')
  })

  it('leaves HTML without </head> untouched', () => {
    expect(injectFaviconLinks('<html><body>no head</body></html>')).toBe('<html><body>no head</body></html>')
  })
})
