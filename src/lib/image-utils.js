/**
 * Image utility functions
 * Handles image conversions and processing
 */

/**
 * Convert image URL to base64 data URL
 * @param {string} imageUrl - HTTP/HTTPS URL of the image
 * @returns {Promise<string>} Base64 data URL
 */
export async function convertImageUrlToBase64(imageUrl) {
  return convertUrlToBase64(imageUrl)
}

/**
 * Convert any media URL to a base64 data URL
 * Model outputs live on short-lived Replicate URLs, so they are inlined before
 * being stored in node data: exported flows are plain JSON and must stand alone
 * @param {string} url - HTTP/HTTPS URL of the file
 * @returns {Promise<string>} Base64 data URL
 */
export async function convertUrlToBase64(url) {
  try {
    // Fetch the file
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
    }

    // Get the file as a blob
    const blob = await response.blob()

    // Convert blob to base64 using FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onloadend = () => {
        resolve(reader.result)
      }

      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'))
      }

      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting URL to base64:', error)
    throw error
  }
}

/**
 * Check if a string is a base64 data URL
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isBase64DataUrl(str) {
  return typeof str === 'string' && str.startsWith('data:')
}

/**
 * Check if a string is an HTTP/HTTPS URL
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isHttpUrl(str) {
  return typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://'))
}
