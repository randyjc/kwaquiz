import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    readFileSync: vi.fn(() => '{"subject":"Test","questions":[]}'),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  readFileSync: vi.fn(() => '{"subject":"Test","questions":[]}'),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

describe('Config Security - Path Traversal Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getQuizz', () => {
    it('should reject path traversal attempts with ../', async () => {
      const Config = (await import('../services/config')).default

      const result = Config.getQuizz('../../../etc/passwd')
      expect(result).toBeNull()
    })

    it('should reject path traversal attempts with encoded characters', async () => {
      const Config = (await import('../services/config')).default

      const result = Config.getQuizz('..%2F..%2Fetc%2Fpasswd')
      expect(result).toBeNull()
    })

    it('should reject IDs with special characters', async () => {
      const Config = (await import('../services/config')).default

      expect(Config.getQuizz('test/../../etc')).toBeNull()
      expect(Config.getQuizz('test\\..\\..\\etc')).toBeNull()
      expect(Config.getQuizz('test;rm -rf /')).toBeNull()
      expect(Config.getQuizz('test`whoami`')).toBeNull()
    })

    it('should accept valid alphanumeric IDs', async () => {
      const Config = (await import('../services/config')).default

      // These should not return null due to sanitization (may return null if file doesn't exist)
      const result = Config.getQuizz('valid-quizz-id')
      // The mock returns a valid JSON, so this should work
      expect(result).not.toBeNull()
      expect(result?.id).toBe('valid-quizz-id')
    })

    it('should accept IDs with underscores and hyphens', async () => {
      const Config = (await import('../services/config')).default

      const result = Config.getQuizz('my_quizz-2024')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('my_quizz-2024')
    })
  })

  describe('deleteQuizz', () => {
    it('should reject path traversal attempts', async () => {
      const Config = (await import('../services/config')).default
      const fs = await import('fs')

      const result = Config.deleteQuizz('../../../etc/passwd')
      expect(result).toBe(false)
      expect(fs.default.unlinkSync).not.toHaveBeenCalled()
    })

    it('should reject IDs with special characters', async () => {
      const Config = (await import('../services/config')).default
      const fs = await import('fs')

      expect(Config.deleteQuizz('test/path')).toBe(false)
      expect(Config.deleteQuizz('test\\path')).toBe(false)
      expect(fs.default.unlinkSync).not.toHaveBeenCalled()
    })

    it('should allow deletion of valid IDs', async () => {
      const Config = (await import('../services/config')).default
      const fs = await import('fs')

      const result = Config.deleteQuizz('valid-quizz')
      expect(result).toBe(true)
      expect(fs.default.unlinkSync).toHaveBeenCalled()
    })
  })
})
