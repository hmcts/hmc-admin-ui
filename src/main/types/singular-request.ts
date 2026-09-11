export enum SingularRequestType {
  FINAL_STATE_TRANSITION = 'final-state-transition',
  ROLLBACK = 'rollback',
}

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

export type SingularPageOptions = {
  heading: string;
  requestType: SingularRequestType;
  view: string;
};

export type SingularResponseResult = {
  hearingId: string;
  requestType: SingularRequestType;
  status: 'success' | 'failure';
  message: string;
};

export type SingularSession = {
  singularResponse?: SingularResponseResult;
};

export type SingularRequestTypeSelectionForm = {
  singularRequestType: string;
};
