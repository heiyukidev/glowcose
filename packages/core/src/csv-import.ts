import {
  compact,
  deburr,
  filter,
  findIndex,
  fromPairs,
  get,
  includes,
  map,
  max,
  reduce,
  size,
  some,
  sortBy,
  toLower,
  toPairs,
  trim,
} from "lodash";

import {
  defaultContextForTime,
  effectiveOffset,
  parseGlucoseInput,
  type GlucoseUnit,
  type NewReading,
  type PostMealOffset,
  type ReadingContext,
} from "./glucose";

export const MAX_CSV_IMPORT_ROWS = 5000;

export type CsvImportError =
  | "empty"
  | "not_glucose"
  | "cgm"
  | "no_rows"
  | "too_large";

export type CsvImportParse =
  | { ok: false; error: CsvImportError }
  | { ok: true; readings: NewReading[]; rejected: number };

export const CORRESPONDENCE_FIELDS = [
  { key: "date", required: true },
  { key: "time", required: true },
  { key: "value", required: true },
  { key: "unit", required: false },
  { key: "context", required: false },
  { key: "mealType", required: false },
  { key: "postPrandial", required: false },
  { key: "note", required: false },
] as const;

export type CorrespondenceField = (typeof CORRESPONDENCE_FIELDS)[number]["key"];
export type Correspondence = Partial<Record<CorrespondenceField, number>>;

export type CsvInspection =
  | { ok: false; error: CsvImportError }
  | {
      ok: true;
      headers: string[];
      rows: string[][];
      guessed: Correspondence;
    };

const CGM_HEADER_MARKERS = [
  "historic glucose",
  "historique glycemie",
  "historique de la glycemie",
  "glukosewert",
  "scan glucose",
  "glucose scan",
  "record type",
  "type d enregistrement",
  "aufzeichnungstyp",
];

const NON_GLUCOSE_MARKERS = [
  "insuline",
  "insulin",
  "glucide",
  "carbohydrate",
  "poids",
  "weight",
  "cetone",
  "ketone",
  "hba1c",
];

const DATE_MARKERS = ["date", "jour", "timestamp", "horodatage"];
const TIME_MARKERS = ["heure", "time", "hour", "horaire"];
const VALUE_MARKERS = ["glycemie", "glycemia", "glucose", "valeur"];
const UNIT_MARKERS = ["unite", "unit"];
const CONTEXT_MARKERS = ["moment", "periode", "contexte", "repas"];
const NOTE_MARKERS = ["comment", "note", "remarque"];

export function readingIdentity(takenAt: number, valueMgDl: number): string {
  return `${takenAt}:${Math.round(valueMgDl)}`;
}

export function planImport(
  existing: Array<{ takenAt: number; valueMgDl: number; archivedAt?: number }>,
  incoming: NewReading[],
): { toAdd: NewReading[]; skippedDuplicate: number } {
  const seen = new Set(
    map(
      filter(existing, (row) => !row.archivedAt),
      (row) => readingIdentity(row.takenAt, row.valueMgDl),
    ),
  );

  const planned = reduce(
    incoming,
    (acc, reading) => {
      const key = readingIdentity(reading.takenAt, reading.valueMgDl);
      if (acc.seen.has(key)) {
        return {
          ...acc,
          skippedDuplicate: acc.skippedDuplicate + 1,
        };
      }
      acc.seen.add(key);
      return {
        ...acc,
        toAdd: [...acc.toAdd, reading],
      };
    },
    {
      toAdd: [] as NewReading[],
      skippedDuplicate: 0,
      seen,
    },
  );
  return {
    toAdd: planned.toAdd,
    skippedDuplicate: planned.skippedDuplicate,
  };
}

export function assignCorrespondence(
  current: Correspondence,
  field: CorrespondenceField,
  columnIndex: number | null,
): Correspondence {
  const cleared = fromPairs(
    filter(toPairs(current), ([, index]) => index !== columnIndex),
  ) as Correspondence;
  if (columnIndex === null) {
    const next = { ...cleared };
    delete next[field];
    return next;
  }
  return { ...cleared, [field]: columnIndex };
}

export function missingCorrespondenceFields(
  correspondence: Correspondence,
): CorrespondenceField[] {
  return compact(
    map(CORRESPONDENCE_FIELDS, (field) => {
      if (!field.required) {
        return null;
      }
      return get(correspondence, field.key) === undefined ? field.key : null;
    }),
  );
}

