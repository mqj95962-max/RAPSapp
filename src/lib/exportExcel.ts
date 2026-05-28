import ExcelJS from "exceljs";
import { EQUIPMENT_STATUS_LABELS } from "./equipment";
import { effectiveLoanStatus, LOAN_STATUS_LABELS } from "./loans";
import { formatTimestamp } from "./time";
import type {
  Category,
  ClubEvent,
  Equipment,
  FormalEvent,
  Loan,
  UserProfile,
} from "./types";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF18181B" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
};

function styleHeaderRow(sheet: ExcelJS.Worksheet, columnCount: number): void {
  const row = sheet.getRow(1);
  row.font = HEADER_FONT;
  row.alignment = { vertical: "middle", horizontal: "left" };
  for (let c = 1; c <= columnCount; c++) {
    row.getCell(c).fill = HEADER_FILL;
  }
  row.height = 22;
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

function addDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const sheet = workbook.addWorksheet(name, {
    properties: { defaultRowHeight: 18 },
  });
  sheet.addRow(headers);
  styleHeaderRow(sheet, headers.length);
  for (const row of rows) {
    sheet.addRow(row);
  }
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  autoColumnWidths(sheet);
}

function rolesLabel(user: UserProfile): string {
  if (user.isAdmin) return "Admin (isAdmin)";
  return user.roles.join(", ");
}

function equipmentNames(loan: Loan): string {
  return loan.equipment.map((e) => `${e.name} (${e.equipmentId})`).join("; ");
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
  styleHeaderRow(summary, 2);
  const counts: [string, number][] = [
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
  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 14;

  addDataSheet(
    workbook,
    "Members",
    [
      "Display name",
      "Email",
      "Roles",
      "Profile complete",
      "User ID",
      "Created",
      "Updated",
    ],
    data.users.map((u) => [
      u.displayName,
      u.email,
      rolesLabel(u),
      u.profileComplete ? "Yes" : "No",
      u.uid,
      formatTimestamp(u.createdAt),
      formatTimestamp(u.updatedAt),
    ])
  );

  addDataSheet(
    workbook,
    "Equipment",
    [
      "Name",
      "Equipment ID",
      "Status",
      "Status details",
      "Archived",
      "Archived at",
      "Firestore ID",
      "Created",
      "Updated",
    ],
    [...data.equipmentActive, ...data.equipmentArchived].map((e) => [
      e.name,
      e.equipmentId,
      EQUIPMENT_STATUS_LABELS[e.status],
      e.statusDetails,
      e.deletedAt ? "Yes" : "No",
      e.deletedAt ? formatTimestamp(e.deletedAt) : "",
      e.id,
      formatTimestamp(e.createdAt),
      formatTimestamp(e.updatedAt),
    ])
  );

  addDataSheet(
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

  const now = data.exportedAt;
  addDataSheet(
    workbook,
    "Loans",
    [
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
    ],
    data.loans.map((l) => [
      l.userName,
      LOAN_STATUS_LABELS[effectiveLoanStatus(l, now)],
      equipmentNames(l),
      l.purpose,
      l.isExternal ? "Yes" : "No",
      l.externalDetails,
      l.pickupDate ?? "",
      l.returnDate ?? "",
      l.approvalNote,
      l.extensionNote,
      formatTimestamp(l.createdAt),
      l.approvedAt ? formatTimestamp(l.approvedAt) : "",
      l.activatedAt ? formatTimestamp(l.activatedAt) : "",
      l.deniedAt ? formatTimestamp(l.deniedAt) : "",
      l.returnedAt ? formatTimestamp(l.returnedAt) : "",
      l.userId,
      l.id,
    ])
  );

  addDataSheet(
    workbook,
    "Events",
    [
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
    ],
    data.events.map((e) => [
      e.userName,
      e.title,
      e.eventDate,
      e.eventTime,
      e.durationHours,
      e.photosSubmitted ? "Yes" : "No",
      e.photosSubmittedAt ? formatTimestamp(e.photosSubmittedAt) : "",
      e.confirmed ? "Yes" : "No",
      e.confirmedAt ? formatTimestamp(e.confirmedAt) : "",
      e.formalEventId ?? "",
      e.userId,
      e.id,
      formatTimestamp(e.createdAt),
    ])
  );

  addDataSheet(
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
