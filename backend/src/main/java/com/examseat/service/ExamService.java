package com.examseat.service;

import com.examseat.dto.exam.ExamRequest;
import com.examseat.dto.exam.ExamResponse;
import com.examseat.dto.student.StudentResponse;

import java.time.LocalDate;
import java.util.List;

public interface ExamService {

    List<ExamResponse> list(String status, String search, String department);

    ExamResponse get(String id);

    ExamResponse getByCode(String code);

    List<ExamResponse> upcoming(int limit);

    ExamResponse create(ExamRequest request);

    ExamResponse update(String id, ExamRequest request);

    void delete(String id);

    /** {@code POST /api/exams/{id}/publish} — also reachable via the seating controller. */
    ExamResponse publish(String id);

    /** Marks an exam COMPLETED once the paper has been collected. */
    ExamResponse complete(String id);

    /** Students eligible to sit the exam (department + min-year filter). */
    List<StudentResponse> eligibleStudents(String examId);

    /** Earliest exam date, used to anchor the dashboard trend window. */
    LocalDate earliestDate();
}