export function inspectGlucoseCsv(text: string): CsvInspection {
  const workbook = readWorkbook(text);
  if (!workbook.ok) {
    return workbook;
  }
  return {
    ok: true,
    headers: workbook.headers,
    rows: workbook.rows,
    guessed: guessedCorrespondence(workbook.columns),
  };
}

export function parseGlucoseCsv(
  text: string,
  correspondence?: Correspondence,
): CsvImportParse {
  const workbook = readWorkbook(text);
  if (!workbook.ok) {
    return workbook;
  }

  const columns = correspondence
    ? columnMapFromCorrespondence(correspondence)
    : workbook.columns;
  if (columns.value < 0 || (columns.date < 0 && columns.dateTime < 0)) {
    return { ok: false, error: "not_glucose" };
  }

  const headerUnit = unitFromHeader(
    get(workbook.normalizedHeaders, columns.value) ?? "",
  );
  const inferredUnit = inferUnit(workbook.rows, columns, headerUnit);
  const parsed = compact(
    map(workbook.rows, (row) => parseDataRow(row, columns, inferredUnit)),
  );
  const rejected = size(workbook.rows) - size(parsed);
  if (size(parsed) === 0) {
    return { ok: false, error: "no_rows" };
  }
  if (looksLikeCgmSeries(parsed)) {
    return { ok: false, error: "cgm" };
  }

  return { ok: true, readings: parsed, rejected };
}

type ColumnMap = {
  date: number;
  time: number;
  dateTime: number;
  value: number;
  unit: number;
  context: number;
  mealType: number;
  postPrandial: number;
  note: number;
};

type Workbook =
  | { ok: false; error: CsvImportError }
  | {
      ok: true;
      headers: string[];
      normalizedHeaders: string[];
      rows: string[][];
      columns: ColumnMap;
    };

function readWorkbook(text: string): Workbook {
  const trimmed = trim(text);
  if (trimmed === "") {
    return { ok: false, error: "empty" };
  }

  const table = parseCsvTable(trimmed);
  if (size(table) === 0) {
    return { ok: false, error: "empty" };
  }

  const headerIndex = findHeaderRow(table);
  if (headerIndex === -1) {
    return { ok: false, error: "not_glucose" };
  }

  const headers = get(table, headerIndex) ?? [];
  const normalizedHeaders = map(headers, normalizeHeader);
  if (looksLikeCgmHeaders(normalizedHeaders)) {
    return { ok: false, error: "cgm" };
  }

  const columns = locateColumns(normalizedHeaders);
  if (columns.value === -1 || (columns.date === -1 && columns.dateTime === -1)) {
    return { ok: false, error: "not_glucose" };
  }

  const rows = filter(table.slice(headerIndex + 1), (row) => !isEmptyRow(row));
  if (size(rows) === 0) {
    return { ok: false, error: "no_rows" };
  }
  if (size(rows) > MAX_CSV_IMPORT_ROWS) {
    return { ok: false, error: "too_large" };
  }

  return {
    ok: true,
    headers,
    normalizedHeaders,
    rows,
    columns,
  };
}

function guessedCorrespondence(columns: ColumnMap): Correspondence {
  const guessed: Correspondence = {};
  if (columns.date >= 0) {
    guessed.date = columns.date;
  } else if (columns.dateTime >= 0) {
    guessed.date = columns.dateTime;
  }
  if (columns.time >= 0) {
    guessed.time = columns.time;
  }
  if (columns.value >= 0) {
    guessed.value = columns.value;
  }
  if (columns.unit >= 0) {
    guessed.unit = columns.unit;
  }
  if (columns.context >= 0) {
    guessed.context = columns.context;
  }
  if (columns.mealType >= 0) {
    guessed.mealType = columns.mealType;
  }
  if (columns.postPrandial >= 0) {
    guessed.postPrandial = columns.postPrandial;
  }
  if (columns.note >= 0) {
    guessed.note = columns.note;
  }
  return guessed;
}

