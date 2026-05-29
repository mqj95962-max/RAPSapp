import ExcelJS from "exceljs";
import {
  ADMIN_ROLE_EXCEL,
  applyCellStyle,
  CATEGORY_HEADER_EXCEL,
  EQUIPMENT_STATUS_EXCEL,
  EVENT_ROW_EXCEL,
  LOAN_STATUS_EXCEL,
  LOANING_MEMBER_EXCEL,
  MEMBER_ROLE_EXCEL,
  RESERVED_EXCEL,
  SECTION_HEADER_EXCEL,
  SHEET_HEADER_EXCEL,
} from "./exportColors";
import {
  EQUIPMENT_STATUS_LABELS,
  isMemberBorrowListEquipment,
  isReserved,
} from "./equipment";
import {
  effectiveLoanStatus,
  isMemberLoaningEquipment,
  LOAN_STATUS_LABELS,
} from "./loans";
import { isAdmin } from "./roles";
import { formatTimestamp } from "./time";
import type { LoanStatus } from "./types";
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
  "Reserve note",
  "Reserved at",
  "Archived at",
  "Created",
  "Updated",
  "Firestore ID",
] as const;

const STATUS_COLUMN = 3;

const ACTIVE_LOAN_GROUPS: { status: LoanStatus; label: string }[] = [
  { status: "pending", label: "Pending approval" },
  { status: "approved", label: "Waiting pickup" },
  { status: "active", label: "Active" },
  { status: "overdue", label: "Overdue" },
  { status: "denied", label: "Denied" },
];

const LOAN_HEADERS = [
  "Member",
  "Status",
  "Equipment",
  "Purpose",
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
] as const;

const EVENT_HEADERS = [
  "Member",
  "Title",
  "Event date",
  "Event time",
  "Duration (hours)",
  "Signup type",
  "Photos submitted",
  "Photos submitted at",
  "Confirmed",
  "Confirmed at",
  "User ID",
  "Event ID",
  "Created",
] as const;

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

function addSectionHeaderRow(
  sheet: ExcelJS.Worksheet,
  title: string,
  columnCount: number
): void {
  const row = sheet.addRow([title]);
  sheet.mergeCells(row.number, 1, row.number, columnCount);
  applyCellStyle(row.getCell(1), SECTION_HEADER_EXCEL);
  row.getCell(1).font = { bold: true, size: 13 };
  row.height = 26;
}

