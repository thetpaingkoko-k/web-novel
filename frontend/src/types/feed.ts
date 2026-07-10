export interface FeedPost {
  feedPostId: number
  authorId: number
  title: string
  content: string
  isPremiumOnly: boolean
  publishedAt: string
}

export interface FeedPostRequest {
  title: string
  content: string
  isPremiumOnly: boolean
}
