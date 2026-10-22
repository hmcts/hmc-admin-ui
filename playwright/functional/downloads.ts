import { type Download } from '@playwright/test';

export async function readDownloadedText(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Expected a readable downloaded file.');
  }

  let contents = '';
  for await (const chunk of stream) {
    contents += chunk.toString();
  }

  return contents;
}
