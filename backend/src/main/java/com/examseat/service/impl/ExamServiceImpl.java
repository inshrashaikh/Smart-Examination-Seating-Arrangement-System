package com.examseat.service.impl;

import com.examseat.dto.exam.ExamRequest;
import com.examseat.dto.exam.ExamResponse;
import com.examseat.dto.student.StudentResponse;
import com.examseat.entity.Exam;
import com.examseat.entity.ExamHall;
import com.examseat.entity.ExamStatus;
import com.examseat.entity.Hall;
import com.examseat.entity.Notification;
import com.examseat.entity.SeatAllocation;
import com.examseat.exception.ApiException;
import com.examseat.mapper.ExamMapper;
import com.examseat.mapper.StudentMapper;
import com.examseat.repository.ExamHallRepository;
import com.examseat.repository.ExamRepository;
import com.examseat.repository.HallRepository;
import com.examseat.repository.InvigilationDutyRepository;
import com.examseat.repository.NotificationRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import com.examseat.service.ExamService;
import com.examseat.util.IdFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
public class ExamServiceImpl implements ExamService {

    private final ExamRepository examRepository;
    private final ExamHallRepository examHallRepository;
    private final HallRepository hallRepository;
    private final StudentRepository studentRepository;
    private final SeatAllocationRepository allocationRepository;
    private final InvigilationDutyRepository dutyRepository;
    private final NotificationRepository notificationRepository;
    private final ExamMapper examMapper;
    private final StudentMapper studentMapper;

