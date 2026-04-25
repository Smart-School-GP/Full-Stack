/**
 * HTML Sanitization using isomorphic-dompurify
 * 
 * Used to sanitize user-generated rich text content to prevent XSS attacks.
 * Applies to: announcement bodies, message bodies, discussion posts, portfolio descriptions, etc.
 * 
 * Usage:
 *   const { sanitize } = require('./lib/sanitize');
 *   const cleanBody = sanitize(userInput);
 */

let dompurify;
try {
  dompurify = require('isomorphic-dompurify');
} catch (err) {
  console.warn('[Sanitize] isomorphic-dompurify not installed, using basic sanitization');
  dompurify = null;
}

/**
 * Configuration for dompurify - allows safe HTML elements for rich text editing
 */
const SANITIZE_CONFIG = {
  // Allow common formatting tags
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div',
  ],
  // Allow common attributes
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'room', 'id',
    'target', 'rel',
    'width', 'height', 'style',
  ],
  // Allow data URLs for images (base64) and regular URLs
  ALLOW_DATA_URL: true,
};

/**
 * Sanitize HTML string to prevent XSS
 * @param {string} html - Raw HTML input
 * @returns {string} - Sanitized HTML
 */
function sanitize(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // If dompurify is not available, do basic sanitization
  if (!dompurify) {
    return basicSanitize(html);
  }

  try {
    return dompurify.sanitize(html, SANITIZE_CONFIG);
  } catch (err) {
    console.warn('[Sanitize] Sanitization error:', err.message);
    return basicSanitize(html);
  }
}

/**
 * Basic sanitization fallback - strips dangerous tags/attributes
 * @param {string} html - Raw HTML input
 * @returns {string} - Basic sanitized HTML
 */
function basicSanitize(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let_clean = html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove on* event handlers
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs (unless explicitly allowed)
    .replace(/(?<!href["'\s]=["'\s])data:/gi, '')
    // Strip common dangerous tags
    .replace(/<\/?(iframe|object|embed|form|input|button)[^>]*>/gi, '');

  return _clean;
}

/**
 * Sanitize plain text (no HTML) - escape HTML entities
 * @param {string} text - Plain text input
 * @returns {string} - Escaped text safe for HTML display
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

module.exports = {
  sanitize,
  sanitizeText,
  SANITIZE_CONFIG,
};