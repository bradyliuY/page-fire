import { createWriteStream, mkdirSync } from 'fs'
import { join, dirname, resolve, normalize } from 'path'
import yauzl from 'yauzl'
import { validateExtension, ValidationError } from './validate.js'

const MAX_UNCOMPRESSED = 200 * 1024 * 1024 // 200 MB
const MAX_FILES = 500
const MAX_RATIO = 100

export interface ZipResult {
  fileCount: number
  sizeBytes: number
}

export async function extractZip(base64: string, destDir: string): Promise<ZipResult> {
  const buf = Buffer.from(base64, 'base64')
  mkdirSync(destDir, { recursive: true })

  return new Promise((resolveP, rejectP) => {
    yauzl.fromBuffer(buf, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        rejectP(new ValidationError('INVALID_ZIP', 'Cannot open ZIP: ' + (err?.message ?? 'unknown error')))
        return
      }

      let fileCount = 0
      let totalSize = 0
      let hasIndex = false
      let settled = false

      function fail(e: unknown): void {
        if (settled) return
        settled = true
        rejectP(e)
      }

      function done(): void {
        if (settled) return
        settled = true
        if (!hasIndex) {
          rejectP(new ValidationError('MISSING_INDEX', 'ZIP must contain index.html at root'))
          return
        }
        resolveP({ fileCount, sizeBytes: totalSize })
      }

      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        const entryName = normalize(entry.fileName).replace(/\\/g, '/')

        // Skip directory entries
        if (entryName.endsWith('/')) {
          zipfile.readEntry()
          return
        }

        // Zip Slip check
        const destBase = resolve(destDir)
        const destPath = resolve(destDir, entryName)
        if (!destPath.startsWith(destBase + '/') && destPath !== destBase) {
          fail(new ValidationError('ZIP_SLIP', `Zip Slip detected: ${entry.fileName}`))
          return
        }

        // Extension whitelist
        try {
          validateExtension(entryName)
        } catch (e) {
          fail(e)
          return
        }

        if (entryName === 'index.html') hasIndex = true

        fileCount++
        if (fileCount > MAX_FILES) {
          fail(new ValidationError('FILE_COUNT_EXCEEDED', `ZIP contains more than ${MAX_FILES} files`))
          return
        }

        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            fail(new ValidationError('INVALID_ZIP', 'Cannot read ZIP entry: ' + (streamErr?.message ?? 'unknown')))
            return
          }

          let entrySize = 0
          mkdirSync(dirname(destPath), { recursive: true })
          const out = createWriteStream(destPath)

          readStream.on('data', (chunk: Buffer) => {
            entrySize += chunk.length
            totalSize += chunk.length

            if (totalSize > MAX_UNCOMPRESSED) {
              out.destroy()
              readStream.destroy()
              fail(new ValidationError('ZIP_TOO_LARGE', 'Uncompressed size exceeds 200 MB limit'))
              return
            }

            if (entry.compressedSize > 0 && entrySize / entry.compressedSize > MAX_RATIO) {
              out.destroy()
              readStream.destroy()
              fail(new ValidationError('ZIP_BOMB', 'Compression ratio exceeds safety threshold'))
              return
            }
          })

          readStream.pipe(out)

          out.on('finish', () => {
            if (!settled) zipfile.readEntry()
          })

          out.on('error', (e) => fail(e))
          readStream.on('error', (e) => fail(e))
        })
      })

      zipfile.on('end', () => done())
      zipfile.on('error', (e) => fail(e))
    })
  })
}
