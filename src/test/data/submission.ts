export const hearingForm = {
  hearingId: '10000000000000000001',
  caseRef: '1000000000000001',
  status: 'CANCELLED',
  notes: 'Synthetic coverage incident',
};

export const bulkCsv = [
  'hearingId,caseRef,action,notes,state',
  '10000000000000000001,1000000000000001,final_state_transition,Synthetic coverage incident,CANCELLED',
  '10000000000000000002,1000000000000002,rollback,,',
].join('\n');

export const bulkPayload = {
  supportRequests: [
    {
      hearingId: '10000000000000000001',
      caseRef: '1000000000000001',
      action: 'final_state_transition',
      notes: 'Synthetic coverage incident',
      state: 'CANCELLED',
    },
    {
      hearingId: '10000000000000000002',
      caseRef: '1000000000000002',
      action: 'rollback',
      notes: '',
    },
  ],
};

// Response order deliberately differs from input order to prove hearing-ID matching.
export const bulkServiceResponse = {
  supportRequestResponse: [
    { hearingId: '10000000000000000002', status: 'FAILED', message: 'Cannot rollback, status "locked"' },
    { hearingId: '10000000000000000001', status: 'SUCCESS', message: 'Transition applied' },
  ],
};

export const bulkResponseCsv = [
  'hearingId,caseRef,action,state,status,message',
  '10000000000000000001,1000000000000001,final_state_transition,CANCELLED,SUCCESS,Transition applied',
  '10000000000000000002,1000000000000002,rollback,,FAILED,"Cannot rollback, status ""locked"""',
  '',
].join('\n');

export const invalidBulkCsv = bulkCsv.replace('1000000000000002', 'not-a-case-reference');

export const validationResponseCsv = [
  'hearingId,caseRef,action,state,status,message,Validation Issue',
  '10000000000000000001,1000000000000001,final_state_transition,CANCELLED,VALID,,',
  '10000000000000000002,not-a-case-reference,rollback,,INVALID,Validation failed,Case Reference Number must be a 16-digit numeric value.',
  '',
].join('\n');

export const unavailableBulkResponseCsv = [
  'hearingId,caseRef,action,state,status,message',
  'unavailable,unavailable,unavailable,unavailable,error,"No bulk upload response is available"',
  '',
].join('\n');
