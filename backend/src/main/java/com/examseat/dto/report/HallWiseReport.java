package com.examseat.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/** {@code GET /api/reports/hall-wise} — one row per hall. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallWiseReport {

    private ExamSummary exam;
    private List<Row> rows;
    private Totals totals;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Row {
        private String examCode;
        private String examTitle;
        private String hallCode;
        private String hallName;
        private Integer capacity;
        private Integer allocated;
        private Integer utilisation;
        private Integer invigilators;
        private Map<String, Integer> departments;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Totals {
        private Integer halls;
        private Integer allocated;
        private Integer capacity;
        private Integer utilisation;
        private Integer invigilators;
    }
}