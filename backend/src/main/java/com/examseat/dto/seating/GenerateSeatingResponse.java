package com.examseat.dto.seating;

import com.examseat.algorithm.HallAllocation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/** Summary returned by {@code POST /api/seating/generate}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateSeatingResponse {

    private String examId;
    private String examCode;
    private String examTitle;

    private Integer totalSeated;
    private Integer unallocated;
    private Integer clashCount;
    private Integer capacity;
    private Integer usableCapacity;
    private Integer utilisation;
    private Integer score;
    private Boolean clean;

    /** Engine that produced this plan: {@code JAVA} or {@code PYTHON}. */
    private String engine;

    private Map<String, Integer> departments;

    private List<HallAllocation> halls;
    private List<UnallocatedStudent> unallocatedStudents;

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