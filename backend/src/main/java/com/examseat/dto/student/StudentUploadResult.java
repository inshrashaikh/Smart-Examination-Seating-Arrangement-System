package com.examseat.dto.student;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Outcome of a CSV/Excel bulk upload, including a row-level error report. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentUploadResult {

    private int total;
    private int added;
    private int duplicates;
    private int invalid;
    private String fileName;
    private List<RowError> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowError {
        /** 1-based row number in the uploaded file. */
        private int row;
        private String rollNo;
        private String field;
        private String message;
    }
}