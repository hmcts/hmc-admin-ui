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
        .expect(res => expect(res.headers.location).to.equal('/'));
    });
  });
});
