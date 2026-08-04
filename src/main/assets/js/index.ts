import '../scss/main.scss';
import { initAll } from 'govuk-frontend';

initAll();

document.querySelectorAll<HTMLFormElement>('[data-bulk-upload-form]').forEach(form => {
  const fileInput = form.querySelector<HTMLInputElement>('[data-bulk-upload-file]');
  const fileName = form.querySelector<HTMLElement>('[data-bulk-upload-file-name]');

  // simple listener to update file display name when file is selected
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];

    if (!file) {
      if (fileName) {
        fileName.innerText = 'No file selected';
      }

      return;
    }

    if (fileName) {
      fileName.innerText = file.name;
    }
  });
});
