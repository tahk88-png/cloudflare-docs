// Analytics tracking - ready for GA4 / GTM integration

export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
}

// Track events (ready for GA4 / GTM)
export function trackEvent(event: string, properties?: Record<string, any>) {
  // Client-side only
  if (typeof window === 'undefined') return
  
  // GA4 implementation
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', event, properties)
  }
  
  // GTM implementation
  if (typeof window.dataLayer !== 'undefined') {
    window.dataLayer.push({
      event,
      ...properties,
    })
  }
  
  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, properties)
  }
}

// Page view tracking
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return
  
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: path,
      page_title: title,
    })
  }
  
  trackEvent('page_view', { path, title })
}

// Catalog events
export function trackCategoryView(categorySlug: string) {
  trackEvent('category_view', { category_slug: categorySlug })
}

export function trackProductView(productId: string, productName: string) {
  trackEvent('product_view', { product_id: productId, product_name: productName })
}

export function trackSearch(query: string, resultsCount?: number) {
  trackEvent('search', { query, results_count: resultsCount })
}

// Booking events
export function trackBookingStart(productId: string) {
  trackEvent('booking_start', { product_id: productId })
}

export function trackBookingConfirmed(bookingId: string, productId: string, amount: number) {
  trackEvent('booking_confirmed', {
    booking_id: bookingId,
    product_id: productId,
    amount,
  })
}

export function trackBookingCancelled(bookingId: string) {
  trackEvent('booking_cancelled', { booking_id: bookingId })
}

// Add global types for gtag and dataLayer
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}
