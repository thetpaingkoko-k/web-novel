-- Optional narration audio for a chapter (audiobook feature). Authors may attach
-- an uploaded audio file when adding a chapter, or later — including after the
-- chapter is published. NULL means the chapter has no audio.
ALTER TABLE chapters ADD COLUMN audio_url VARCHAR(1024);
