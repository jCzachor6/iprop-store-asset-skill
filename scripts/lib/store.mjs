// Store rules mirrored from iprop-store (github.com/jCzachor6/iprop-store):
// asset/validation/RarPackageValidator.java, CompileMain.java, asset/ListingCategories.java,
// asset/compiler/CompilerRuntimeManager.java and app.assets / app.compiler in application.yml.
// Update both sides together.
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, posix, relative, resolve, sep } from "node:path"
import { deflateSync, inflateSync } from "node:zlib"

export const RULES = {
  titleMin: 2,
  titleMax: 120,
  descriptionMax: 4000,
  descriptionTile: 260,
  changelogMin: 5,
  changelogMax: 4000,
  maxIpsFiles: 64,
  maxIpsBytes: 256 * 1024,
  maxIpsTotal: 2 * 1024 * 1024,
  maxReadmeBytes: 64 * 1024,
  maxSelection: 15,
  maxSeed: 0xffffffff,
  maxIpropBytes: 4 * 1024 * 1024,
  maxMediaBytes: 3 * 1024 * 1024,
  maxGifFrames: 60,
  // app.assets in application.yml
  maxArchiveBytes: 10 * 1024 * 1024,
  maxUnpackedBytes: 5 * 1024 * 1024,
  maxFiles: 200,
  maxDepth: 8,
  compileTimeoutSeconds: 20,
  smokeSeeds: 15,
}

// app.compiler.released-versions: the store compiles only with these Infinite Props releases.
// A listed version is usable once its GitHub release exists (0.8.0 is listed ahead of its release).
export const RELEASED_COMPILERS = ["0.4.0", "0.5.0", "0.6.0", "0.7.0", "0.7.1", "0.7.2", "0.8.0"]
export const DEFAULT_COMPILER = "0.7.1"
// Material libraries (`material Name { ... }` in a .ips file with no asset) need this compiler or newer.
export const MATERIALS_SINCE = "0.8.0"

export const compareVersions = (a, b) => {
  const [x, y] = [a, b].map((version) => version.split(".").map(Number))
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}

export const GALLERY = [
  { filename: "preview.webp", format: "webp", width: 720, height: 480, role: "cover and listing thumbnail" },
  { filename: "preview1.webp", format: "webp", width: 1440, height: 960, role: "gallery image 2" },
  { filename: "preview2.webp", format: "webp", width: 1440, height: 960, role: "gallery image 3" },
  { filename: "preview3.gif", format: "gif", width: 1440, height: 960, role: "optional animation" },
]

export const COMPILER_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
// Every path segment in the archive: letters, digits, '.', '_', '-', starting with a letter or digit.
export const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
export const README_NAME = /^README\.(md|markdown|txt)$/i

export const CATEGORIES = [
  "Characters", "Weapons", "Nature", "Items", "Backgrounds", "Pixel Art", "Top Down", "RPG", "Space", "Zombies",
  "Fantasy", "Sci-Fi", "Horror", "Medieval", "Modern", "Cyberpunk", "Steampunk", "Post-Apocalyptic", "Dungeon",
  "Platformer", "Isometric", "Side Scroller", "Tilesets", "Terrain", "Buildings", "Interiors", "UI", "Icons",
  "Vehicles", "Robots", "Creatures", "Animals", "NPCs", "Bosses", "Armor", "Food", "Tools", "Effects", "Magic", "Water",
]

export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))
const toPosix = (path) => path.split(sep).join("/")

/** Every .ips under sources/, with its path relative to sources/ (the form preview-selection.json uses). */
export const walkSources = (root) => {
  const files = []
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name)
      if (statSync(path).isDirectory()) visit(path)
      else if (name.endsWith(".ips")) files.push({ path: toPosix(relative(root, path)), content: readFileSync(path, "utf8") })
    }
  }
  if (existsSync(root)) visit(root)
  return { files, skipped: [] }
}

/**
 * The files the packer puts into the .rar, at their archive paths. Anything else in the folder
 * (cover-prompt.md, notes, scripts, .DS_Store) stays out: every packed file ships to buyers.
 */
