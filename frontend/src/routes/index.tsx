import { createBrowserRouter } from "react-router"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminLayout } from "@/features/admin/admin-layout"
import { AnalyticsPage } from "@/features/admin/pages/analytics-page"
import { AuditLogPage } from "@/features/admin/pages/audit-log-page"
import { ChaptersQueuePage } from "@/features/admin/pages/chapters-queue-page"
import { PaymentsQueuePage } from "@/features/admin/pages/payments-queue-page"
import { ReportsQueuePage } from "@/features/admin/pages/reports-queue-page"
import { UpgradeRequestsPage } from "@/features/admin/pages/upgrade-requests-page"
import { UsersManagementPage } from "@/features/admin/pages/users-management-page"
import { UsersQueuePage } from "@/features/admin/pages/users-queue-page"
import { WalletsPage } from "@/features/admin/pages/wallets-page"
import { WithdrawalsQueuePage } from "@/features/admin/pages/withdrawals-queue-page"
import { AccountPage } from "@/features/auth/account-page"
import { LoginPage } from "@/features/auth/login-page"
import { RegisterPage } from "@/features/auth/register-page"
import { VerifyEmailPage } from "@/features/auth/verify-email-page"
import { AuthorApplicationPage } from "@/features/authors/author-application-page"
import { MyListPage } from "@/features/bookmarks/my-list-page"
import { AuthorProfilePage } from "@/features/authors/author-profile-page"
import { AuthorDashboardPage } from "@/features/author/author-dashboard-page"
import { BookEditorPage } from "@/features/author/book-editor-page"
import { ChapterEditorPage } from "@/features/author/chapter-editor-page"
import { BookDetailPage } from "@/features/books/book-detail-page"
import { BooksBrowsePage } from "@/features/books/books-browse-page"
import { HomePage } from "@/features/home/home-page"
import { NotificationsPage } from "@/features/notifications/notifications-page"
import { ChapterReaderPage } from "@/features/chapters/chapter-reader-page"
import { DebateListPage } from "@/features/debates/debate-list-page"
import { DebateThreadPage } from "@/features/debates/debate-thread-page"
import { EarningsDashboardPage } from "@/features/earnings/earnings-dashboard-page"
import { AuthorFeedPage } from "@/features/feed/author-feed-page"
import { MySubscriptionsPage } from "@/features/subscriptions/my-subscriptions-page"
import { SubscribePage } from "@/features/subscriptions/subscribe-page"
import { ProtectedRoute } from "./protected-route"

const AUTHOR_ROLES = ["hobbyist_author", "professional_author"] as const

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "books", element: <BooksBrowsePage /> },
      { path: "books/:bookId", element: <BookDetailPage /> },
      { path: "books/:bookId/debates", element: <DebateListPage /> },
      { path: "debates/:threadId", element: <DebateThreadPage /> },
      { path: "chapters/:chapterId", element: <ChapterReaderPage /> },
      { path: "authors/:authorId", element: <AuthorProfilePage /> },
      { path: "authors/:authorId/feed", element: <AuthorFeedPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      {
        // Every signed-in user owns their own account page, regardless of role.
        element: <ProtectedRoute />,
        children: [
          { path: "account", element: <AccountPage /> },
          { path: "notifications", element: <NotificationsPage /> },
        ],
      },
      {
        // Reader-only: bookmarks and applying to become an author.
        element: <ProtectedRoute allowedRoles={["reader"]} />,
        children: [
          { path: "my-list", element: <MyListPage /> },
          { path: "authors/apply", element: <AuthorApplicationPage /> },
        ],
      },
      {
        // Subscribing is open to readers and authors (authors may subscribe to
        // other authors); only admins are excluded.
        element: <ProtectedRoute allowedRoles={["reader", ...AUTHOR_ROLES]} />,
        children: [
          { path: "authors/:authorId/subscribe", element: <SubscribePage /> },
          { path: "subscriptions/me", element: <MySubscriptionsPage /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={[...AUTHOR_ROLES]} />,
        children: [
          { path: "author/books", element: <AuthorDashboardPage /> },
          { path: "author/books/new", element: <BookEditorPage /> },
          { path: "author/books/:bookId/edit", element: <BookEditorPage /> },
          { path: "author/books/:bookId/chapters/new", element: <ChapterEditorPage /> },
          { path: "author/chapters/:chapterId/edit", element: <ChapterEditorPage /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["professional_author"]} />,
        children: [{ path: "author/earnings", element: <EarningsDashboardPage /> }],
      },
    ],
  },
  {
    // Admin runs in its own dedicated full-screen console shell (own sidebar +
    // top bar, no marketing chrome), so it lives outside the public AppLayout.
    element: <ProtectedRoute allowedRoles={["admin"]} />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <UsersQueuePage /> },
          { path: "users", element: <UsersQueuePage /> },
          { path: "manage-users", element: <UsersManagementPage /> },
          { path: "upgrade-requests", element: <UpgradeRequestsPage /> },
          { path: "chapters", element: <ChaptersQueuePage /> },
          { path: "payments", element: <PaymentsQueuePage /> },
          { path: "withdrawals", element: <WithdrawalsQueuePage /> },
          { path: "wallets", element: <WalletsPage /> },
          { path: "analytics", element: <AnalyticsPage /> },
          { path: "reports", element: <ReportsQueuePage /> },
          { path: "audit", element: <AuditLogPage /> },
        ],
      },
    ],
  },
])
