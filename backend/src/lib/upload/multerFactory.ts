import fs from "fs";
import path from "path";
import type { Request } from "express";
import multer from "multer";
import { PUBLIC_UPLOAD_ROOT } from "../constants";
import type { FileUploadOptions } from "../types/upload";

export type { FileUploadFilenameContext, FileUploadOptions } from "../types/upload";

function normalizeClientMimeType(mimetype: string): string {
  return mimetype === "image/jpg" ? "image/jpeg" : mimetype;
}

function resolveUploadDir(subdir: string): string {
  const dir = path.join(PUBLIC_UPLOAD_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });

  return dir;
}

export function createUploadMiddleware(options: FileUploadOptions): multer.Multer {
  const destination = resolveUploadDir(options.subdir);

  return multer({
    storage: multer.diskStorage({
      destination: (_req: Request, _file, cb) => {
        cb(null, destination);
      },
      filename: (req: Request, file, cb) => {
        const userId = req.auth?.sub ?? "anon";
        const name = options.filename({ userId, originalname: file.originalname });

        cb(null, name);
      },
    }),
    limits: { fileSize: options.maxBytes },
    fileFilter: (_req, file, cb) => {
      const mime = normalizeClientMimeType(file.mimetype);
      const ok = options.allowedMimeTypes.test(mime);
      if (!ok && options.invalidMimeTypeError) {
        cb(options.invalidMimeTypeError(file));
        return;
      }
      cb(null, ok);
    },
  });
}

export function publicUploadPath(subdir: string, filename: string): string {
  return `/public/uploads/${subdir}/${filename}`;
}
