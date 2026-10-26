export const csvHeaders = 'hearingId,caseRef,action,notes,state';

export const firstRejectedUpload = {
  name: 'distinct-invalid-rows.csv',
  hearingMarker: '54570000000000000001',
  csv: [
    csvHeaders,
    '54570000000000000001,not-a-case-reference,rollback,,',
    '54570000000000000002,5457000000000002,not-an-action,,',
  ].join('\n'),
  expectedCsv: [
    'hearingId,caseRef,action,state,status,message,Validation Issue',
    '54570000000000000001,not-a-case-reference,rollback,,INVALID,Validation failed,Case Reference Number must be a 16-digit numeric value.',
    "54570000000000000002,5457000000000002,not-an-action,,INVALID,Validation failed,Action must be either 'final_state_transition' or 'rollback'.",
    '',
  ].join('\n'),
};

export const secondRejectedUpload = {
  name: 'replacement-invalid-row.csv',
  csv: [csvHeaders, '54570000000000000003,5457000000000003,final_state_transition,,'].join('\n'),
  expectedCsv: [
    'hearingId,caseRef,action,state,status,message,Validation Issue',
    '54570000000000000003,5457000000000003,final_state_transition,,INVALID,Validation failed,State is mandatory for final_state_transition requests.',
    '',
  ].join('\n'),
};

export const headerOnlyResponseCsv = [
  'hearingId,caseRef,action,state,status,message',
  'unavailable,unavailable,unavailable,unavailable,error,"No valid CSV hearing rows were found"',
  '',
].join('\n');

export const unavailableResponseCsv = [
  'hearingId,caseRef,action,state,status,message',
  'unavailable,unavailable,unavailable,unavailable,error,"No bulk upload response is available"',
  '',
].join('\n');

export const correctionForm = {
  hearingId: '54570000000000000004',
  caseReference: '5457000000000004',
  notes: 'EXUI-5457 synthetic correction',
};
