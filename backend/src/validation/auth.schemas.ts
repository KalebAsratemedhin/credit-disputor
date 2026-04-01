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

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export type SignupBody = z.infer<typeof signupBodySchema>;
export type SigninBody = z.infer<typeof signinBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
