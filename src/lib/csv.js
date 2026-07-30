/**
 * CSV utilities
 * Round-trip of the Batch Run input table: values may contain commas, quotes
 * and newlines (prompts often do), so quoting is handled properly instead of
 * naively joining on commas.
 */

// Excel only detects UTF-8 reliably when the file starts with a BOM
const BOM = '﻿'

const DELIMITERS = [',', ';', '\t']

/**
 * Quote a single CSV field when it needs it
 * @param {*} value
 * @param {string} delimiter
 * @returns {string}
 */
function escapeField(value, delimiter) {
  const text = value === null || value === undefined ? '' : String(value)

  if (text.includes('"') || text.includes('\n') || text.includes('\r') || text.includes(delimiter)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

/**
 * Serialize rows to CSV text
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array<*>>} rows - Row values, aligned with headers
 * @param {Object} [options]
 * @param {string} [options.delimiter=','] - Field delimiter
 * @param {boolean} [options.bom=true] - Prefix a UTF-8 BOM for Excel
 * @returns {string}
 */
export function toCsv(headers, rows, { delimiter = ',', bom = true } = {}) {
  const lines = [headers.map(header => escapeField(header, delimiter)).join(delimiter)]

  for (const row of rows) {
    lines.push(row.map(value => escapeField(value, delimiter)).join(delimiter))
  }

  return (bom ? BOM : '') + lines.join('\r\n')
}

/**
 * Guess the delimiter used by a CSV file.
 * Spanish/European Excel writes `;` by default, so assuming `,` would break
 * every file exported from a localized spreadsheet.
 * @param {string} text
 * @returns {string}
 */
export function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''

  let best = ','
  let bestCount = 0

  for (const delimiter of DELIMITERS) {
    // Count only delimiters outside quoted sections
    let count = 0
    let inQuotes = false

    for (let i = 0; i < firstLine.length; i++) {
      const char = firstLine[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        count++
      }
    }

    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }

  return best
}

/**
 * Parse CSV text into a matrix of strings
 * Handles quoted fields, escaped quotes ("") and newlines inside fields.
 * @param {string} text
 * @param {Object} [options]
 * @param {string} [options.delimiter] - Defaults to auto-detection
 * @returns {Array<Array<string>>} Rows of fields
 */
export function parseCsv(text, { delimiter } = {}) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const sep = delimiter || detectDelimiter(input)

  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < input.length) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }

    if (char === '"') {
      inQuotes = true
      i++
      continue
    }

    if (char === sep) {
      row.push(field)
      field = ''
      i++
      continue
    }

    if (char === '\r' || char === '\n') {
      // Consume CRLF as a single break
      if (char === '\r' && input[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }

    field += char
    i++
  }

  // Flush the last field/row unless the file ended with a clean line break
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop trailing rows that are entirely empty
  while (rows.length > 0 && rows[rows.length - 1].every(value => value.trim() === '')) {
    rows.pop()
  }

  return rows
}

/**
 * Trigger a CSV file download
 * @param {string} content - CSV text
 * @param {string} filename
 */
export function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
