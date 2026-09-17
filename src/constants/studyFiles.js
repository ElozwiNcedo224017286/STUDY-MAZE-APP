export const STUDY_MATERIAL_TYPES = [
  '*/*',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/rtf',
  'application/rtf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.presentation',
];

const MIME_BY_EXT = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  rtf: 'text/rtf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  odt: 'application/vnd.oasis.opendocument.text',
  odp: 'application/vnd.oasis.opendocument.presentation',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  m4a: 'audio/aac',
  aac: 'audio/aac',
  caf: 'audio/aac',
  mp3: 'audio/mp3',
  wav: 'audio/wav',
  mp4: 'audio/aac',
};

export function mimeFromFileName(name, fallback = 'application/pdf') {
  const ext = String(name || '').split('.').pop()?.toLowerCase();
  return MIME_BY_EXT[ext] || fallback;
}
