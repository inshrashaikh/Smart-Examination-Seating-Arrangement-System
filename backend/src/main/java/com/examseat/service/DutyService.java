package com.examseat.service;

import com.examseat.dto.duty.AssignDutyRequest;
import com.examseat.dto.duty.DutyResponse;
import com.examseat.dto.duty.FacultyResponse;
import com.examseat.dto.duty.MarkAttendanceRequest;
import com.examseat.dto.report.AttendanceSheet;
import com.examseat.service.ReportService.TableData;

import java.time.LocalDate;
import java.util.List;

public interface DutyService {

    /* -------- faculty directory -------- */

    List<FacultyResponse> listFaculty();

    FacultyResponse getFaculty(String id);

    /* -------- duty CRUD (ADMIN) -------- */

    List<DutyResponse> list(String examId, String facultyId);

    DutyResponse assign(AssignDutyRequest request);

    void remove(String dutyId);

    /** Marks a duty as confirmed / completed / cancelled. */
    DutyResponse updateStatus(String dutyId, String status);

    /* -------- faculty self-service -------- */

    /** {@code GET /api/duties/my} — the signed-in faculty's own duties. */
    List<DutyResponse> myDuties(String email);

    /** {@code GET /api/duties/faculty?email=} — alias used by the React client. */
    List<DutyResponse> forFaculty(String email);

    /** Duty rows restricted to a hall the faculty actually supervises. */
    List<DutyResponse> forFacultyHall(String email, String hallId);

    /** Hall ids the faculty is allowed to open for a given exam. */
    List<String> myHallIds(String email, String examId);

    List<DutyResponse> upcoming(String email, LocalDate from, LocalDate to);

    /* -------- faculty attendance (scoped to the faculty's own hall) -------- */

    /**
     * Attendance sheet for one hall the faculty supervises.
     *
     * @throws com.examseat.exception.ApiException 403 when the faculty holds no duty in
     *         that hall for that exam
     */
    AttendanceSheet attendance(String email, String examId, String hallId);

    /** Flattened sheet for {@code ?format=pdf|excel|csv}. Same scoping as above. */
    TableData attendanceTable(String email, String examId, String hallId);

    /**
     * Persists a batch of present/absent marks and returns the refreshed sheet.
     *
     * <p>Idempotent: re-posting the same records updates the same rows. Every
     * {@code allocationId} is validated against the actual allocations of that exam
     * and hall, so a typo cannot silently create a mark for a seat that does not exist.
     */
    AttendanceSheet saveAttendance(String email, String examId, String hallId,
                                   MarkAttendanceRequest request);
}
