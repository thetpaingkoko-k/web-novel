import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  Cloud,
  CloudLightning,
  CloudRain,
  Coffee,
  Flame,
  Loader2,
  Music2,
  Music3,
  Music4,
  Piano,
  TriangleAlert,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** The bundled ambient loops. Each id maps to `public/sounds/<id>.mp3` — nature
 * ambience from the Google Sound Library (CC BY 4.0) and lo-fi music tracks from
 * Wikimedia Commons (CC BY); see `public/sounds/CREDITS.md`. Add a sound by
 * dropping `<id>.mp3` in that folder and adding a catalog entry below. */
export type AmbientSound =
  | "rain"
  | "storm"
  | "ocean"
  | "wind"
  | "fire"
  | "cafe"
  | "lofi-chill"
  | "lofi-dreamy"
  | "lofi-upbeat"
  | "piano-satie"
  | "piano-debussy"
  | "piano-chopin"

export type AmbientCategory = "ambience" | "lofi" | "piano"

interface AmbientSoundDef {
  id: AmbientSound
  category: AmbientCategory
  icon: LucideIcon
}

/** Single source of truth for the picker — order here is display order. */
export const AMBIENT_CATALOG: AmbientSoundDef[] = [
  { id: "rain", category: "ambience", icon: CloudRain },
  { id: "storm", category: "ambience", icon: CloudLightning },
  { id: "ocean", category: "ambience", icon: Waves },
  { id: "wind", category: "ambience", icon: Wind },
  { id: "fire", category: "ambience", icon: Flame },
  { id: "cafe", category: "ambience", icon: Coffee },
  { id: "lofi-chill", category: "lofi", icon: Music2 },
  { id: "lofi-dreamy", category: "lofi", icon: Music3 },
  { id: "lofi-upbeat", category: "lofi", icon: Music4 },
  { id: "piano-satie", category: "piano", icon: Piano },
  { id: "piano-debussy", category: "piano", icon: Piano },
  { id: "piano-chopin", category: "piano", icon: Piano },
]

const CATEGORY_ORDER: AmbientCategory[] = ["ambience", "lofi", "piano"]

export const AMBIENT_SOUNDS: AmbientSound[] = AMBIENT_CATALOG.map((s) => s.id)

/** Public asset URL, honouring a non-root Vite `base`. */
function soundUrl(sound: AmbientSound): string {
  return `${import.meta.env.BASE_URL}sounds/${sound}.mp3`
}

const STORAGE_KEY = "webnovel-ambient-sound-v1"

interface StoredAmbient {
  sound: AmbientSound
  volume: number
}

const DEFAULTS: StoredAmbient = { sound: "rain", volume: 0.5 }

/** How long the volume fade in/out runs, in ms — keeps starts/stops gentle. */
const FADE_MS = 450

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function load(): StoredAmbient {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<StoredAmbient>
    return {
      sound: AMBIENT_SOUNDS.includes(parsed.sound as AmbientSound)
        ? (parsed.sound as AmbientSound)
        : DEFAULTS.sound,
      volume: typeof parsed.volume === "number" ? clamp01(parsed.volume) : DEFAULTS.volume,
    }
  } catch {
    return DEFAULTS
  }
}

/** Playback state for the currently selected sound. */
export type AmbientStatus = "idle" | "loading" | "playing" | "error"

export interface UseAmbientSound {
  enabled: boolean
  sound: AmbientSound
  volume: number
  status: AmbientStatus
  toggle: () => void
  setEnabled: (value: boolean) => void
  /** Selects a sound and turns playback on — picking a sound means "play it". */
  selectSound: (sound: AmbientSound) => void
  setVolume: (value: number) => void
}

/**
 * Reader-controlled ambient soundscape backed by real bundled audio loops. The
 * chosen sound + volume persist in localStorage; playback starts off on every
 * page load (audio can't autoplay without a gesture, and no one wants a chapter
 * that blares on open).
 *
 * Lives inside {@link AmbientSoundProvider} at the app root so the audio element
 * survives route changes — the loop keeps playing as the reader moves between
 * chapters instead of restarting on every navigation.
 */