function addSubsectionHeaderRow(
  sheet: ExcelJS.Worksheet,
  title: string,
  columnCount: number
): void {
  const row = sheet.addRow([title]);
  sheet.mergeCells(row.number, 1, row.number, columnCount);
  applyCellStyle(row.getCell(1), CATEGORY_HEADER_EXCEL);
  row.getCell(1).font = { bold: true, size: 12 };
  row.height = 24;
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
  cell.font = { ...cell.font, bold: true, size: 11 };
  row.height = 22;
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

function addEquipmentDataRow(
  sheet: ExcelJS.Worksheet,
  item: Equipment,
  rowStyle?: (typeof EQUIPMENT_STATUS_EXCEL)[keyof typeof EQUIPMENT_STATUS_EXCEL]
): void {
  const row = sheet.addRow([
    item.name,
    item.equipmentId,
    EQUIPMENT_STATUS_LABELS[item.status],
    item.statusDetails,
    item.reservedNote,
    item.reservedAt ? formatTimestamp(item.reservedAt) : "",
    item.deletedAt ? formatTimestamp(item.deletedAt) : "",
    formatTimestamp(item.createdAt),
    formatTimestamp(item.updatedAt),
    item.id,
  ]);
  applyCellStyle(row.getCell(STATUS_COLUMN), EQUIPMENT_STATUS_EXCEL[item.status]);
  if (rowStyle) {
    for (let c = 1; c <= EQUIPMENT_HEADERS.length; c++) {
      if (c === STATUS_COLUMN) continue;
      applyCellStyle(row.getCell(c), rowStyle);
    }
  }
}

function addEquipmentByCategoryBlock(
  sheet: ExcelJS.Worksheet,
  categories: Category[],
  items: Equipment[],
  rowStyle?: (typeof EQUIPMENT_STATUS_EXCEL)[keyof typeof EQUIPMENT_STATUS_EXCEL]
): void {
  if (!items.length) return;

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
      addEquipmentDataRow(sheet, item, rowStyle);
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
      addEquipmentDataRow(sheet, item, rowStyle);
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

  const borrowList = equipmentActive.filter((e) => isMemberBorrowListEquipment(e));
  const reserved = equipmentActive.filter((e) => isReserved(e));
  const otherActive = equipmentActive.filter(
    (e) => !isMemberBorrowListEquipment(e) && !isReserved(e)
  );

  addSectionHeaderRow(
    sheet,
    "BORROW LIST — available to members (matches Borrow equipment page)",
    EQUIPMENT_HEADERS.length
  );
  addEquipmentByCategoryBlock(sheet, categories, borrowList);

  addSectionHeaderRow(
    sheet,
    "RESERVED — held for major events (matches Reserve equipment page)",
    EQUIPMENT_HEADERS.length
  );
  addEquipmentByCategoryBlock(sheet, categories, reserved, RESERVED_EXCEL);

  addSectionHeaderRow(
    sheet,
    "OTHER ACTIVE — not on borrow or reserve lists (Manage equipment)",
    EQUIPMENT_HEADERS.length
  );
  addEquipmentByCategoryBlock(sheet, categories, otherActive);

  addSectionHeaderRow(
    sheet,
    "ARCHIVED — past equipment (matches Past equipment page)",
    EQUIPMENT_HEADERS.length
  );
  addEquipmentByCategoryBlock(sheet, categories, equipmentArchived);

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EQUIPMENT_HEADERS.length },
  };
  autoColumnWidths(sheet);
}

function equipmentNames(loan: Loan): string {
  return loan.equipment.map((e) => `${e.name} (${e.equipmentId})`).join("; ");
}

