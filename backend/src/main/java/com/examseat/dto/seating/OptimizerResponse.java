package com.examseat.dto.seating;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Body of the optimizer's {@code POST /optimize} reply.
 *
 * <p>Per hall, the seats the solver assigned (row/col plus the student id).
 * The Java side rebuilds the full grid from these and runs its own
 * {@code verify} pass, so a plan produced by the optimizer is verified — and
 * scored — by exactly the same code as a plan the Java engine produced.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptimizerResponse {

    private String engine;

    private List<HallResult> halls;

    /** Student ids the solver could not seat. */
    @Builder.Default
    private List<String> unallocated = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HallResult {
        private String hallId;
        private List<Seat> seats;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Seat {
            private int row;
            private int col;
            private String studentId;
        }
    }
}
