/**
 * useSanitizedHtml Composable
 *
 * Wraps DOMPurify to sanitize HTML strings before they are rendered
 * via v-html. This prevents XSS attacks from user-generated content,
 * AI responses, markdown-rendered HTML, and database-sourced templates.
 *
 * Usage:
 *   const { sanitize } = useSanitizedHtml()
 *   const clean = sanitize(dirtyHtml)
 *
 *   // Or as a computed:
 *   const safeHtml = computed(() => sanitize(rawHtml.value))
 */
import DOMPurify from 'dompurify'

export function useSanitizedHtml() {
  /**
   * Sanitize an HTML string, stripping dangerous tags/attributes.
   * Allows safe formatting tags (b, i, em, strong, p, h1-h6, ul, ol, li,
   * a, br, hr, table, thead, tbody, tr, th, td, img, span, div, code, pre,
   * blockquote, details, summary) while removing scripts, event handlers, etc.
   */
  function sanitize(dirty: string | null | undefined): string {
    if (!dirty) return ''

    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'b', 'i', 'em', 'strong', 'u', 's', 'mark', 'small', 'sub', 'sup',
        'ul', 'ol', 'li',
        'a',
        'img',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
        'div', 'span',
        'pre', 'code',
        'blockquote',
        'details', 'summary',
        'dl', 'dt', 'dd',
        'abbr', 'cite',
        'figure', 'figcaption',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'title', 'alt', 'src', 'width', 'height',
        'class', 'id', 'style',
        'colspan', 'rowspan', 'scope',
        'start', 'type',
        'open', // for <details>
      ],
      // Force links to open in new tab + noopener
      ADD_ATTR: ['target'],
      ALLOW_DATA_ATTR: false,
      // Strip dangerous URI schemes
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    })
  }

  return { sanitize }
}
