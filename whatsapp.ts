/**
 * Formats phone number by removing non-numeric characters except leading plus.
 */
export function normalizePhoneNumber(phone: string, defaultCountryCode = '+1'): string {
  if (!phone || phone === 'WhatsApp Contact') return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    const cleanCC = defaultCountryCode.replace(/[^\d+]/g, '');
    cleaned = `${cleanCC}${cleaned}`;
  }
  return cleaned.replace('+', '');
}

/**
 * Formats phone string for clear visual display
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone || phone === 'WhatsApp Contact') {
    return 'Chosen in WhatsApp';
  }
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  return `+${trimmed}`;
}

/**
 * Builds standard WhatsApp Web / API deep link.
 * If phone is omitted or empty, creates a generic text share link that lets the user choose the contact in WhatsApp.
 */
export function buildWhatsAppWebUrl(phone: string | undefined, message: string, defaultCountryCode = '+1'): string {
  const encodedText = encodeURIComponent(message);
  if (phone && phone.trim() && phone !== 'WhatsApp Contact') {
    const cleanPhone = normalizePhoneNumber(phone, defaultCountryCode);
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodedText}`;
    }
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Builds WhatsApp app protocol scheme
 */
export function buildWhatsAppNativeUrl(phone: string | undefined, message: string, defaultCountryCode = '+1'): string {
  const encodedText = encodeURIComponent(message);
  if (phone && phone.trim() && phone !== 'WhatsApp Contact') {
    const cleanPhone = normalizePhoneNumber(phone, defaultCountryCode);
    if (cleanPhone) {
      return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    }
  }
  return `whatsapp://send?text=${encodedText}`;
}

/**
 * Attempts to copy text to clipboard safely
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Copy fallback failed', err);
    return false;
  }
}

/**
 * Triggers WhatsApp opening via window.open / intent
 */
export function openWhatsApp(phone: string | undefined, message: string, defaultCountryCode = '+1'): boolean {
  const url = buildWhatsAppWebUrl(phone, message, defaultCountryCode);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  return !!win;
}

