import { z } from "zod";

export const signupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

export const otpPurposeApiSchema = z.enum(["signup_verify"]);

export const verifyOtpBodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{4}$/, "code must be exactly 4 digits"),
  purpose: otpPurposeApiSchema,
});

export const verifyEmailBodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{4}$/, "code must be exactly 4 digits"),
});

export const resendOtpBodySchema = z
  .object({
    email: z.string().email(),
    purpose: otpPurposeApiSchema,
  });

export const resendEmailVerificationBodySchema = z.object({
  email: z.string().email(),
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
    password: z.string().min(8, "Password must be at least 8 characters"),
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
export type OtpPurposeApi = z.infer<typeof otpPurposeApiSchema>;
