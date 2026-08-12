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

    test('should redirect singular requests to the singular request type page', async () => {
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
        .expect(res => expect(res.headers.location).to.equal('/singular'));
    });
  });
});

describe('Singular request type page', () => {
  describe('on GET', () => {
    test('should display the singular request type page', async () => {
      await request(app)
        .get('/singular')
        .expect(res => expect(res.status).to.equal(200))
        .expect(res => expect(res.text).to.contain('Support tools'))
        .expect(res => expect(res.text).to.contain('What type of singular request would you like to make?'))
        .expect(res => expect(res.text).to.contain('name="singularRequestType"'))
        .expect(res => expect(res.text).to.contain('value="final-state-transition"'))
        .expect(res => expect(res.text).to.contain('Final state transition'))
        .expect(res => expect(res.text).to.contain('value="rollback"'))
        .expect(res => expect(res.text).to.contain('Rollback'))
        .expect(res => expect(res.text).to.contain('Continue'))
        .expect(res => expect(res.text).to.contain('href="/"'));
    });
  });

  describe('on POST', () => {
    test('should redirect final state transition requests to the final state transition page', async () => {
      const agent = request.agent(app);
      const getResponse = await agent.get('/singular').expect(200);
      const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

      expect(csrfToken).to.not.be.undefined;

      await agent
        .post('/singular')
        .type('form')
        .send({
          _csrf: csrfToken,
          singularRequestType: 'final-state-transition',
        })
        .expect(res => expect(res.status).to.equal(303))
        .expect(res => expect(res.headers.location).to.equal('/singular/final-state-transition'));
    });

    test('should redirect rollback requests to the rollback page', async () => {
      const agent = request.agent(app);
      const getResponse = await agent.get('/singular').expect(200);
      const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

      expect(csrfToken).to.not.be.undefined;

      await agent
        .post('/singular')
        .type('form')
        .send({
          _csrf: csrfToken,
          singularRequestType: 'rollback',
        })
        .expect(res => expect(res.status).to.equal(303))
        .expect(res => expect(res.headers.location).to.equal('/singular/rollback'));
    });
  });
});

describe('Singular final state transition page', () => {
  test('should display the final state transition page', async () => {
    await request(app)
      .get('/singular/final-state-transition')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('Support tools'))
      .expect(res => expect(res.text).to.contain('Final state transition'))
      .expect(res => expect(res.text).to.contain('name="hearingId"'))
      .expect(res => expect(res.text).to.contain('Hearing ID'))
      .expect(res => expect(res.text).to.contain('name="caseRef"'))
      .expect(res => expect(res.text).to.contain('CCD Case Reference Number'))
      .expect(res => expect(res.text).to.contain('name="status"'))
      .expect(res => expect(res.text).to.contain('Cancelled'))
      .expect(res => expect(res.text).to.contain('Adjourned'))
      .expect(res => expect(res.text).to.contain('Completed'))
      .expect(res => expect(res.text).to.contain('name="notes"'))
      .expect(res => expect(res.text).to.contain('Incident Number / Notes'))
      .expect(res => expect(res.text).to.contain('Submit'))
      .expect(res => expect(res.text).to.contain('Cancel'))
      .expect(res => expect(res.text).to.contain('href="/"'))
      .expect(res => expect(res.text).to.contain('href="/singular"'));
  });

  test('should display validation errors when mandatory fields are missing', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/singular/final-state-transition').expect(200);
    const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    expect(csrfToken).to.not.be.undefined;

    await agent
      .post('/singular/final-state-transition')
      .type('form')
      .send({
        _csrf: csrfToken,
      })
      .expect(res => expect(res.status).to.equal(400))
      .expect(res => expect(res.text).to.contain('Enter a hearing ID'))
      .expect(res => expect(res.text).to.contain('Enter a CCD Case Reference Number'))
      .expect(res => expect(res.text).to.contain('Select a status'));
  });

  test('should display validation errors when field rules are broken', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/singular/final-state-transition').expect(200);
    const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    expect(csrfToken).to.not.be.undefined;

    await agent
      .post('/singular/final-state-transition')
      .type('form')
      .send({
        _csrf: csrfToken,
        hearingId: '1234567890123456789012345678901',
        caseRef: 'not-a-case-ref',
        status: 'INVALID',
        notes: 'a'.repeat(5001),
      })
      .expect(res => expect(res.status).to.equal(400))
      .expect(res => expect(res.text).to.contain('Hearing ID must be 30 characters or fewer'))
      .expect(res => expect(res.text).to.contain('CCD Case Reference Number must be a 16-digit number'))
      .expect(res => expect(res.text).to.contain('Status must be Cancelled, Adjourned or Completed'))
      .expect(res => expect(res.text).to.contain('Incident Number / Notes must be 5000 characters or fewer'));
  });

  test('should display a success message when the final state transition is submitted', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/singular/final-state-transition').expect(200);
    const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    expect(csrfToken).to.not.be.undefined;

    await agent
      .post('/singular/final-state-transition')
      .type('form')
      .send({
        _csrf: csrfToken,
        hearingId: '12345678901234567890',
        caseRef: '1234567890123456',
        status: 'CANCELLED',
        notes: 'Incident',
      })
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('Success'))
      .expect(res => expect(res.text).to.contain('Final state transition was successful.'));
  });
});

