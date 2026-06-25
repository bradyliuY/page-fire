import { describe, it, expect } from 'vitest'
import { validatePath, validateExtension, validateFileSize, ValidationError } from '../../src/core/validate.js'
import { resolve } from 'path'

describe('validatePath', () => {
  const root = '/tmp/deploy-root'
  it('accepts simple filename', () => { expect(() => validatePath('index.html', root)).not.toThrow() })
  it('accepts nested path', () => { expect(() => validatePath('css/style.css', root)).not.toThrow() })
  it('rejects absolute path', () => { expect(() => validatePath('/etc/passwd', root)).toThrow(ValidationError) })
  it('rejects .. traversal', () => { expect(() => validatePath('../secret', root)).toThrow(ValidationError) })
  it('rejects encoded traversal', () => { expect(() => validatePath('foo/../../etc/passwd', root)).toThrow(ValidationError) })
})

describe('validateExtension', () => {
  it('allows .html', () => { expect(() => validateExtension('page.html')).not.toThrow() })
  it('allows .svg', () => { expect(() => validateExtension('img.svg')).not.toThrow() })
  it('rejects .php', () => { expect(() => validateExtension('shell.php')).toThrow(ValidationError) })
  it('rejects .sh', () => { expect(() => validateExtension('run.sh')).toThrow(ValidationError) })
  it('rejects .exe', () => { expect(() => validateExtension('bad.exe')).toThrow(ValidationError) })
})

describe('validateFileSize', () => {
  it('passes when under limit', () => { expect(() => validateFileSize(100, 1000)).not.toThrow() })
  it('throws when over limit', () => { expect(() => validateFileSize(1001, 1000)).toThrow(ValidationError) })
  it('passes exactly at limit', () => { expect(() => validateFileSize(1000, 1000)).not.toThrow() })
})
