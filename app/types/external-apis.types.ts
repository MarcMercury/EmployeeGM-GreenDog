/**
 * External API Integration Types
 * ================================
 * Type definitions for all free/free-tier external API integrations.
 * Organized by category: Scheduling, Time Clock, Communication,
 * AI, Documents, Analytics, Marketing, Compliance, Veterinary, Finance.
 */

// =====================================================
// GOOGLE CALENDAR
// =====================================================

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
  attendees?: GoogleCalendarAttendee[]
  status: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
  recurringEventId?: string
  created: string
  updated: string
}

export interface GoogleCalendarAttendee {
  email: string
  displayName?: string
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  self?: boolean
}

export interface GoogleCalendarSyncState {
  calendarId: string
  syncToken: string | null
  lastSynced: string | null
}

// =====================================================
// CAL.COM
// =====================================================

export interface CalComEventType {
  id: number
  title: string
  slug: string
  length: number
  description?: string
  locations?: { type: string; address?: string }[]
}

export interface CalComBooking {
  id: number
  uid: string
  title: string
  startTime: string
  endTime: string
  attendees: { email: string; name: string; timeZone: string }[]
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED'
  eventTypeId: number
}

// =====================================================
// CRONITOR
// =====================================================

export interface CronitorMonitor {
  key: string
  name: string
  type: 'cron' | 'heartbeat' | 'check'
  schedule?: string
  status: 'healthy' | 'failing' | 'not_scheduled'
  running: boolean
  lastPing?: string
}

export interface CronitorPing {
  state: 'run' | 'complete' | 'fail' | 'ok'
  message?: string
  metrics?: Record<string, number>
}

// =====================================================
// CLOCKIFY (Time Clock)
// =====================================================

export interface ClockifyTimeEntry {
  id: string
  description: string
  billable: boolean
  projectId?: string
  taskId?: string
  timeInterval: {
    start: string
    end: string | null
    duration: string | null
  }
  userId: string
  workspaceId: string
}

export interface ClockifyUser {
  id: string
  email: string
  name: string
  activeWorkspace: string
  status: 'ACTIVE' | 'PENDING_EMAIL_VERIFICATION' | 'DELETED'
}

export interface ClockifyWorkspace {
  id: string
  name: string
  hourlyRate?: { amount: number; currency: string }
}

// =====================================================
// SENDGRID (Email)
// =====================================================

export interface SendGridEmail {
  to: string | string[]
  from: { email: string; name?: string }
  subject: string
  html?: string
  text?: string
  templateId?: string
  dynamicTemplateData?: Record<string, any>
  categories?: string[]
}

export interface SendGridResponse {
  statusCode: number
  headers: Record<string, string>
}

// =====================================================
// ONESIGNAL (Push Notifications)
// =====================================================

export interface OneSignalNotification {
  app_id: string
  contents: { en: string }
  headings?: { en: string }
  include_player_ids?: string[]
  include_external_user_ids?: string[]
  filters?: OneSignalFilter[]
  url?: string
  data?: Record<string, any>
}

export interface OneSignalFilter {
  field: string
  key?: string
  relation: string
  value: string
}

export interface OneSignalDevice {
  id: string
  identifier: string
  session_count: number
  last_active: number
  external_user_id?: string
  tags: Record<string, string>
}

// =====================================================
// GOOGLE GEMINI (AI)
// =====================================================

export interface GeminiGenerateRequest {
  contents: GeminiContent[]
  generationConfig?: {
    temperature?: number
    topP?: number
    topK?: number
    maxOutputTokens?: number
  }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

export interface GeminiGenerateResponse {
  candidates: {
    content: GeminiContent
    finishReason: string
    safetyRatings: { category: string; probability: string }[]
  }[]
  usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number }
}

// =====================================================
// PINECONE (Vector DB)
// =====================================================

export interface PineconeVector {
  id: string
  values: number[]
  metadata?: Record<string, any>
}

