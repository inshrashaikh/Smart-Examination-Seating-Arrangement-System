package com.examseat.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** {@code GET /api/reports/department-wise} — one row per department. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentWiseReport {

    private ExamSummary exam;
    private List<Row> rows;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Row {
        private String department;
        private String departmentName;
        private String color;
        private Integer eligible;
        private Integer allocated;
        private Integer unallocated;
        private Integer hallsUsed;
        private Integer share;
    }
}