export type ImportedField = "fullName" | "lastName" | "phone" | "email" | "website";

export interface ParsedImportData {
  headers?: string[];
  rows: string[][];
}

const fieldLabelTokens: Record<ImportedField, string[]> = {
  fullName: ["full name", "full_name", "name", "first name", "first_name"],
  lastName: ["last name", "last_name", "surname", "lastname"],
  phone: ["phone", "phone number", "phone_number", "mobile", "mobile number"],
  email: ["email", "email address", "email_address", "e-mail"],
  website: ["website", "site", "url", "web address", "website url"],
};

const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const websitePattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}([\/\w .-]*)*\/?$/i;
const phonePattern = /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{2,5}\)|\d{2,5})[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;

function trimCell(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      values.push(trimCell(current));
      current = "";
      continue;
    }

    current += char;
  }

  values.push(trimCell(current));
  return values;
}

export function parseTextToRows(text: string): ParsedImportData {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").map(line => line.trim()).filter(line => line !== "");

  const rows = lines.map(line => {
    if (line.includes(",")) {
      return parseCsvLine(line);
    }
    if (line.includes("\t")) {
      return line.split("\t").map(trimCell);
    }
    return line.split(/\s+/).map(trimCell);
  }).filter(row => row.length > 0 && row.some(cell => cell !== ""));

  if (rows.length === 0) {
    return { rows: [] };
  }

  const firstRow = rows[0].map(cell => cell.toLowerCase());
  const hasHeader = Object.values(fieldLabelTokens).some(tokens =>
    tokens.some(token => firstRow.some(cell => cell.includes(token)))
  );

  if (hasHeader) {
    return {
      headers: rows[0],
      rows: rows.slice(1),
    };
  }

  return { rows };
}

function matchHeader(cell: string, field: ImportedField): boolean {
  const normalized = cell.toLowerCase();
  return fieldLabelTokens[field].some(token => normalized.includes(token));
}

export function mapHeaderIndexes(headers: string[]): Partial<Record<ImportedField, number>> {
  const mapping: Partial<Record<ImportedField, number>> = {};
  headers.forEach((cell, index) => {
    (Object.keys(fieldLabelTokens) as ImportedField[]).forEach((field) => {
      if (!mapping[field] && matchHeader(cell, field)) {
        mapping[field] = index;
      }
    });
  });
  return mapping;
}

export function extractRowValues(
  row: string[],
  selectedFields: ImportedField[],
  headerMap?: Partial<Record<ImportedField, number>>
): Record<ImportedField, string | undefined> {
  const values: Record<ImportedField, string | undefined> = {
    fullName: undefined,
    lastName: undefined,
    phone: undefined,
    email: undefined,
    website: undefined,
  };

  const remainingCells = [...row];

  const assignFromHeader = (field: ImportedField) => {
    const index = headerMap?.[field];
    if (index !== undefined && row[index] !== undefined) {
      values[field] = row[index].trim();
      remainingCells[index] = "";
      return true;
    }
    return false;
  };

  selectedFields.forEach(field => {
    assignFromHeader(field);
  });

  if (selectedFields.includes("email") && !values.email) {
    const match = row.find(cell => emailPattern.test(cell));
    if (match) {
      values.email = match.trim();
      const idx = row.indexOf(match);
      if (idx !== -1) remainingCells[idx] = "";
    }
  }

  if (selectedFields.includes("website") && !values.website) {
    const match = row.find(cell => websitePattern.test(cell));
    if (match) {
      values.website = match.trim();
      const idx = row.indexOf(match);
      if (idx !== -1) remainingCells[idx] = "";
    }
  }

  if (selectedFields.includes("phone") && !values.phone) {
    const match = row.find(cell => phonePattern.test(cell));
    if (match) {
      values.phone = match.trim();
      const idx = row.indexOf(match);
      if (idx !== -1) remainingCells[idx] = "";
    }
  }

  const leftover = remainingCells.filter(cell => cell && !emailPattern.test(cell) && !websitePattern.test(cell)).map(cell => cell.trim()).filter(Boolean);

  if (selectedFields.includes("fullName") && !values.fullName) {
    if (leftover.length > 0) {
      values.fullName = leftover.join(" ");
    }
  }

  if (selectedFields.includes("lastName") && !values.lastName) {
    const possible = leftover.find(cell => cell.split(" ").length <= 2);
    if (possible) {
      const parts = possible.split(" ").filter(Boolean);
      values.lastName = parts[parts.length - 1];
    }
  }

  if (selectedFields.includes("fullName") && values.fullName && selectedFields.includes("lastName") && !values.lastName) {
    const parts = values.fullName.split(" ").filter(Boolean);
    if (parts.length > 1) {
      values.lastName = parts[parts.length - 1];
    }
  }

  return values;
}

export function buildClientPayloads(
  rows: string[][],
  selectedFields: ImportedField[],
  headers?: string[]
) {
  const headerMap = headers ? mapHeaderIndexes(headers) : undefined;

  return rows.map(row => {
    const extracted = extractRowValues(row, selectedFields, headerMap);
    const businessName = extracted.fullName
      || extracted.lastName
      || extracted.email?.split("@")[0]
      || row.find(cell => cell.trim().length > 0)
      || "Imported Contact";

    const payload: Record<string, string> = {
      business_name: businessName,
    };

    if (extracted.email) payload.email = extracted.email;
    if (extracted.phone) payload.phone = extracted.phone;
    if (extracted.website) payload.website = extracted.website;

    return payload;
  });
}