function columnMapFromCorrespondence(correspondence: Correspondence): ColumnMap {
  return {
    dateTime: -1,
    date: get(correspondence, "date") ?? -1,
    time: get(correspondence, "time") ?? -1,
    value: get(correspondence, "value") ?? -1,
    unit: get(correspondence, "unit") ?? -1,
    context: get(correspondence, "context") ?? -1,
    mealType: get(correspondence, "mealType") ?? -1,
    postPrandial: get(correspondence, "postPrandial") ?? -1,
    note: get(correspondence, "note") ?? -1,
  };
}

function parseCsvTable(text: string): string[][] {
  const withoutBom = text.replace(/^\uFEFF/, "");
  const source = withoutBom.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      row.push(trim(current));
      current = "";
      continue;
    }
    if (char === "\n" && !inQuotes) {
      row.push(trim(current));
      current = "";
      pushRow(rows, row);
      row = [];
      continue;
    }
    current += char;
  }
  row.push(trim(current));
  pushRow(rows, row);
  return rows;
}

function pushRow(rows: string[][], row: string[]): void {
  if (isEmptyRow(row)) {
    return;
  }
  if (startsWithIgnoreCase(get(row, 0) ?? "", "sep=")) {
    return;
  }
  rows.push(row);
}

function detectDelimiter(source: string): "," | ";" {
  let semi = 0;
  let comma = 0;
  let inQuotes = false;
  const sample = source.slice(0, 2000);
  for (let index = 0; index < sample.length; index += 1) {
    const char = sample[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) {
      continue;
    }
    if (char === ";") {
      semi += 1;
    }
    if (char === ",") {
      comma += 1;
    }
  }
  return semi >= comma && semi > 0 ? ";" : ",";
}

function findHeaderRow(table: string[][]): number {
  return findIndex(table, (row) => {
    const cells = map(row, normalizeHeader);
    const hasValue = some(cells, isValueHeader);
    const hasDate = some(
      cells,
      (cell) => isDateHeader(cell) || isDateTimeHeader(cell),
    );
    return hasValue && hasDate;
  });
}

function locateColumns(headers: string[]): ColumnMap {
  return {
    dateTime: findIndex(headers, isDateTimeHeader),
    date: findIndex(
      headers,
      (cell) => isDateHeader(cell) && !isDateTimeHeader(cell),
    ),
    time: findIndex(
      headers,
      (cell) => isTimeHeader(cell) && !isDateTimeHeader(cell),
    ),
    value: findIndex(headers, isValueHeader),
    unit: findIndex(headers, isUnitHeader),
    context: findIndex(headers, isContextHeader),
    mealType: findIndex(headers, isMealTypeHeader),
    postPrandial: findIndex(headers, isPostPrandialHeader),
    note: findIndex(headers, isNoteHeader),
  };
}

function parseDataRow(
  row: string[],
  columns: ColumnMap,
  unit: GlucoseUnit,
): NewReading | null {
  const dateTimeRaw =
    columns.dateTime >= 0 ? cellAt(row, columns.dateTime) : "";
  const dateRaw = columns.date >= 0 ? cellAt(row, columns.date) : dateTimeRaw;
  const timeRaw = columns.time >= 0 ? cellAt(row, columns.time) : "";
  const takenAt = parseFrenchDateTime(dateRaw, timeRaw);
  if (takenAt === null) {
    return null;
  }

  const unitRaw = columns.unit >= 0 ? cellAt(row, columns.unit) : "";
  const rowUnit = unitFromText(unitRaw) ?? unit;
  const valueMgDl = parseValueCell(cellAt(row, columns.value), rowUnit);
  if (valueMgDl === null) {
    return null;
  }

  const mapped = resolveContext(row, columns, takenAt);
  const noteRaw = columns.note >= 0 ? cellAt(row, columns.note) : "";
  const note = trim(noteRaw);

  return {
    valueMgDl,
    context: mapped.context,
    postMealOffset: effectiveOffset(mapped.context, mapped.postMealOffset),
    takenAt,
    ...(note !== "" ? { note } : {}),
  };
}

function resolveContext(
  row: string[],
  columns: ColumnMap,
  takenAt: number,
): { context: ReadingContext; postMealOffset?: PostMealOffset } {
  const coded = contextFromMealType(
    columns.mealType >= 0 ? cellAt(row, columns.mealType) : "",
    columns.postPrandial >= 0 ? cellAt(row, columns.postPrandial) : "",
  );
  if (coded) {
    return coded;
  }
  const contextRaw = columns.context >= 0 ? cellAt(row, columns.context) : "";
  return mapContext(contextRaw, takenAt);
}

