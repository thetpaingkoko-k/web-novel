-- Remove the 'archived' debate-thread status: lock and archive were duplicate
-- functions, so only 'locked' is kept. Reclassify any existing archived threads
-- as locked, then tighten the VARCHAR + CHECK constraint (§9.6).
UPDATE debate_threads SET status = 'locked' WHERE status = 'archived';

ALTER TABLE debate_threads DROP CONSTRAINT debate_threads_status_check;
ALTER TABLE debate_threads ADD CONSTRAINT debate_threads_status_check
    CHECK (status IN ('open','locked'));
