import { createClient } from '@sanity/client'

function readEnv() {
  return {
    projectId: import.meta.env.VITE_SANITY_PROJECT_ID || '',
    dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
    apiVersion: import.meta.env.VITE_SANITY_API_VERSION || '2025-01-01',
  }
}

/** @returns {import('@sanity/client').SanityClient | null} */
export function getSanityClient() {
  const { projectId, dataset, apiVersion } = readEnv()
  if (!projectId) return null
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true,
  })
}

export function isSanityConfigured() {
  return Boolean(readEnv().projectId)
}
