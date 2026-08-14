/**
 * timezone.ts
 * ============================================================
 * Timezone utilities for Dr. Talha Clinic (LifeFlow HMS).
 * Standardized on Pakistan Standard Time (PKT, UTC+5).
 * ============================================================
 */

export interface DayBounds {
  startOfDay: Date;
  endOfDay: Date;
  dateString: string; // YYYY-MM-DD in PKT
}

/**
 * Returns the exact Start-of-Day (00:00:00.000) and End-of-Day (23:59:59.999)
 * for a given date in Pakistan Standard Time (UTC+5), converted to UTC Date objects
 * suitable for database queries (e.g. Sequelize Op.between).
 *
 * @param referenceDate Optional reference Date object (defaults to current time).
 */
export function getPktDayBounds(referenceDate: Date = new Date()): DayBounds {
  // PKT is fixed at UTC+5 (300 minutes offset)
  const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
  
  // Shift current UTC time to PKT local time
  const pktTimeMs = referenceDate.getTime() + PKT_OFFSET_MS;
  const pktDate = new Date(pktTimeMs);

  const year = pktDate.getUTCFullYear();
  const month = String(pktDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pktDate.getUTCDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  // Start of day in PKT corresponds to YYYY-MM-DD 00:00:00 PKT -> (UTC - 5 hours)
  const startOfDay = new Date(`${dateString}T00:00:00.000+05:00`);
  // End of day in PKT corresponds to YYYY-MM-DD 23:59:59.999 PKT -> (UTC - 5 hours)
  const endOfDay = new Date(`${dateString}T23:59:59.999+05:00`);

  return {
    startOfDay,
    endOfDay,
    dateString
  };
}
