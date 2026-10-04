package com.examseat.service.impl;

import com.examseat.dto.duty.AssignDutyRequest;
import com.examseat.dto.duty.DutyResponse;
import com.examseat.dto.duty.FacultyResponse;
import com.examseat.dto.duty.MarkAttendanceRequest;
import com.examseat.dto.report.AttendanceSheet;
import com.examseat.entity.AttendanceMark;
import com.examseat.entity.DutyRole;
import com.examseat.entity.DutyStatus;
import com.examseat.entity.Exam;
import com.examseat.entity.Hall;
import com.examseat.entity.InvigilationDuty;
import com.examseat.entity.Notification;
import com.examseat.entity.Role;
import com.examseat.entity.SeatAllocation;
import com.examseat.entity.User;
import com.examseat.exception.ApiException;
import com.examseat.repository.AttendanceMarkRepository;
import com.examseat.repository.ExamRepository;
import com.examseat.repository.HallRepository;
import com.examseat.repository.InvigilationDutyRepository;
import com.examseat.repository.NotificationRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.UserRepository;
import com.examseat.service.DutyService;
import com.examseat.service.ReportService;
import com.examseat.util.IdFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class DutyServiceImpl implements DutyService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final InvigilationDutyRepository dutyRepository;
    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final HallRepository hallRepository;
    private final SeatAllocationRepository allocationRepository;
    private final NotificationRepository notificationRepository;
    private final AttendanceMarkRepository attendanceMarkRepository;
    /**
     * Injected so the attendance sheet is built by exactly one implementation. The
     * faculty route and the admin report route return the same shape, and two copies
     * of the builder is how they would end up disagreeing about what {@code present}
     * means.
     */
    private final ReportService reportService;
    private final com.examseat.service.AuditService auditService;

    /* =========================================================== faculty directory */

    @Override
    @Transactional(readOnly = true)
    public List<FacultyResponse> listFaculty() {
        return userRepository.findByRoleOrderByNameAsc(Role.FACULTY).stream()
                .map(faculty -> {
                    List<InvigilationDuty> duties = dutyRepository.findByFacultyIdOrderByDateDesc(faculty.getId());
                    long upcoming = duties.stream()
                            .filter(d -> d.getDate() != null && !d.getDate().isBefore(LocalDate.now()))
                            .count();

                    return FacultyResponse.builder()
                            .id(faculty.getId())
                            .name(faculty.getName())
                            .email(faculty.getEmail())
                            .department(faculty.getDepartment())
                            .designation(faculty.getTitle())
                            .employeeId(faculty.getEmployeeId())
                            .phone(faculty.getPhone())
                            .photo(faculty.getPhoto())
                            .dutyPreference("BALANCED")
                            .maxDutiesPerDay(3)
                            .dutyCount(duties.size())
                            .hallsCovered((int) duties.stream()
                                    .map(d -> d.getHall().getId()).distinct().count())
                            .upcomingDuties((int) upcoming)
                            .status(faculty.isEnabled() ? "ACTIVE" : "INACTIVE")
                            .build();
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FacultyResponse getFaculty(String id) {
        User faculty = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Faculty", id));
        return listFaculty().stream()
                .filter(row -> row.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Faculty", id));
    }

    /* ================================================================ duties */

    @Override
    @Transactional(readOnly = true)
    public List<DutyResponse> list(String examId, String facultyId) {
        List<InvigilationDuty> duties;
        if (examId != null && !examId.isBlank()) {
            duties = dutyRepository.findByExamId(examId);
        } else if (facultyId != null && !facultyId.isBlank()) {
            duties = dutyRepository.findByFacultyIdOrderByDateDesc(facultyId);
        } else {
            duties = dutyRepository.findAll();
        }
        return duties.stream().sorted(
                        java.util.Comparator.comparing(InvigilationDuty::getDate,
                                java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                                .thenComparing(d -> d.getHall().getCode()))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public DutyResponse assign(AssignDutyRequest request) {
        User faculty = userRepository.findById(request.getFacultyId())
                .orElseThrow(() -> ApiException.notFound("Faculty", request.getFacultyId()));
        Exam exam = examRepository.findById(request.getExamId())
                .orElseThrow(() -> ApiException.notFound("Exam", request.getExamId()));
        Hall hall = hallRepository.findById(request.getHallId())
                .orElseThrow(() -> ApiException.notFound("Hall", request.getHallId()));

        if (dutyRepository.existsByExamIdAndHallIdAndFacultyId(exam.getId(), hall.getId(), faculty.getId())) {
            throw ApiException.conflict(faculty.getName() + " is already assigned to "
                    + hall.getName() + " for " + exam.getCode());
        }
        // Two invigilators per hall is the practical ceiling; a third is a data-entry slip.
        if (dutyRepository.findByExamIdAndHallId(exam.getId(), hall.getId()).size() >= 2) {
            throw ApiException.conflict(hall.getName() + " already has two invigilators for "
                    + exam.getCode());
        }

        InvigilationDuty duty = InvigilationDuty.builder()
                .id(IdFactory.next("D-", dutyRepository.findAll().stream()
                        .map(InvigilationDuty::getId).toList(), 4))
                .faculty(faculty)
                .exam(exam)
                .hall(hall)
                .date(request.getDate() == null ? exam.getDate() : request.getDate())
                .startTime(request.getStartTime() == null ? exam.getStartTime() : request.getStartTime())
                .endTime(request.getEndTime() == null ? exam.getEndTime() : request.getEndTime())
                .role(request.getRole() == null ? DutyRole.INVIGILATOR : request.getRole())
                .status(DutyStatus.ASSIGNED)
                .assignedAt(Instant.now())
                .build();

        DutyResponse saved = toResponse(dutyRepository.save(duty));

        // Tell the faculty member about the new duty.
        notificationRepository.save(Notification.builder()
                .id(IdFactory.next("N-", notificationRepository.findAll().stream()
                        .map(Notification::getId).toList(), 5))
                .user(faculty)
                .type("duty")
                .title("Invigilation duty assigned")
                .message(hall.getName() + " · " + (exam.getTitle() == null ? exam.getSubject() : exam.getTitle())
                        + " on " + duty.getDate() + " at " + duty.getStartTime().format(TIME))
                .href("/faculty/duties")
                .createdAt(Instant.now())
                .build());

        log.info("Assigned {} to {} / {} for {}", faculty.getName(), hall.getCode(), exam.getCode(), duty.getDate());
        auditService.record("duty.assign", faculty.getName() + " (" + faculty.getEmail() + ") -> "
                + hall.getName() + " / " + exam.getCode() + " on " + duty.getDate());
        return saved;
    }

    @Override
    @Transactional
    public void remove(String dutyId) {
        InvigilationDuty duty = dutyRepository.findById(dutyId)
                .orElseThrow(() -> ApiException.notFound("Duty", dutyId));
        dutyRepository.delete(duty);
        auditService.record("duty.remove", duty.getFaculty().getName() + " removed from "
                + duty.getHall().getName() + " / " + duty.getExam().getCode());
    }

    @Override
    @Transactional
    public DutyResponse updateStatus(String dutyId, String status) {
        InvigilationDuty duty = dutyRepository.findById(dutyId)
                .orElseThrow(() -> ApiException.notFound("Duty", dutyId));
        DutyStatus next;
        try {
            next = DutyStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw ApiException.badRequest("Unknown duty status '" + status
                    + "'. Use ASSIGNED, CONFIRMED, COMPLETED or CANCELLED.");
        }
        duty.setStatus(next);
        auditService.record("duty.status", duty.getFaculty().getName() + " · "
                + duty.getHall().getName() + " / " + duty.getExam().getCode()
                + ": " + duty.getStatus() + " -> " + next);
        return toResponse(dutyRepository.save(duty));
    }

    /* ===================================================== faculty self-service */

    @Override
    @Transactional(readOnly = true)
    public List<DutyResponse> myDuties(String email) {
        return forFaculty(email);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DutyResponse> forFaculty(String email) {
        User faculty = requireFaculty(email);
        return dutyRepository.findByFacultyIdOrderByDateDesc(faculty.getId()).stream()
                .sorted(java.util.Comparator.comparing(InvigilationDuty::getDate,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DutyResponse> forFacultyHall(String email, String hallId) {
        User faculty = requireFaculty(email);
        return dutyRepository.findByFacultyIdOrderByDateDesc(faculty.getId()).stream()
                .filter(duty -> duty.getHall().getId().equals(hallId))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> myHallIds(String email, String examId) {
        User faculty = requireFaculty(email);
        return dutyRepository.findByFacultyIdOrderByDateDesc(faculty.getId()).stream()
                .filter(duty -> examId == null || examId.isBlank() || duty.getExam().getId().equals(examId))
                .map(duty -> duty.getHall().getId())
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new))
                .stream().toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DutyResponse> upcoming(String email, LocalDate from, LocalDate to) {
        User faculty = requireFaculty(email);
        LocalDate start = from == null ? LocalDate.now() : from;
        LocalDate end = to == null ? start.plusMonths(3) : to;
        return dutyRepository
                .findByFacultyIdAndDateBetweenOrderByDateAsc(faculty.getId(), start, end).stream()
                .map(this::toResponse)
                .toList();
    }

    /* ===================================================== faculty attendance === */

    @Override
    @Transactional(readOnly = true)
    public AttendanceSheet attendance(String email, String examId, String hallId) {
        requireSupervisedHall(email, examId, hallId);
        return reportService.attendance(examId, hallId);
    }

    @Override
    @Transactional(readOnly = true)
    public ReportService.TableData attendanceTable(String email, String examId, String hallId) {
        requireSupervisedHall(email, examId, hallId);
        return reportService.attendanceTable(examId, hallId);
    }

    @Override
    @Transactional
    public AttendanceSheet saveAttendance(String email, String examId, String hallId,
                                          MarkAttendanceRequest request) {
        User invigilator = requireFaculty(email);
        requireSupervisedHall(email, examId, hallId);

        Hall hall = hallRepository.findById(hallId)
                .orElseThrow(() -> ApiException.notFound("Hall", hallId));

        // Every allocation in this exam+hall, indexed by id. Validating the submitted ids
        // against this set is what stops a typo - or a malicious client - from creating a
        // mark for a seat that is not on the sheet.
        Map<String, SeatAllocation> valid = new LinkedHashMap<>();
        for (SeatAllocation allocation :
                allocationRepository.findByExamIdAndHallIdOrderByRowNoAscColNoAsc(examId, hallId)) {
            valid.put(allocation.getId(), allocation);
        }

        Instant now = Instant.now();
        List<AttendanceMark> toSave = new ArrayList<>();

        for (MarkAttendanceRequest.Mark mark : request.getRecords()) {
            SeatAllocation allocation = valid.get(mark.getAllocationId());
            if (allocation == null) {
                throw ApiException.badRequest("Seat '" + mark.getAllocationId()
                        + "' is not seated in " + hall.getCode() + " for exam " + examId
                        + ". It is either a different hall, a different exam, or an empty seat.");
            }

            // Idempotent by construction: the id is derived from (allocation, exam), so
            // re-posting a batch after a timeout overwrites rather than duplicates.
            AttendanceMark entity = attendanceMarkRepository
                    .findById(AttendanceMark.idFor(mark.getAllocationId(), examId))
                    .orElseGet(() -> AttendanceMark.builder()
                            .id(AttendanceMark.idFor(mark.getAllocationId(), examId))
                            .allocationId(mark.getAllocationId())
                            .examId(examId)
                            .hallId(hallId)
                            .build());

            entity.setRollNo(allocation.getStudent().getRollNo());
            entity.setPresent(Boolean.TRUE.equals(mark.getPresent()));
            entity.setNote(mark.getNote());
            entity.setMarkedBy(invigilator.getEmail());
            entity.setMarkedAt(now);
            entity.syncStatus();
            toSave.add(entity);
        }

        attendanceMarkRepository.saveAll(toSave);

        log.info("Attendance saved by {}: {}/{} marks for {} {}",
                invigilator.getEmail(), toSave.size(), valid.size(), examId, hall.getCode());
        auditService.record("attendance.mark", examId + " · " + hall.getCode() + ": "
                + toSave.size() + " mark(s) saved by " + invigilator.getEmail());

        // Return the refreshed sheet so the client renders what was actually stored
        // rather than echoing back its own optimistic guess.
        return reportService.attendance(examId, hallId);
    }

    /**
     * 403 unless the faculty member actually supervises this hall for this exam.
     *
     * <p>Called by all three attendance entry points. Scoping lives here, once, rather
     * than being restated per endpoint - the paths all carry {@code /my/}, but the
     * {@code {hallId}} in the URL is caller-supplied and is not trustworthy on its own.
     */
    private void requireSupervisedHall(String email, String examId, String hallId) {
        if (examId == null || examId.isBlank()) {
            throw ApiException.badRequest("An examId is required to open an attendance sheet");
        }
        if (hallId == null || hallId.isBlank()) {
            throw ApiException.badRequest("A hall id is required to open an attendance sheet");
        }
        if (!myHallIds(email, examId).contains(hallId)) {
            throw ApiException.forbidden("You are not assigned to " + hallId + " for exam " + examId);
        }
    }

    /* ================================================================= helpers */

    private DutyResponse toResponse(InvigilationDuty duty) {
        User faculty = duty.getFaculty();
        Exam exam = duty.getExam();
        Hall hall = duty.getHall();
        int seatCount = (int) allocationRepository
                .countByExamIdAndHallId(exam.getId(), hall.getId());

        return DutyResponse.builder()
                .id(duty.getId())
                .facultyId(faculty.getId())
                .facultyName(faculty.getName())
                .facultyEmail(faculty.getEmail())
                .facultyDepartment(faculty.getDepartment())
                .facultyDesignation(faculty.getTitle())
                .facultyPhone(faculty.getPhone())
                .facultyPhoto(faculty.getPhoto())
                .examId(exam.getId())
                .examTitle(exam.getTitle() == null ? exam.getSubject() : exam.getTitle())
                .examCode(exam.getCode())
                .subject(exam.getSubject())
                .hallId(hall.getId())
                .hallName(hall.getName())
                .hallCode(hall.getCode())
                .date(duty.getDate())
                .startTime(duty.getStartTime())
                .endTime(duty.getEndTime())
                .timeRange(duty.getStartTime() == null || duty.getEndTime() == null ? null
                        : duty.getStartTime().format(TIME) + " - " + duty.getEndTime().format(TIME))
                .role(duty.getRole())
                .status(duty.getStatus())
                .seatCount(seatCount)
                .assignedAt(duty.getAssignedAt())
                .build();
    }

    private User requireFaculty(String email) {
        if (email == null || email.isBlank()) {
            throw ApiException.badRequest("An email is required to resolve the faculty account");
        }
        User faculty = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> ApiException.notFound("Faculty", email));
        if (faculty.getRole() != Role.FACULTY && faculty.getRole() != Role.ADMIN) {
            throw ApiException.forbidden(email + " is not a faculty account");
        }
        return faculty;
    }

    /** Distinct hall ids covered across every duty, used by the faculty dashboard. */
    @Transactional(readOnly = true)
    public Set<String> hallsCovered(String email) {
        User faculty = requireFaculty(email);
        Set<String> halls = new HashSet<>();
        dutyRepository.findByFacultyIdOrderByDateDesc(faculty.getId())
                .forEach(duty -> halls.add(duty.getHall().getId()));
        return halls;
    }
}
