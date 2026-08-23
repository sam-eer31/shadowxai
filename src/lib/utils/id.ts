/**
 * Generate a unique ID using crypto.randomUUID with a fallback.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

/**
 * Generate a short, clean, collision-resistant unique ID for artifacts (e.g. art_7k9m2x).
 * Uses unambiguous base32 characters (excludes 0, o, 1, i, l) and cryptographically secure entropy.
 */
export function generateShortId(prefix = 'art_'): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  const length = 8;

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let str = '';
    for (let i = 0; i < length; i++) {
      str += chars[bytes[i] % chars.length];
    }
    return `${prefix}${str}`;
  }

  // Fallback for non-crypto environments
  let id = prefix;
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
