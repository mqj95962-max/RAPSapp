import type { EquipmentStatus, LoanStatus } from "./types";

/** Excel ARGB fills aligned with in-app Tailwind badges. */
export interface ExcelCellStyle {
  fill: string;
  font: string;
}

function style(fill: string, font: string): ExcelCellStyle {
  return { fill, font };
}

export const EQUIPMENT_STATUS_EXCEL: Record<EquipmentStatus, ExcelCellStyle> = {
  working: style("FFD1FAE5", "FF064E3B"),
  faulty: style("FFFEF3C7", "FF78350F"),
  broken: style("FFFEE2E2", "FF7F1D1D"),
  missing: style("FFF4F4F5", "FF52525B"),
};

export const LOAN_STATUS_EXCEL: Record<LoanStatus, ExcelCellStyle> = {
  pending: style("FFFEF3C7", "FF78350F"),
  approved: style("FFDBEAFE", "FF1E3A8A"),
  active: style("FFD1FAE5", "FF064E3B"),
  returned: style("FFF4F4F5", "FF52525B"),
  denied: style("FFE4E4E7", "FF3F3F46"),
  overdue: style("FFFEE2E2", "FF7F1D1D"),
};

/** Event list card colours from My events / coverage pages. */
export const EVENT_ROW_EXCEL = {
  incomplete: style("FFFFFFFF", "FF18181B"),
  pending: style("FFEFF6FF", "FF1E3A8A"),
  completed: style("FFECFDF5", "FF064E3B"),
} as const;

export const CATEGORY_HEADER_EXCEL = style("FFE4E4E7", "FF18181B");
export const SECTION_HEADER_EXCEL = style("FFD4D4D8", "FF18181B");
export const SHEET_HEADER_EXCEL = style("FF18181B", "FFFFFFFF");
/** Reserved equipment rows (admin reserve list). */
export const RESERVED_EXCEL = style("FFDBEAFE", "FF1E3A8A");
/** Member currently loaning badge. */
export const LOANING_MEMBER_EXCEL = style("FFFEF3C7", "FF78350F");
/** Admin role badge on members sheet. */
export const ADMIN_ROLE_EXCEL = style("FFFEF3C7", "FF78350F");
/** Regular member role badge. */
export const MEMBER_ROLE_EXCEL = style("FFD1FAE5", "FF064E3B");

export function applyCellStyle(
  cell: { fill?: unknown; font?: unknown },
  colors: ExcelCellStyle
): void {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.fill },
  };
  cell.font = { color: { argb: colors.font } };
}
