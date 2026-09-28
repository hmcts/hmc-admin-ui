import { ManageExceptionsPayload, ManageExceptionsResponse } from '../types/manage-exceptions';

// Mock response used for local development and tests when auth is disabled.
export function mockManageExceptionsResponse(payload: ManageExceptionsPayload): ManageExceptionsResponse {
  return {
    supportRequestResponse: payload.supportRequests.map(request => ({
      hearingId: request.hearingId,
      status: 'success',
      message: 'Mock manageExceptions response processed',
    })),
  };
}
