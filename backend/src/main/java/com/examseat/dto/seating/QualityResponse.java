package com.examseat.dto.seating;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Aggregate plan-quality metrics, powering the analytics page and the
 * engine-comparison card.
 *
 * <p>Per exam, the numbers come from the stored plan summaries (the same ones
 * the hall-plan viewer shows), so the page can never disagree with the grids.
 * The per-engine roll-up is what makes the JAVA-vs-PYTHON comparison honest:
 * both engines' plans are verified by the same code, so their scores are
 * comparable.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QualityResponse {

    private List<ExamQuality> exams;

    private List<EngineQuality> engines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExamQuality {
        private String examId;
        private String examCode;
        private String examTitle;
        private String engine;
        private int halls;
        private int allocated;
        private int capacity;
        private int utilisation;
        private int clashes;
        private int adjacentSameDept;
        private int score;
        private boolean clean;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EngineQuality {
        private String engine;
        private int exams;
        private int plans;
        private int allocated;
        private int capacity;
        private double averageScore;
        private int clashes;
        private int adjacentSameDept;
        private int cleanPlans;
    }
}