export interface PineconeQueryRequest {
  vector: number[]
  topK: number
  filter?: Record<string, any>
  includeMetadata?: boolean
  namespace?: string
}

export interface PineconeQueryResponse {
  matches: {
    id: string
    score: number
    values?: number[]
    metadata?: Record<string, any>
  }[]
  namespace: string
}

// =====================================================
// ASSEMBLYAI (Transcription)
// =====================================================

export interface AssemblyAITranscript {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  text: string | null
  audio_url: string
  language_code?: string
  confidence?: number
  words?: { text: string; start: number; end: number; confidence: number }[]
  utterances?: { speaker: string; text: string; start: number; end: number }[]
  error?: string
}

export interface AssemblyAIUploadResponse {
  upload_url: string
}

// =====================================================
// GOOGLE DRIVE (Documents)
// =====================================================

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  parents?: string[]
  webViewLink?: string
  webContentLink?: string
  createdTime: string
  modifiedTime: string
  size?: string
  owners?: { displayName: string; emailAddress: string }[]
}

export interface GoogleDriveUploadMeta {
  name: string
  mimeType?: string
  parents?: string[]
  description?: string
}

// =====================================================
// PANDADOC (e-Signatures)
// =====================================================

export interface PandaDocDocument {
  id: string
  name: string
  status: 'document.draft' | 'document.sent' | 'document.completed' | 'document.viewed' | 'document.waiting_approval' | 'document.voided'
  date_created: string
  date_modified: string
  recipients: PandaDocRecipient[]
}

export interface PandaDocRecipient {
  email: string
  first_name: string
  last_name: string
  role: string
  signing_order?: number
  has_completed: boolean
}

// =====================================================
// GOOGLE ANALYTICS 4
// =====================================================

export interface GA4Event {
  name: string
  params?: Record<string, string | number | boolean>
}

export interface GA4ReportRequest {
  dateRanges: { startDate: string; endDate: string }[]
  dimensions?: { name: string }[]
  metrics: { name: string }[]
  dimensionFilter?: Record<string, any>
  limit?: number
}

export interface GA4ReportResponse {
  rows: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]
  rowCount: number
  metadata: { currencyCode: string; timeZone: string }
}

// =====================================================
// MIXPANEL
// =====================================================

export interface MixpanelEvent {
  event: string
  properties: {
    distinct_id: string
    time?: number
    [key: string]: any
  }
}

export interface MixpanelProfile {
  $distinct_id: string
  $set?: Record<string, any>
  $set_once?: Record<string, any>
}

// =====================================================
// MAILCHIMP
// =====================================================

export interface MailchimpMember {
  email_address: string
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional'
  merge_fields?: Record<string, string>
  tags?: string[]
  list_id: string
}

export interface MailchimpCampaign {
  id: string
  type: 'regular' | 'plaintext' | 'absplit' | 'rss' | 'variate'
  status: 'save' | 'paused' | 'schedule' | 'sending' | 'sent'
  settings: {
    subject_line: string
    from_name: string
    reply_to: string
  }
  recipients: { list_id: string; segment_opts?: any }
  send_time?: string
}

// =====================================================
// HUBSPOT
// =====================================================

