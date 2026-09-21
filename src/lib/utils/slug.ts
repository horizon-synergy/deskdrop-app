/**
 * slug.ts
 * ----------------------------------------------------------------------------
 * Turns a display name into a URL-safe slug, e.g. "A5 Ruled Notebook (Navy)"
 * -> "a5-ruled-notebook-navy". Used by the admin Product and Category
 * forms to auto-populate the slug field from the name field, while still
 * letting an admin override it manually (slugs are stored as their own
 * field, not derived at read time, since a product's name may later
 * change without wanting to break existing shared/bookmarked URLs).
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFKD') // splits accented characters into base + diacritic
    .replace(/[\u0300-\u036f]/g, '') // strips the diacritics
    .replace(/[^a-z0-9\s-]/g, '') // drop anything that isn't alphanumeric/space/hyphen
    .replace(/\s+/g, '-') // spaces -> hyphens
    .replace(/-+/g, '-') // collapse repeated hyphens
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}
