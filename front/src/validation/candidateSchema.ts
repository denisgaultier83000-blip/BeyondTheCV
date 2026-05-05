import { z } from "zod";

export const ExperienceSchema = z.object({
  id: z.union([z.number(), z.string()]),
  role: z.string().min(1, "Role is required"),
  company: z.string().min(1, "Company is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
});

export const EducationSchema = z.object({
  id: z.union([z.number(), z.string()]),
  degree: z.string().min(1, "Degree is required"),
  school: z.string().min(1, "School is required"),
  year: z.string().min(1, "Year is required"),
});

export const AchievementSchema = z.object({
  id: z.union([z.number(), z.string()]),
  description: z.string().min(1, "Description is required"),
  metric: z.string().optional(),
});

export const FailureSchema = z.object({
  id: z.union([z.number(), z.string()]),
  description: z.string().min(1, "Description is required"),
  lesson: z.string().min(1, "Lesson learned is required"),
});

export const CandidateProfileSchema = z.object({
  // Personal Info
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  photo: z.string().optional(),
  language: z.string().default("en"),

  // Location & Mobility
  residence_country: z.string().length(2, "Use ISO2 code (e.g. US, FR)"),
  city: z.string().optional(),
  target_country: z.string().length(2, "Use ISO2 code").optional(),
  remote_preference: z.string().optional(),

  // Professional Identity
  current_role: z.string().optional(),
  current_company: z.string().optional(),
  target_role_primary: z.string().min(1, "Target role is required"),
  target_company: z.string().optional(),
  target_industry: z.string().optional(),
  contract_type: z.string().optional(),
  bio: z.string().optional(),

  // Skills & Traits
  skills: z.string().optional(),
  qualities: z.array(z.string()).optional(),
  flaws: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  free_text: z.string().optional(),
}).refine(data => data.target_company?.trim() || data.target_industry?.trim(), {
  message: "Either target_company or target_industry must be provided",
  path: ["target_industry"]
});

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;