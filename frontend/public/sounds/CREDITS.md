# Ambient sound credits

All files here are Creative Commons **Attribution** licensed. Under CC BY you may
use and adapt them (including commercially) as long as you credit the source.
Keep this attribution available to users (e.g. an "About"/credits page in the app).

## Nature ambience — Google Sound Library (CC BY 4.0)

Source: https://developers.google.com/assistant/tools/sound-library
License: https://creativecommons.org/licenses/by/4.0/

| File        | Source clip (actions.google.com/sounds/v1) | Notes                          |
| ----------- | ------------------------------------------ | ------------------------------ |
| `rain.mp3`  | `weather/light_rain.ogg`                   | normalized, transcoded to mp3  |
| `storm.mp3` | `weather/thunderstorm.ogg`                 | trimmed to 120s, normalized    |
| `ocean.mp3` | `water/waves_crashing_on_rock_beach.ogg`   | normalized, transcoded to mp3  |
| `wind.mp3`  | `weather/wind.ogg`                         | normalized, transcoded to mp3  |
| `fire.mp3`  | `ambiences/fire.ogg`                       | normalized, transcoded to mp3  |
| `cafe.mp3`  | `ambiences/coffee_shop.ogg`                | normalized, transcoded to mp3  |

## Lo-fi music — Wikimedia Commons (CC BY)

| File              | Title / artist                          | License   | Source                                                        |
| ----------------- | --------------------------------------- | --------- | ------------------------------------------------------------- |
| `lofi-chill.mp3`  | "Lofi" — Caden Currie                    | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Lofi_by_Caden_Currie.mp3 |
| `lofi-dreamy.mp3` | "Perspective (Lofi Hip Hop)" — Sappheiros | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Sappheiros_-_Perspective_(Lofi_Hip_Hop).ogg |
| `lofi-upbeat.mp3` | "Lofi Hip Hop Upbeat" — Raspberrymusic   | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg |

CC BY 3.0: https://creativecommons.org/licenses/by/3.0/

## Piano — Wikimedia Commons (public domain)

These are public-domain recordings of public-domain compositions. No attribution
is legally required, but the source recordings are credited here.

| File                | Piece                                          | Source                                                                                     |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `piano-satie.mp3`   | Satie — Gymnopédie No. 1                        | https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg |
| `piano-debussy.mp3` | Debussy — Clair de Lune (1905, piano solo)     | https://commons.wikimedia.org/wiki/File:Clair_de_Lune_by_Claude_Debussy_(1905,_piano_solo).opus |
| `piano-chopin.mp3`  | Chopin — Nocturne in E-flat major, Op. 9 No. 2 | https://commons.wikimedia.org/wiki/File:Nocturne_in_E_flat_major,_Op._9_no._2.mp3          |

Processing: all files loudness-normalized to ~-20 LUFS with ffmpeg — ambience at
96 kbps, music (lo-fi + piano) at 128 kbps stereo mp3. Originals © their respective creators.

To add another sound: drop a `<name>.mp3` here and add a matching entry to
`AMBIENT_CATALOG` in `src/features/chapters/ambient-sound.tsx`.
