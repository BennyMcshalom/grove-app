import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

/** The same three rules the sign-up screen shows under the password field. */
export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");