function contextFromMealType(
  mealType: string,
  postPrandial: string,
): { context: ReadingContext; postMealOffset?: PostMealOffset } | null {
  const meal = trim(mealType);
  const after = trim(postPrandial) === "1";
  if (meal === "0") {
    return after
      ? { context: "after_breakfast", postMealOffset: 2 }
      : { context: "before_breakfast" };
  }
  if (meal === "1") {
    return after
      ? { context: "after_lunch", postMealOffset: 2 }
      : { context: "before_lunch" };
  }
  if (meal === "2") {
    return after
      ? { context: "after_dinner", postMealOffset: 2 }
      : { context: "before_dinner" };
  }
  return null;
}

function parseValueCell(raw: string, unit: GlucoseUnit): number | null {
  const cleaned = trim(raw).replace(/\s*(g\/l|mg\/dl|mmol\/l|mmol)\s*$/i, "");
  return parseGlucoseInput(cleaned, unit);
}

function inferUnit(
  rows: string[][],
  columns: ColumnMap,
  headerUnit: GlucoseUnit | null,
): GlucoseUnit {
  if (headerUnit) {
    return headerUnit;
  }
  const values = compact(
    map(rows, (row) => parseNumericCell(cellAt(row, columns.value))),
  );
  const highest = max(values) ?? 0;
  if (highest > 33) return "mgdl";
  if (highest > 6) return "mmol";
  return "gL";
}

