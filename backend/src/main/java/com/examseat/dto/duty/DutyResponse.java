package com.examseat.dto.duty;

import com.examseat.entity.DutyRole;
import com.examseat.entity.DutyStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Faculty-facing duty row. Flattened (not nested entities) exactly as the mock
 * returned it, because the faculty Duties table reads these fields directly.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DutyResponse {

    private String id;

    private String facultyId;
    private String facultyName;
    private String facultyEmail;
    private String facultyDepartment;
    private String facultyDesignation;
    private String facultyPhone;
    private String facultyPhoto;

    private String examId;
    private String examTitle;
    private String examCode;
    private String subject;

    private String hallId;
    private String hallName;
    private String hallCode;

    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String timeRange;

    private DutyRole role;
    private DutyStatus status;

    /** Students seated in this hall for this exam — drives the "seat count" column. */
    private Integer seatCount;
    private String note;

    private Instant assignedAt;
}