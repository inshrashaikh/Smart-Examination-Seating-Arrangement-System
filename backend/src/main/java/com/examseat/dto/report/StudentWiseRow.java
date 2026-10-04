package com.examseat.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * {@code GET /api/reports/student-wise} returns a bare array of these rows —
 * the React report table iterates the payload directly.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentWiseRow {

    private String rollNo;
    private String name;
    private String department;
    private Integer year;
    private String section;
    private String hall;
    private String hallCode;
    private String seat;
    private String status;
}