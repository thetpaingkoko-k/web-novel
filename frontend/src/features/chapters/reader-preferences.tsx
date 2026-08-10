import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import { RotateCcw, Type } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type ReaderFontSize = "sm" | "md" | "lg" | "xl"
export type ReaderWidth = "narrow" | "comfortable" | "wide"
export type ReaderTheme = "light" | "dim" | "dark"

export interface ReaderPreferences {
  fontSize: ReaderFontSize
  width: ReaderWidth
  theme: ReaderTheme
}

/** Reading surface colours — warm paper/ink tones, kept independent of the app
 * light/dark theme so the reader controls the page. Matches the editorial
 * identity: warm paper by day, warm charcoal by night (never cool/violet). */
export interface ReaderSurface {
  /** Inline style for the reading panel (background + text + border colours). */
  style: CSSProperties
  /** Inline style for muted meta text placed on the surface. */
  mutedStyle: CSSProperties
}

// v2: the warm "sepia" reading theme was removed in favour of the cool "dim"
// slate theme. Bumping the key drops any stored 'sepia' value so it can't leak
// into the new union; prefs fall back to defaults gracefully.
const STORAGE_KEY = "webnovel-reader-prefs-v2"

const DEFAULTS: ReaderPreferences = {
  fontSize: "md",
  width: "comfortable",
  theme: "light",
}

const FONT_SIZE_REM: Record<ReaderFontSize, string> = {
  sm: "1.0625rem",
  md: "1.1875rem",
  lg: "1.3125rem",
  xl: "1.5rem",
}

const WIDTH_REM: Record<ReaderWidth, string> = {
  narrow: "38rem",
  comfortable: "46rem",
  wide: "60rem",
}

const SURFACES: Record<
  ReaderTheme,
  { background: string; color: string; muted: string; border: string }
> = {
  // Warm tones only — soft paper whites and warm sepia/charcoal darks.
  light: { background: "#faf8f2", color: "#26231d", muted: "#736d60", border: "#eae6db" },
  dim: { background: "#33302a", color: "#e2ded1", muted: "#a49d8d", border: "#454139" },
  dark: { background: "#1a1815", color: "#dcd7cb", muted: "#8f897b", border: "#2b2822" },
}

const FONT_SIZES: ReaderFontSize[] = ["sm", "md", "lg", "xl"]
const WIDTHS: ReaderWidth[] = ["narrow", "comfortable", "wide"]
const THEMES: ReaderTheme[] = ["light", "dim", "dark"]

function isKey<T extends string>(keys: T[], value: unknown): value is T {
  return typeof value === "string" && (keys as string[]).includes(value)
}

function load(): ReaderPreferences {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<ReaderPreferences>
    return {
      fontSize: isKey(FONT_SIZES, parsed.fontSize) ? parsed.fontSize : DEFAULTS.fontSize,
      width: isKey(WIDTHS, parsed.width) ? parsed.width : DEFAULTS.width,
      theme: isKey(THEMES, parsed.theme) ? parsed.theme : DEFAULTS.theme,
    }
  } catch {
    return DEFAULTS
  }
}

export interface UseReaderPreferences {
  prefs: ReaderPreferences
  setFontSize: (value: ReaderFontSize) => void
  setWidth: (value: ReaderWidth) => void
  setTheme: (value: ReaderTheme) => void
  reset: () => void
  /** Inline font-size for the `.reading-prose` element (scales the body text). */
  fontSizeValue: string
  /** Max-width for the reading column. */
  maxWidthValue: string
  /** Colours for the reading surface, independent of the app theme. */
  surface: ReaderSurface
}

