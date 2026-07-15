import { ROLES } from "@/server/authz/policy";
import { z } from "zod";

// One definition. The login form, the API route, and the CSV importer
// all validate against THIS — so they can never drift apart.

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(255)
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Password is too long") // argon2 gets slow on huge inputs — a DoS vector
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"), // don't leak rules at login
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ROLES, { message: "Choose a valid role" }),
});
