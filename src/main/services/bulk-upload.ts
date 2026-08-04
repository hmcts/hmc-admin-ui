import type { BulkUploadParseResult, BulkUploadValidationError, CsvRow } from '../types/bulk-upload';
import { ManageExceptionsResponse, SupportRequest } from '../types/manage-exceptions';

const expectedHeaders = ['hearingId', 'caseRef', 'action', 'notes', 'state'];
const validActions = ['final_state_transition', 'rollback'];
const validStates = ['CANCELLED', 'COMPLETED', 'ADJOURNED'];

// parse the uploaded csv into JSON
export function parseBulkUploadCsv(csvContent: string): BulkUploadParseResult {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim());
  const headerRowIndex = findHeaderRowIndex(lines);
  const { headers, rows } = parseCsv(csvContent, headerRowIndex);
  const headerErrors = validateHeaders(headers);

  if (headerErrors.length > 0) {
    // if no headers or invalid headers, return an error to the user
    return { isValid: false, errors: headerErrors };
  }

  const rowErrors = rows.flatMap((row, index) => validateRow(row, index + 2));

  if (rowErrors.length > 0) {
    return { isValid: false, errors: rowErrors };
  }

  //convert rows into support request objects
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

// convert the manageExceptions response into a downloadable CSV
export function buildBulkUploadResponseCsv(
  supportRequests: SupportRequest[],
  manageExceptionsResponse?: ManageExceptionsResponse
): string {
  const rows = ['hearingId,caseRef,action,state,status,message'];
  const responseByHearingId = new Map(
    (manageExceptionsResponse?.supportRequestResponse || []).map(response => [response.hearingId, response])
  );

  if (supportRequests.length === 0) {
    // default row if no valid hearing rows were found in the CSV
    rows.push('unavailable,unavailable,unavailable,unavailable,error,"No valid CSV hearing rows were found"');
  } else {
    supportRequests.forEach(request => {
      const response = responseByHearingId.get(request.hearingId);
      rows.push(
        [
          // Currently all hearing details returned back, may only need hearingId, status and message for users though
          request.hearingId,
          request.caseRef,
          request.action,
          request.state,
          // added default messages in unlikely event that manageExceptions does not return the relevant fields
          response?.status || 'UNKNOWN',
          response?.message || 'No response message returned',
        ]
          .map(csvEscape)
          // convert object into row
          .join(',')
      );
    });
  }

  rows.push('');
  // convert rows into full csv file
  return rows.join('\n');
}

// cleanly escape a value for CSV output, adding quotes if necessary
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

// Will parse the CSV content into headers and rows
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

// validate the headers of the CSV file against the expected headers
function validateHeaders(headers: string[]): BulkUploadValidationError[] {
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

// validate a single row of the CSV file against expectations
function validateRow(row: CsvRow, rowNumber: number): BulkUploadValidationError[] {
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

  // Regex to check if caseRef is a 16-digit numeric value
  if (!/^\d{16}$/.test(caseRef)) {
    errors.push({ row: rowNumber, message: 'Case Reference Number must be a 16-digit numeric value.' });
  }

  if (!validActions.includes(action)) {
    errors.push({ row: rowNumber, message: "Action must be either 'final_state_transition' or 'rollback'." });
  }

  if (action === 'final_state_transition' && !state) {
    errors.push({ row: rowNumber, message: 'State is mandatory for final_state_transition requests.' });
  } else if (state && !validStates.includes(state)) {
    errors.push({ row: rowNumber, message: 'State must be one of CANCELLED, COMPLETED, or ADJOURNED.' });
  }

  return errors;
}

// find which row the headers are on
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
