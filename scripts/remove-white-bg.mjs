import sharp from 'sharp'

const inputPath = 'public/favicon.png'
const outputPath = 'public/favicon.png'

// Load image as raw RGBA pixels
const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info
const pixels = new Uint8ClampedArray(data)

// Flood-fill from all 4 corners to find white/near-white background pixels
// White threshold: R>230, G>230, B>230
const THRESHOLD = 230
const visited = new Uint8Array(width * height)
const queue = []

function idx(x, y) { return (y * width + x) }
function pixelIsWhite(x, y) {
  const i = (y * width + x) * channels
  return pixels[i] > THRESHOLD && pixels[i+1] > THRESHOLD && pixels[i+2] > THRESHOLD
}

// Seed corners
const corners = [[0,0],[width-1,0],[0,height-1],[width-1,height-1]]
for (const [cx, cy] of corners) {
  if (!visited[idx(cx,cy)] && pixelIsWhite(cx, cy)) {
    queue.push([cx, cy])
    visited[idx(cx,cy)] = 1
  }
}

// BFS flood fill
while (queue.length > 0) {
  const [x, y] = queue.pop()
  // Make transparent
  const i = (y * width + x) * channels
  pixels[i+3] = 0

  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nx = x + dx, ny = y + dy
    if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[idx(nx,ny)] && pixelIsWhite(nx, ny)) {
      visited[idx(nx,ny)] = 1
      queue.push([nx, ny])
    }
  }
}

// Write back
await sharp(Buffer.from(pixels), { raw: { width, height, channels } })
  .png()
  .toFile(outputPath)

console.log(`Done — ${width}x${height} px, white background removed.`)
