import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "../constants";

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    confirmPassword: z.string().min(1, "confirmPassword is required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "passwords do not match",
    path: ["confirmPassword"],
  });

export const patchProfileBodySchema = z
  .object({
    fullName: z.string().min(1).optional(),
    phoneNumber: z.union([z.string().min(1), z.null()]).optional(),
  })
  .refine((d) => d.fullName !== undefined || d.phoneNumber !== undefined, {
    message: "At least one of fullName or phoneNumber is required",
    path: ["fullName"],
  });

export const totpVerifyBodySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "code must be 6 digits"),
});

export const webauthnRegisterVerifyBodySchema = z.object({
  nickname: z.string().min(1, "nickname is required").max(120),
  response: z.record(z.unknown()),
});
