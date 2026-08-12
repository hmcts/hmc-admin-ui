import { ManageExceptionsPayload } from '../types/manage-exceptions';

export type SingularRequestType = 'final-state-transition' | 'rollback';

export type SingularRequestForm = {
  hearingId: string;
  caseRef: string;
  status: string;
  notes: string;
};

export type FormError = {
  field: string;
  message: string;
};

export const finalStateTransitionStatuses = ['CANCELLED', 'ADJOURNED', 'COMPLETED'];

export function buildSingularRequestForm(body: Record<string, unknown>): SingularRequestForm {
  return {
    hearingId: String(body.hearingId || '').trim(),
    caseRef: String(body.caseRef || '').trim(),
    status: String(body.status || '').trim(),
    notes: String(body.notes || '').trim(),
  };
}

export function validateSingularRequestForm(
  form: SingularRequestForm,
  options: { requireStatus: boolean }
): FormError[] {
  const errors: FormError[] = [];

  if (!form.hearingId) {
    errors.push({ field: 'hearing-id', message: 'Enter a hearing ID' });
  } else if (form.hearingId.length > 30) {
    errors.push({ field: 'hearing-id', message: 'Hearing ID must be 30 characters or fewer' });
  }

  if (!form.caseRef) {
    errors.push({ field: 'case-ref', message: 'Enter a CCD Case Reference Number' });
  } else if (!/^\d{16}$/.test(form.caseRef)) {
    errors.push({ field: 'case-ref', message: 'CCD Case Reference Number must be a 16-digit number' });
  }

  if (options.requireStatus) {
    if (!form.status) {
      errors.push({ field: 'status', message: 'Select a status' });
    } else if (!finalStateTransitionStatuses.includes(form.status)) {
      errors.push({ field: 'status', message: 'Status must be Cancelled, Adjourned or Completed' });
    }
  }

  if (form.notes.length > 5000) {
    errors.push({ field: 'notes', message: 'Incident Number / Notes must be 5000 characters or fewer' });
  }

  return errors;
}

export function buildErrorMap(errors: FormError[]): Record<string, string> {
  return errors.reduce<Record<string, string>>((errorMap, error) => {
    errorMap[error.field] = error.message;
    return errorMap;
  }, {});
}

export function buildSingularRequestPayload(
  form: SingularRequestForm,
  requestType: SingularRequestType
): ManageExceptionsPayload {
  return {
    supportRequests: [
      {
        hearingId: form.hearingId,
        caseRef: form.caseRef,
        action: requestType === 'rollback' ? 'rollback' : form.status,
        notes: form.notes,
        state: requestType === 'rollback' ? '' : 'final_state_transition',
      },
    ],
  };
}
