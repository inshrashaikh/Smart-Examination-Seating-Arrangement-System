package com.examseat.dto.seating;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Body of {@code POST /api/seating/plans/{planId}/swap} and {@code PUT /api/seating/swap}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SwapSeatsRequest {

    /**
     * Optional. The plan-scoped endpoint takes the exam from its path variable, so
     * this is only needed by the exam-scoped {@code PUT /api/seating/swap} variant —
     * which validates the body itself and therefore must not require it here.
     */
    private String examId;

    @NotNull(message = "is required")
    private SeatRef a;

    @NotNull(message = "is required")
    private SeatRef b;

    /**
     * Refuse the swap when it would introduce an adjacency clash.
     *
     * <p>Boxed rather than primitive on purpose: Jackson builds this through the
     * no-args constructor and sets whatever the client sent, so a primitive would
     * default to {@code false} when the field is omitted — silently disabling the
     * check. A missing {@code validate} therefore means "validate".</p>
     */
    @Builder.Default
    private Boolean validate = Boolean.TRUE;

    @JsonIgnore
    public boolean shouldValidate() {
        return validate == null || validate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatRef {
        private String hallId;
        private String allocationId;
        @NotNull(message = "is required")
        private Integer row;
        @NotNull(message = "is required")
        private Integer col;
    }
}