export const packageFiles = (root) => {
  const included = []
  const excluded = []
  const add = (archivePath) => included.push({ archivePath, path: join(root, ...archivePath.split("/")) })
  for (const name of readdirSync(root).sort()) {
    const path = join(root, name)
    const directory = statSync(path).isDirectory()
    if (name === "listing.json" || name === "preview-selection.json" || README_NAME.test(name)) add(name)
    else if (name === "sources" && directory) {
      const visit = (dir) => {
        for (const child of readdirSync(dir).sort()) {
          const childPath = join(dir, child)
          if (statSync(childPath).isDirectory()) visit(childPath)
          else if (child.endsWith(".ips")) add(toPosix(relative(root, childPath)))
          else if (child !== ".DS_Store") excluded.push(toPosix(relative(root, childPath)))
        }
      }
      visit(path)
    } else if (name === "gallery" && directory) {
      for (const child of readdirSync(path).sort()) {
        if (GALLERY.some((slot) => slot.filename === child)) add(`gallery/${child}`)
        else if (child !== ".DS_Store") excluded.push(`gallery/${child}`)
      }
    } else if (name !== ".DS_Store") excluded.push(directory ? `${name}/` : name)
  }
  return { included, excluded }
}

const IMPORT = /^\s*import\s+\w+\s+from\s+"([^"]+)"/gm
const MATERIAL = /^\s*material\s+[A-Za-z_]\w*\s*\{/m
const ASSET = /^\s*asset\s+[A-Za-z_]\w*/m

// A material library defines materials and no asset; it only works when an asset imports it.
export const isMaterialLibrary = (content) => MATERIAL.test(content) && !ASSET.test(content)
export const definesMaterials = (content) => MATERIAL.test(content)

// Same text scan as the store's validator: an entry is a file no other file imports.
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

/** Decodes an 8-bit RGBA PNG (what ipgen writes) to { width, height, rgba }; null for other PNGs. */
export const decodePng = (bytes) => {
  if (bytes.subarray(1, 4).toString("latin1") !== "PNG") return null
  let offset = 8
  let width = 0, height = 0, depth = 0, colour = 0, interlace = 0
  const idat = []
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const type = bytes.subarray(offset + 4, offset + 8).toString("latin1")
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    if (type === "IHDR") [width, height, depth, colour, interlace] = [data.readUInt32BE(0), data.readUInt32BE(4), data[8], data[9], data[12]]
    if (type === "IDAT") idat.push(data)
    offset += 12 + length
  }
  if (depth !== 8 || colour !== 6 || interlace !== 0 || !idat.length) return null
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const rgba = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = rgba.subarray(y * stride, (y + 1) * stride)
    raw.copy(line, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const previous = y ? rgba.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride)
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? line[x - 4] : 0
      const up = previous[x]
      const upLeft = x >= 4 ? previous[x - 4] : 0
      if (filter === 1) line[x] = (line[x] + left) & 0xff
      else if (filter === 2) line[x] = (line[x] + up) & 0xff
      else if (filter === 3) line[x] = (line[x] + ((left + up) >> 1)) & 0xff
      else if (filter === 4) {
        const p = left + up - upLeft
        const [pa, pb, pc] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)]
        line[x] = (line[x] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 0xff
      }
    }
  }
  return { width, height, rgba }
}

/** True when the PNG has no visible pixel; null when it cannot tell. */
export const pngIsEmpty = (bytes) => {
  const image = decodePng(bytes)
  if (!image) return null
  for (let i = 3; i < image.rgba.length; i += 4) if (image.rgba[i] > 0) return false
  return true
}

/** Encodes RGBA pixels as an 8-bit RGBA PNG. */
export const encodePng = ({ width, height, rgba }) => {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  const chunk = (type, data) => {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(data.length)
    head.write(type, 4, "latin1")
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])))
    return Buffer.concat([head, data, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))])
}

// --- RAR4 packer: the store reads RAR4 only (Junrar has no RAR5 support) ---

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const rarBlock = (type, flags, body) => {
  const header = Buffer.alloc(5 + body.length)
  header[0] = type
  header.writeUInt16LE(flags, 1)
  header.writeUInt16LE(7 + body.length, 3)
  body.copy(header, 5)
  const crc = Buffer.alloc(2)
  crc.writeUInt16LE(crc32(header) & 0xffff)
  return Buffer.concat([crc, header])
}

