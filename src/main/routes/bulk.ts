import path from 'path';

import config from 'config';
import { Application, NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { buildBulkUploadResponseCsv, parseBulkUploadCsv } from '../services/bulk-upload';
import { ManageExceptionsResponse } from '../types/manage-exceptions';

type BulkUploadSession = {
  bulkUploadRequestJson?: string;
  bulkUploadResponseCsv?: string;
};

const defaultBulkUploadResponseCsv = [
  'hearingId,caseRef,action,state,status,message',
  'unavailable,unavailable,unavailable,unavailable,error,"No bulk upload response is available"',
  '',
].join('\n');

const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const INVALID_UPLOAD_FILE_TYPE_ERROR = 'INVALID_UPLOAD_FILE_TYPE';
const allowedCsvFileExtensions = ['.csv'];
const allowedCsvMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
const expectedCsvHeaders = ['hearingId', 'caseRef', 'action', 'notes', 'state'];
const storage = multer.memoryStorage();

export const uploadLimits = {
  fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
  files: 1,
  parts: 6,
  fields: 5,
  fieldNameSize: 100,
  fieldSize: 1024 * 1024,
};

export function isAllowedCsvFile(file: Pick<Express.Multer.File, 'originalname' | 'mimetype'>): boolean {
  const extension = path.extname(file.originalname).toLowerCase();
  return allowedCsvFileExtensions.includes(extension) && allowedCsvMimeTypes.includes(file.mimetype);
}

export function hasCsvContent(file: Pick<Express.Multer.File, 'buffer'>): boolean {
  const content = file.buffer.toString('utf8');

  if (content.includes('\u0000')) {
    return false;
  }

  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return lines.slice(0, 5).some(line => expectedCsvHeaders.every(header => line.split(',').includes(header)));
}

function csvFileFilter(req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback): void {
  if (isAllowedCsvFile(file)) {
    callback(null, true);
    return;
  }

  callback(new Error(INVALID_UPLOAD_FILE_TYPE_ERROR));
}

const upload = multer({ storage, limits: uploadLimits, fileFilter: csvFileFilter });

const uploadLimitErrorDescriptions = {
  LIMIT_FILE_SIZE: `The selected file must be smaller than ${MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
  LIMIT_FILE_COUNT: 'You can only upload one file.',
  LIMIT_PART_COUNT: 'Too many form parts were submitted.',
  LIMIT_FIELD_COUNT: 'Too many form fields were submitted.',
  LIMIT_FIELD_KEY: 'One or more form field names are too long.',
  LIMIT_FIELD_VALUE: 'One or more form fields are too large.',
  LIMIT_UNEXPECTED_FILE: 'The selected file field is not supported.',
};

type UploadLimitErrorCode = keyof typeof uploadLimitErrorDescriptions;

function isUploadLimitErrorCode(code: string): code is UploadLimitErrorCode {
  return Object.prototype.hasOwnProperty.call(uploadLimitErrorDescriptions, code);
}

function isInvalidUploadFileTypeError(error: unknown): boolean {
  return error instanceof Error && error.message === INVALID_UPLOAD_FILE_TYPE_ERROR;
}

export function handleUploadError(error: unknown, res: Response, next: NextFunction): void {
  if (isInvalidUploadFileTypeError(error)) {
    res.status(400).render('bulk-upload', {
      errors: [{ message: 'The selected file must be a CSV file with .csv extension.' }],
    });
    return;
  }

  if (error instanceof multer.MulterError && isUploadLimitErrorCode(error.code)) {
    res.status(400).render('bulk-upload', {
      errors: [{ message: uploadLimitErrorDescriptions[error.code] }],
    });
    return;
  }

  next(error);
}

function uploadSingleBulkUploadFile(req: Request, res: Response, next: NextFunction): void {
  upload.single('bulkUploadFile')(req, res, (error: unknown) => {
    if (error) {
      handleUploadError(error, res, next);
      return;
    }

    next();
  });
}

const authEnabled: boolean = config.get('auth.enabled');

export default function (app: Application): void {
  app.get('/bulk-upload', (req, res) => {
    res.render('bulk-upload');
  });

  app.post('/bulk-upload', uploadSingleBulkUploadFile, async (req, res) => {
    if (!req.file) {
      // if no file was uploaded, return an error to the user
      res.status(400).render('bulk-upload', {
        errors: [{ message: 'A file must be uploaded.' }],
      });
      return;
    }

    if (!hasCsvContent(req.file)) {
      res.status(400).render('bulk-upload', {
        errors: [{ message: 'The selected file must be a valid CSV file.' }],
      });
      return;
    }

    // parsing of the bulk upload CSV file (includes validation)
    const result = parseBulkUploadCsv(req.file.buffer.toString('utf8'));

    if (!result.isValid) {
      // if here means the bulk upload CSV was not valid
      res.status(400).render('bulk-upload', { errors: result.errors });
      return;
    }

    const session = req.session as typeof req.session & BulkUploadSession;
    session.bulkUploadRequestJson = JSON.stringify(result.payload);

    let manageExceptionsResponse: ManageExceptionsResponse = { supportRequestResponse: [] };

    // below line to be removed once the manageExceptions service is fully implemented
    if (authEnabled) {
      const { HearingService } = require('../services/hearing-service');
      const { getUserAccessToken } = require('../services/user-auth');

      try {
        // send the request to the manageExceptions service
        manageExceptionsResponse = await new HearingService().manageExceptions(result.payload, getUserAccessToken(req));
      } catch (error: unknown) {
        res.redirect(303, '/bulk-upload/problem');
        return;
      }
    }

    // now parse the manageExceptions response and build the CSV response for the user to download
    session.bulkUploadResponseCsv = buildBulkUploadResponseCsv(
      result.payload.supportRequests,
      manageExceptionsResponse
    );

    res.redirect(303, '/bulk-upload/response');
  });

  app.get('/bulk-upload/response', (req, res) => {
    // transfer to the bulk upload response page where user can download response
    res.render('bulk-upload-response');
  });

  app.get('/bulk-upload/problem', (req, res) => {
    res.status(502).render('bulk-upload-problem');
  });

  app.get('/bulk-upload/response/download', (req, res) => {
    const session = req.session as typeof req.session & BulkUploadSession;
    // send the CSV response file to the user for download
    // note that file name can be changed to include a timestamp or other unique identifier
    res
      .status(200)
      .set({
        'Content-Disposition': 'attachment; filename="bulk-upload-response.csv"',
        'Content-Type': 'text/csv; charset=utf-8',
      })
      .send(session.bulkUploadResponseCsv || defaultBulkUploadResponseCsv);
  });
}