function parseNumericCell(raw: string): number | null {
  const cleaned = trim(raw)
    .replace(/\s*(g\/l|mg\/dl|mmol\/l|mmol)\s*$/i, "")
    .replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseFrenchDateTime(datePart: string, timePart: string): number | null {
  const combined = trim(`${trim(datePart)} ${trim(timePart)}`);
  if (combined === "") {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(combined)) {
    const ms = Date.parse(combined);
    return Number.isFinite(ms) ? ms : null;
  }
  const match = combined.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:[ T](\d{1,2})[:hH](\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const ms = new Date(year, month - 1, day, hour, minute, second).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function mapContext(
  raw: string,
  takenAt: number,
): { context: ReadingContext; postMealOffset?: PostMealOffset } {
  const normalized = normalizeHeader(raw);
  if (normalized === "") {
    return withDefaultOffset(defaultContextForTime(new Date(takenAt)));
  }

  const offset = offsetFromText(normalized);
  if (
    some(
      ["gout", "collation", "coucher", "nuit", "night", "bedtime", "snack"],
      (marker) => includes(normalized, marker),
    )
  ) {
    return { context: "other" };
  }

  const after = some(
    ["apres", "after", "postprand"],
    (marker) => includes(normalized, marker),
  );
  const before = some(
    ["avant", "before", "preprand", "a jeun", "jeun", "fasting"],
    (marker) => includes(normalized, marker),
  );

  if (some(["petit", "breakfast"], (marker) => includes(normalized, marker))) {
    return after
      ? { context: "after_breakfast", postMealOffset: offset ?? 2 }
      : { context: "before_breakfast" };
  }
  if (some(["dejeuner", "lunch", "midi"], (marker) => includes(normalized, marker))) {
    return after
      ? { context: "after_lunch", postMealOffset: offset ?? 2 }
      : { context: "before_lunch" };
  }
  if (some(["diner", "dinner", "soir"], (marker) => includes(normalized, marker))) {
    return after
      ? { context: "after_dinner", postMealOffset: offset ?? 2 }
      : { context: "before_dinner" };
  }

  if (after) {
    return withDefaultOffset(afterContextForTime(new Date(takenAt)), offset ?? 2);
  }
  if (before) {
    return { context: beforeContextForTime(new Date(takenAt)) };
  }
  return { context: "other" };
}

function withDefaultOffset(
  context: ReadingContext,
  offset?: PostMealOffset,
): { context: ReadingContext; postMealOffset?: PostMealOffset } {
  return {
    context,
    postMealOffset: effectiveOffset(context, offset),
  };
}

function afterContextForTime(date: Date): ReadingContext {
  const hour = date.getHours();
  if (hour < 11) return "after_breakfast";
  if (hour < 16) return "after_lunch";
  return "after_dinner";
}

function beforeContextForTime(date: Date): ReadingContext {
  const hour = date.getHours();
  if (hour < 11) return "before_breakfast";
  if (hour < 16) return "before_lunch";
  return "before_dinner";
}

function offsetFromText(normalized: string): PostMealOffset | undefined {
  if (includes(normalized, "1h") || includes(normalized, "1 h")) return 1;
  if (includes(normalized, "2h") || includes(normalized, "2 h")) return 2;
  return undefined;
}

function looksLikeCgmHeaders(headers: string[]): boolean {
  return some(headers, isCgmHeader);
}

function isCgmHeader(header: string): boolean {
  if (includes(header, "historique") && includes(header, "glycemie")) {
    return true;
  }
  if (includes(header, "historic") && includes(header, "glucose")) {
    return true;
  }
  if (includes(header, "continu") && includes(header, "glucose")) {
    return true;
  }
  return some(CGM_HEADER_MARKERS, (marker) => includes(header, marker));
}

function looksLikeCgmSeries(readings: NewReading[]): boolean {
  if (size(readings) < 36) {
    return false;
  }
  const times = sortBy(map(readings, (reading) => reading.takenAt));
  const gaps = compact(
    map(times, (takenAt, index) => {
      if (index === 0) return null;
      const previous = times[index - 1];
      if (previous === undefined) return null;
      return takenAt - previous;
    }),
  );
  if (size(gaps) === 0) {
    return false;
  }
  const medianGap = get(sortBy(gaps), Math.floor(size(gaps) / 2)) ?? 0;
  return medianGap > 0 && medianGap < 12 * 60 * 1000;
}

function isValueHeader(header: string): boolean {
  if (isCgmHeader(header)) return false;
  if (includes(header, "glucide")) return false;
  return some(VALUE_MARKERS, (marker) => includes(header, marker));
}

function isDateTimeHeader(header: string): boolean {
  return (
    (includes(header, "date") && includes(header, "heure")) ||
    includes(header, "timestamp") ||
    includes(header, "horodatage")
  );
}

function isDateHeader(header: string): boolean {
  return some(DATE_MARKERS, (marker) => includes(header, marker));
}

function isTimeHeader(header: string): boolean {
  return some(TIME_MARKERS, (marker) => includes(header, marker));
}

function isUnitHeader(header: string): boolean {
  if (isValueHeader(header)) return false;
  return some(UNIT_MARKERS, (marker) => includes(header, marker));
}

function isMealTypeHeader(header: string): boolean {
  return (
    (includes(header, "type") && includes(header, "meal")) ||
    (includes(header, "type") && includes(header, "repas"))
  );
}

function isPostPrandialHeader(header: string): boolean {
  return includes(header, "post prandial") || includes(header, "postprand");
}

function isContextHeader(header: string): boolean {
  if (isMealTypeHeader(header) || isPostPrandialHeader(header)) {
    return false;
  }
  return some(CONTEXT_MARKERS, (marker) => includes(header, marker));
}

function isNoteHeader(header: string): boolean {
  if (some(NOTE_MARKERS, (marker) => includes(header, marker))) {
    return true;
  }
  return includes(header, "meal") && includes(header, "description");
}

function unitFromHeader(header: string): GlucoseUnit | null {
  return unitFromText(header);
}

function unitFromText(raw: string): GlucoseUnit | null {
  const normalized = normalizeHeader(raw);
  if (includes(normalized, "mmol")) return "mmol";
  if (includes(normalized, "mg") && includes(normalized, "dl")) return "mgdl";
  if (includes(normalized, "g") && includes(normalized, "l")) return "gL";
  return null;
}

function normalizeHeader(raw: string): string {
  return trim(toLower(deburr(raw)).replace(/[^a-z0-9]+/g, " "));
}

function cellAt(row: string[], index: number): string {
  if (index < 0) return "";
  return trim(get(row, index) ?? "");
}

function isEmptyRow(row: string[]): boolean {
  return !some(row, (cell) => trim(cell) !== "");
}

function startsWithIgnoreCase(value: string, prefix: string): boolean {
  return toLower(trim(value)).startsWith(toLower(prefix));
}
