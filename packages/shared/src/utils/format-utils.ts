/**
 * General Formatting Utilities
 * Consistent data formatting across web and mobile
 * 
 * Shared between web and mobile applications
 */

/**
 * Service type labels for display
 */
export const SERVICE_LABELS: Record<string, string> = {
  'drop-in': 'Drop-In',
  'walk': 'Walk',
  'overnight': 'Overnight',
  'housesit': 'Housesit',
  'meet-greet': 'Meet & Greet',
  'nail-trim': 'Nail Trim',
  'other': 'Other',
};

/**
 * Get display label for a service type
 * @param type - Service type key
 * @returns Human-readable label
 */
export function getServiceLabel(type?: string): string {
  if (!type) return SERVICE_LABELS['other'];
  return SERVICE_LABELS[type] ?? type;
}

/**
 * Format a number as currency
 * @param amount - Number to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a number with thousands separators
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format percentage
 * @param value - Decimal value (0.5 = 50%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string (e.g., "50%")
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format percentage from raw percent value
 * @param percent - Already-calculated percent value (50 = 50%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string (e.g., "50%")
 */
export function formatPercentRaw(percent: number, decimals: number = 0): string {
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to title case
 * @param str - String to convert
 * @returns Title-cased string
 */
export function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => capitalize(word.toLowerCase()))
    .join(' ');
}

/**
 * Generate initials from a name
 * @param name - Full name
 * @param maxLength - Maximum number of initials (default: 2)
 * @returns Initials string (e.g., "JD" for "John Doe")
 */
export function getInitials(name: string, maxLength: number = 2): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('');
}

/**
 * Pluralize a word based on count
 * @param count - Number to check
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + 's')
 * @returns Pluralized word
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? singular + 's');
}

/**
 * Format count with label (e.g., "5 visits", "1 visit")
 * @param count - Number
 * @param singular - Singular label
 * @param plural - Plural label (optional)
 * @returns Formatted string with count and label
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
