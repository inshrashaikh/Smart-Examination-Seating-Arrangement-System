package com.examseat.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** Serialised with {@code read} so the React toggle binds straight to it. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private String id;
    private String type;
    private String title;
    private String message;
    private boolean read;
    private String href;
    private Instant createdAt;
    /** Convenience alias so the client can use either {@code at} or {@code createdAt}. */
    private Instant at;
}