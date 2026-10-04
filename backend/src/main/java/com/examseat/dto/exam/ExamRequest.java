package com.examseat.dto.exam;

import com.examseat.entity.ExamStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamRequest {

    @Size(max = 40, message = "must be at most 40 characters")
    private String code;

    @Size(max = 160, message = "must be at most 160 characters")
    private String subject;

    @Size(max = 40, message = "must be at most 40 characters")
    private String subjectCode;

    @Size(max = 200, message = "must be at most 200 characters")
    private String title;

    @Size(max = 120, message = "must be at most 120 characters")
    private String course;

    @NotNull(message = "is required")
    private LocalDate date;

    @NotNull(message = "is required")
    private LocalTime startTime;

    @NotNull(message = "is required")
    private LocalTime endTime;

    @Min(value = 1, message = "must be at least 1")
    @Max(value = 5, message = "must be 5 or less")
    private Integer durationHours;

    @Min(value = 1, message = "must be at least 1")
    @Max(value = 5, message = "must be 5 or less")
    @Builder.Default
    private Integer minYear = 1;

    @NotEmpty(message = "is required")
    private List<String> departments;

    private List<Integer> years;

    private ExamStatus status;

    @Min(value = 1, message = "must be at least 1")
    private Integer seatsPerHall;

    /** Optional convenience: halls may be attached straight from the exam form. */
    private List<String> hallIds;
}