export function getUploadRoot(): string {
  // Default requested for local Windows development.
  // Override via `UPLOAD_ROOT` to support other environments.
  return process.env.UPLOAD_ROOT || 'D:\\file\\OurStory';
}
