import { ManageExceptionsPayload, SupportRequest } from './manage-exceptions';

export type BulkUploadValidationError = {
  row?: number;
  message: string;
};

export type BulkUploadParseResult =
  | {
      isValid: true;
      payload: ManageExceptionsPayload;
      responseRows: BulkUploadResponseRow[];
      responseCsv: string;
    }
  | {
      isValid: false;
      errors: BulkUploadValidationError[];
    };

export type CsvRow = Record<string, string>;

export type BulkUploadResponseRow = SupportRequest & {
  validationIssue?: string;
};

export type BulkUploadSession = {
  bulkUploadRequestJson?: string;
  bulkUploadResponseCsv?: string;
};
