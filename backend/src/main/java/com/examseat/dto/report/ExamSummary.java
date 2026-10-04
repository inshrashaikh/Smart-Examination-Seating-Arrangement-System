package com.examseat.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** The exam block echoed at the top of every report payload. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamSummary {

    private String id;
    private String code;
    private String title;
    private String subject;
    private String course;
    private String date;
    private String startTime;
    private String endTime;
    private String timeRange;
    private String status;
}