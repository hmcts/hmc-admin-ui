import axios from 'axios';
import { expect } from 'chai';
import * as cheerio from 'cheerio';

const testUrl = process.env.TEST_URL || 'http://localhost:3000';

describe('Smoke Test', () => {
  it('Home page has the expected heading', async () => {
    const res = await axios.get(testUrl, { headers: { 'Accept-Encoding': 'identity' } });
    const $ = cheerio.load(String(res.data));
    expect($('h1.govuk-heading-xl').text().trim()).to.equal('Admin UI - Support Tools');
  });
});
