import { expect } from 'chai';
import request from 'supertest';

import { app } from '../../main/app';

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
    test.each([undefined, 'invalid-token', ['invalid-token']])(
      'should reject an invalid CSRF token: %j',
      async token => {
        const agent = request.agent(app);
        await agent.get('/').expect(200);

        await agent.post('/').send({ _csrf: token, requestType: 'bulk' }).expect(403);
      }
    );

    test('should reject a CSRF token from another session', async () => {
      const firstAgent = request.agent(app);
      const firstResponse = await firstAgent.get('/').expect(200);
      const token = firstResponse.text.match(/name="_csrf" value="([^"]+)"/)?.[1];
      expect(token).to.be.a('string');

      const secondAgent = request.agent(app);
      await secondAgent.get('/').expect(200);
      await secondAgent.post('/').send({ _csrf: token, requestType: 'bulk' }).expect(403);
    });

    test('should accept a CSRF token in the existing header', async () => {
      const agent = request.agent(app);
      const response = await agent.get('/').expect(200);
      const token = response.text.match(/name="_csrf" value="([^"]+)"/)?.[1];
      expect(token).to.be.a('string');
      if (!token) {
        throw new Error('Expected a CSRF token');
      }

      await agent.post('/').set('x-csrf-token', token).send({ requestType: 'bulk' }).expect(303);
    });

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