/** Reader-controlled, localStorage-persisted reading preferences. */
export function useReaderPreferences(): UseReaderPreferences {
  const [prefs, setPrefs] = useState<ReaderPreferences>(load)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Ignore write failures (private mode / quota); prefs still apply this session.
    }
  }, [prefs])

  const setFontSize = useCallback(
    (fontSize: ReaderFontSize) => setPrefs((p) => ({ ...p, fontSize })),
    []
  )
  const setWidth = useCallback((width: ReaderWidth) => setPrefs((p) => ({ ...p, width })), [])
  const setTheme = useCallback((theme: ReaderTheme) => setPrefs((p) => ({ ...p, theme })), [])
  const reset = useCallback(() => setPrefs(DEFAULTS), [])

  const surface = useMemo<ReaderSurface>(() => {
    const s = SURFACES[prefs.theme]
    return {
      style: { backgroundColor: s.background, color: s.color, borderColor: s.border },
      mutedStyle: { color: s.muted },
    }
  }, [prefs.theme])

  return {
    prefs,
    setFontSize,
    setWidth,
    setTheme,
    reset,
    fontSizeValue: FONT_SIZE_REM[prefs.fontSize],
    maxWidthValue: WIDTH_REM[prefs.width],
    surface,
  }
}

function Segment({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={cn(
        "flex flex-1 items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "bg-background text-foreground ring-1 ring-foreground/10 shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

const FONT_GLYPH: Record<ReaderFontSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
}

const THEME_SWATCH: Record<ReaderTheme, CSSProperties> = {
  light: { backgroundColor: SURFACES.light.background, borderColor: SURFACES.light.border },
  dim: { backgroundColor: SURFACES.dim.background, borderColor: SURFACES.dim.border },
  dark: { backgroundColor: SURFACES.dark.background, borderColor: SURFACES.dark.border },
}

/** The unobtrusive "Aa" popover of reading preferences. */
export function ReaderControls({ controller }: { controller: UseReaderPreferences }) {
  const { t } = useTranslation()
  const { prefs, setFontSize, setWidth, setTheme, reset } = controller

  const sizeLabels: Record<ReaderFontSize, string> = {
    sm: t("chapters.sizeSmall"),
    md: t("chapters.sizeMedium"),
    lg: t("chapters.sizeLarge"),
    xl: t("chapters.sizeXLarge"),
  }
  const widthLabels: Record<ReaderWidth, string> = {
    narrow: t("chapters.widthNarrow"),
    comfortable: t("chapters.widthComfortable"),
    wide: t("chapters.widthWide"),
  }
  const themeLabels: Record<ReaderTheme, string> = {
    light: t("chapters.themeLight"),
    dim: t("chapters.themeDim"),
    dark: t("chapters.themeDark"),
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" aria-label={t("chapters.readerSettings")}>
          <Type className="h-4 w-4" aria-hidden="true" />
          <span className="font-semibold">Aa</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-0.5">
            <span className="brand-gradient flex h-6 w-6 items-center justify-center rounded-md text-[0.7rem] font-bold text-primary-foreground">
              Aa
            </span>
            <span className="font-display text-sm font-semibold">
              {t("chapters.readerSettings")}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("chapters.textSize")}
            </span>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {FONT_SIZES.map((size) => (
                <Segment
                  key={size}
                  active={prefs.fontSize === size}
                  onClick={() => setFontSize(size)}
                  label={sizeLabels[size]}
                >
                  <span className={FONT_GLYPH[size]}>A</span>
                </Segment>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("chapters.readingWidth")}
            </span>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {WIDTHS.map((width) => (
                <Segment
                  key={width}
                  active={prefs.width === width}
                  onClick={() => setWidth(width)}
                  label={widthLabels[width]}
                >
                  <span className="text-xs">{widthLabels[width]}</span>
                </Segment>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("chapters.readingTheme")}
            </span>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {THEMES.map((theme) => (
                <Segment
                  key={theme}
                  active={prefs.theme === theme}
                  onClick={() => setTheme(theme)}
                  label={themeLabels[theme]}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full border"
                      style={THEME_SWATCH[theme]}
                      aria-hidden="true"
                    />
                    <span className="text-xs">{themeLabels[theme]}</span>
                  </span>
                </Segment>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={reset}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("chapters.resetPreferences")}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
