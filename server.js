// server.js — Lightweight production server for Railway
// Serves the Vite build output (dist/) with SPA fallback
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, 'dist')
const PORT = parseInt(process.env.PORT || '3001', 10)

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.webm': 'video/webm',
  '.mp4':  'video/mp4',
}

function serveFile(res, filePath) {
  try {
    const content = readFileSync(filePath)
    const ext = extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    // Cache static assets for 1 year (they have content hashes)
    const isAsset = filePath.includes('/assets/')
    const cacheControl = isAsset
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate'

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(content)
  } catch {
    return false
  }
  return true
}

const indexHtml = readFileSync(join(DIST, 'index.html'))

const server = createServer((req, res) => {
  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'raya-frontend' }))
    return
  }

  // Try to serve the requested file from dist/
  const urlPath = req.url.split('?')[0]
  const filePath = join(DIST, urlPath)

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    if (serveFile(res, filePath)) return
  }

  // SPA fallback: serve index.html for all unmatched routes
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
  })
  res.end(indexHtml)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('='.repeat(50))
  console.log('  Raya Frontend running on port ' + PORT)
  console.log('  Environment: ' + (process.env.NODE_ENV || 'production'))
  console.log('  API Backend: ' + (process.env.VITE_API_BASE || 'not configured'))
  console.log('='.repeat(50))
  console.log('')
})
