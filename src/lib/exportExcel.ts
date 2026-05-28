import ExcelJS from "exceljs";
import {
  applyCellStyle,
  CATEGORY_HEADER_EXCEL,
  EQUIPMENT_STATUS_EXCEL,
  EVENT_ROW_EXCEL,
  LOAN_STATUS_EXCEL,
  SECTION_HEADER_EXCEL,
  SHEET_HEADER_EXCEL,
} from "./exportColors";
import { EQUIPMENT_STATUS_LABELS } from "./equipment";
import { effectiveLoanStatus, LOAN_STATUS_LABELS } from "./loans";
import type { LoanStatus } from "./types";
import { formatTimestamp } from "./time";
import type {
  Category,
  ClubEvent,
  Equipment,
  FormalEvent,
  Loan,
  UserProfile,
} from "./types";

const EQUIPMENT_HEADERS = [
  "Name",
  "Equipment ID",
  "Status",
  "Status details",
  "Archived",
  "Archived at",
  "Firestore ID",
  "Created",
  "Updated",
] as const;

const STATUS_COLUMN = 3;

function styleSheetHeaderRow(sheet: ExcelJS.Worksheet, columnCount: number): void {
  const row = sheet.getRow(1);
  row.height = 22;
  row.alignment = { vertical: "middle", horizontal: "left" };
  for (let c = 1; c <= columnCount; c++) {
    applyCellStyle(row.getCell(c), SHEET_HEADER_EXCEL);
    row.getCell(c).font = { ...row.getCell(c).font, bold: true };
  }
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function autoColumnWidths(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach((column) => {
    if (!column || !column.eachCell) return;
    let max = 12;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = Math.min(len, 48);
    });
    column.width = max + 2;
  });
}

function addCategoryHeaderRow(
  sheet: ExcelJS.Worksheet,
  title: string,
  columnCount: number
): void {
  const row = sheet.addRow([title]);
  sheet.mergeCells(row.number, 1, row.number, columnCount);
  const cell = row.getCell(1);
  cell.value = title;
  applyCellStyle(cell, CATEGORY_HEADER_EXCEL);
  cell.font = { ...cell.font, bold: true, size: 12 };
  row.height = 24;
}

function addEquipmentDataRow(
  sheet: ExcelJS.Worksheet,
  item: Equipment
): void {
  const row = sheet.addRow([
    item.name,
    item.equipmentId,
    EQUIPMENT_STATUS_LABELS[item.status],
    item.statusDetails,
    item.deletedAt ? "Yes" : "No",
    item.deletedAt ? formatTimestamp(item.deletedAt) : "",
    item.id,
    formatTimestamp(item.createdAt),
    formatTimestamp(item.updatedAt),
  ]);
  applyCellStyle(row.getCell(STATUS_COLUMN), EQUIPMENT_STATUS_EXCEL[item.status]);
}

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

function equipmentInCategory(category: Category, all: Equipment[]): Equipment[] {
  return all
    .filter((e) => category.equipmentIds.includes(e.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function uncategorizedEquipment(
  categories: Category[],
  all: Equipment[]
): Equipment[] {
  const filed = new Set(categories.flatMap((c) => c.equipmentIds));
  return all.filter((e) => !filed.has(e.id)).sort((a, b) => a.name.localeCompare(b.name));
}

function addEquipmentByCategorySections(
  sheet: ExcelJS.Worksheet,
  sectionTitle: string,
  categories: Category[],
  items: Equipment[]
): void {
  if (!items.length) return;

  const row = sheet.addRow([sectionTitle]);
  sheet.mergeCells(row.number, 1, row.number, EQUIPMENT_HEADERS.length);
  applyCellStyle(row.getCell(1), SECTION_HEADER_EXCEL);
  row.getCell(1).font = { bold: true, size: 13 };
  row.height = 26;

  const sorted = sortCategories(categories);
  for (const category of sorted) {
    const group = equipmentInCategory(category, items);
    if (!group.length) continue;
    addCategoryHeaderRow(
      sheet,
      `${category.name} (${group.length} item${group.length === 1 ? "" : "s"})`,
      EQUIPMENT_HEADERS.length
    );
    for (const item of group) {
      addEquipmentDataRow(sheet, item);
    }
  }

  const loose = uncategorizedEquipment(categories, items);
  if (loose.length) {
    addCategoryHeaderRow(
      sheet,
      `Uncategorized (${loose.length} item${loose.length === 1 ? "" : "s"})`,
      EQUIPMENT_HEADERS.length
    );
    for (const item of loose) {
      addEquipmentDataRow(sheet, item);
    }
  }
}

function addEquipmentSheet(
  workbook: ExcelJS.Workbook,
  categories: Category[],
  equipmentActive: Equipment[],
  equipmentArchived: Equipment[]
): void {
  const sheet = workbook.addWorksheet("Equipment", {
    properties: { defaultRowHeight: 18 },
  });

  sheet.addRow([...EQUIPMENT_HEADERS]);
  styleSheetHeaderRow(sheet, EQUIPMENT_HEADERS.length);

  addEquipmentByCategorySections(
    sheet,
    "ACTIVE EQUIPMENT",
    categories,
    equipmentActive
  );

  addEquipmentByCategorySections(
    sheet,
    "ARCHIVED EQUIPMENT",
    categories,
    equipmentArchived
  );

  const lastRow = sheet.rowCount;
  if (lastRow > 1) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: EQUIPMENT_HEADERS.length },
    };
  }
  autoColumnWidths(sheet);
}

function addSimpleDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const sheet = workbook.addWorksheet(name, {
    properties: { defaultRowHeight: 18 },
  });
  sheet.addRow(headers);
  styleSheetHeaderRow(sheet, headers.length);
  for (const row of rows) {
    sheet.addRow(row);
  }
  if (rows.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }
  autoColumnWidths(sheet);
}

function rolesLabel(user: UserProfile): string {
  if (user.isAdmin) return "Admin";
  if (user.roles.includes("quartermaster")) return "Quartermaster";
  if (user.roles.includes("archivist")) return "Archivist";
  if (user.roles.includes("admin")) return "Admin";
  return "Member";
}

function memberRoleStyle(user: UserProfile): (typeof LOAN_STATUS_EXCEL)[LoanStatus] | typeof EVENT_ROW_EXCEL.pending {
  if (user.isAdmin || user.roles.some((r) => r === "admin" || r === "quartermaster" || r === "archivist")) {
    return LOAN_STATUS_EXCEL.pending;
  }
  return EVENT_ROW_EXCEL.completed;
}

function equipmentNames(loan: Loan): string {
  return loan.equipment.map((e) => `${e.name} (${e.equipmentId})`).join("; ");
}

function eventRowStyle(event: ClubEvent): (typeof EVENT_ROW_EXCEL)[keyof typeof EVENT_ROW_EXCEL] {
  if (event.confirmed) return EVENT_ROW_EXCEL.completed;
  if (event.photosSubmitted) return EVENT_ROW_EXCEL.pending;
  return EVENT_ROW_EXCEL.incomplete;
}

function addLoansSheet(workbook: ExcelJS.Workbook, loans: Loan[], now: Date): void {
  const headers = [
    "Member",
    "Status",
    "Equipment",
    "Purpose",
    "External loan",
    "External details",
    "Pickup date",
    "Return date",
    "Approval note",
    "Extension note",
    "Requested",
    "Approved",
    "Activated",
    "Denied",
    "Returned",
    "User ID",
    "Loan ID",
  ];
  const sheet = workbook.addWorksheet("Loans", {
    properties: { defaultRowHeight: 18 },
  });
  sheet.addRow(headers);
  styleSheetHeaderRow(sheet, headers.length);

  const statusCol = 2;
  for (const loan of loans) {
    const status = effectiveLoanStatus(loan, now);
    const row = sheet.addRow([
      loan.userName,
      LOAN_STATUS_LABELS[status],
      equipmentNames(loan),
      loan.purpose,
      loan.isExternal ? "Yes" : "No",
      loan.externalDetails,
      loan.pickupDate ?? "",
      loan.returnDate ?? "",
      loan.approvalNote,
      loan.extensionNote,
      formatTimestamp(loan.createdAt),
      loan.approvedAt ? formatTimestamp(loan.approvedAt) : "",
      loan.activatedAt ? formatTimestamp(loan.activatedAt) : "",
      loan.deniedAt ? formatTimestamp(loan.deniedAt) : "",
      loan.returnedAt ? formatTimestamp(loan.returnedAt) : "",
      loan.userId,
      loan.id,
    ]);

    if (loan.isExternal) {
      for (let c = 1; c <= headers.length; c++) {
        applyCellStyle(row.getCell(c), LOAN_STATUS_EXCEL.approved);
      }
      row.getCell(1).font = { bold: true };
    } else {
      applyCellStyle(row.getCell(statusCol), LOAN_STATUS_EXCEL[status]);
    }
  }

  if (loans.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }
  autoColumnWidths(sheet);
}

