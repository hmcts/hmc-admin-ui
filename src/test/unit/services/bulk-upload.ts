import { buildBulkUploadResponseCsv, parseBulkUploadCsv } from '../../../main/services/bulk-upload';

const validCsv = [
  'hearingId,caseRef,action,notes,state',
  '12345678901234567890,1234567890123456,final_state_transition,Incident 123,CANCELLED',
  '22345678901234567890,2234567890123456,rollback,,',
  '',
].join('\n');

describe('parseBulkUploadCsv', () => {
  test('validates and transforms CSV rows into support request JSON', () => {
    const result = parseBulkUploadCsv(validCsv);

    expect(result).toMatchObject({
      isValid: true,
      payload: {
        supportRequests: [
          {
            hearingId: '12345678901234567890',
            caseRef: '1234567890123456',
            action: 'final_state_transition',
            notes: 'Incident 123',
            state: 'CANCELLED',
          },
          {
            hearingId: '22345678901234567890',
            caseRef: '2234567890123456',
            action: 'rollback',
            notes: '',
            state: undefined,
          },
        ],
      },
    });
  });

  test('rejects invalid headers', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,unexpected,notes,state\n123,1234567890123456,CANCELLED,,rollback'
    );

    expect(result).toEqual({
      isValid: false,
      errors: [{ message: 'The file contains unexpected or invalid headers.' }],
    });
  });

  test('rejects hearing IDs over 30 characters', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n1234567890123456789012345678901,1234567890123456,rollback,,'
    );

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ row: 2, message: 'hearingId exceeds 30 character limit.' }],
    });
  });

  test('rejects notes over 5000 characters', () => {
    const notes = 'a'.repeat(5001);
    const result = parseBulkUploadCsv(
      `hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,rollback,${notes},`
    );

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ row: 2, message: 'Notes/Incident Number exceeds 5000 character limit.' }],
    });
  });

  test('rejects invalid case references', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n12345678901234567890,not-a-case-ref,rollback,,'
    );

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ row: 2, message: 'Case Reference Number must be a 16-digit numeric value.' }],
    });
  });

  test('rejects invalid actions', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,invalid,,CANCELLED'
    );

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ row: 2, message: "Action must be either 'final_state_transition' or 'rollback'." }],
    });
  });

  test('rejects invalid states', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,,INVALID'
    );

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ row: 2, message: 'State must be one of CANCELLED, COMPLETED, or ADJOURNED.' }],
    });
  });

  test('requires state for final state transition requests', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,,'
    );

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ row: 2, message: 'State is mandatory for final_state_transition requests.' }],
    });
  });
});

describe('buildBulkUploadResponseCsv', () => {
  test('maps manageExceptions support request response into the response CSV', () => {
    const responseCsv = buildBulkUploadResponseCsv(
      [
        {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          action: 'final_state_transition',
          notes: 'Incident 123',
          state: 'CANCELLED',
        },
      ],
      {
        supportRequestResponse: [
          {
            hearingId: '12345678901234567890',
            status: 'error',
            message: 'Unable to process, try again',
          },
        ],
      }
    );

    expect(responseCsv).toContain(
      '12345678901234567890,1234567890123456,final_state_transition,CANCELLED,error,"Unable to process, try again"'
    );
  });

  test('uses fallback status and message when manageExceptions does not return a hearing response', () => {
    const responseCsv = buildBulkUploadResponseCsv(
      [
        {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          action: 'rollback',
          notes: '',
          state: '',
        },
      ],
      { supportRequestResponse: [] }
    );

    expect(responseCsv).toContain(
      '12345678901234567890,1234567890123456,rollback,,UNKNOWN,No response message returned'
    );
  });

  test('escapes manageExceptions response messages for CSV output', () => {
    const responseCsv = buildBulkUploadResponseCsv(
      [
        {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          action: 'rollback',
          notes: '',
          state: '',
        },
      ],
      {
        supportRequestResponse: [
          {
            hearingId: '12345678901234567890',
            status: 'error',
            message: 'Could not process "rollback", retry later',
          },
        ],
      }
    );

    expect(responseCsv).toContain(
      '12345678901234567890,1234567890123456,rollback,,error,"Could not process ""rollback"", retry later"'
    );
  });
});
