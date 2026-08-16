/** Formats a phone number for WhatsApp links. */
export function normalizePhoneNumber(phone: string, defaultCountryCode = '+27'): string {
  if (!phone || phone === 'WhatsApp Contact') return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    const cleanCC = defaultCountryCode.replace(/[^\d+]/g, '');
    cleaned = `${cleanCC}${cleaned}`;
  }
  return cleaned.replace('+', '');
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone || phone === 'WhatsApp Contact') return 'Chosen in WhatsApp';
  const trimmed = phone.trim();
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

export function buildWhatsAppWebUrl(phone: string | undefined, message: string, defaultCountryCode = '+27'): string {
  const encodedText = encodeURIComponent(message);
  if (phone && phone.trim() && phone !== 'WhatsApp Contact') {
    const cleanPhone = normalizePhoneNumber(phone, defaultCountryCode);
    if (cleanPhone) return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

export function buildWhatsAppNativeUrl(phone: string | undefined, message: string, defaultCountryCode = '+27'): string {
  const encodedText = encodeURIComponent(message);
  if (phone && phone.trim() && phone !== 'WhatsApp Contact') {
    const cleanPhone = normalizePhoneNumber(phone, defaultCountryCode);
    if (cleanPhone) return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `whatsapp://send?text=${encodedText}`;
}

/**
 * Opens WhatsApp's recipient picker from a user click.
 * A web app cannot read WhatsApp's private contact database, so the contact
 * is selected inside WhatsApp itself. Textly keeps the recipient as
 * "WhatsApp Contact" and prepares the message when WhatsApp is opened.
 */
export function openWhatsAppContactPicker(message = ''): boolean {
  const encodedText = encodeURIComponent(message);
  const nativeUrl = `whatsapp://send?text=${encodedText}`;
  const webUrl = `https://wa.me/?text=${encodedText}`;

  try {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = nativeUrl;
      return true;
    }

    const win = window.open(webUrl, '_blank', 'noopener,noreferrer');
    return !!win;
  } catch {
    try {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      return true;
    } catch {
      return false;
    }
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export function openWhatsApp(phone: string | undefined, message: string, defaultCountryCode = '+27'): boolean {
  const win = window.open(buildWhatsAppWebUrl(phone, message, defaultCountryCode), '_blank', 'noopener,noreferrer');
  return !!win;
}
