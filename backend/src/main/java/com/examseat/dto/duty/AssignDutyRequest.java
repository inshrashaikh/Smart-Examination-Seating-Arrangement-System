package com.examseat.dto.duty;

import com.examseat.entity.DutyRole;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/** Body of {@code POST /api/duties/assign} and {@code POST /api/duties}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignDutyRequest {

    @NotNull(message = "is required")
    private String facultyId;

    @NotNull(message = "is required")
    private String examId;

    @NotNull(message = "is required")
    private String hallId;

    /** Defaults to the exam date when omitted. */
    private LocalDate date;

    /** Defaults to the exam start/end times when omitted. */
    private LocalTime startTime;
    private LocalTime endTime;

    private DutyRole role;

    @Size(max = 200, message = "must be at most 200 characters")
    private String note;
}