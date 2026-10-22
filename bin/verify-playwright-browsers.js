#!/usr/bin/env node

const fs = require('node:fs');
const { chromium } = require('playwright');

const browserName = process.argv[2] || 'chromium';
if (browserName !== 'chromium') {
  throw new Error(`Unsupported Playwright browser: ${browserName}`);
}

async function verifyChromium() {
  const executablePath = chromium.executablePath();
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Playwright Chromium executable is missing: ${executablePath}`);
  }

  const browser = await chromium.launch();
  await browser.close();
  console.log(`Verified Playwright Chromium at ${executablePath}`);
}

verifyChromium().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
