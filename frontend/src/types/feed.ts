export interface FeedPost {
  feedPostId: number
  authorId: number
  authorUsername: string | null
  authorAvatarUrl: string | null
  title: string
  content: string
  premiumOnly: boolean
  publishedAt: string
}

export interface FeedPostRequest {
  title: string
  content: string
  premiumOnly: boolean
}