    @Override
    @Transactional(readOnly = true)
    public List<ExamResponse> list(String status, String search, String department) {
        return examRepository.findAllByOrderByDateAsc().stream()
                .filter(exam -> status == null || status.isBlank()
                        || exam.getStatus().name().equalsIgnoreCase(status.trim()))
                .filter(exam -> search == null || search.isBlank()
                        || matches(exam, search.trim().toLowerCase(Locale.ROOT)))
                .filter(exam -> department == null || department.isBlank()
                        || exam.getDepartments().stream()
                        .anyMatch(d -> d.equalsIgnoreCase(department.trim())))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ExamResponse get(String id) {
        return toResponse(require(id));
    }

    @Override
    @Transactional(readOnly = true)
    public ExamResponse getByCode(String code) {
        Exam exam = examRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> ApiException.notFound("Exam", code));
        return toResponse(exam);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExamResponse> upcoming(int limit) {
        return examRepository.findByDateGreaterThanEqualOrderByDateAsc(LocalDate.now())
                .stream()
                .limit(limit <= 0 ? 5 : limit)
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ExamResponse create(ExamRequest request) {
        validate(request);
        String code = normaliseCode(request.getCode());
        if (code != null && examRepository.existsByCodeIgnoreCase(code)) {
            throw ApiException.conflict("Exam code " + code + " is already in use");
        }

        Exam exam = examMapper.toEntity(request);
        exam.setCode(code);
        exam.setId(IdFactory.next("EX-", examRepository.findAll().stream().map(Exam::getId).toList(), 3));
        exam.setCreatedAt(Instant.now());
        Exam saved = examRepository.save(exam);

        attachHalls(saved, request.getHallIds());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ExamResponse update(String id, ExamRequest request) {
        validate(request);
        Exam exam = require(id);

        String code = normaliseCode(request.getCode());
        if (code != null && !code.equalsIgnoreCase(exam.getCode())) {
            examRepository.findByCodeIgnoreCase(code).filter(other -> !other.getId().equals(id))
                    .ifPresent(other -> {
                        throw ApiException.conflict("Exam code " + code + " is already in use");
                    });
        }

        long seated = allocationRepository.countByExamId(id);
        if (seated > 0) {
            if (!new TreeSet<>(request.getDepartments()).equals(new TreeSet<>(exam.getDepartments()))) {
                throw ApiException.conflict("Cannot change departments while " + seated
                        + " students are already seated. Reset the plan first.");
            }
            if (exam.getStatus() == ExamStatus.PUBLISHED && request.getStatus() == ExamStatus.SCHEDULED) {
                throw ApiException.conflict("A published exam cannot be moved back to SCHEDULED");
            }
        }

        examMapper.updateEntity(request, exam);
        Exam saved = examRepository.save(exam);

        if (request.getHallIds() != null) {
            attachHalls(saved, request.getHallIds());
        }
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(String id) {
        Exam exam = require(id);
        long allocations = allocationRepository.countByExamId(id);
        if (allocations > 0) {
            throw ApiException.conflict(exam.getCode() + " has " + allocations
                    + " seat allocations. Reset the exam before deleting it.");
        }
        if (!dutyRepository.findByExamId(id).isEmpty()) {
            throw ApiException.conflict(exam.getCode() + " still has invigilation duties assigned");
        }
        examHallRepository.deleteByExamId(id);
        examRepository.delete(exam);
    }

    @Override
    @Transactional
    public ExamResponse publish(String id) {
        Exam exam = require(id);
        if (exam.getStatus() == ExamStatus.COMPLETED) {
            throw ApiException.conflict("A completed exam cannot be published");
        }
        long allocations = allocationRepository.countByExamId(id);
        if (allocations == 0) {
            throw ApiException.conflict("Generate a seating plan before publishing " + exam.getCode());
        }

        exam.setStatus(ExamStatus.PUBLISHED);
        List<SeatAllocation> saved = allocationRepository.findByExamId(id);
        saved.forEach(a -> a.setPlanStatus(ExamStatus.PUBLISHED));
        allocationRepository.saveAll(saved);

        notifyInvigilators(exam);
        return toResponse(examRepository.save(exam));
    }

    @Override
    @Transactional
    public ExamResponse complete(String id) {
        Exam exam = require(id);
        exam.setStatus(ExamStatus.COMPLETED);
        return toResponse(examRepository.save(exam));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentResponse> eligibleStudents(String examId) {
        Exam exam = require(examId);
        return studentMapper.toResponses(
                studentRepository.findEligible(exam.getDepartments(), minYearOf(exam)));
    }

    @Override
    @Transactional(readOnly = true)
    public LocalDate earliestDate() {
        return examRepository.findAllByOrderByDateAsc().stream()
                .map(Exam::getDate)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(LocalDate.now());
    }

    /* ------------------------------------------------------------------ */

    /** Tells every assigned invigilator that the seating plan is now live. */
    private void notifyInvigilators(Exam exam) {
        List<Notification> batch = dutyRepository.findByExamId(exam.getId()).stream()
                .filter(duty -> duty.getFaculty() != null)
                .map(duty -> Notification.builder()
                        .id(IdFactory.next("N-",
                                notificationRepository.findAll().stream()
                                        .map(Notification::getId).toList(), 5))
                        .user(duty.getFaculty())
                        .type("duty")
                        .title("Seating plan published")
                        .message("The hall plan for " + titleOf(exam) + " is now available. "
                                + "Duty: " + duty.getHall().getName() + ".")
                        .href("/faculty/hall-plan")
                        .createdAt(Instant.now())
                        .build())
                .toList();
        notificationRepository.saveAll(batch);
    }

    private String titleOf(Exam exam) {
        return exam.getTitle() == null || exam.getTitle().isBlank() ? exam.getSubject() : exam.getTitle();
    }

    private ExamResponse toResponse(Exam exam) {
        List<ExamHall> links = examHallRepository.findByExamId(exam.getId());
        List<String> hallIds = links.stream().map(eh -> eh.getHall().getId()).toList();
        List<String> hallCodes = links.stream().map(eh -> eh.getHall().getCode()).toList();
        int eligible = studentRepository
                .findEligible(exam.getDepartments(), minYearOf(exam)).size();
        int allocated = (int) allocationRepository.countByExamId(exam.getId());

        return examMapper.toResponse(exam, hallIds, hallCodes, eligible, allocated);
    }

    private void attachHalls(Exam exam, List<String> hallIds) {
        if (hallIds == null) return;
        examHallRepository.deleteAll(examHallRepository.findByExamId(exam.getId()));

        List<String> distinct = hallIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();
        if (distinct.isEmpty()) return;

        List<Hall> halls = hallRepository.findByIdIn(distinct);
        if (halls.size() != distinct.size()) {
            List<String> found = halls.stream().map(Hall::getId).toList();
            throw ApiException.badRequest("Unknown hall id(s): "
                    + distinct.stream().filter(id -> !found.contains(id)).toList());
        }
        for (Hall hall : halls) {
            examHallRepository.save(ExamHall.builder()
                    .id(IdFactory.examHall(exam.getId(), hall.getId()))
                    .exam(exam)
                    .hall(hall)
                    .createdAt(Instant.now())
                    .build());
        }
    }

    private void validate(ExamRequest request) {
        if (request.getStartTime() != null && request.getEndTime() != null
                && !request.getEndTime().isAfter(request.getStartTime())) {
            throw ApiException.badRequest("endTime must be later than startTime");
        }
        for (String dept : request.getDepartments()) {
            if (dept == null || dept.isBlank()) {
                throw ApiException.badRequest("departments must not contain blanks");
            }
        }
    }

    private Integer minYearOf(Exam exam) {
        return exam.getMinYear() == null ? 1 : exam.getMinYear();
    }

    private Exam require(String id) {
        return examRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Exam", id));
    }

    private boolean matches(Exam exam, String needle) {
        return contains(exam.getCode(), needle)
                || contains(exam.getSubject(), needle)
                || contains(exam.getSubjectCode(), needle)
                || contains(exam.getTitle(), needle)
                || contains(exam.getCourse(), needle);
    }

    private boolean contains(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase(Locale.ROOT).contains(needle);
    }

    private String normaliseCode(String code) {
        if (code == null || code.isBlank()) return null;
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
