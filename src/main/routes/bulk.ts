import config from 'config';
import { Application } from 'express';
import multer from 'multer';

import { buildBulkUploadResponseCsv, parseBulkUploadCsv } from '../services/bulk-upload';
import { mockManageExceptionsResponse } from '../services/manage-exceptions';
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

const upload = multer({ storage: multer.memoryStorage() });
const authEnabled: boolean = config.get('auth.enabled');

export default function (app: Application): void {
  app.get('/bulk-upload', (req, res) => {
    res.render('bulk-upload');
  });

  app.post('/bulk-upload', upload.single('bulkUploadFile'), async (req, res) => {
    if (!req.file) {
      res.status(400).render('bulk-upload', {
        errors: [{ message: 'A file must be uploaded.' }],
      });
      return;
    }

    const result = parseBulkUploadCsv(req.file.buffer.toString('utf8'));

    if (!result.isValid) {
      res.status(400).render('bulk-upload', { errors: result.errors });
      return;
    }

    const session = req.session as typeof req.session & BulkUploadSession;
    session.bulkUploadRequestJson = JSON.stringify(result.payload);

    let manageExceptionsResponse: ManageExceptionsResponse = { supportRequestResponse: [] };

    if (process.env.NODE_ENV !== 'production') {
      manageExceptionsResponse = mockManageExceptionsResponse(result.payload);
    }

    if (authEnabled) {
      const { HearingService } = require('../services/hearing-service');
      const { getUserAccessToken } = require('../services/user-auth');
      manageExceptionsResponse = await new HearingService().manageExceptions(result.payload, getUserAccessToken(req));
    }

    session.bulkUploadResponseCsv = buildBulkUploadResponseCsv(
      result.payload.supportRequests,
      manageExceptionsResponse
    );

    res.redirect(303, '/bulk-upload/response');
  });

  app.get('/bulk-upload/response', (req, res) => {
    res.render('bulk-upload-response');
  });

  app.get('/bulk-upload/response/download', (req, res) => {
    const session = req.session as typeof req.session & BulkUploadSession;
    res
      .status(200)
      .set({
        'Content-Disposition': 'attachment; filename="bulk-upload-response.csv"',
        'Content-Type': 'text/csv; charset=utf-8',
      })
      .send(session.bulkUploadResponseCsv || defaultBulkUploadResponseCsv);
  });
}