function addEventsSheet(workbook: ExcelJS.Workbook, events: ClubEvent[]): void {
  const headers = [
    "Member",
    "Title",
    "Event date",
    "Event time",
    "Duration (hours)",
    "Photos submitted",
    "Photos submitted at",
    "Confirmed",
    "Confirmed at",
    "Formal event ID",
    "User ID",
    "Event ID",
    "Created",
  ];
  const sheet = workbook.addWorksheet("Events", {
    properties: { defaultRowHeight: 18 },
  });
  sheet.addRow(headers);
  styleSheetHeaderRow(sheet, headers.length);

  for (const event of events) {
    const rowStyle = eventRowStyle(event);
    const row = sheet.addRow([
      event.userName,
      event.title,
      event.eventDate,
      event.eventTime,
      event.durationHours,
      event.photosSubmitted ? "Yes" : "No",
      event.photosSubmittedAt ? formatTimestamp(event.photosSubmittedAt) : "",
      event.confirmed ? "Yes" : "No",
      event.confirmedAt ? formatTimestamp(event.confirmedAt) : "",
      event.formalEventId ?? "",
      event.userId,
      event.id,
      formatTimestamp(event.createdAt),
    ]);
    for (let c = 1; c <= headers.length; c++) {
      applyCellStyle(row.getCell(c), rowStyle);
    }
    if (event.formalEventId) {
      applyCellStyle(row.getCell(10), LOAN_STATUS_EXCEL.approved);
    }
  }

  if (events.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }
  autoColumnWidths(sheet);
}

function addMembersSheet(workbook: ExcelJS.Workbook, users: UserProfile[]): void {
  const headers = [
    "Display name",
    "Email",
    "Role",
    "Profile complete",
    "User ID",
    "Created",
    "Updated",
  ];
  const sheet = workbook.addWorksheet("Members", {
    properties: { defaultRowHeight: 18 },
  });
  sheet.addRow(headers);
  styleSheetHeaderRow(sheet, headers.length);

  const roleCol = 3;
  for (const user of users) {
    const row = sheet.addRow([
      user.displayName,
      user.email,
      rolesLabel(user),
      user.profileComplete ? "Yes" : "No",
      user.uid,
      formatTimestamp(user.createdAt),
      formatTimestamp(user.updatedAt),
    ]);
    applyCellStyle(row.getCell(roleCol), memberRoleStyle(user));
  }

  if (users.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }
  autoColumnWidths(sheet);
}

export interface ClubExportData {
  exportedAt: Date;
  users: UserProfile[];
  equipmentActive: Equipment[];
  equipmentArchived: Equipment[];
  categories: Category[];
  loans: Loan[];
  events: ClubEvent[];
  formalEvents: FormalEvent[];
}

export async function buildClubExportWorkbook(data: ClubExportData): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RAPS Photography Club";
  workbook.created = data.exportedAt;
  workbook.modified = data.exportedAt;

  const summary = workbook.addWorksheet("Summary", {
    properties: { defaultRowHeight: 20 },
  });
  summary.addRow(["RAPS Photography Club — data export"]);
  summary.getRow(1).font = { bold: true, size: 14 };
  summary.addRow(["Exported at", data.exportedAt.toLocaleString()]);
  summary.addRow([]);
  summary.addRow(["Sheet", "Records"]);
  styleSheetHeaderRow(summary, 2);
  const counts: [string, number | string][] = [
    ["Members", data.users.length],
    ["Equipment (active)", data.equipmentActive.length],
    ["Equipment (archived)", data.equipmentArchived.length],
    ["Categories", data.categories.length],
    ["Loans", data.loans.length],
    ["Events", data.events.length],
    ["Formal events", data.formalEvents.length],
  ];
  for (const [label, count] of counts) {
    summary.addRow([label, count]);
  }
  summary.addRow([]);
  summary.addRow(["Colour legend", ""]);
  summary.addRow(["Equipment Status column", "Working / Faulty / Broken / Missing colours"]);
  summary.addRow(["Loans Status column", "Matches loan badge colours in the app"]);
  summary.addRow(["Events rows", "Green = confirmed, Blue = photos submitted, White = incomplete"]);
  summary.getColumn(1).width = 32;
  summary.getColumn(2).width = 52;

  addMembersSheet(workbook, data.users);

  addEquipmentSheet(
    workbook,
    data.categories,
    data.equipmentActive,
    data.equipmentArchived
  );

  addSimpleDataSheet(
    workbook,
    "Categories",
    ["Category name", "Equipment count", "Equipment IDs", "Firestore ID", "Created"],
    data.categories.map((c) => [
      c.name,
      c.equipmentIds.length,
      c.equipmentIds.join("; "),
      c.id,
      formatTimestamp(c.createdAt),
    ])
  );

  addLoansSheet(workbook, data.loans, data.exportedAt);

  addEventsSheet(workbook, data.events);

  addSimpleDataSheet(
    workbook,
    "Formal events",
    [
      "Title",
      "Event date",
      "Event time",
      "Duration (hours)",
      "Description",
      "Max signups",
      "Signup count",
      "Created by",
      "Created",
      "Event ID",
    ],
    data.formalEvents.map((e) => [
      e.title,
      e.eventDate,
      e.eventTime,
      e.durationHours,
      e.description,
      e.maxSignups ?? "Unlimited",
      e.signupCount,
      e.createdBy,
      formatTimestamp(e.createdAt),
      e.id,
    ])
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export function downloadExcelBuffer(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportFilename(exportedAt: Date): string {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `raps-club-export-${stamp}.xlsx`;
}
