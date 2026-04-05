import { z } from "zod";
import {
  PASSWORD_MIN_LENGTH,
  PHONE_VERIFICATION_CODE_MAX_LENGTH,
  PHONE_VERIFICATION_CODE_MIN_LENGTH,
} from "../constants";

export const signupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  fullName: z.string().min(1, "fullName is required"),
  phoneNumber: z.string().min(1, "phoneNumber is required"),
});

export const signinBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "password is required"),
});

export const googleSignInBodySchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export const verifyEmailBodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{4}$/, "code must be exactly 4 digits"),
});

export const resendEmailVerificationBodySchema = z.object({
  email: z.string().email(),
});

export const verifyPhoneCodeOnlyBodySchema = z.object({
  code: z
    .string()
    .min(PHONE_VERIFICATION_CODE_MIN_LENGTH, "code is too short")
    .max(PHONE_VERIFICATION_CODE_MAX_LENGTH, "code is too long")
    .regex(/^\d+$/, "code must be numeric"),
});

export const signinWebauthnVerifyBodySchema = z
  .object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    type: z.literal("public-key"),
    response: z.object({
      clientDataJSON: z.string().min(1),
      authenticatorData: z.string().min(1),
      signature: z.string().min(1),
      userHandle: z.string().optional(),
    }),
    clientExtensionResults: z.record(z.unknown()).optional(),
  })
  .passthrough();
 

export const forgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

export const resetPasswordBodySchema = z
  .object({
    token: z.string().min(1, "token is required"),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    confirmPassword: z.string().min(1, "confirmPassword is required"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupBody = z.infer<typeof signupBodySchema>;
export const signinMfaVerifyBodySchema = z.object({
  kind: z.enum(["email_otp", "totp", "backup_code"]),
  code: z.string().min(1, "code is required"),
});

export type SigninBody = z.infer<typeof signinBodySchema>;
export type SigninMfaVerifyBody = z.infer<typeof signinMfaVerifyBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
