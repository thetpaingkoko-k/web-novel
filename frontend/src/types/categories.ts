/**
 * Admin-managed book categories (formerly the hardcoded genre enum).
 *
 * `code` is the immutable wire value: it is what book payloads carry, what the
 * `GET /books?genre=` browse filter takes, and what `/books?genre=` deep links use.
 * `name` is the admin-editable display label — see `categoryLabel` in
 * `features/categories/api.ts` for how it combines with the `genres.*` translations.
 */
export interface Category {
  categoryId: number
  code: string
  name: string
  /**
   * Icon name from `lib/category-icons.ts`, or null for the generic fallback. The API
   * stores only the name, so an unknown value degrades to the fallback rather than breaking.
   */
  icon: string | null
  active: boolean
  sortOrder: number
  /** Books filed under this category. Only populated on the admin listing; null elsewhere. */
  bookCount: number | null
}

/** Body for `POST /admin/categories`. The code is permanent once created. */
export interface CategoryCreateRequest {
  code: string
  name: string
  icon: string | null
  sortOrder?: number
}

/** Body for `PUT /admin/categories/{id}`. The code is immutable and not accepted. */
export interface CategoryUpdateRequest {
  name: string
  icon: string | null
  active: boolean
  sortOrder?: number
}
