import { buildSingularRequestPayload } from '../../../main/services/singular-request';
import { SingularRequestType } from '../../../main/types/singular-request';

describe('buildSingularRequestPayload', () => {
  test('builds a manageExceptions payload for final state transition', () => {
    expect(
      buildSingularRequestPayload(
        {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          status: 'CANCELLED',
          notes: 'Incident',
        },
        SingularRequestType.FINAL_STATE_TRANSITION
      )
    ).toEqual({
      supportRequests: [
        {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          action: 'final_state_transition',
          notes: 'Incident',
          state: 'CANCELLED',
        },
      ],
    });
  });

  test('builds a manageExceptions payload for rollback', () => {
    expect(
      buildSingularRequestPayload(
        {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          status: '',
          notes: 'Incident',
        },
        SingularRequestType.ROLLBACK
      )
    ).toEqual({
      supportRequests: [
        {
          hearingId: '12345678901234567890',
          caseRef: '1234567890123456',
          action: SingularRequestType.ROLLBACK,
          notes: 'Incident',
          state: undefined,
        },
      ],
    });
  });
});
