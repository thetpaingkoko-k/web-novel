import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Coffee,
  Compass,
  DoorOpen,
  Drama,
  Flame,
  Ghost,
  Heart,
  Landmark,
  Laugh,
  Mountain,
  Rocket,
  Search,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react"

/**
 * A characterful icon per canonical genre (see `lib/genres.ts`). Shared by the
 * home-page discovery tiles and the browse-page filter pills so the two read as
 * one visual language. Falls back to {@link BookOpen} for any unmapped genre.
 */
export const GENRE_ICON: Record<string, LucideIcon> = {
  Fantasy: Sparkles,
  Romance: Heart,
  SciFi: Rocket,
  Mystery: Search,
  Drama: Drama,
  Action: Zap,
  Adventure: Compass,
  Horror: Ghost,
  Thriller: Flame,
  Historical: Landmark,
  SliceOfLife: Coffee,
  Comedy: Laugh,
  MartialArts: Swords,
  Xianxia: Mountain,
  Isekai: DoorOpen,
}

export function genreIcon(genre: string): LucideIcon {
  return GENRE_ICON[genre] ?? BookOpen
}
