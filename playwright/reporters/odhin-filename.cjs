/* global module */

function normalizeOdhinReportFilename(filename = 'index.html') {
  return `${filename.replaceAll('.html', '').replaceAll('.htm', '').replaceAll('.', '_').replaceAll(' ', '_')}.html`;
}

module.exports = { normalizeOdhinReportFilename };