function useAmbientSoundEngine(): UseAmbientSound {
  const [{ sound, volume }, setStored] = useState<StoredAmbient>(load)
  const [enabled, setEnabledState] = useState(false)
  const [status, setStatus] = useState<AmbientStatus>("idle")

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedSoundRef = useRef<AmbientSound | null>(null)
  const fadeRef = useRef<number | null>(null)

  // Latest values for effects that must not re-run when they change.
  const soundRef = useRef(sound)
  soundRef.current = sound
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sound, volume }))
    } catch {
      // Ignore write failures (private mode / quota).
    }
  }, [sound, volume])

  const cancelFade = useCallback(() => {
    if (fadeRef.current != null) {
      cancelAnimationFrame(fadeRef.current)
      fadeRef.current = null
    }
  }, [])

  /** Linearly ramps `audio.volume` to `target`, running `done` when it lands. */
  const fadeTo = useCallback(
    (audio: HTMLAudioElement, target: number, ms: number, done?: () => void) => {
      cancelFade()
      const from = audio.volume
      const start = performance.now()
      const tick = (now: number) => {
        const k = ms <= 0 ? 1 : Math.min(1, (now - start) / ms)
        audio.volume = clamp01(from + (target - from) * k)
        if (k < 1) {
          fadeRef.current = requestAnimationFrame(tick)
        } else {
          fadeRef.current = null
          done?.()
        }
      }
      fadeRef.current = requestAnimationFrame(tick)
    },
    [cancelFade]
  )

  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio()
      audio.loop = true
      audio.preload = "auto"
      audio.volume = 0
      audio.addEventListener("error", () => setStatus("error"))
      audioRef.current = audio
    }
    return audioRef.current
  }, [])

  /** Loads `next` (if not already loaded), plays, and fades up to volume. */
  const playSound = useCallback(
    (next: AmbientSound) => {
      const audio = ensureAudio()
      if (loadedSoundRef.current !== next) {
        audio.src = soundUrl(next)
        loadedSoundRef.current = next
      }
      setStatus("loading")
      void audio
        .play()
        .then(() => {
          setStatus("playing")
          fadeTo(audio, volumeRef.current, FADE_MS)
        })
        .catch(() => setStatus("error"))
    },
    [ensureAudio, fadeTo]
  )

  // Enable / disable. Fades out and pauses on disable; the element is reused so
  // re-enabling is instant.
  useEffect(() => {
    if (!enabled) {
      const audio = audioRef.current
      if (!audio) return
      setStatus("idle")
      fadeTo(audio, 0, FADE_MS, () => audio.pause())
      return
    }
    playSound(soundRef.current)
  }, [enabled, fadeTo, playSound])

  // Swap the loop when the sound changes mid-playback — quick fade to avoid a
  // hard cut, then load and fade the new one in.
  useEffect(() => {
    if (!enabledRef.current) return
    const audio = ensureAudio()
    fadeTo(audio, 0, 150, () => playSound(sound))
  }, [sound, ensureAudio, fadeTo, playSound])

  // Live volume while playing.
  useEffect(() => {
    if (!enabledRef.current) return
    const audio = audioRef.current
    if (audio) fadeTo(audio, volume, 120)
  }, [volume, fadeTo])

  // Tear the audio element down on unmount.
  useEffect(
    () => () => {
      cancelFade()
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.src = ""
      }
      audioRef.current = null
      loadedSoundRef.current = null
    },
    [cancelFade]
  )

  const toggle = useCallback(() => setEnabledState((v) => !v), [])
  const setEnabled = useCallback((value: boolean) => setEnabledState(value), [])
  const selectSound = useCallback((next: AmbientSound) => {
    setStored((prev) => ({ ...prev, sound: next }))
    setEnabledState(true)
  }, [])
  const setVolume = useCallback(
    (value: number) => setStored((prev) => ({ ...prev, volume: clamp01(value) })),
    []
  )

  return { enabled, sound, volume, status, toggle, setEnabled, selectSound, setVolume }
}

const AmbientSoundContext = createContext<UseAmbientSound | undefined>(undefined)

/**
 * Hosts the single ambient-sound engine for the whole app. Mount once at the
 * root (above the router) so playback persists across chapter navigation.
 */
