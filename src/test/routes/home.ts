import { expect } from 'chai';
import request from 'supertest';

import { app } from '../../main/app';

// TODO: replace this sample test with proper route tests for the application
/* eslint-disable jest/expect-expect */
describe('Home page', () => {
  describe('on GET', () => {
    test('should display the support tools request type landing page', async () => {
      await request(app)
        .get('/')
        .expect(res => expect(res.status).to.equal(200))
        .expect(res => expect(res.text).to.contain('Support tools'))
        .expect(res => expect(res.text).to.contain('autocomplete="off"'))
        .expect(res => expect(res.text).to.contain('novalidate'))
        .expect(res => expect(res.text).to.contain('What type of request would you like to make?'))
        .expect(res => expect(res.text).to.contain('name="_csrf"'))
        .expect(res => expect(res.text).to.contain('value="bulk"'))
        .expect(res => expect(res.text).to.contain('Bulk'))
        .expect(res => expect(res.text).to.contain('value="singular"'))
        .expect(res => expect(res.text).to.contain('Singular'))
        .expect(res => expect(res.text).to.contain('type="submit"'))
        .expect(res => expect(res.text).to.contain('Continue'))
        .expect(res => expect(res.text).not.to.contain('Sign out'));
    });
  });

  describe('on POST', () => {
    test('should handle continue requests', async () => {
      const agent = request.agent(app);
      const getResponse = await agent.get('/').expect(200);
      const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

      expect(csrfToken).to.not.be.undefined;

      await agent
        .post('/')
        .type('form')
        .send({
          _csrf: csrfToken,
          requestType: 'bulk',
        })
        .expect(res => expect(res.status).to.equal(303))
        .expect(res => expect(res.headers.location).to.equal('/bulk-upload'));
    });

    test('should keep singular requests on the home page', async () => {
      const agent = request.agent(app);
      const getResponse = await agent.get('/').expect(200);
      const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

      expect(csrfToken).to.not.be.undefined;

      await agent
        .post('/')
        .type('form')
        .send({
          _csrf: csrfToken,
          requestType: 'singular',
        })
        .expect(res => expect(res.status).to.equal(303))
        .expect(res => expect(res.headers.location).to.equal('/'));
    });
  });
});

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
  test('should display the response download page', async () => {
    await request(app)
      .get('/bulk-upload/response')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('Bulk upload response'))
      .expect(res => expect(res.text).to.contain('Download response CSV'))
      .expect(res => expect(res.text).to.contain('href="/bulk-upload/response/download"'));
  });

  test('should download a CSV response file', async () => {
    await request(app)
      .get('/bulk-upload/response/download')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.headers['content-type']).to.contain('text/csv'))
      .expect(res => expect(res.headers['content-disposition']).to.contain('bulk-upload-response.csv'))
      .expect(res => expect(res.text).to.contain('hearingId,caseRef,action,state,status,message'));
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
          '12345678901234567890,1234567890123456,rollback,,success,Mock manageExceptions response processed'
        )
      );
  });
});
