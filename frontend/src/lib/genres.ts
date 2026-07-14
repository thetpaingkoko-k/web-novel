/**
 * Canonical book genres. These strings are the backend `Genre` enum names and
 * are sent/received verbatim over the API (book create/update payloads, the
 * `GET /books?genre=` browse filter, and book list/detail responses). Do not
 * localise the values — only their display labels are translated, via
 * `genreLabelKey` against the `genres.*` i18n namespace.
 */
export const GENRES = [
  "Fantasy",
  "Romance",
  "SciFi",
  "Mystery",
  "Drama",
  "Action",
  "Adventure",
  "Horror",
  "Thriller",
  "Historical",
  "SliceOfLife",
  "Comedy",
  "MartialArts",
  "Xianxia",
  "Isekai",
] as const

export type Genre = (typeof GENRES)[number]

/** i18n key for a genre's display label (e.g. `genres.SciFi`). */
export function genreLabelKey(genre: string): string {
  return `genres.${genre}`
}
