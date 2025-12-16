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
  try {
    // Fetch the image
    const response = await fetch(imageUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    // Get the image as a blob
    const blob = await response.blob()

    // Convert blob to base64 using FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onloadend = () => {
        resolve(reader.result)
      }

      reader.onerror = () => {
        reject(new Error('Failed to convert image to base64'))
      }

      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting image URL to base64:', error)
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
