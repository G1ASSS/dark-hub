'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/auth/dal'

/** Staff: update series metadata from the edit form. */
export async function updateSeriesAction(id: string, formData: FormData) {
  await requireAdmin()
  const status = String(formData.get('status') ?? 'DRAFT')
  await prisma.series.update({
    where: { id },
    data: {
      title: String(formData.get('title') ?? '').slice(0, 120),
      description: String(formData.get('description') ?? '') || null,
      thumbnail: String(formData.get('thumbnail') ?? '') || null,
      coverImage: String(formData.get('coverImage') ?? '') || null,
      status: status === 'PUBLISHED' ? 'PUBLISHED' : status === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT',
    },
  })
  revalidatePath(`/admin/series/${id}`)
  revalidatePath('/admin/series')
  redirect(`/admin/series/${id}`)
}