export interface HubSpotContact {
  id: string
  properties: {
    email: string
    firstname?: string
    lastname?: string
    phone?: string
    company?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

export interface HubSpotDeal {
  id: string
  properties: {
    dealname: string
    amount?: string
    dealstage: string
    pipeline: string
    closedate?: string
    [key: string]: any
  }
}

// =====================================================
// GOOGLE MAPS / PLACES
// =====================================================

export interface GoogleMapsGeocode {
  lat: number
  lng: number
  formatted_address: string
  place_id: string
}

export interface GoogleMapsDistanceResult {
  origin: string
  destination: string
  distance: { text: string; value: number }
  duration: { text: string; value: number }
}

export interface GooglePlaceDetails {
  place_id: string
  name: string
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
  rating?: number
  reviews?: { author_name: string; rating: number; text: string; time: number }[]
  opening_hours?: { open_now: boolean; weekday_text: string[] }
}

// =====================================================
// YELP FUSION
// =====================================================

export interface YelpBusiness {
  id: string
  name: string
  url: string
  rating: number
  review_count: number
  phone: string
  location: { address1: string; city: string; state: string; zip_code: string }
  categories: { alias: string; title: string }[]
  coordinates: { latitude: number; longitude: number }
  is_closed: boolean
}

export interface YelpReview {
  id: string
  text: string
  rating: number
  time_created: string
  user: { name: string; image_url?: string }
}

// =====================================================
// GOOGLE BUSINESS PROFILE
// =====================================================

export interface GoogleBusinessLocation {
  name: string
  title: string
  phoneNumbers?: { primaryPhone: string }
  websiteUri?: string
  regularHours?: { periods: { openDay: string; openTime: string; closeDay: string; closeTime: string }[] }
  metadata?: { placeId: string; mapsUri: string }
}

export interface GoogleBusinessReview {
  name: string
  reviewId: string
  reviewer: { displayName: string; profilePhotoUrl?: string }
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: { comment: string; updateTime: string }
}

// =====================================================
// META MARKETING (Facebook/Instagram)
// =====================================================

export interface MetaPost {
  message: string
  link?: string
  published?: boolean
  scheduled_publish_time?: number
  targeting?: { geo_locations?: { countries?: string[] } }
}

export interface MetaPageInsight {
  name: string
  period: string
  values: { value: number; end_time: string }[]
  title: string
  description: string
}

// =====================================================
// EVENTBRITE
// =====================================================

export interface EventbriteEvent {
  id: string
  name: { text: string; html: string }
  description?: { text: string; html: string }
  url: string
  start: { timezone: string; local: string; utc: string }
  end: { timezone: string; local: string; utc: string }
  status: 'draft' | 'live' | 'started' | 'ended' | 'completed' | 'canceled'
  capacity?: number
  venue_id?: string
  category_id?: string
}

export interface EventbriteAttendee {
  id: string
  status: 'Attending' | 'Checked In' | 'Not Attending'
  profile: { name: string; email: string; first_name: string; last_name: string }
  event_id: string
  order_id: string
}

// =====================================================
// OSHA (Compliance)
// =====================================================

export interface OSHAInspection {
  activity_nr: number
  estab_name: string
  site_address: string
  site_city: string
  site_state: string
  open_date: string
  close_case_date?: string
  case_type: string
  safety_hlth: string
}

export interface OSHAViolation {
  activity_nr: number
  citation_id: string
  standard: string
  viol_type: string
  issuance_date: string
  abate_date?: string
  current_penalty: number
  initial_penalty: number
}

// =====================================================
// VETCOVE (Veterinary Supplies)
// =====================================================

export interface VetCoveProduct {
  id: string
  name: string
  manufacturer: string
  category: string
  prices: VetCovePrice[]
  description?: string
  ndc?: string
}

export interface VetCovePrice {
  distributor: string
  price: number
  unit: string
  in_stock: boolean
}

// =====================================================
// PLAID (Finance)
// =====================================================

export interface PlaidAccount {
  account_id: string
  name: string
  official_name?: string
  type: 'depository' | 'credit' | 'loan' | 'investment' | 'other'
  subtype?: string
  balances: {
    available: number | null
    current: number | null
    limit: number | null
    iso_currency_code: string | null
  }
}

export interface PlaidTransaction {
  transaction_id: string
  account_id: string
  amount: number
  date: string
  name: string
  merchant_name?: string
  category?: string[]
  pending: boolean
  iso_currency_code?: string
}

// =====================================================
// METABASE (Embedded Analytics)
// =====================================================

export interface MetabaseEmbedPayload {
  resource: { dashboard?: number; question?: number }
  params: Record<string, any>
}

export interface MetabaseDashboard {
  id: number
  name: string
  description?: string
  parameters: { id: string; name: string; type: string; default?: any }[]
}
