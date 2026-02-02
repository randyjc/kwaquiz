import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Config module
vi.mock('@rahoot/socket/services/config', () => ({
  default: {
    ensureBaseFolders: vi.fn(),
    getMediaPath: vi.fn(() => '/tmp/test-media'),
    quizz: vi.fn(() => []),
  },
}))

// Mock fs modules
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    createReadStream: vi.fn(),
  },
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  createReadStream: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: {
    readdir: vi.fn(() => Promise.resolve([])),
    stat: vi.fn(() => Promise.resolve({ size: 1000 })),
    writeFile: vi.fn(() => Promise.resolve()),
    unlink: vi.fn(() => Promise.resolve()),
  },
  readdir: vi.fn(() => Promise.resolve([])),
  stat: vi.fn(() => Promise.resolve({ size: 1000 })),
  writeFile: vi.fn(() => Promise.resolve()),
  unlink: vi.fn(() => Promise.resolve()),
}))

describe('Media Upload Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('File Extension Validation', () => {
    it('should reject files with disallowed extensions', async () => {
      // Import after mocks are set up
      const { storeMediaFile } = await import('../server/media')

      // Create a fake executable file disguised as video
      const maliciousFile = new File(
        [new Uint8Array([0x7f, 0x45, 0x4c, 0x46])], // ELF header (Linux executable)
        'miner.sh',
        { type: 'video/mp4' }
      )

      await expect(storeMediaFile(maliciousFile)).rejects.toThrow(
        'File extension ".sh" is not allowed'
      )
    })

    it('should reject files with no extension', async () => {
      const { storeMediaFile } = await import('../server/media')

      const noExtFile = new File(
        [new Uint8Array([0x00, 0x00, 0x00, 0x00])],
        'malicious',
        { type: 'video/mp4' }
      )

      await expect(storeMediaFile(noExtFile)).rejects.toThrow(
        'File extension "(none)" is not allowed'
      )
    })

    it('should reject executable extensions disguised with valid MIME', async () => {
      const { storeMediaFile } = await import('../server/media')

      const pyFile = new File(
        [new Uint8Array([0x23, 0x21])], // Shebang
        'script.py',
        { type: 'video/mp4' }
      )

      await expect(storeMediaFile(pyFile)).rejects.toThrow(
        'File extension ".py" is not allowed'
      )
    })
  })

  describe('Magic Bytes Validation', () => {
    it('should reject files where content does not match extension', async () => {
      const { storeMediaFile } = await import('../server/media')

      // Create a file with .mp4 extension but ELF binary content
      const fakeVideo = new File(
        [new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x00, 0x00, 0x00, 0x00])], // ELF header
        'video.mp4',
        { type: 'video/mp4' }
      )

      await expect(storeMediaFile(fakeVideo)).rejects.toThrow(
        'File content does not match its extension'
      )
    })

    it('should accept valid JPEG files', async () => {
      const { storeMediaFile } = await import('../server/media')

      // Valid JPEG magic bytes
      const validJpeg = new File(
        [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])],
        'image.jpg',
        { type: 'image/jpeg' }
      )

      // This should not throw (though it may fail on file write due to mocks)
      try {
        await storeMediaFile(validJpeg)
      } catch (e: any) {
        // Should not be a security-related error
        expect(e.message).not.toContain('not allowed')
        expect(e.message).not.toContain('does not match')
      }
    })

    it('should accept valid PNG files', async () => {
      const { storeMediaFile } = await import('../server/media')

      // Valid PNG magic bytes
      const validPng = new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        'image.png',
        { type: 'image/png' }
      )

      try {
        await storeMediaFile(validPng)
      } catch (e: any) {
        expect(e.message).not.toContain('not allowed')
        expect(e.message).not.toContain('does not match')
      }
    })
  })
})
