package com.examseat.algorithm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Tunable constraints applied while filling a hall grid. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatingRules {

    /** Spread departments across the hall instead of filling one block at a time. */
    @Builder.Default
    private boolean mixDepartments = true;

    /** Never seat two students of the same department side by side (left / front / back). */
    @Builder.Default
    private boolean avoidSameDeptAdjacent = true;

    /** Additionally forbid same-department students on the diagonals. */
    @Builder.Default
    private boolean avoidSameDeptDiagonal = true;

    /** Never seat two students of the same year next to each other. */
    @Builder.Default
    private boolean avoidSameYearAdjacent = false;

    /** Keep the rearmost row empty (spare row for late arrivals). */
    @Builder.Default
    private boolean keepLastRowClear = false;

    /** Randomise the order students are drawn from their department queue. */
    @Builder.Default
    private boolean shuffle = true;

    /**
     * When true (default, per spec) the engine refuses to run if the selected
     * halls cannot hold every eligible student.
     */
    @Builder.Default
    private boolean strictCapacity = true;

    /** Deterministic seed so the same inputs always produce the same plan. */
    @Builder.Default
    private long seed = 0L;

    public static SeatingRules defaults() {
        return SeatingRules.builder().build();
    }
}