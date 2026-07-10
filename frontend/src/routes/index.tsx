import { createBrowserRouter } from "react-router"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminLayout } from "@/features/admin/admin-layout"
import { AuditLogPage } from "@/features/admin/pages/audit-log-page"
import { ChaptersQueuePage } from "@/features/admin/pages/chapters-queue-page"
import { PaymentsQueuePage } from "@/features/admin/pages/payments-queue-page"
import { ReportsQueuePage } from "@/features/admin/pages/reports-queue-page"
import { UsersManagementPage } from "@/features/admin/pages/users-management-page"
import { UsersQueuePage } from "@/features/admin/pages/users-queue-page"
import { WalletsPage } from "@/features/admin/pages/wallets-page"
import { WithdrawalsQueuePage } from "@/features/admin/pages/withdrawals-queue-page"
import { AccountPage } from "@/features/auth/account-page"
import { LoginPage } from "@/features/auth/login-page"
import { RegisterPage } from "@/features/auth/register-page"
import { AuthorApplicationPage } from "@/features/authors/author-application-page"
import { MyListPage } from "@/features/bookmarks/my-list-page"
import { AuthorProfilePage } from "@/features/authors/author-profile-page"
import { AuthorSettingsPage } from "@/features/authors/author-settings-page"
import { AuthorDashboardPage } from "@/features/author/author-dashboard-page"
import { BookEditorPage } from "@/features/author/book-editor-page"
import { ChapterEditorPage } from "@/features/author/chapter-editor-page"
import { BookDetailPage } from "@/features/books/book-detail-page"
import { BooksBrowsePage } from "@/features/books/books-browse-page"
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
      { index: true, element: <BooksBrowsePage /> },
      { path: "books", element: <BooksBrowsePage /> },
      { path: "books/:bookId", element: <BookDetailPage /> },
      { path: "books/:bookId/debates", element: <DebateListPage /> },
      { path: "debates/:threadId", element: <DebateThreadPage /> },
      { path: "chapters/:chapterId", element: <ChapterReaderPage /> },
      { path: "authors/:authorId", element: <AuthorProfilePage /> },
      { path: "authors/:authorId/feed", element: <AuthorFeedPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "account", element: <AccountPage /> },
          { path: "my-list", element: <MyListPage /> },
          { path: "authors/apply", element: <AuthorApplicationPage /> },
          { path: "authors/:authorId/subscribe", element: <SubscribePage /> },
          { path: "subscriptions/me", element: <MySubscriptionsPage /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={[...AUTHOR_ROLES]} />,
        children: [
          { path: "author/books", element: <AuthorDashboardPage /> },
          { path: "author/settings", element: <AuthorSettingsPage /> },
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
      {
        element: <ProtectedRoute allowedRoles={["admin"]} />,
        children: [
          {
            path: "admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <UsersQueuePage /> },
              { path: "users", element: <UsersQueuePage /> },
              { path: "manage-users", element: <UsersManagementPage /> },
              { path: "chapters", element: <ChaptersQueuePage /> },
              { path: "payments", element: <PaymentsQueuePage /> },
              { path: "withdrawals", element: <WithdrawalsQueuePage /> },
              { path: "wallets", element: <WalletsPage /> },
              { path: "reports", element: <ReportsQueuePage /> },
              { path: "audit", element: <AuditLogPage /> },
            ],
          },
        ],
      },
    ],
  },
])
