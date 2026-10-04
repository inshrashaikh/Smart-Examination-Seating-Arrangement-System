package com.examseat.algorithm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Summary of a whole {@code generate} run across every selected hall. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatingResult {

    private String examId;
    private String examCode;
    private String examTitle;

    private int totalSeated;

    /** Eligible students who could not be seated (empty only when strictCapacity is on). */
    private int unallocated;

    /** Sum of {@code clashes} across halls — must be 0. */
    private int clashCount;

    private int capacity;
    private int usableCapacity;

    private int utilisation;

    /** Lowest per-hall score, useful for the "plan quality" widget. */
    private int score;

    private boolean clean;

    /** Engine that produced the plan: {@code JAVA} or {@code PYTHON}. */
    private String engine;

    private List<HallAllocation> halls;

    /** Eligible students that were left standing when strictCapacity is disabled. */
    private List<UnallocatedStudent> unallocatedStudents;

    /** A student the engine could not place. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnallocatedStudent {
        private String studentId;
        private String rollNo;
        private String name;
        private String department;
        private Integer year;
        private String reason;
    }
}