function addLoanDataRow(
  sheet: ExcelJS.Worksheet,
  loan: Loan,
  status: LoanStatus,
  externalHighlight: boolean
): void {
  const statusCol = 2;
  const row = sheet.addRow([
    loan.userName,
    LOAN_STATUS_LABELS[status],
    equipmentNames(loan),
    loan.purpose,
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

  if (externalHighlight) {
    for (let c = 1; c <= LOAN_HEADERS.length; c++) {
      applyCellStyle(row.getCell(c), LOAN_STATUS_EXCEL.approved);
    }
    row.getCell(1).font = { bold: true };
  } else {
    applyCellStyle(row.getCell(statusCol), LOAN_STATUS_EXCEL[status]);
  }
}

function addLoansSheet(workbook: ExcelJS.Workbook, loans: Loan[], now: Date): void {
  const sheet = workbook.addWorksheet("Loans", {
    properties: { defaultRowHeight: 18 },
  });
  sheet.addRow([...LOAN_HEADERS]);
  styleSheetHeaderRow(sheet, LOAN_HEADERS.length);

  const withStatus = loans.map((loan) => ({
    loan,
    status: effectiveLoanStatus(loan, now),
  }));

  addSectionHeaderRow(
    sheet,
    "MEMBER LOANS — active queue (matches Member loans page)",
    LOAN_HEADERS.length
  );

  for (const group of ACTIVE_LOAN_GROUPS) {
    const groupLoans = withStatus.filter(
      ({ loan, status }) => !loan.isExternal && status === group.status
    );
    if (!groupLoans.length) continue;
    addSubsectionHeaderRow(
      sheet,
      `${group.label} (${groupLoans.length})`,
      LOAN_HEADERS.length
    );
    for (const { loan, status } of groupLoans) {
      addLoanDataRow(sheet, loan, status, false);
    }
  }

  const activeExternal = withStatus.filter(
    ({ loan, status }) => loan.isExternal && status !== "returned"
  );
  addSectionHeaderRow(
    sheet,
    "EXTERNAL LOANS — club equipment lent externally (matches External loans page)",
    LOAN_HEADERS.length
  );
  if (activeExternal.length) {
    for (const { loan, status } of activeExternal) {
      addLoanDataRow(sheet, loan, status, true);
    }
  } else {
    addSubsectionHeaderRow(sheet, "No active external loans", LOAN_HEADERS.length);
  }

  const history = withStatus
    .filter(({ status }) => status === "returned")
    .sort((a, b) => (b.loan.returnedAt ?? b.loan.createdAt) - (a.loan.returnedAt ?? a.loan.createdAt));

  addSectionHeaderRow(
    sheet,
    "LOAN HISTORY — returned loans (matches Admin loan history page)",
    LOAN_HEADERS.length
  );
  if (history.length) {
    for (const { loan, status } of history) {
      addLoanDataRow(sheet, loan, status, loan.isExternal);
    }
  } else {
    addSubsectionHeaderRow(sheet, "No returned loans", LOAN_HEADERS.length);
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: LOAN_HEADERS.length },
  };
  autoColumnWidths(sheet);
}

function eventRowStyle(event: ClubEvent): (typeof EVENT_ROW_EXCEL)[keyof typeof EVENT_ROW_EXCEL] {
  if (event.confirmed) return EVENT_ROW_EXCEL.completed;
  if (event.photosSubmitted) return EVENT_ROW_EXCEL.pending;
  return EVENT_ROW_EXCEL.incomplete;
}

function sortEventsByDate(events: ClubEvent[]): ClubEvent[] {
  return [...events].sort((a, b) => {
    const dateCmp = b.eventDate.localeCompare(a.eventDate);
    if (dateCmp !== 0) return dateCmp;
    return b.eventTime.localeCompare(a.eventTime);
  });
}

function addEventDataRow(sheet: ExcelJS.Worksheet, event: ClubEvent): void {
  const rowStyle = eventRowStyle(event);
  const row = sheet.addRow([
    event.userName,
    event.title,
    event.eventDate,
    event.eventTime,
    event.durationHours,
    event.formalEventId ? "Formal signup" : "Self-added",
    event.photosSubmitted ? "Yes" : "No",
    event.photosSubmittedAt ? formatTimestamp(event.photosSubmittedAt) : "",
    event.confirmed ? "Yes" : "No",
    event.confirmedAt ? formatTimestamp(event.confirmedAt) : "",
    event.userId,
    event.id,
    formatTimestamp(event.createdAt),
  ]);
  for (let c = 1; c <= EVENT_HEADERS.length; c++) {
    applyCellStyle(row.getCell(c), rowStyle);
  }
}

function addEventsSheet(workbook: ExcelJS.Workbook, events: ClubEvent[]): void {
  const sheet = workbook.addWorksheet("Events", {
    properties: { defaultRowHeight: 18 },
  });
  sheet.addRow([...EVENT_HEADERS]);
  styleSheetHeaderRow(sheet, EVENT_HEADERS.length);

  const openSignups = sortEventsByDate(events.filter((e) => !e.confirmed));
  const confirmed = sortEventsByDate(events.filter((e) => e.confirmed));

  addSectionHeaderRow(
    sheet,
    "OPEN SIGNUPS — awaiting photos or confirmation (Member events coverage → All member signups)",
    EVENT_HEADERS.length
  );
  if (openSignups.length) {
    for (const event of openSignups) {
      addEventDataRow(sheet, event);
    }
  } else {
    addSubsectionHeaderRow(sheet, "No open signups", EVENT_HEADERS.length);
  }

  addSectionHeaderRow(
    sheet,
    "CONFIRMED EVENTS — archived coverage counted toward hours (Confirmed events tab / My hours)",
    EVENT_HEADERS.length
  );
  if (confirmed.length) {
    for (const event of confirmed) {
      addEventDataRow(sheet, event);
    }
  } else {
    addSubsectionHeaderRow(sheet, "No confirmed events", EVENT_HEADERS.length);
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EVENT_HEADERS.length },
  };
  autoColumnWidths(sheet);
}

