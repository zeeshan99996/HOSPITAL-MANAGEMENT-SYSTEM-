/**
 * formatters.ts
 * ============================================================
 * Input mask and formatter helpers for Pakistani CNIC and Phone numbers.
 * Enforces strict character limits and real-time dash formatting.
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
