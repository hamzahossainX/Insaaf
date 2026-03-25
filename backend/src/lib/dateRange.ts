/**
 * Builds a Prisma-friendly { gte, lte } date filter where `to` is treated as inclusive of
 * the WHOLE day (23:59:59.999), not just midnight. Without this, filtering "from 12 to 15"
 * silently excludes everything that happened on the 15th itself, since a bare date string
 * parses to that day's midnight.
 */
export function inclusiveDateRange(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  const gte = from ? new Date(from) : undefined;
  let lte: Date | undefined;
  if (to) {
    lte = new Date(to);
    lte.setHours(23, 59, 59, 999);
  }
  return { gte, lte };
}
