package com.examseat.dto.seating;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Body of {@code POST /api/seating/generate}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateSeatingRequest {

    @NotNull(message = "is required")
    private String examId;

    @NotEmpty(message = "is required")
    private List<String> hallIds;

    /** Optional override of the exam's own department list. */
    private List<String> departments;

    /**
     * Which engine should allocate the seats:
     * <ul>
     *   <li>{@code JAVA} — the built-in algorithm (default behaviour);</li>
     *   <li>{@code PYTHON} — the OR-Tools optimizer service, a hard failure
     *       when it is unavailable;</li>
     *   <li>{@code AUTO} — try the optimizer, fall back to the built-in
     *       algorithm when it cannot be reached (default).</li>
     * </ul>
     * The engine that actually produced the plan is recorded on the exam and
     * returned in the response.
     */
    private String engine;

    private SeatingRulesRequest rules;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatingRulesRequest {
        private Boolean mixDepartments;
        private Boolean avoidSameDeptAdjacent;
        private Boolean avoidSameDeptDiagonal;
        private Boolean avoidSameYearAdjacent;
        private Boolean keepLastRowClear;
        private Boolean shuffle;
        /**
         * When true (default) the engine refuses to run if the halls cannot seat
         * every eligible student. Set false to allow partial allocation.
         */
        private Boolean strictCapacity;
        private Long seed;
    }
}