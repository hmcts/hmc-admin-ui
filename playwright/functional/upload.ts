export function createUploadFile(
  name: string,
  mimeType: string,
  contents: string
): { name: string; mimeType: string; buffer: Buffer } {
  return { name, mimeType, buffer: Buffer.from(contents) };
}
