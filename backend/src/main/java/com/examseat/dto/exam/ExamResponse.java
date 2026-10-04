package com.examseat.dto.exam;

import com.examseat.entity.ExamStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamResponse {

    private String id;
    private String code;
    private String subject;
    private String subjectCode;
    private String title;
    private String course;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String timeRange;
    private Integer durationHours;
    private Integer minYear;
    private List<String> departments;
    private List<Integer> years;
    private ExamStatus status;
    private Integer seatsPerHall;
    private List<String> hallIds;
    private List<String> hallCodes;
    private int eligibleStudents;
    private int allocatedSeats;
    private Instant createdAt;
}