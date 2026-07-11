export interface FeedPost {
  feedPostId: number
  authorId: number
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
