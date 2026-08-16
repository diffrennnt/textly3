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
  if (!phone || phone === 'WhatsApp Contact') return 'Choose a contact';
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

export interface PickedContact {
  name: string;
  phone: string;
}

/**
 * Uses the browser Contact Picker API when available. A web page cannot
 * directly read WhatsApp's private contact database.
 */
export async function pickWhatsAppContact(): Promise<PickedContact | null> {
  try {
    const contactsApi = (navigator as Navigator & {
      contacts?: {
        select: (properties: string[], options?: { multiple?: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
      };
    }).contacts;

    if (!contactsApi?.select) return null;

    const selected = await contactsApi.select(['name', 'tel'], { multiple: false });
    const contact = selected?.[0];
    const phone = contact?.tel?.[0]?.trim();
    const name = contact?.name?.[0]?.trim();

    if (!phone) return null;
    return { name: name || 'WhatsApp Contact', phone };
  } catch {
    return null;
  }
}

/** Opens WhatsApp for a known contact. */
export function openWhatsApp(phone: string | undefined, message: string, defaultCountryCode = '+27'): boolean {
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = isMobile
    ? buildWhatsAppNativeUrl(phone, message, defaultCountryCode)
    : buildWhatsAppWebUrl(phone, message, defaultCountryCode);

  try {
    if (isMobile) {
      window.location.href = url;
      return true;
    }
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return !!win;
  } catch {
    return false;
  }
}

/** Fallback when the browser does not support the Contact Picker API. */
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
    return false;
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
