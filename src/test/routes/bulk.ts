import { expect } from 'chai';
import request from 'supertest';

import { app } from '../../main/app';

/* eslint-disable jest/expect-expect */
describe('Bulk upload page', () => {
  describe('on GET', () => {
    test('should display the bulk upload page', async () => {
      await request(app)
        .get('/bulk-upload')
        .expect(res => expect(res.status).to.equal(200))
        .expect(res => expect(res.text).to.contain('Bulk request'))
        .expect(res => expect(res.text).to.contain('enctype="multipart/form-data"'))
        .expect(res => expect(res.text).to.contain('type="file"'))
        .expect(res => expect(res.text).to.contain('class="govuk-file-upload"'))
        .expect(res => expect(res.text).to.contain('accept=".csv,text/csv"'))
        .expect(res => expect(res.text).to.contain('name="bulkUploadFile"'))
        .expect(res => expect(res.text).to.contain('aria-describedby="bulk-upload-file-hint'))
        .expect(res => expect(res.text).to.contain('hearingId, caseRef, action, notes and state'))
        .expect(res => expect(res.text).to.contain('Submit'))
        .expect(res => expect(res.text).to.contain('Cancel'))
        .expect(res => expect(res.text).to.contain('href="/"'));
    });
  });

  describe('on POST', () => {
    test('should redirect to the response page', async () => {
      const agent = request.agent(app);
      const getResponse = await agent.get('/bulk-upload').expect(200);
      const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

      expect(csrfToken).to.not.be.undefined;
      if (!csrfToken) {
        throw new Error('CSRF token was not rendered');
      }

      await agent
        .post('/bulk-upload')
        .query({ _csrf: csrfToken })
        .attach(
          'bulkUploadFile',
          Buffer.from(
            'hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,final_state_transition,Incident,CANCELLED'
          ),
          'bulk-upload.csv'
        )
        .expect(res => expect(res.status).to.equal(303))
        .expect(res => expect(res.headers.location).to.equal('/bulk-upload/response'));
    });

    test('should display a validation error when no file is uploaded', async () => {
      const agent = request.agent(app);
      const getResponse = await agent.get('/bulk-upload').expect(200);
      const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

      expect(csrfToken).to.not.be.undefined;
      if (!csrfToken) {
        throw new Error('CSRF token was not rendered');
      }

      await agent
        .post('/bulk-upload')
        .query({ _csrf: csrfToken })
        .expect(res => expect(res.status).to.equal(400))
        .expect(res => expect(res.text).to.contain('A file must be uploaded.'));
    });
  });
});

describe('Bulk upload response page', () => {
  test('should display the bulk upload problem page', async () => {
    await request(app)
      .get('/bulk-upload/problem')
      .expect(res => expect(res.status).to.equal(502))
      .expect(res => expect(res.text).to.contain('Sorry, there is a problem with the service'))
      .expect(res => expect(res.text).to.contain('Try bulk upload again'))
      .expect(res => expect(res.text).to.contain('href="/bulk-upload"'));
  });

  test('should display the response download page', async () => {
    await request(app)
      .get('/bulk-upload/response')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('Bulk request response'))
      .expect(res => expect(res.text).to.contain('Download response CSV'))
      .expect(res => expect(res.text).to.contain('href="/bulk-upload/response/download"'));
  });

  test('should download a CSV response file', async () => {
    await request(app)
      .get('/bulk-upload/response/download')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.headers['content-type']).to.contain('text/csv'))
      .expect(res => expect(res.headers['content-disposition']).to.contain('bulk-upload-response.csv'))
      .expect(res => expect(res.text).to.contain('hearingId,caseRef,action,state,status,message'))
      .expect(res => expect(res.text).not.to.contain('Validation Issue'));
  });

  test('should download the processed CSV response after upload', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/bulk-upload').expect(200);
    const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    expect(csrfToken).to.not.be.undefined;
    if (!csrfToken) {
      throw new Error('CSRF token was not rendered');
    }

    await agent
      .post('/bulk-upload')
      .query({ _csrf: csrfToken })
      .attach(
        'bulkUploadFile',
        Buffer.from('hearingId,caseRef,action,notes,state\n12345678901234567890,1234567890123456,rollback,,'),
        'bulk-upload.csv'
      )
      .expect(303);

    await agent
      .get('/bulk-upload/response/download')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res =>
        expect(res.text).to.contain(
          '12345678901234567890,1234567890123456,rollback,,UNKNOWN,No response message returned'
        )
      )
      .expect(res => expect(res.text).not.to.contain('Validation Issue'));
  });

  test('should stay on the upload page and download validation issues after uploading a CSV with invalid rows', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/bulk-upload').expect(200);
    const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    expect(csrfToken).to.not.be.undefined;
    if (!csrfToken) {
      throw new Error('CSRF token was not rendered');
    }

    await agent
      .post('/bulk-upload')
      .query({ _csrf: csrfToken })
      .attach(
        'bulkUploadFile',
        Buffer.from('hearingId,caseRef,action,notes,state\n12345678901234567890,not-a-case-ref,rollback,,'),
        'bulk-upload.csv'
      )
      .expect(res => expect(res.status).to.equal(400))
      .expect(res =>
        expect(res.text).to.contain('There were validation errors. Please check and edit the csv file and try again')
      )
      .expect(res => expect(res.text).to.contain('href="/bulk-upload/response/download"'))
      .expect(res => expect(res.text).to.contain('data-validation-response-download'))
      .expect(res => expect(res.text).not.to.contain('Bulk request response'));

    await agent
      .get('/bulk-upload/response/download')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('hearingId,caseRef,action,state,status,message,Validation Issue'))
      .expect(res =>
        expect(res.text).to.contain(
          '12345678901234567890,not-a-case-ref,rollback,,INVALID,Validation failed,Case Reference Number must be a 16-digit numeric value.'
        )
      );
  });
});
