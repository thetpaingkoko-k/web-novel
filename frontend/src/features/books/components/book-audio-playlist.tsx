import { Headphones, Lock, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { resolveUploadUrl } from "@/api/uploads"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { AudioTrack } from "@/types/content"
import { useBookAudioPlaylist } from "../api"

/** Playback speeds offered on the playlist, matching common audiobook players. */
const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

/** `mm:ss`, or `—:—` while the browser hasn't reported a duration yet. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—:—"
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

interface BookAudioPlaylistProps {
  bookId: number
  /** The book's author, for the "subscribe to unlock" link on gated tracks. */
  authorId: number
}

/**
 * The book's audiobook: every published chapter that carries narration audio, played
 * as one continuous playlist that auto-advances between chapters.
 *
 * <p>Renders nothing when the book has no narration at all. Tracks the reader can't
 * play (premium chapters without a subscription) stay listed but are disabled and link
 * to the subscribe flow, mirroring the locks on the chapter list below.
 */
export function BookAudioPlaylist({ bookId, authorId }: BookAudioPlaylistProps) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useBookAudioPlaylist(bookId)
  const audioRef = useRef<HTMLAudioElement>(null)

  const tracks = useMemo(() => data ?? [], [data])
  const playable = useMemo(() => tracks.filter((track) => !track.locked), [tracks])

  // Index into `tracks`; null until the reader picks a track or presses play.
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState<number>(1)

  const current = tracks.find((track) => track.chapterId === currentId) ?? null
  // Navigation walks the playable tracks only, so locked chapters are skipped over.
  const playableIndex = playable.findIndex((track) => track.chapterId === currentId)

  const selectTrack = useCallback((track: AudioTrack) => {
    if (track.locked) return
    setCurrentId(track.chapterId)
    setIsPlaying(true)
    setPosition(0)
    setDuration(0)
  }, [])

  // Load and (when playing) start the selected track. Re-runs on track change only —
  // play/pause of the *current* track is handled by the transport button directly.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current?.audioUrl) return
    audio.load()
    if (isPlaying) {
      // A rejected play() (autoplay policy, missing file) must not leave the UI
      // claiming it is playing.
      audio.play().catch(() => setIsPlaying(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = speed
  }, [speed, currentId])

  function togglePlay() {
    const audio = audioRef.current
    // Nothing selected yet: pressing play starts the book from its first playable track.
    if (!current) {
      if (playable.length > 0) selectTrack(playable[0])
      return
    }
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }

  function step(delta: number) {
    if (playableIndex < 0) return
    const next = playable[playableIndex + delta]
    if (next) selectTrack(next)
  }

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />
  }
  // A book with no narration (or a playlist we couldn't load) simply shows nothing —
  // the section is additive, never an error surface on the book page.
  if (isError || tracks.length === 0) {
    return null
  }

  const hasPlayable = playable.length > 0

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
          <Headphones className="size-5 text-primary" aria-hidden="true" />
          {t("books.audiobookTitle")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("books.audiobookCount", { count: tracks.length })}
        </span>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        {/* Transport */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="icon"
            className="glow-brand size-11 shrink-0 rounded-full"
            disabled={!hasPlayable}
            onClick={togglePlay}
            aria-label={t(isPlaying ? "books.audiobookPause" : "books.audiobookPlay")}
          >
            {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full"
            disabled={playableIndex <= 0}
            onClick={() => step(-1)}
            aria-label={t("books.audiobookPrev")}
          >
            <SkipBack className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full"
            disabled={playableIndex < 0 || playableIndex >= playable.length - 1}
            onClick={() => step(1)}
            aria-label={t("books.audiobookNext")}
          >
            <SkipForward className="size-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {current
                ? t("books.audiobookNowPlaying", {
                    number: current.chapterNumber,
                    title: current.title,
                  })
                : t("books.audiobookIdle")}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatTime(position)} / {formatTime(duration)}
            </p>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only sm:not-sr-only">{t("books.audiobookSpeed")}</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label={t("books.audiobookSpeed")}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs tabular-nums"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 0}
          step={1}
          value={position}
          disabled={!current || duration === 0}
          aria-label={t("books.audiobookSeek")}
          onChange={(e) => {
            const next = Number(e.target.value)
            setPosition(next)
            if (audioRef.current) audioRef.current.currentTime = next
          }}
          className="accent-primary h-1.5 w-full cursor-pointer disabled:cursor-default disabled:opacity-50"
        />

        {/* Track list */}
        <ol className="-mx-1 flex max-h-72 flex-col overflow-y-auto">
          {tracks.map((track) => {
            const active = track.chapterId === currentId
            return (
              <li key={track.chapterId}>
                {track.locked ? (
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm opacity-60">
                    <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {t("books.audiobookTrack", {
                        number: track.chapterNumber,
                        title: track.title,
                      })}
                    </span>
                    <Link
                      to={`/authors/${authorId}/subscribe`}
                      className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t("books.subscribeToRead")}
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectTrack(track)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "hover:bg-muted/60",
                    )}
                  >
                    {active && isPlaying ? (
                      <Pause className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    ) : (
                      <Play className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {t("books.audiobookTrack", {
                        number: track.chapterNumber,
                        title: track.title,
                      })}
                    </span>
                  </button>
                )}
              </li>
            )
          })}
        </ol>

        {/* One element drives the whole playlist; the track list only swaps its source. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- author narration, no captions available */}
        <audio
          ref={audioRef}
          preload="metadata"
          src={current?.audioUrl ? resolveUploadUrl(current.audioUrl) : undefined}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            // Auto-advance; stop cleanly at the end of the book.
            const next = playableIndex >= 0 ? playable[playableIndex + 1] : undefined
            if (next) selectTrack(next)
            else setIsPlaying(false)
          }}
          className="hidden"
        />
      </div>
    </section>
  )
}
