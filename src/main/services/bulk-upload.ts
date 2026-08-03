export type SupportRequest = {
  hearingId: string;
  caseRef: string;
  action: string;
  notes: string;
  state: string;
};

export type BulkUploadPayload = {
  supportRequests: SupportRequest[];
};

export type BulkUploadValidationError = {
  row?: number;
  message: string;
};

export type BulkUploadParseResult =
  | {
      isValid: true;
      payload: BulkUploadPayload;
      responseCsv: string;
    }
  | {
      isValid: false;
      errors: BulkUploadValidationError[];
    };

type CsvRow = Record<string, string>;

const expectedHeaders = ['hearingId', 'caseRef', 'action', 'notes', 'state'];
const validStates = ['final_state_transition', 'rollback'];
const validActions = ['CANCELLED', 'COMPLETED', 'ADJOURNED'];

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

// Transforms a single CSV line into an array of cell values
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentCell += '"';
      index++;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === ',' && !insideQuotes) {
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += character;
    }
  }

  cells.push(currentCell.trim());
  return cells;
}

function parseCsv(csvContent: string, headerStartLine = 0): { headers: string[]; rows: CsvRow[] } {
  const lines = csvContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length <= headerStartLine) {
    // If there are not enough lines, return empty headers and rows
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[headerStartLine]).filter(header => header.trim() !== '');
  const rows = lines.slice(headerStartLine + 1).map(line => {
    const values = parseCsvLine(line);

    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });

  return { headers, rows };
}

function validateHeaders(headers: string[]): BulkUploadValidationError[] {
  console.log('Validating headers:', headers);
  const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
  const unexpectedHeaders = headers.filter(header => !expectedHeaders.includes(header));

  if (missingHeaders.length === 0 && unexpectedHeaders.length === 0) {
    return [];
  }

  return [
    {
      message: 'The file contains unexpected or invalid headers.',
    },
  ];
}

function validateRow(row: CsvRow, rowNumber: number): BulkUploadValidationError[] {
  console.log(`Validating row ${rowNumber}:`, row)
  const errors: BulkUploadValidationError[] = [];
  const hearingId = row.hearingId || '';
  const caseRef = row.caseRef || '';
  const action = row.action || '';
  const notes = row.notes || '';
  const state = row.state || '';

  if (hearingId.length > 30) {
    errors.push({ row: rowNumber, message: 'hearingId exceeds 30 character limit.' });
  }

  if (notes.length > 5000) {
    errors.push({ row: rowNumber, message: 'Notes/Incident Number exceeds 5000 character limit.' });
  }

  if (!/^\d{16}$/.test(caseRef)) {
    errors.push({ row: rowNumber, message: 'Case Reference Number must be a 16-digit numeric value.' });
  }

  if (!validStates.includes(state)) {
    console.log(validStates, state)
    errors.push({ row: rowNumber, message: "State must be either 'final_state_transition' or 'rollback'." });
  }

  if (state === 'final_state_transition' && !action) {
    errors.push({ row: rowNumber, message: 'Status is mandatory for final_state_transition requests.' });
  } else if (action && !validActions.includes(action)) {
    errors.push({ row: rowNumber, message: 'Action must be one of CANCELLED, COMPLETED, or ADJOURNED.' });
  }

  return errors;
}

export function parseBulkUploadCsv(csvContent: string): BulkUploadParseResult {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim());
  const headerRowIndex = findHeaderRowIndex(lines);
  const { headers, rows } = parseCsv(csvContent, headerRowIndex);
  const headerErrors = validateHeaders(headers);

  if (headerErrors.length > 0) {
    return { isValid: false, errors: headerErrors };
  }

  const rowErrors = rows.flatMap((row, index) => validateRow(row, index + 2));

  if (rowErrors.length > 0) {
    return { isValid: false, errors: rowErrors };
  }

  const supportRequests = rows.map(row => ({
    hearingId: row.hearingId,
    caseRef: row.caseRef,
    action: row.action,
    notes: row.notes,
    state: row.state,
  }));

  return {
    isValid: true,
    payload: { supportRequests },
    responseCsv: buildBulkUploadResponseCsv(supportRequests),
  };
}

export function buildBulkUploadResponseCsv(supportRequests: SupportRequest[]): string {
  const rows = ['hearingId,caseRef,action,state,status,message'];

  if (supportRequests.length === 0) {
    rows.push('unavailable,unavailable,unavailable,unavailable,error,"No valid CSV hearing rows were found"');
  } else {
    supportRequests.forEach(request => {
      rows.push(
        [
          request.hearingId,
          request.caseRef,
          request.action,
          request.state,
          'success',
          'Request accepted for processing',
        ]
          .map(csvEscape)
          .join(',')
      );
    });
  }

  rows.push('');
  return rows.join('\n');
}

function findHeaderRowIndex(lines: string[]): number {
  const headerSet = new Set(expectedHeaders);
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.some(cell => headerSet.has(cell))) {
      // if some cells match expected headers, consider this the header row
      return i;
    }
  }
  return 0; // fall back to first line if headers never found, validation will correctly fail
}
