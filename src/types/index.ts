// Dark Hubb - Shared TypeScript Types

export type Role = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN'

export type VideoStatus =
  | 'UPLOADING'
  | 'PROCESSING'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'HIDDEN'
  | 'REJECTED'
  | 'DELETED'

export type ReportReason =
  | 'ILLEGAL_CONTENT'
  | 'NON_CONSENSUAL'
  | 'COPYRIGHT_INFRINGEMENT'
  | 'HARASSMENT'
  | 'ABUSE'
  | 'UNDERAGE_CONTENT'
  | 'SPAM'
  | 'OTHER'

export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

// ---- UI / Mock data types ----

export interface VideoCardData {
  id: string
  title: string
  thumbnailUrl: string
  duration: number // seconds
  views: number
  publishedAt: string
  creator: {
    id: string
    slug: string
    displayName: string
    avatarUrl: string
    isVerified: boolean
  }
  categories: string[]
  status?: VideoStatus
}

export interface CreatorCardData {
  id: string
  slug: string
  displayName: string
  avatarUrl: string
  bannerUrl?: string
  bio?: string
  isVerified: boolean
  subscriberCount: number
  totalVideos: number
  totalViews: number
  website?: string
  socialLinks?: Record<string, string>
}

export interface CategoryData {
  id: string
  name: string
  slug: string
  imageUrl?: string
  videoCount: number
}

export interface CommentData {
  id: string
  body: string
  createdAt: string
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
  replies?: CommentData[]
}

export interface SearchFilters {
  query: string
  category?: string
  duration?: 'short' | 'medium' | 'long'
  uploadDate?: 'today' | 'week' | 'month' | 'year'
  sort?: 'relevance' | 'newest' | 'most_viewed' | 'most_liked'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface AuthUser {
  id: string
  email: string
  username: string
  role: Role
  emailVerified: boolean
  profile?: {
    displayName?: string
    avatarUrl?: string
  }
}
