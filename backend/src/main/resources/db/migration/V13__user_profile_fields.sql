-- ============================================================
-- V13: Reader profile fields (§4.1.1)
--  - avatar_url: profile picture path from POST /uploads/images
--  - gender / date_of_birth: collected at registration
--  - terms_accepted_at: when the user confirmed the terms & conditions
-- All nullable so existing rows remain valid; enums modeled as VARCHAR + CHECK.
-- ============================================================
ALTER TABLE users
    ADD COLUMN avatar_url       VARCHAR(512),
    ADD COLUMN gender           VARCHAR(20)
                                    CHECK (gender IN ('male','female','other','prefer_not_to_say')),
    ADD COLUMN date_of_birth    DATE,
    ADD COLUMN terms_accepted_at TIMESTAMPTZ;
