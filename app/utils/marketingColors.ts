/**
 * Shared color / icon helper functions for Marketing pages.
 *
 * Functions that are specific to one domain (partner vs influencer vs event) are
 * prefixed accordingly so there are no collisions when Nuxt auto-imports them.
 */

// ---------------------------------------------------------------------------
// Partner colours (partners.vue, partner/[id].vue)
// ---------------------------------------------------------------------------

/** Status colour for marketing partners (pet businesses, rescues, etc.). */
export function getPartnerStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'success',
    pending: 'warning',
    expired: 'error',
    inactive: 'grey',
    prospect: 'info',
    completed: 'blue-grey',
  }
  return colors[status] || 'grey'
}

/** Partner-type badge colour. */
export function getPartnerTypeColor(type: string): string {
  const colors: Record<string, string> = {
    pet_business: 'teal',
    exotic_shop: 'lime',
    rescue: 'pink',
    influencer: 'secondary',
    entertainment: 'purple',
    print_vendor: 'brown',
    chamber: 'primary',
    food_vendor: 'orange',
    media: 'deep-purple',
    groomer: 'light-blue',
    daycare_boarding: 'amber',
    pet_retail: 'teal-darken-2',
    charity: 'red',
    merch_vendor: 'blue-grey',
    designers_graphics: 'deep-orange',
    association: 'indigo',
    spay_neuter: 'cyan',
    other: 'grey',
  }
  return colors[type] || 'grey'
}

/** Partner category human-readable label. */
export function getPartnerCategoryLabel(category: string | null): string {
  if (!category) return ''
  const labels: Record<string, string> = {
    pet_business: 'Other Pet Business',
    exotic_shop: 'Exotic Shop',
    rescue: 'Rescue',
    influencer: 'Influencer',
    entertainment: 'Entertainment',
    print_vendor: 'Print Vendor',
    chamber: 'Chamber/Association',
    food_vendor: 'Food & Beverage',
    media: 'Media',
    groomer: 'Groomer',
    daycare_boarding: 'Daycare/Boarding',
    pet_retail: 'Pet Retail',
    charity: 'Charity',
    merch_vendor: 'Merch Vendor',
    designers_graphics: 'Designers/Graphics',
    other: 'Other',
  }
  return labels[category] || category
}

/** Partner category icon. */
export function getPartnerCategoryIcon(category: string | null): string {
  if (!category) return 'mdi-tag'
  const icons: Record<string, string> = {
    pet_business: 'mdi-paw',
    exotic_shop: 'mdi-snake',
    rescue: 'mdi-heart',
    influencer: 'mdi-account-star',
    entertainment: 'mdi-party-popper',
    print_vendor: 'mdi-printer',
    chamber: 'mdi-domain',
    food_vendor: 'mdi-food',
    media: 'mdi-newspaper',
    groomer: 'mdi-content-cut',
    daycare_boarding: 'mdi-home-heart',
    pet_retail: 'mdi-store',
    charity: 'mdi-hand-heart',
    merch_vendor: 'mdi-tshirt-crew',
    designers_graphics: 'mdi-palette',
    other: 'mdi-tag',
  }
  return icons[category] || 'mdi-tag'
}

// ---------------------------------------------------------------------------
// Influencer colours (influencers.vue)
// ---------------------------------------------------------------------------

/** Tier colour for influencers (nano / micro / macro / mega). */
export function getInfluencerTierColor(tier: string | null): string {
  const colors: Record<string, string> = {
    nano: 'grey',
    micro: 'info',
    macro: 'success',
    mega: 'warning',
  }
  return colors[tier || ''] || 'grey'
}

/** Status colour for influencers. */
export function getInfluencerStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'success',
    prospect: 'info',
    inactive: 'grey',
    completed: 'warning',
  }
  return colors[status] || 'grey'
}

/** Social platform icon. */
export function getPlatformIcon(platform: string | null): string {
  const icons: Record<string, string> = {
    IG: 'mdi-instagram',
    Instagram: 'mdi-instagram',
    TikTok: 'mdi-music-note',
    YouTube: 'mdi-youtube',
    Facebook: 'mdi-facebook',
  }
  return icons[platform || ''] || 'mdi-account-star'
}

/** Social platform chip colour. */
export function getPlatformColor(platform: string | null): string {
  const colors: Record<string, string> = {
    IG: 'pink',
    Instagram: 'pink',
    TikTok: 'cyan',
    YouTube: 'red',
    Facebook: 'blue',
  }
  return colors[platform || ''] || 'secondary'
}

/** Influencer note-type icon. */
export function getNoteTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    general: 'mdi-note-text',
    outreach: 'mdi-send',
    call: 'mdi-phone',
    email: 'mdi-email',
    meeting: 'mdi-account-group',
    content_review: 'mdi-image-check',
    payment: 'mdi-currency-usd',
    issue: 'mdi-alert-circle',
  }
  return icons[type] || 'mdi-note'
}

/** Influencer note-type chip colour. */
export function getNoteTypeColor(type: string): string {
  const colors: Record<string, string> = {
    general: 'grey',
    outreach: 'primary',
    call: 'info',
    email: 'purple',
    meeting: 'success',
    content_review: 'warning',
    payment: 'teal',
    issue: 'error',
  }
  return colors[type] || 'grey'
}

// ---------------------------------------------------------------------------
// Event colours (calendar.vue)
// ---------------------------------------------------------------------------

/** Status colour for marketing events (planned / confirmed / completed / cancelled). */
export function getEventStatusColor(status: string): string {
  const colors: Record<string, string> = {
    planned: 'info',
    confirmed: 'success',
    completed: 'grey',
    cancelled: 'error',
  }
  return colors[status] || 'grey'
}
