import config from 'config';
import { Application } from 'express';
import multer from 'multer';

import { buildBulkUploadResponseCsv, parseBulkUploadCsv } from '../services/bulk-upload';
import { ManageExceptionsPayload, ManageExceptionsResponse } from '../types/manage-exceptions';

type BulkUploadSession = {
  bulkUploadRequestJson?: string;
  bulkUploadResponseCsv?: string;
};

const defaultBulkUploadResponseCsv = [
  'hearingId,caseRef,action,state,status,message',
  'unavailable,unavailable,unavailable,unavailable,error,"No bulk upload response is available"',
  '',
].join('\n');

const upload = multer({ storage: multer.memoryStorage() });
const authEnabled: boolean = config.get('auth.enabled');

// mock to use if auth not enabled (for local dev and testing)
function mockManageExceptionsResponse(payload: ManageExceptionsPayload): ManageExceptionsResponse {
  return {
    supportRequestResponse: payload.supportRequests.map(request => ({
      hearingId: request.hearingId,
      status: 'success',
      message: 'Mock manageExceptions response processed',
    })),
  };
}

export default function (app: Application): void {
  app.get('/', (req, res) => {
    res.render('home');
  });

  app.post('/', (req, res) => {
    if (req.body.requestType === 'bulk') {
      res.redirect(303, '/bulk-upload');
      return;
    }

    // Singular route page to be defined, for now just redirect to home page

    res.redirect(303, '/');
  });

  app.get('/bulk-upload', (req, res) => {
    res.render('bulk-upload');
  });

  app.post('/bulk-upload', upload.single('bulkUploadFile'), async (req, res) => {
    if (!req.file) {
      // if no file was uploaded, return an error to the user
      res.status(400).render('bulk-upload', {
        errors: [{ message: 'A file must be uploaded.' }],
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
    if (process.env.NODE_ENV !== 'production') {
      manageExceptionsResponse = mockManageExceptionsResponse(result.payload);
    }

    if (authEnabled) {
      const { HearingService } = require('../services/hearing-service');
      const { getUserAccessToken } = require('../services/user-auth');
      // send the request to the manageExceptions service
      manageExceptionsResponse = await new HearingService().manageExceptions(result.payload, getUserAccessToken(req));
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
