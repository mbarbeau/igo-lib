export class ImportError extends Error {}

export class ImportInvalidFileError extends ImportError {
  constructor() {
    super('Invalid file');
    Object.setPrototypeOf(this, ImportInvalidFileError.prototype);
  }
}

export class ImportUnreadableFileError extends ImportError {
  constructor() {
      super('Failed to read file');
      Object.setPrototypeOf(this, ImportUnreadableFileError.prototype);
  }
}

export class ImportNothingToImportError extends ImportError {
  constructor() {
      super('Nothing to import');
      Object.setPrototypeOf(this, ImportNothingToImportError.prototype);
  }
}

export class ImportSizeError extends ImportError {
  constructor() {
      super('File is too large');
      Object.setPrototypeOf(this, ImportNothingToImportError.prototype);
  }
}

export class ImportSRSError extends ImportError {
  constructor() {
      super('Invalid SRS definition');
      Object.setPrototypeOf(this, ImportNothingToImportError.prototype);
  }
}

export class ImportOgreServerError extends ImportError {
  constructor() {
      super('Error 500 with OGRE in convert shapefile');
      Object.setPrototypeOf(this, ImportOgreServerError.prototype);
  }
}
