/**
 * Slug Utility Functions
 * Handles SEO-friendly URL slug generation and validation
 */

/**
 * Generate SEO-friendly slug from title
 * @param {string} title - Quiz title
 * @returns {string} - URL-safe slug
 */
export function slugify(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')          // Remove leading/trailing hyphens
    .substring(0, 50);              // Max 50 chars
}

/**
 * Validate slug format
 * @param {string} slug - Slug to validate
 * @returns {boolean} - True if valid
 */
export function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  
  // Must be lowercase alphanumeric with hyphens only
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length <= 50;
}

/**
 * Convert slug back to readable title (approximate)
 * @param {string} slug - URL slug
 * @returns {string} - Human-readable title
 */
export function unslugify(slug) {
  if (!slug) return '';
  
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate unique slug by appending number if needed
 * @param {string} baseSlug - Base slug
 * @param {string[]} existingSlugs - Array of existing slugs
 * @returns {string} - Unique slug
 */
export function makeUniqueSlug(baseSlug, existingSlugs = []) {
  let slug = baseSlug;
  let counter = 2;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
