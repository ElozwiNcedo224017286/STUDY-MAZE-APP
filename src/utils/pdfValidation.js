const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_PAGES = 1;
const MAX_PAGES = 5;

/**
 * Check that the selected file is a PDF.
 */
export function validatePdfType(file) {
  if (!file) {
    return {
      valid: false,
      message: 'Please select a PDF file.',
    };
  }

  const mimeType = (file.mimeType || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();

  const isPdf =
    mimeType === 'application/pdf' ||
    fileName.endsWith('.pdf');

  if (!isPdf) {
    return {
      valid: false,
      message: 'Only PDF files are supported.',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Check that the PDF is within the allowed file-size limit.
 */
export function validateFileSize(file) {
  if (!file?.size) {
    return {
      valid: true,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message:
        'This PDF is too large. Please choose a file smaller than 10 MB.',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Check that a server-provided page count is between 1 and 5.
 *
 * The actual PDF page count will be determined server-side.
 */
export function validatePageCount(pageCount) {
  if (!Number.isInteger(pageCount)) {
    return {
      valid: false,
      message: 'We could not determine the number of pages in this PDF.',
    };
  }

  if (pageCount < MIN_PAGES || pageCount > MAX_PAGES) {
    return {
      valid: false,
      message: 'Your PDF must contain between 1 and 5 pages.',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Run the basic client-side PDF validation checks.
 */
export function validatePdf(file) {
  const typeResult = validatePdfType(file);

  if (!typeResult.valid) {
    return typeResult;
  }

  const sizeResult = validateFileSize(file);

  if (!sizeResult.valid) {
    return sizeResult;
  }

  return {
    valid: true,
  };
}

export const PDF_LIMITS = {
  MAX_FILE_SIZE,
  MIN_PAGES,
  MAX_PAGES,
};