describe('Singular rollback page', () => {
  test('should display the rollback page', async () => {
    await request(app)
      .get('/singular/rollback')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('Support tools'))
      .expect(res => expect(res.text).to.contain('Rollback'))
      .expect(res => expect(res.text).to.contain('name="hearingId"'))
      .expect(res => expect(res.text).to.contain('Hearing ID'))
      .expect(res => expect(res.text).to.contain('name="caseRef"'))
      .expect(res => expect(res.text).to.contain('CCD Case Reference Number'))
      .expect(res => expect(res.text).not.to.contain('name="status"'))
      .expect(res => expect(res.text).to.contain('name="notes"'))
      .expect(res => expect(res.text).to.contain('Incident Number / Notes'))
      .expect(res => expect(res.text).to.contain('Submit'))
      .expect(res => expect(res.text).to.contain('Cancel'))
      .expect(res => expect(res.text).to.contain('href="/"'))
      .expect(res => expect(res.text).to.contain('href="/singular"'));
  });

  test('should display validation errors when rollback mandatory fields are missing', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/singular/rollback').expect(200);
    const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    expect(csrfToken).to.not.be.undefined;

    await agent
      .post('/singular/rollback')
      .type('form')
      .send({
        _csrf: csrfToken,
      })
      .expect(res => expect(res.status).to.equal(400))
      .expect(res => expect(res.text).to.contain('Enter a hearing ID'))
      .expect(res => expect(res.text).to.contain('Enter a CCD Case Reference Number'))
      .expect(res => expect(res.text).not.to.contain('Select a status'));
  });

  test('should display validation errors when rollback field rules are broken', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/singular/rollback').expect(200);
    const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    expect(csrfToken).to.not.be.undefined;

    await agent
      .post('/singular/rollback')
      .type('form')
      .send({
        _csrf: csrfToken,
        hearingId: '1234567890123456789012345678901',
        caseRef: 'not-a-case-ref',
        notes: 'a'.repeat(5001),
      })
      .expect(res => expect(res.status).to.equal(400))
      .expect(res => expect(res.text).to.contain('Hearing ID must be 30 characters or fewer'))
      .expect(res => expect(res.text).to.contain('CCD Case Reference Number must be a 16-digit number'))
      .expect(res => expect(res.text).to.contain('Incident Number / Notes must be 5000 characters or fewer'));
  });

  test('should display a success message when rollback is submitted', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/singular/rollback').expect(200);
    const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

    expect(csrfToken).to.not.be.undefined;

    await agent
      .post('/singular/rollback')
      .type('form')
      .send({
        _csrf: csrfToken,
        hearingId: '12345678901234567890',
        caseRef: '1234567890123456',
        notes: 'Incident',
      })
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('Success'))
      .expect(res => expect(res.text).to.contain('Rollback was successful.'));
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