export function AmbientSoundProvider({ children }: { children: React.ReactNode }) {
  // The provider re-renders only when the engine's own state changes, so a new
  // value identity here is exactly when consumers should update — no memo needed.
  const engine = useAmbientSoundEngine()
  return <AmbientSoundContext.Provider value={engine}>{children}</AmbientSoundContext.Provider>
}

/** Reads the shared ambient-sound controller from {@link AmbientSoundProvider}. */
export function useAmbientSound(): UseAmbientSound {
  const ctx = useContext(AmbientSoundContext)
  if (!ctx) throw new Error("useAmbientSound must be used within an AmbientSoundProvider")
  return ctx
}

/** Ambience belongs to the reading experience — a chapter or its book. */
function isBookRoute(pathname: string): boolean {
  return pathname.startsWith("/chapters/") || pathname.startsWith("/books/")
}

/**
 * Stops ambient playback when the reader navigates away from the book (any route
 * that isn't a chapter or a book page). Mount inside the router so the loop keeps
 * playing across chapters but ends once you leave the book. Renders nothing.
 */
export function AmbientSoundRouteGuard() {
  const { pathname } = useLocation()
  const { enabled, setEnabled } = useAmbientSound()

  useEffect(() => {
    if (enabled && !isBookRoute(pathname)) setEnabled(false)
  }, [pathname, enabled, setEnabled])

  // Leaving the book's layout entirely (e.g. into the admin console) also ends it.
  useEffect(() => () => setEnabled(false), [setEnabled])

  return null
}

/** The speaker button + popover that lives in the sticky reader bar. */
export function AmbientSoundControls() {
  const { t } = useTranslation()
  const { enabled, sound, volume, status, setEnabled, selectSound, setVolume } = useAmbientSound()

  const labels: Record<AmbientSound, string> = {
    rain: t("chapters.ambient.rain"),
    storm: t("chapters.ambient.storm"),
    ocean: t("chapters.ambient.ocean"),
    wind: t("chapters.ambient.wind"),
    fire: t("chapters.ambient.fire"),
    cafe: t("chapters.ambient.cafe"),
    "lofi-chill": t("chapters.ambient.lofiChill"),
    "lofi-dreamy": t("chapters.ambient.lofiDreamy"),
    "lofi-upbeat": t("chapters.ambient.lofiUpbeat"),
    "piano-satie": t("chapters.ambient.pianoSatie"),
    "piano-debussy": t("chapters.ambient.pianoDebussy"),
    "piano-chopin": t("chapters.ambient.pianoChopin"),
  }
  const categoryLabels: Record<AmbientCategory, string> = {
    ambience: t("chapters.ambient.categoryAmbience"),
    lofi: t("chapters.ambient.categoryLofi"),
    piano: t("chapters.ambient.categoryPiano"),
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 rounded-full text-muted-foreground hover:text-foreground",
            enabled && "text-primary"
          )}
          aria-label={t("chapters.ambient.title")}
          title={t("chapters.ambient.title")}
        >
          <Waves className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-2">
              <span className="brand-gradient flex h-6 w-6 items-center justify-center rounded-md text-primary-foreground">
                <Waves className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-semibold">
                {t("chapters.ambient.title")}
              </span>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label={enabled ? t("chapters.ambient.turnOff") : t("chapters.ambient.turnOn")}
            />
          </div>

          <div className="flex flex-col gap-3">
            {CATEGORY_ORDER.map((category) => (
              <div key={category} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {categoryLabels[category]}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {AMBIENT_CATALOG.filter((def) => def.category === category).map((def) => {
                    const option = def.id
                    const active = enabled && sound === option
                    const isLoading = active && status === "loading"
                    const isError = active && status === "error"
                    const Icon = isError ? TriangleAlert : def.icon
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectSound(option)}
                        aria-pressed={active}
                        title={isError ? t("chapters.ambient.unavailable") : labels[option]}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          isError
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : active
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span>{labels[option]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {enabled && status === "error" ? (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <Cloud className="h-3 w-3" aria-hidden="true" />
                {t("chapters.ambient.unavailable")}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("chapters.ambient.volume")}
            </span>
            <div className="flex items-center gap-2">
              {volume <= 0.001 ? (
                <VolumeX className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label={t("chapters.ambient.volume")}
                className="h-1.5 w-full cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
