import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { type ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  href?: string
  description?: string
  icon?: ReactNode
}

export function SectionHeader({ title, href, description, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold leading-none">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-medium text-cyan hover:opacity-80 transition-opacity"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}
