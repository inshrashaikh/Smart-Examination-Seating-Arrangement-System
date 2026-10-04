package com.examseat.dto.duty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Body of {@code POST /api/duties/my/hall/{hallId}/attendance}.
 *
 * <p>An invigilator marks the whole sheet in one call rather than one request per
 * candidate: a hall has 24–36 candidates, and a per-row PUT would mean 29 chances for a
 * dropped request and a half-saved sheet. This body is idempotent per
 * {@code allocationId}, so a retry after a network timeout is safe.
 *
 * <p>{@code examId} is repeated in the body even though the path also carries
 * {@code hallId}. It is required here because a hall can host several exams over a
 * term, and the sheet has to be unambiguous about which one is being marked.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarkAttendanceRequest {

    @NotBlank(message = "is required")
    private String examId;

    @NotEmpty(message = "must contain at least one mark")
    @Valid
    private List<Mark> records;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Mark {

        /** Seat being marked. Must be a real allocation in this exam and hall. */
        @NotBlank(message = "is required")
        @Size(max = 40, message = "must be at most 40 characters")
        private String allocationId;

        @NotNull(message = "is required")
        private Boolean present;

        @Size(max = 240, message = "must be at most 240 characters")
        private String note;
    }
}