/**
 * A RAR4 archive with stored (uncompressed) entries, byte for byte what the store's
 * StoredRarWriter writes for its own working copies. entries: [{ name, data }].
 */
export const rar4 = (entries) => {
  const parts = [Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]), rarBlock(0x73, 0, Buffer.alloc(6))]
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, "utf8")
    const body = Buffer.alloc(25 + nameBytes.length)
    body.writeUInt32LE(data.length, 0) // packed size
    body.writeUInt32LE(data.length, 4) // unpacked size
    body[8] = 2 // host OS: win32, so no unix type bits that could read as a link
    body.writeUInt32LE(crc32(data), 9)
    body.writeUInt32LE(0, 13) // file time
    body[17] = 20 // version needed to extract
    body[18] = 0x30 // method: store
    body.writeUInt16LE(nameBytes.length, 19)
    body.writeUInt32LE(0, 21) // attributes
    nameBytes.copy(body, 25)
    parts.push(rarBlock(0x74, 0, body), data)
  }
  parts.push(rarBlock(0x7b, 0x4000, Buffer.alloc(0)))
  return Buffer.concat(parts)
}

// --- Infinite Props SDK: the exact release the listing declares, as the store uses it ---

export const platform = () => {
  if (process.platform === "darwin" && process.arch === "arm64") return "macos-arm64"
  if (process.platform === "linux" && process.arch === "x64") return "linux-x86_64"
  if (process.platform === "win32" && process.arch === "x64") return "windows-x86_64"
  return null
}

const exe = (name) => (process.platform === "win32" ? `${name}.exe` : name)
const cacheDir = () => resolve(process.env.IPROP_SDK_CACHE || join(homedir(), ".cache/iprop-store-asset/compilers"))

const sdkAt = (dir, version) => {
  if (!dir || !existsSync(join(dir, "bin", exe("ipc")))) return null
  let declared = null
  try {
    declared = readJson(join(dir, "release.json")).product_version
  } catch {}
  if (version && declared && declared !== version) return null
  const bin = (name) => (existsSync(join(dir, "bin", exe(name))) ? join(dir, "bin", exe(name)) : null)
  return { dir, version: declared ?? version, ipc: bin("ipc"), ipval: bin("ipval"), ipgen: bin("ipgen") }
}

/**
 * Finds the SDK for `version`: IPROP_SDK (an unpacked SDK folder, used as is), then the skill's
 * cache. With fetch it downloads the release from GitHub and verifies it against the release
 * SHA256SUMS, as the store does.
 */
export const findSdk = (version, { fetch: allowFetch = true } = {}) => {
  if (process.env.IPROP_SDK) return sdkAt(resolve(process.env.IPROP_SDK), null)
  const cached = sdkAt(join(cacheDir(), version), version)
  if (cached) return cached
  const name = platform()
  return allowFetch && name ? downloadSdk(version, name) : null
}

const downloadSdk = (version, name) => {
  const asset = `iprop-${version}-${name}.tar.gz`
  const base = `https://github.com/jCzachor6/infinite-props/releases/download/v${version}`
  const dir = join(cacheDir(), version)
  mkdirSync(dir, { recursive: true })
  const archive = join(dir, asset)
  try {
    execFileSync("curl", ["-fsSL", "-o", archive, `${base}/${asset}`])
    const sums = execFileSync("curl", ["-fsSL", `${base}/iprop-${version}-SHA256SUMS.txt`], { encoding: "utf8" })
    const expected = sums.split("\n").map((line) => line.trim().split(/\s+/)).find((parts) => parts[1]?.replace("*", "") === asset)?.[0]
    const actual = createHash("sha256").update(readFileSync(archive)).digest("hex")
    if (!expected || expected.toLowerCase() !== actual) throw new Error(`SHA-256 mismatch for ${asset}`)
    execFileSync("tar", ["-xzf", archive, "-C", dir, "--strip-components=1"])
    return sdkAt(dir, version)
  } catch (cause) {
    rmSync(dir, { recursive: true, force: true })
    throw new Error(`cannot download Infinite Props ${version} (${name}), is it released yet? ${cause.message}`)
  }
}

export const writeFile = (path, data) => {
  mkdirSync(resolve(path, ".."), { recursive: true })
  writeFileSync(path, data)
}
