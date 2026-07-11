import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FeedPost } from "@/types/feed"

export function FeedPostCard({ post }: { post: FeedPost }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{post.title}</CardTitle>
          {post.premiumOnly && <Badge>{t("feed.premiumOnlyBadge")}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(post.publishedAt).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      </CardContent>
    </Card>
  )
}
