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
      responseRows: [
        {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          action: 'final_state_transition',
          notes: 'Incident 123',
          state: 'CANCELLED',
          validationIssue: '',
        },
        {
          hearingId: '22345678901234567890',
          caseRef: '2234567890123456',
          action: 'rollback',
          notes: '',
          state: undefined,
          validationIssue: '',
        },
      ],
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

  test('records a validation issue for hearing IDs over 30 characters', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n1234567890123456789012345678901,1234567890123456,rollback,,'
    );

    expect(result).toMatchObject({
      isValid: true,
      payload: {
        supportRequests: [],
      },
      responseRows: [
        {
          hearingId: '1234567890123456789012345678901',
          validationIssue: 'hearingId exceeds 30 character limit.',
        },
      ],
    });
  });

  test('records a validation issue for notes over 5000 characters', () => {
    const notes = 'a'.repeat(5001);
    const result = parseBulkUploadCsv(
      `hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,rollback,${notes},`
    );

    expect(result).toMatchObject({
      isValid: true,
      payload: {
        supportRequests: [],
      },
      responseRows: [
        {
          hearingId: '12345678901234567890',
          validationIssue: 'Notes/Incident Number exceeds 5000 character limit.',
        },
      ],
    });
  });

  test('records a validation issue for invalid case references', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n12345678901234567890,not-a-case-ref,rollback,,'
    );

    expect(result).toMatchObject({
      isValid: true,
      payload: {
        supportRequests: [],
      },
      responseRows: [
        {
          hearingId: '12345678901234567890',
          validationIssue: 'Case Reference Number must be a 16-digit numeric value.',
        },
      ],
    });
  });

  test('records a validation issue for invalid actions', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,invalid,,CANCELLED'
    );

    expect(result).toMatchObject({
      isValid: true,
      payload: {
        supportRequests: [],
      },
      responseRows: [
        {
          hearingId: '12345678901234567890',
          validationIssue: "Action must be either 'final_state_transition' or 'rollback'.",
        },
      ],
    });
  });

  test('records a validation issue for invalid states', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,,INVALID'
    );

    expect(result).toMatchObject({
      isValid: true,
      payload: {
        supportRequests: [],
      },
      responseRows: [
        {
          hearingId: '12345678901234567890',
          validationIssue: 'State must be one of CANCELLED, COMPLETED, or ADJOURNED.',
        },
      ],
    });
  });

  test('records a validation issue when state is missing for final state transition requests', () => {
    const result = parseBulkUploadCsv(
      'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,,'
    );

    expect(result).toMatchObject({
      isValid: true,
      payload: {
        supportRequests: [],
      },
      responseRows: [
        {
          hearingId: '12345678901234567890',
          validationIssue: 'State is mandatory for final_state_transition requests.',
        },
      ],
    });
  });

  test('keeps valid rows in the payload when other rows have validation issues', () => {
    const result = parseBulkUploadCsv(
      [
        'hearingId,caseRef,action,notes,state',
        '12345678901234567890,1234567890123456,rollback,,',
        '22345678901234567890,not-a-case-ref,rollback,,',
      ].join('\n')
    );

    expect(result).toMatchObject({
      isValid: true,
      payload: {
        supportRequests: [
          {
            hearingId: '12345678901234567890',
            caseRef: '1234567890123456',
            action: 'rollback',
            notes: '',
            state: undefined,
          },
        ],
      },
      responseRows: [
        {
          hearingId: '12345678901234567890',
          validationIssue: '',
        },
        {
          hearingId: '22345678901234567890',
          validationIssue: 'Case Reference Number must be a 16-digit numeric value.',
        },
      ],
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
    expect(responseCsv).not.toContain('Validation Issue');
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

  test('adds validation issues to invalid response rows', () => {
    const responseCsv = buildBulkUploadResponseCsv(
      [
        {
          hearingId: '12345678901234567890',
          caseRef: 'not-a-case-ref',
          action: 'rollback',
          notes: '',
          state: '',
          validationIssue: 'Case Reference Number must be a 16-digit numeric value.',
        },
      ],
      undefined,
      { includeValidationIssues: true }
    );

    expect(responseCsv).toContain('hearingId,caseRef,action,state,status,message,Validation Issue');
    expect(responseCsv).toContain(
      '12345678901234567890,not-a-case-ref,rollback,,INVALID,Validation failed,Case Reference Number must be a 16-digit numeric value.'
    );
  });
});
