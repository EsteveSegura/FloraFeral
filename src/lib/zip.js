/**
 * Minimal ZIP writer (STORE method, no compression)
 *
 * Batch results are mostly PNG/JPEG data URLs, which are already compressed,
 * so storing them uncompressed costs almost nothing and keeps the app free of
 * third-party dependencies (see decisions.md — "No Backend", minimal deps).
 */

const LOCAL_FILE_HEADER_SIG = 0x04034b50
const CENTRAL_DIRECTORY_SIG = 0x02014b50
const END_OF_CENTRAL_DIR_SIG = 0x06054b50

const VERSION = 20
const FLAG_UTF8 = 0x0800
const METHOD_STORE = 0

const CRC_TABLE = buildCrcTable()

/**
 * Build the CRC-32 lookup table (polynomial 0xEDB88320)
 * @returns {Uint32Array}
 */
function buildCrcTable() {
  const table = new Uint32Array(256)

  for (let i = 0; i < 256; i++) {
    let value = i
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1
    }
    table[i] = value >>> 0
  }

  return table
}

/**
 * Compute the CRC-32 of a byte array
 * @param {Uint8Array} bytes
 * @returns {number} Unsigned 32-bit checksum
 */
function crc32(bytes) {
  let crc = 0xffffffff

  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff]
  }

  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Convert a Date to the MS-DOS time/date pair used by the ZIP format
 * @param {Date} date
 * @returns {{ time: number, date: number }}
 */
function toDosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980)

  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  }
}

/**
 * Decode a data URL into raw bytes
 * @param {string} dataUrl - e.g. "data:image/png;base64,iVBOR..."
 * @returns {{ bytes: Uint8Array, mimeType: string }}
 */
export function dataUrlToBytes(dataUrl) {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl || '')
  if (!match) {
    throw new Error('Invalid data URL')
  }

  const [, mimeType, base64Marker, payload] = match

  if (!base64Marker) {
    return { bytes: textToBytes(decodeURIComponent(payload)), mimeType }
  }

  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return { bytes, mimeType }
}

/**
 * Map a MIME type to a file extension
 * @param {string} mimeType
 * @returns {string} Extension including the dot
 */
export function extensionForMimeType(mimeType) {
  const extensions = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
  }

  return extensions[mimeType] || '.png'
}

/**
 * Encode a string as UTF-8 bytes
 * @param {string} text
 * @returns {Uint8Array}
 */
export function textToBytes(text) {
  return new TextEncoder().encode(text)
}

/**
 * Build a ZIP archive
 * @param {Array<{ name: string, bytes: Uint8Array }>} entries - Files to include
 * @returns {Blob} ZIP archive
 */
export function createZip(entries) {
  const { time, date } = toDosDateTime(new Date())
  const encoder = new TextEncoder()

  const chunks = []
  const centralRecords = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const data = entry.bytes
    const checksum = crc32(data)

    // Local file header
    const header = new Uint8Array(30 + nameBytes.length)
    const headerView = new DataView(header.buffer)
    headerView.setUint32(0, LOCAL_FILE_HEADER_SIG, true)
    headerView.setUint16(4, VERSION, true)
    headerView.setUint16(6, FLAG_UTF8, true)
    headerView.setUint16(8, METHOD_STORE, true)
    headerView.setUint16(10, time, true)
    headerView.setUint16(12, date, true)
    headerView.setUint32(14, checksum, true)
    headerView.setUint32(18, data.length, true)
    headerView.setUint32(22, data.length, true)
    headerView.setUint16(26, nameBytes.length, true)
    headerView.setUint16(28, 0, true)
    header.set(nameBytes, 30)

    chunks.push(header, data)

    // Central directory record (written after all files)
    const record = new Uint8Array(46 + nameBytes.length)
    const recordView = new DataView(record.buffer)
    recordView.setUint32(0, CENTRAL_DIRECTORY_SIG, true)
    recordView.setUint16(4, VERSION, true)
    recordView.setUint16(6, VERSION, true)
    recordView.setUint16(8, FLAG_UTF8, true)
    recordView.setUint16(10, METHOD_STORE, true)
    recordView.setUint16(12, time, true)
    recordView.setUint16(14, date, true)
    recordView.setUint32(16, checksum, true)
    recordView.setUint32(20, data.length, true)
    recordView.setUint32(24, data.length, true)
    recordView.setUint16(28, nameBytes.length, true)
    recordView.setUint16(30, 0, true)
    recordView.setUint16(32, 0, true)
    recordView.setUint16(34, 0, true)
    recordView.setUint16(36, 0, true)
    recordView.setUint32(38, 0, true)
    recordView.setUint32(42, offset, true)
    record.set(nameBytes, 46)

    centralRecords.push(record)
    offset += header.length + data.length
  }

  const centralDirectoryOffset = offset
  let centralDirectorySize = 0
  for (const record of centralRecords) {
    chunks.push(record)
    centralDirectorySize += record.length
  }

  // End of central directory
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, END_OF_CENTRAL_DIR_SIG, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, centralRecords.length, true)
  endView.setUint16(10, centralRecords.length, true)
  endView.setUint32(12, centralDirectorySize, true)
  endView.setUint32(16, centralDirectoryOffset, true)
  endView.setUint16(20, 0, true)

  chunks.push(end)

  return new Blob(chunks, { type: 'application/zip' })
}

/**
 * Build a ZIP and trigger its download
 * @param {Array<{ name: string, bytes: Uint8Array }>} entries
 * @param {string} filename
 */
export function downloadZip(entries, filename) {
  const blob = createZip(entries)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Make a string safe to use as a file or folder name inside the archive
 * @param {string} value
 * @returns {string}
 */
export function sanitizeFilename(value) {
  return String(value || 'untitled')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 60)
}
