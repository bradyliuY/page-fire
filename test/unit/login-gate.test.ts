import { describe, it, expect } from 'vitest'
import { renderLoginPage, sanitizeNextPath, parseFragmentPassword } from '../../src/http/login.js'

describe('parseFragmentPassword', () => {
  it('extracts the password from a #pf= fragment', () => {
    expect(parseFragmentPassword('#pf=hello123')).toBe('hello123')
    expect(parseFragmentPassword('#pf=hello%20123')).toBe('hello 123')
    expect(parseFragmentPassword('#foo=1&pf=secret')).toBe('secret')
  })
  it('returns null for missing / empty fragments', () => {
    expect(parseFragmentPassword('')).toBeNull()
    expect(parseFragmentPassword('#other=x')).toBeNull()
    expect(parseFragmentPassword('#pf=')).toBeNull()
    expect(parseFragmentPassword('#pf=%')).toBeNull()
  })
})

describe('sanitizeNextPath', () => {
  it('keeps safe absolute paths and defaults otherwise', () => {
    expect(sanitizeNextPath('/about')).toBe('/about')
    expect(sanitizeNextPath('/')).toBe('/')
    expect(sanitizeNextPath('/foo/bar.html')).toBe('/foo/bar.html')
    expect(sanitizeNextPath(null)).toBe('/')
    expect(sanitizeNextPath('')).toBe('/')
    expect(sanitizeNextPath('https://evil.com')).toBe('/')
    expect(sanitizeNextPath('/../etc/passwd')).toBe('/')
    expect(sanitizeNextPath('/foo\nbar')).toBe('/')
  })
})

describe('renderLoginPage', () => {
  it('renders a password form posting to /_pf/login', () => {
    const html = renderLoginPage({ next: '/about' })
    expect(html).toContain('action="/_pf/login"')
    expect(html).toContain('type="password"')
    expect(html).toContain('name="next" value="/about"')
    expect(html).toContain('此页面受密码保护')
    // ASCII quotes only — must not trip the html-templates guard
    expect(html).not.toContain('“')
    expect(html).not.toContain('”')
  })

  it('shows an error message when error=true', () => {
    const html = renderLoginPage({ error: true })
    expect(html).toContain('密码错误，请重试')
    const ok = renderLoginPage({ error: false })
    expect(ok).not.toContain('密码错误')
  })

  it('includes the fragment auto-login script', () => {
    const html = renderLoginPage()
    expect(html).toContain("location.hash")
    expect(html).toContain("pf=")
    expect(html).toContain("form.submit()")
  })
})
