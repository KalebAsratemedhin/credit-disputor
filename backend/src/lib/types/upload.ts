import type { Express } from "express";

export type FileUploadFilenameContext = {
  userId: string;
  originalname: string;
};

export type FileUploadOptions = {
  subdir: string;
  maxBytes: number;
  allowedMimeTypes: RegExp;
  filename: (ctx: FileUploadFilenameContext) => string;
  /** If set, rejected MIME types invoke this and Multer passes the error to `next` (handler not run). */
  invalidMimeTypeError?: (file: Express.Multer.File) => Error;
};
