package com.examseat.dto.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Envelope every JSON endpoint returns. The React client unwraps {@code data}
 * and treats {@code status >= 400} as a rejection (see {@code src/services/api.js}).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    private int status;
    private String message;
    private T data;
    private String timestamp;
    private String path;
    /** Field-level validation problems, e.g. {@code {"email": "must be well-formed"}}. */
    private Object errors;

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
                .status(200)
                .message("OK")
                .data(data)
                .timestamp(Instant.now().toString())
                .build();
    }

    /**
     * {@code 200} with a message that says something about what happened.
     *
     * <p>Distinct from {@link #created}: the status is 200 because nothing new exists —
     * it is an idempotent update that happened to report useful detail. Added for
     * {@code POST /api/duties/my/hall/{hallId}/attendance}, which re-saving the same
     * batch should not read as a new resource being created.
     */
    public static <T> ApiResponse<T> ok(T data, String message) {
        return ApiResponse.<T>builder()
                .status(200)
                .message(message)
                .data(data)
                .timestamp(Instant.now().toString())
                .build();
    }

    public static <T> ApiResponse<T> created(T data, String message) {
        return ApiResponse.<T>builder()
                .status(201)
                .message(message)
                .data(data)
                .timestamp(Instant.now().toString())
                .build();
    }

    public static <T> ApiResponse<T> error(int status, String message, Object errors) {
        return ApiResponse.<T>builder()
                .status(status)
                .message(message)
                .errors(errors)
                .timestamp(Instant.now().toString())
                .build();
    }
}