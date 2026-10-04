package com.examseat.mapper;

import com.examseat.dto.exam.ExamRequest;
import com.examseat.dto.exam.ExamResponse;
import com.examseat.dto.report.ExamSummary;
import com.examseat.entity.Exam;
import com.examseat.entity.ExamStatus;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class ExamMapper {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    public ExamResponse toResponse(Exam exam,
                                   List<String> hallIds,
                                   List<String> hallCodes,
                                   int eligibleStudents,
                                   int allocatedSeats) {
        if (exam == null) return null;
        return ExamResponse.builder()
                .id(exam.getId())
                .code(exam.getCode())
                .subject(exam.getSubject())
                .subjectCode(exam.getSubjectCode())
                .title(exam.getTitle())
                .course(exam.getCourse())
                .date(exam.getDate())
                .startTime(exam.getStartTime())
                .endTime(exam.getEndTime())
                .timeRange(timeRange(exam))
                .durationHours(exam.getDurationHours())
                .minYear(exam.getMinYear())
                .departments(exam.getDepartments())
                .years(exam.getYears())
                .status(exam.getStatus())
                .seatsPerHall(exam.getSeatsPerHall())
                .hallIds(hallIds == null ? List.of() : hallIds)
                .hallCodes(hallCodes == null ? List.of() : hallCodes)
                .eligibleStudents(eligibleStudents)
                .allocatedSeats(allocatedSeats)
                .createdAt(exam.getCreatedAt())
                .build();
    }

    public ExamSummary toSummary(Exam exam) {
        if (exam == null) return null;
        return ExamSummary.builder()
                .id(exam.getId())
                .code(exam.getCode())
                .title(exam.getTitle())
                .subject(exam.getSubject())
                .course(exam.getCourse())
                .date(exam.getDate() == null ? null : exam.getDate().toString())
                .startTime(exam.getStartTime() == null ? null : exam.getStartTime().format(TIME))
                .endTime(exam.getEndTime() == null ? null : exam.getEndTime().format(TIME))
                .timeRange(timeRange(exam))
                .status(exam.getStatus() == null ? null : exam.getStatus().name())
                .build();
    }

    public void updateEntity(ExamRequest request, Exam exam) {
        if (request.getCode() != null && !request.getCode().isBlank()) exam.setCode(request.getCode());
        if (request.getSubject() != null) exam.setSubject(request.getSubject());
        if (request.getSubjectCode() != null) exam.setSubjectCode(request.getSubjectCode());
        if (request.getTitle() != null) exam.setTitle(request.getTitle());
        if (request.getCourse() != null) exam.setCourse(request.getCourse());
        exam.setDate(request.getDate());
        exam.setStartTime(request.getStartTime());
        exam.setEndTime(request.getEndTime());
        exam.setDurationHours(request.getDurationHours());
        exam.setMinYear(request.getMinYear() == null ? 1 : request.getMinYear());
        exam.setDepartments(new ArrayList<>(request.getDepartments()));
        exam.setYears(request.getYears() == null ? new ArrayList<>() : new ArrayList<>(request.getYears()));
        if (request.getStatus() != null) exam.setStatus(request.getStatus());
        exam.setSeatsPerHall(request.getSeatsPerHall());
    }

    public Exam toEntity(ExamRequest request) {
        Exam exam = new Exam();
        updateEntity(request, exam);
        exam.setCode(request.getCode());
        exam.setStatus(request.getStatus() == null ? ExamStatus.SCHEDULED : request.getStatus());
        return exam;
    }

    public String timeRange(Exam exam) {
        if (exam == null || exam.getStartTime() == null || exam.getEndTime() == null) return null;
        return exam.getStartTime().format(TIME) + " - " + exam.getEndTime().format(TIME);
    }
}