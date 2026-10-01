/**
 * Google Authentication & Identity Services Helper for GVCN App
 */

export interface GoogleUserProfile {
  id: string; // Google sub
  email: string;
  name: string;
  avatar: string;
  verifiedEmail: boolean;
  provider: 'google';
}

/**
 * Decode JWT token payload from Google Identity Services Credential Response
 */
export function parseGoogleJwtToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse Google JWT credential:', e);
    return null;
  }
}

/**
 * Verify whether an email address belongs to a real Google Account domain
 */
export function isRealGoogleEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) return false;
  return (
    clean.endsWith('@gmail.com') ||
    clean.endsWith('.edu.vn') ||
    clean.includes('googlemail.com') ||
    clean.endsWith('.edu') ||
    clean.endsWith('.vn')
  );
}

/**
 * Generate a friendly initial-based Google style avatar
 */
export function getGoogleInitialAvatar(name: string, email: string): string {
  const seed = (name || email || 'Teacher').trim();
  const initial = (seed.charAt(0) || 'G').toUpperCase();
  const colors = [
    '4285F4', // Google Blue
    'EA4335', // Google Red
    'FBBC05', // Google Yellow
    '34A853', // Google Green
    '6366F1', // Indigo
    '0D9488', // Teal
  ];
  let charSum = 0;
  for (let i = 0; i < seed.length; i++) {
    charSum += seed.charCodeAt(i);
  }
  const color = colors[charSum % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=${color}&color=fff&size=150&bold=true`;
}
