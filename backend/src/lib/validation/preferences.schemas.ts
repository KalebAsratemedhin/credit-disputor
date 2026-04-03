import { z } from "zod";

/** Keys are preference definition slugs; validated against active rows in the service. */
export const patchPreferencesBodySchema = z
  .record(z.string(), z.boolean())
  .superRefine((obj, ctx) => {
    if (Object.keys(obj).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one preference key is required",
      });
    }
  });

export type PatchPreferencesBody = z.infer<typeof patchPreferencesBodySchema>;
