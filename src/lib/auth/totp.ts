import 'server-only'
import { Secret, TOTP } from 'otpauth'

export function totpFor(email: string, secretBase32: string) {
  return new TOTP({
    issuer: 'Dark Hubb',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  })
}

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32
}

export async function verifyTotpCode(
  secretBase32: string,
  email: string,
  code: string
): Promise<boolean> {
  return totpFor(email, secretBase32).validate({ token: code.replace(/\s/g, ''), window: 1 }) !== null
}
