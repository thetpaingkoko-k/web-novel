import { Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FeedPost } from "@/types/feed"
import { useDeleteFeedPost } from "../api"

export function FeedPostCard({ post, canDelete = false }: { post: FeedPost; canDelete?: boolean }) {
  const { t } = useTranslation()
  const deletePost = useDeleteFeedPost(post.authorId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{post.title}</CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            {post.premiumOnly && <Badge>{t("feed.premiumOnlyBadge")}</Badge>}
            {canDelete && (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={t("feed.deletePost")}
                    disabled={deletePost.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                }
                title={t("feed.deleteConfirmTitle")}
                description={t("feed.deleteConfirmBody")}
                confirmLabel={t("feed.deletePost")}
                icon={Trash2}
                onConfirm={() =>
                  deletePost.mutate(post.feedPostId, {
                    onSuccess: () => toast.success(t("feed.postDeleted")),
                    onError: () => toast.error(t("common.genericError")),
                  })
                }
              />
            )}
          </div>
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
