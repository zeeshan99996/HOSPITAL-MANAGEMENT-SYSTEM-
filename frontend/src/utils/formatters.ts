/**
 * formatters.ts
 * ============================================================
 * Input mask and formatter helpers for Pakistani CNIC, Phone numbers,
 * and strict local date parsing (avoiding UTC off-by-one shifts).
 * ============================================================
 */

/**
 * Formats a CNIC number in real-time as XXXXX-XXXXXXX-X (13 digits max).
 * Example: '4210112345671' -> '42101-1234567-1'
 */
export function formatCNIC(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 13);
  
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

/**
 * Formats a Pakistani Mobile Phone number in real-time as 03XX-XXXXXXX (11 digits max).
 * Example: '03001234567' -> '0300-1234567'
 */
export function formatPhone(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 4) {
    return digits;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
}

/**
 * Formats a date string or Date object cleanly as 'DD MMM YYYY' (e.g. '15 May 1990').
 * Prevents off-by-one day shifts caused by UTC/Local timezone conversions on ISO strings.
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Match YYYY-MM-DD pattern directly from string prefix
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const monthIdx = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthIdx >= 0 && monthIdx < 12 && day > 0 && day <= 31) {
        return `${day.toString().padStart(2, '0')} ${months[monthIdx]} ${year}`;
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Formats a date string or Date object with time as 'DD MMM YYYY, HH:MM AM/PM'.
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const formattedDate = formatDate(dateInput);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${formattedDate}, ${timeStr}`;
}
