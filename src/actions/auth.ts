'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { registerSchema, loginSchema } from '@/lib/validators'
import { createSession, deleteSession } from '@/lib/auth/cookies'

export type AuthFormState =
  | {
      errors?: Record<string, string[] | undefined>
      message?: string
    }
  | undefined

function safeRedirectTarget(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/home'
}

export async function signup(state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = registerSchema.safeParse({
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    username: String(formData.get('username') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    ageConfirmed: formData.get('ageConfirmed') === 'on' || formData.get('ageConfirmed') === 'true',
    termsAccepted: formData.get('termsAccepted') === 'on' || formData.get('termsAccepted') === 'true',
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, username, password } = validated.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  })
  if (existing) {
    if (existing.email === email) {
      return { errors: { email: ['An account with this email already exists.'] } }
    }
    return { errors: { username: ['This username is taken.'] } }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      profile: { create: { displayName: username } },
      ageVerification: { create: { method: 'SELF_DECLARATION' } },
    },
    select: { id: true, role: true },
  })

  await createSession(user.id, user.role)
  redirect('/home')
}

export async function login(state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = loginSchema.safeParse({
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, password } = validated.data
  const callbackUrl = safeRedirectTarget(formData.get('callbackUrl'))

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true, isActive: true, isBanned: true },
  })

  // Generic message to avoid user enumeration
  if (!user || !user.passwordHash || !user.isActive) {
    return { message: 'Invalid email or password.' }
  }
  if (user.isBanned) {
    return { message: 'This account has been suspended. Contact support.' }
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return { message: 'Invalid email or password.' }
  }

  await createSession(user.id, user.role)
  redirect(callbackUrl)
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
