export type SupportRequest = {
  hearingId: string;
  caseRef: string;
  action: string;
  notes: string;
  state: string;
};

export type ManageExceptionsPayload = {
  supportRequests: SupportRequest[];
};

export type SupportRequestResponse = {
  hearingId: string;
  status: string;
  message: string;
};

export type ManageExceptionsResponse = {
  supportRequestResponse?: SupportRequestResponse[];
};
