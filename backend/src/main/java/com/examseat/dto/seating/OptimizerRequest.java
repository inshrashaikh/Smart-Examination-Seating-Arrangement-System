package com.examseat.dto.seating;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Body of {@code POST /optimize} on the Python optimizer service.
 *
 * <p>Carries everything the CP-SAT model needs and nothing it does not: the
 * hall grids with blocked seats, the eligible students with the attributes the
 * constraints key on (department, year), and the rule flags. The Java engine's
 * other rules (shuffle, seed, mix-departments) are deliberately absent — the
 * optimizer models the hard constraints and derives the rest.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptimizerRequest {

    private String examId;

    private List<Hall> halls;

    private List<Student> students;

    private Rules rules;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Hall {
        private String hallId;
        private int rows;
        private int cols;
        /** Blocked seats as {@code [row, col]} pairs. */
        @Builder.Default
        private List<int[]> blocked = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Student {
        private String id;
        private String department;
        private Integer year;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Rules {
        private boolean avoidSameDeptAdjacent;
        private boolean avoidSameDeptDiagonal;
        private boolean avoidSameYearAdjacent;
        private boolean keepLastRowClear;
        private boolean strictCapacity;
    }
}