function memberEventStats(
  userId: string,
  events: ClubEvent[]
): { eventCount: number; confirmedHours: number } {
  let eventCount = 0;
  let confirmedHours = 0;
  for (const ev of events) {
    if (ev.userId !== userId) continue;
    eventCount++;
    if (ev.confirmed) confirmedHours += ev.durationHours ?? 0;
  }
  return { eventCount, confirmedHours };
}

function addMembersSheet(
  workbook: ExcelJS.Workbook,
  users: UserProfile[],
  loans: Loan[],
  events: ClubEvent[],
  now: Date
): void {
  const headers = [
    "Display name",
    "Email",
    "Role",
    "Loaning equipment",
    "Events",
    "Confirmed hours",
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

  const sorted = [...users].sort((a, b) =>
    (a.displayName || a.email).localeCompare(b.displayName || b.email)
  );

  const roleCol = 3;
  const loaningCol = 4;
  for (const user of sorted) {
    const loaning = isMemberLoaningEquipment(user.uid, loans, now);
    const { eventCount, confirmedHours } = memberEventStats(user.uid, events);
    const row = sheet.addRow([
      user.displayName,
      user.email,
      isAdmin(user) ? "Admin" : "Member",
      loaning ? "Yes" : "No",
      eventCount,
      confirmedHours,
      user.profileComplete ? "Yes" : "No",
      user.uid,
      formatTimestamp(user.createdAt),
      formatTimestamp(user.updatedAt),
    ]);
    applyCellStyle(row.getCell(roleCol), isAdmin(user) ? ADMIN_ROLE_EXCEL : MEMBER_ROLE_EXCEL);
    if (loaning) {
      applyCellStyle(row.getCell(loaningCol), LOANING_MEMBER_EXCEL);
    }
  }

  if (users.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }
  autoColumnWidths(sheet);
}

function formalSignupStats(
  formalEventId: string,
  events: ClubEvent[]
): { pending: number; confirmed: number; total: number } {
  const signups = events.filter((e) => e.formalEventId === formalEventId);
  return {
    pending: signups.filter((e) => !e.confirmed).length,
    confirmed: signups.filter((e) => e.confirmed).length,
    total: signups.length,
  };
}

function addFormalEventsSheet(
  workbook: ExcelJS.Workbook,
  formalEvents: FormalEvent[],
  events: ClubEvent[]
): void {
  const headers = [
    "Title",
    "Event date",
    "Event time",
    "Duration (hours)",
    "Description",
    "Max signups",
    "Total signups",
    "Open signups",
    "Confirmed signups",
    "Created by",
    "Created",
    "Event ID",
  ];
  const sheet = workbook.addWorksheet("Formal events", {
    properties: { defaultRowHeight: 18 },
  });
  sheet.addRow(headers);
  styleSheetHeaderRow(sheet, headers.length);

  const sorted = [...formalEvents].sort((a, b) => {
    const dateCmp = b.eventDate.localeCompare(a.eventDate);
    if (dateCmp !== 0) return dateCmp;
    return b.eventTime.localeCompare(a.eventTime);
  });

  for (const formal of sorted) {
    const stats = formalSignupStats(formal.id, events);
    sheet.addRow([
      formal.title,
      formal.eventDate,
      formal.eventTime,
      formal.durationHours,
      formal.description,
      formal.maxSignups ?? "Unlimited",
      stats.total,
      stats.pending,
      stats.confirmed,
      formal.createdBy,
      formatTimestamp(formal.createdAt),
      formal.id,
    ]);
  }

  if (formalEvents.length) {
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

function countEquipmentSections(
  equipmentActive: Equipment[],
  equipmentArchived: Equipment[]
) {
  const borrowList = equipmentActive.filter((e) => isMemberBorrowListEquipment(e));
  const reserved = equipmentActive.filter((e) => isReserved(e));
  const otherActive = equipmentActive.filter(
    (e) => !isMemberBorrowListEquipment(e) && !isReserved(e)
  );
  return {
    borrowList: borrowList.length,
    reserved: reserved.length,
    otherActive: otherActive.length,
    archived: equipmentArchived.length,
  };
}

function countLoanSections(loans: Loan[], now: Date) {
  let memberActive = 0;
  let externalActive = 0;
  let history = 0;
  for (const loan of loans) {
    const status = effectiveLoanStatus(loan, now);
    if (status === "returned") {
      history++;
    } else if (loan.isExternal) {
      externalActive++;
    } else {
      memberActive++;
    }
  }
  return { memberActive, externalActive, history };
}

function countEventSections(events: ClubEvent[]) {
  return {
    open: events.filter((e) => !e.confirmed).length,
    confirmed: events.filter((e) => e.confirmed).length,
  };
}

export async function buildClubExportWorkbook(data: ClubExportData): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RAPS Photography Club";
  workbook.created = data.exportedAt;
  workbook.modified = data.exportedAt;

  const equipmentCounts = countEquipmentSections(
    data.equipmentActive,
    data.equipmentArchived
  );
  const loanCounts = countLoanSections(data.loans, data.exportedAt);
  const eventCounts = countEventSections(data.events);

  const summary = workbook.addWorksheet("Summary", {
    properties: { defaultRowHeight: 20 },
  });
  summary.addRow(["RAPS Photography Club — data export"]);
  summary.getRow(1).font = { bold: true, size: 14 };
  summary.addRow(["Exported at", data.exportedAt.toLocaleString()]);
  summary.addRow([]);
  summary.addRow(["Section (matches app home page)", "Records"]);
  styleSheetHeaderRow(summary, 2);

  const summaryRows: ([string, number | string] | null)[] = [
    ["Club admin → View members", data.users.length],
    null,
    ["Equipment → Borrow list", equipmentCounts.borrowList],
    ["Equipment → Reserve equipment", equipmentCounts.reserved],
    ["Equipment → Manage equipment (other active)", equipmentCounts.otherActive],
    ["Equipment → Past equipment", equipmentCounts.archived],
    null,
    ["Equipment → Member loans (active queue)", loanCounts.memberActive],
    ["Equipment → External loans (active)", loanCounts.externalActive],
    ["Equipment → Admin loan history", loanCounts.history],
    null,
    ["Events → Open signups", eventCounts.open],
    ["Events → Confirmed events", eventCounts.confirmed],
    ["Events → Formal events", data.formalEvents.length],
  ];

  for (const row of summaryRows) {
    if (row === null) {
      summary.addRow([]);
      continue;
    }
    summary.addRow(row);
  }

  summary.addRow([]);
  summary.addRow(["Workbook sheets", ""]);
  summary.addRow(["Members", "View members stats and roles"]);
  summary.addRow(["Equipment", "Borrow list, reserved, other active, archived — by category"]);
  summary.addRow(["Loans", "Member loans, external loans, loan history"]);
  summary.addRow(["Events", "Open signups and confirmed events"]);
  summary.addRow(["Formal events", "Club formal events with signup breakdown"]);
  summary.addRow([]);
  summary.addRow(["Colour legend", ""]);
  summary.addRow(["Equipment Status", "Working / Faulty / Broken / Missing"]);
  summary.addRow(["Reserved equipment rows", "Blue highlight"]);
  summary.addRow(["Loan Status", "Matches loan badge colours in the app"]);
  summary.addRow(["External loan rows", "Blue highlight"]);
  summary.addRow(["Event rows", "Green = confirmed, Blue = photos submitted, White = open"]);
  summary.addRow(["Members — Loaning", "Amber = currently has equipment out"]);
  summary.getColumn(1).width = 44;
  summary.getColumn(2).width = 52;

  addMembersSheet(workbook, data.users, data.loans, data.events, data.exportedAt);
  addEquipmentSheet(
    workbook,
    data.categories,
    data.equipmentActive,
    data.equipmentArchived
  );
  addLoansSheet(workbook, data.loans, data.exportedAt);
  addEventsSheet(workbook, data.events);
  addFormalEventsSheet(workbook, data.formalEvents, data.events);

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
