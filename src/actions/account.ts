'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import { prisma } from '@/lib/db/prisma'
import { verifySession } from '@/lib/auth/dal'
import { deleteSession } from '@/lib/auth/cookies'
import { newTotpSecret, totpFor, verifyTotpCode } from '@/lib/auth/totp'
import { profileUpdateSchema, passwordChangeSchema, type AuthFormState } from '@/lib/validators'

async function me() {
  const session = await verifySession()
  if (!session) redirect('/login')
  return session
}

export async function updateProfile(state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { userId } = await me()
  const validated = profileUpdateSchema.safeParse({
    displayName: String(formData.get('displayName') ?? '') || undefined,
    bio: String(formData.get('bio') ?? '') || undefined,
    website: String(formData.get('website') ?? '') || undefined,
    location: String(formData.get('location') ?? '') || undefined,
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  await prisma.profile.upsert({
    where: { userId },
    update: { ...validated.data },
    create: { userId, ...validated.data },
  })
  return { message: 'Profile saved.' }
}

export async function changePassword(state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { userId } = await me()
  const validated = passwordChangeSchema.safeParse({
    currentPassword: String(formData.get('currentPassword') ?? ''),
    newPassword: String(formData.get('newPassword') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
  if (!user?.passwordHash || !(await bcrypt.compare(validated.data.currentPassword, user.passwordHash))) {
    return { message: 'Current password is incorrect.' }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(validated.data.newPassword, 12) },
  })
  return { message: 'Password changed.' }
}

function totpUri(email: string, secretBase32: string): string {
  return totpFor(email, secretBase32).toString()
}

/** Start 2FA: returns a QR code + manual key (not enabled until confirmed). */
export async function setupTwoFactor(): Promise<{ qr: string; manualKey: string }> {
  const { userId } = await me()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  const secret = newTotpSecret()
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } })
  const uri = totpUri(user!.email, secret)
  return { qr: await QRCode.toDataURL(uri), manualKey: secret }
}

export async function confirmTwoFactor(state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { userId } = await me()
  const code = String(formData.get('code') ?? '').replace(/\s/g, '')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorSecret: true },
  })
  if (!user?.twoFactorSecret) return { message: 'Start setup first.' }
  const ok = await verifyTotpCode(user.twoFactorSecret, user.email, code)
  if (!ok) return { message: 'Invalid code — try the current one from your app.' }
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } })
  return { message: 'Two-factor authentication is on.' }
}

export async function disableTwoFactor(state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { userId } = await me()
  const password = String(formData.get('password') ?? '')
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return { message: 'Password incorrect.' }
  }
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } })
  return { message: 'Two-factor authentication is off.' }
}

export async function deleteAccount(state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { userId } = await me()
  const password = String(formData.get('password') ?? '')
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return { message: 'Password incorrect.' }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false, deletedAt: new Date() },
  })
  await deleteSession()
  redirect('/')
}
