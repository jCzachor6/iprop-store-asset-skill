// Store rules mirrored from mercur (apps/api/src/api/vendor/iprop-packs/validators.ts,
// apps/api/src/lib/iprop/{pack,media,worker}.ts). Update both sides together.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { homedir } from "node:os"
import { join, posix, relative, resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"

export const RULES = {
  titleMin: 2,
  titleMax: 120,
  descriptionMax: 4000,
  descriptionExcerpt: 260,
  changelogMin: 5,
  changelogMax: 4000,
  priceMax: 100000,
  maxCategories: 5,
  maxSourceFiles: 64,
  maxSourceBytes: 256 * 1024,
  maxPackBytes: 2 * 1024 * 1024,
  maxReadmeBytes: 64 * 1024,
  maxSelection: 15,
  maxSeed: 0xffffffff,
  smokeSeeds: 15,
  maxCanvasSide: 2048,
  maxCanvasPixels: 1024 * 1024,
  maxBinaryBytes: 4 * 1024 * 1024,
  maxFuel: 5_000_000,
  maxMediaBytes: 3 * 1024 * 1024,
  maxGalleryBytes: 12 * 1024 * 1024,
  maxDecodedPixels: 32 * 1024 * 1024,
  maxGifFrames: 60,
}

export const GALLERY = [
  { filename: "preview.webp", format: "webp", width: 720, height: 480, role: "cover and listing thumbnail" },
  { filename: "preview1.webp", format: "webp", width: 1440, height: 960, role: "gallery image 2" },
  { filename: "preview2.webp", format: "webp", width: 1440, height: 960, role: "gallery image 3" },
  { filename: "preview3.gif", format: "gif", width: 1440, height: 960, role: "optional animation" },
]

export const VERSION = /^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/
export const SOURCE_PATH = /^(?:[A-Za-z0-9][A-Za-z0-9_-]{0,63}\/){0,8}[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.ips$/
export const README_NAME = /^README\.(md|markdown|txt)$/i
// The panel's folder picker drops these directories before upload.
export const SKIPPED_DIRS = new Set(["release", "out", ".git"])

export const CATEGORIES = [
  "Characters", "Weapons", "Nature", "Items", "Backgrounds", "Pixel Art", "Top Down", "RPG", "Space", "Zombies",
  "Fantasy", "Sci-Fi", "Horror", "Medieval", "Modern", "Cyberpunk", "Steampunk", "Post-Apocalyptic", "Dungeon",
  "Platformer", "Isometric", "Side Scroller", "Tilesets", "Terrain", "Buildings", "Interiors", "UI", "Icons",
  "Vehicles", "Robots", "Creatures", "Animals", "NPCs", "Bosses", "Armor", "Food", "Tools", "Effects", "Magic", "Water",
]

export const mercurDir = () => resolve(process.env.MERCUR_DIR || join(homedir(), "Desktop/quants-space/mercur"))

export const loadSharp = () => {
  const apiPackage = join(mercurDir(), "apps/api/package.json")
  if (!existsSync(apiPackage)) return null
  try {
    return createRequire(apiPackage)("sharp")
  } catch {
    return null
  }
}

export const loadRuntime = async () => {
  const entry = join(mercurDir(), "packages/iprop/dist/node.js")
  if (!existsSync(entry)) return null
  return import(pathToFileURL(entry).href)
}

export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))

export const walkSources = (root) => {
  const files = []
  const skipped = []
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name)
      if (statSync(path).isDirectory()) {
        if (SKIPPED_DIRS.has(name)) skipped.push(relative(root, path).split(sep).join("/") + "/")
        else visit(path)
      } else if (name.endsWith(".ips")) {
        files.push({ path: relative(root, path).split(sep).join("/"), content: readFileSync(path, "utf8") })
      }
    }
  }
  visit(root)
  return { files, skipped }
}

const IMPORT = /^\s*import\s+\w+\s+from\s+"([^"]+)"/gm

// Without the compiler, imports are read the same way the demo fixtures do.
export const importGraph = (files) => {
  const known = new Set(files.map((file) => file.path))
  const imported = new Set()
  const unresolved = []
  for (const file of files) {
    for (const match of file.content.matchAll(IMPORT)) {
      const target = posix.normalize(posix.join(posix.dirname(file.path), match[1]))
      if (known.has(target)) imported.add(target)
      else unresolved.push({ from: file.path, import: match[1] })
    }
  }
  return { entries: files.map((file) => file.path).filter((path) => !imported.has(path)), unresolved }
}

export const imageInfo = (bytes) => {
  const ascii = (start, end) => bytes.subarray(start, end).toString("latin1")
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    const chunk = ascii(12, 16)
    if (chunk === "VP8X") {
      return {
        format: "webp",
        width: bytes.readUIntLE(24, 3) + 1,
        height: bytes.readUIntLE(27, 3) + 1,
        frames: bytes[20] & 0x02 ? countWebpFrames(bytes) : 1,
      }
    }
    if (chunk === "VP8L") {
      const bits = bytes.readUInt32LE(21)
      return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, frames: 1 }
    }
    if (chunk === "VP8 ") {
      return { format: "webp", width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff, frames: 1 }
    }
    return { format: "webp", width: 0, height: 0, frames: 0 }
  }
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") {
    return { format: "gif", width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8), frames: countGifFrames(bytes) }
  }
  if (ascii(1, 4) === "PNG") return { format: "png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), frames: 1 }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { format: "jpeg", width: 0, height: 0, frames: 1 }
  return { format: "unknown", width: 0, height: 0, frames: 0 }
}

const countWebpFrames = (bytes) => {
  let frames = 0
  for (let offset = 12; offset + 8 <= bytes.length;) {
    if (bytes.subarray(offset, offset + 4).toString("latin1") === "ANMF") frames++
    offset += 8 + bytes.readUInt32LE(offset + 4) + (bytes.readUInt32LE(offset + 4) % 2)
  }
  return frames
}

const countGifFrames = (bytes) => {
  const skipBlocks = (offset) => {
    while (offset < bytes.length && bytes[offset] !== 0) offset += bytes[offset] + 1
    return offset + 1
  }
  let offset = 13
  if (bytes[10] & 0x80) offset += 3 * 2 ** ((bytes[10] & 0x07) + 1)
  let frames = 0
  while (offset < bytes.length) {
    const marker = bytes[offset]
    if (marker === 0x3b) break
    if (marker === 0x21) {
      offset = skipBlocks(offset + 2)
    } else if (marker === 0x2c) {
      frames++
      const flags = bytes[offset + 9]
      offset += 10
      if (flags & 0x80) offset += 3 * 2 ** ((flags & 0x07) + 1)
      offset = skipBlocks(offset + 1)
    } else {
      break
    }
  }
  return frames
}
