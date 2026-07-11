package com.webnovel.dto.content;

import java.time.OffsetDateTime;

/** Submit a chapter for publishing (§9.5). Optional {@code scheduledFor} schedules a future publish (FR-2.6). */
public record PublishRequest(OffsetDateTime scheduledFor) {
}
