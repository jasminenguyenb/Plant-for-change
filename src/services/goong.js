/**
 * Goong Maps API - Autocomplete V2 & Place Detail V2
 * @see https://help.goong.io/kb/rest-api-v2/autocomplete-rest-api-v2/autocomplete-v2/
 * @see https://help.goong.io/kb/rest-api-v2/place-detail-rest-api-v2/place-detail-place-detail-v2/
 */

const BASE = 'https://rsapi.goong.io/v2'

function getApiKey() {
  const key = import.meta.env.VITE_GOONG_API_KEY
  if (!key) {
    console.warn('VITE_GOONG_API_KEY chưa được cấu hình. Thêm vào file .env')
    return ''
  }
  return key
}

/**
 * Gợi ý địa điểm theo từ khóa (Autocomplete V2)
 * @param {string} input - Từ khóa tìm kiếm
 * @param {Object} options - location "lat,lng", limit (mặc định 5), radius (km)
 * @returns {Promise<{ predictions: Array }>}
 */
export async function autocomplete(input, options = {}) {
  const apiKey = getApiKey()
  if (!apiKey) return { predictions: [] }

  const params = new URLSearchParams({
    input: input.trim(),
    api_key: apiKey,
    limit: String(options.limit ?? 5),
    ...(options.location && { location: options.location }),
    ...(options.radius != null && { radius: String(options.radius) }),
    ...(options.more_compound === true && { more_compound: 'true' }),
  })

  const res = await fetch(`${BASE}/place/autocomplete?${params}`)
  const data = await res.json()
  if (data.status !== 'OK') return { predictions: [] }
  return data
}

/**
 * Chi tiết địa điểm theo place_id (Place Detail V2)
 * @param {string} placeId
 * @returns {Promise<{ result?: { formatted_address, geometry: { location: { lat, lng } }, name, place_id }, status }>}
 */
export async function placeDetail(placeId) {
  const apiKey = getApiKey()
  if (!apiKey || !placeId) return { status: 'ERROR', result: null }

  const params = new URLSearchParams({
    place_id: placeId,
    api_key: apiKey,
  })

  const res = await fetch(`${BASE}/place/detail?${params}`)
  const data = await res.json()
  return data
}
