import type { LucideIcon } from "lucide-react"
import {
  Anchor,
  Atom,
  Baby,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Cat,
  Clapperboard,
  Cloud,
  Coffee,
  Compass,
  Crown,
  DoorOpen,
  Drama,
  Feather,
  Flame,
  Gamepad2,
  Ghost,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Laugh,
  Leaf,
  Moon,
  Mountain,
  Music,
  Palette,
  Puzzle,
  Rocket,
  Search,
  Shield,
  Skull,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Utensils,
  Zap,
} from "lucide-react"

/**
 * The icons an admin can pick for a category, keyed by the name stored in
 * `categories.icon`. Deliberately a fixed registry rather than "any lucide icon": the
 * backend stores only a name, so an unknown or retired value can do nothing worse than
 * fall back to {@link BookOpen}, and the bundle only carries what's listed here.
 *
 * Adding an icon is additive — append it and existing categories are unaffected.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Heart,
  Rocket,
  Search,
  Drama,
  Zap,
  Compass,
  Ghost,
  Flame,
  Landmark,
  Coffee,
  Laugh,
  Swords,
  Mountain,
  DoorOpen,
  Skull,
  Crown,
  Moon,
  Star,
  Shield,
  Anchor,
  Atom,
  Baby,
  Bot,
  Brain,
  Briefcase,
  Cat,
  Clapperboard,
  Cloud,
  Feather,
  Gamepad2,
  Globe,
  GraduationCap,
  Leaf,
  Music,
  Palette,
  Puzzle,
  Trophy,
  Utensils,
  BookOpen,
}

/** The icon names in registry order — what the admin picker renders. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)

/**
 * Resolve a category's icon. Falls back to {@link BookOpen} when the category has no
 * icon set or names one this build doesn't know about.
 */
export function categoryIcon(iconName: string | null | undefined): LucideIcon {
  return (iconName && CATEGORY_ICONS[iconName]) || BookOpen
}
