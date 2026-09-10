import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Generate runs offline with a placeholder; the real connection comes
  // from DATABASE_URL at migrate/runtime time.
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/darkhubb' },
})
