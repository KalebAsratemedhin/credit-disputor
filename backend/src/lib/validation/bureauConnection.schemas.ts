import { z } from "zod";

const mmddyyyy = z
  .string()
  .regex(
    /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{4}$/,
    "dob must be MMDDYYYY (8 digits)"
  );

const ssn = z
  .string()
  .min(9)
  .max(11)
  .regex(/^[0-9-]+$/, "ssn must be digits with optional hyphens");

const usState = z 
  .string()
  .length(2)
  .regex(/^[A-Za-z]{2}$/, "state must be a 2-letter code")
  .transform((s) => s.toUpperCase());

export const bureauConnectionStartBodySchema = z.object({
  institutionId: z.string().max(120).optional(),
});

export const bureauConnectionIdentityBodySchema = z.object({
  firstName: z.string().min(1).max(32),
  lastName: z.string().min(1).max(32),
  middleName: z.string().min(1).max(32).optional(),
  dob: mmddyyyy,
  ssn,
  email: z.string().email().max(60).optional(),
});

export const bureauConnectionAddressBodySchema = z
  .object({
    street: z.string().min(1).max(60),
    city: z.string().min(1).max(38),
    state: usState,
    zip: z.string().min(5).max(10).regex(/^[\d-]+$/, "zip must be digits with optional hyphen"),
    addressOverTwoYears: z.boolean(),
    previousStreet: z.string().min(1).max(60).optional(),
    previousCity: z.string().min(1).max(38).optional(),
    previousState: usState.optional(),
    previousZip: z
      .string()
      .min(5)
      .max(10)
      .regex(/^[\d-]+$/)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.addressOverTwoYears) {
      if (!data.previousStreet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "previousStreet is required when addressOverTwoYears is false",
          path: ["previousStreet"],
        });
      }
      if (!data.previousCity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "previousCity is required when addressOverTwoYears is false",
          path: ["previousCity"],
        });
      }
      if (!data.previousState) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "previousState is required when addressOverTwoYears is false",
          path: ["previousState"],
        });
      }
      if (!data.previousZip) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "previousZip is required when addressOverTwoYears is false",
          path: ["previousZip"],
        });
      }
    }
  });

export const bureauConnectionConsentBodySchema = z.object({
  agreementVersion: z.string().min(1).max(64),
  textHash: z.string().max(128).optional(),
});

export const bureauConnectionKiqAnswersBodySchema = z.object({
  answers: z.array(z.number().int().min(1)).min(1),
});

export const bureauConnectionIdParamSchema = z.object({
  connectionId: z.string().cuid(),
});

export type BureauConnectionStartBody = z.infer<typeof bureauConnectionStartBodySchema>;
export type BureauConnectionIdentityBody = z.infer<typeof bureauConnectionIdentityBodySchema>;
export type BureauConnectionAddressBody = z.infer<typeof bureauConnectionAddressBodySchema>;
export type BureauConnectionConsentBody = z.infer<typeof bureauConnectionConsentBodySchema>;
export type BureauConnectionKiqAnswersBody = z.infer<typeof bureauConnectionKiqAnswersBodySchema>;
