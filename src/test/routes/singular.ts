import { expect } from 'chai';
import request from 'supertest';

import { app } from '../../main/app';

/* eslint-disable jest/expect-expect */
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
        .expect(res => expect(res.text).to.contain('href="/"'))
        .expect(res => expect(res.text).not.to.contain('There is a problem'));
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

    test('should display a validation error when no singular request type is selected', async () => {
      const agent = request.agent(app);
      const getResponse = await agent.get('/singular').expect(200);
      const csrfToken = getResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];

      expect(csrfToken).to.not.be.undefined;

      await agent
        .post('/singular')
        .type('form')
        .send({
          _csrf: csrfToken,
        })
        .expect(res => expect(res.status).to.equal(400))
        .expect(res => expect(res.text).to.contain('There is a problem'))
        .expect(res => expect(res.text).to.contain('Select a singular request type'))
        .expect(res =>
          expect(res.text).to.contain('aria-describedby="singular-request-type-hint singular-request-type-error"')
        );
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

  test('should redirect to the singular response page when the final state transition is submitted', async () => {
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
      .expect(res => expect(res.status).to.equal(303))
      .expect(res => expect(res.headers.location).to.equal('/singular/response'));

    await agent
      .get('/singular/response')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('Final state transition'))
      .expect(res => expect(res.text).to.contain('request unsuccessful'))
      .expect(res => expect(res.text).to.contain('Hearing ID'))
      .expect(res => expect(res.text).to.contain('12345678901234567890'))
      .expect(res => expect(res.text).to.contain('govuk-error-message'))
      .expect(res => expect(res.text).to.contain('No response message returned'))
      .expect(res => expect(res.text).not.to.contain('Singular request response'))
      .expect(res => expect(res.text).to.contain('Return to Support tools'))
      .expect(res => expect(res.text).to.contain('Make another singular request'))
      .expect(res => expect(res.text).to.contain('href="/"'));
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

  test('should redirect to the singular response page when rollback is submitted', async () => {
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
      .expect(res => expect(res.status).to.equal(303))
      .expect(res => expect(res.headers.location).to.equal('/singular/response'));

    await agent
      .get('/singular/response')
      .expect(res => expect(res.status).to.equal(200))
      .expect(res => expect(res.text).to.contain('Rollback'))
      .expect(res => expect(res.text).to.contain('request unsuccessful'))
      .expect(res => expect(res.text).to.contain('Hearing ID'))
      .expect(res => expect(res.text).to.contain('12345678901234567890'))
      .expect(res => expect(res.text).to.contain('govuk-error-message'))
      .expect(res => expect(res.text).to.contain('No response message returned'))
      .expect(res => expect(res.text).not.to.contain('Singular request response'))
      .expect(res => expect(res.text).to.contain('Return to Support tools'))
      .expect(res => expect(res.text).to.contain('Make another singular request'))
      .expect(res => expect(res.text).to.contain('href="/"'));
  });
});
