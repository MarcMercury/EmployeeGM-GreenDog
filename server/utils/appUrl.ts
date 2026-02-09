/**
 * App URL Utility
 * 
 * Returns the application base URL for generating links.
 * Throws an error in production if APP_URL is not configured.
 */

export function getAppUrl(): string {
  const config = useRuntimeConfig()
  
  const appUrl = config.public.appUrl
  
  if (appUrl) {
    // Remove trailing slash if present
    return appUrl.replace(/\/$/, '')
  }
  
  // In development, allow localhost fallback
  if (process.env.NODE_ENV === 'development') {
    logger.warn('APP_URL not set, using localhost fallback (dev only)', 'getAppUrl')
    return 'http://localhost:3000'
  }
  
  // In production, this is a configuration error
  throw new Error(
    'APP_URL environment variable is required in production. ' +
    'Set NUXT_PUBLIC_APP_URL or APP_URL in your environment.'
  )
}
