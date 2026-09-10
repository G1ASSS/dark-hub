import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  ageConfirmed: z.literal(true, { error: 'You must confirm you are 18+' }),
  termsAccepted: z.literal(true, { error: 'You must accept the terms' }),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().length(6).optional(),
})

export const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
})

export const videoUploadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().max(2000).optional(),
  categories: z.array(z.string()).min(1, 'Select at least one category').max(5),
  tags: z.array(z.string().max(50)).max(10),
  ageConfirmed: z.literal(true),
  consentConfirmed: z.literal(true),
})

export const reportSchema = z.object({
  targetType: z.enum(['VIDEO', 'USER', 'COMMENT']),
  targetId: z.string().min(1),
  reason: z.enum([
    'ILLEGAL_CONTENT', 'NON_CONSENSUAL', 'COPYRIGHT_INFRINGEMENT',
    'HARASSMENT', 'ABUSE', 'UNDERAGE_CONTENT', 'SPAM', 'OTHER',
  ]),
  details: z.string().max(2000).optional(),
})

export const copyrightRequestSchema = z.object({
  videoId: z.string().min(1),
  claimantName: z.string().min(2).max(100),
  claimantEmail: z.string().email(),
  organization: z.string().max(100).optional(),
  description: z.string().min(20, 'Please provide a detailed description').max(2000),
  workDescription: z.string().max(1000).optional(),
})

export const profileUpdateSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
})

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VideoUploadInput = z.infer<typeof videoUploadSchema>
export type ReportInput = z.infer<typeof reportSchema>
export type CopyrightRequestInput = z.infer<typeof copyrightRequestSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
