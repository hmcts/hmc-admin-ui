import { ManageExceptionsPayload } from './manage-exceptions';

export type BulkUploadValidationError = {
  row?: number;
  message: string;
};

export type BulkUploadParseResult =
  | {
      isValid: true;
      payload: ManageExceptionsPayload;
      responseCsv: string;
    }
  | {
      isValid: false;
      errors: BulkUploadValidationError[];
    };

export type CsvRow = Record<string, string>;
