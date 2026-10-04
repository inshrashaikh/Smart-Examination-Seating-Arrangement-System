package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.duty.AssignDutyRequest;
import com.examseat.dto.duty.DutyResponse;
import com.examseat.dto.duty.FacultyResponse;
import com.examseat.dto.duty.MarkAttendanceRequest;
import com.examseat.dto.report.AttendanceSheet;
import com.examseat.dto.seating.HallPlanResponse;
import com.examseat.exception.ApiException;
import com.examseat.security.CurrentUser;
import com.examseat.service.DutyService;
import com.examseat.service.SeatingService;
import com.examseat.util.TableDownloader;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Faculty & duties", description = "Faculty directory and invigilation duty assignment")
public class DutyController {

    private final DutyService dutyService;
    private final SeatingService seatingService;

    /* ============================== faculty directory ============================== */

    @GetMapping("/faculty")
    @Operation(summary = "Every faculty member with duty aggregates")
    public ApiResponse<List<FacultyResponse>> faculty() {
        return ApiResponse.ok(dutyService.listFaculty());
    }

    @GetMapping("/faculty/{id}")
    @Operation(summary = "One faculty member")
    public ApiResponse<FacultyResponse> facultyById(@PathVariable String id) {
        return ApiResponse.ok(dutyService.getFaculty(id));
    }

    /* ================================ duty CRUD (admin) ============================= */

    @GetMapping("/duties")
    @Operation(summary = "Every duty, optionally filtered by exam or faculty")
    public ApiResponse<List<DutyResponse>> list(
            @RequestParam(required = false) String examId,
            @RequestParam(required = false) String facultyId) {
        return ApiResponse.ok(dutyService.list(examId, facultyId));
    }

    @PostMapping({"/duties", "/duties/assign"})
    @Operation(summary = "Assign a faculty member to invigilate one hall of one exam")
    public ResponseEntity<ApiResponse<DutyResponse>> assign(
            @Valid @RequestBody AssignDutyRequest request) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(dutyService.assign(request), "Duty assigned"));
    }

    @DeleteMapping("/duties/{id}")
    @Operation(summary = "Remove a duty")
    public ApiResponse<Map<String, Object>> remove(@PathVariable String id) {
        dutyService.remove(id);
        return ApiResponse.ok(Map.of("id", id, "deleted", true));
    }

    @PatchMapping("/duties/{id}/status")
    @Operation(summary = "Move a duty through ASSIGNED / CONFIRMED / COMPLETED / CANCELLED")
    public ApiResponse<DutyResponse> updateStatus(
            @PathVariable String id,
            @RequestParam(name = "status", required = false) String statusParam,
            @RequestBody(required = false) Map<String, Object> body) {
        // Accept both shapes: a PATCH carries a body far more naturally than a query
        // parameter, but the parameter form is convenient from a browser address bar.
        String status = statusParam != null && !statusParam.isBlank()
                ? statusParam
                : stringValue(body, "status");
        if (status == null || status.isBlank()) {
            throw ApiException.badRequest(
                    "Provide the new status, either as ?status=COMPLETED or a body of {\"status\": \"COMPLETED\"}");
        }
        return ApiResponse.ok(dutyService.updateStatus(id, status));
    }

    /* ============================== faculty self-service =========================== */

    @GetMapping("/duties/my")
    @Operation(summary = "The signed-in faculty member's duties")
    public ApiResponse<List<DutyResponse>> myDuties(@RequestParam(required = false) String email) {
        return ApiResponse.ok(dutyService.myDuties(resolve(email)));
    }

    @GetMapping("/duties/faculty")
    @Operation(summary = "Alias used by the React client — duties for ?email=")
    public ApiResponse<List<DutyResponse>> forFaculty(@RequestParam(required = false) String email) {
        return ApiResponse.ok(dutyService.forFaculty(resolve(email)));
    }

    @GetMapping("/duties/my/hall/{hallId}")
    @Operation(summary = "The signed-in faculty member's duty in one hall")
    public ApiResponse<List<DutyResponse>> myDutiesInHall(
            @PathVariable String hallId,
            @RequestParam(required = false) String email) {
        return ApiResponse.ok(dutyService.forFacultyHall(resolve(email), hallId));
    }

    @GetMapping("/duties/my/hall/{hallId}/plan")
    @Operation(summary = "The seating plan for a hall this faculty member supervises")
    public ApiResponse<List<HallPlanResponse>> myHallPlan(
            @PathVariable String hallId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String examId) {
        String resolved = resolve(email);
        List<String> allowed = examId == null || examId.isBlank()
                ? dutyService.forFaculty(resolved).stream()
                        .map(DutyResponse::getExamId).distinct().findFirst()
                        .map(id -> dutyService.myHallIds(resolved, id)).orElse(List.of())
                : dutyService.myHallIds(resolved, examId);

        if (!CurrentUser.isAdmin() && !allowed.contains(hallId)) {
            throw ApiException.forbidden("You are not assigned to hall " + hallId);
        }

        return ApiResponse.ok(seatingPlans(resolved, examId, allowed).stream()
                .filter(plan -> hallId.equals(plan.getHallId()))
                .toList());
    }

    @GetMapping("/duties/my/hall/{hallId}/attendance")
    @Operation(summary = "Attendance sheet for a hall this faculty member supervises. "
            + "Add ?format=pdf|excel|csv to download the file instead of the JSON sheet.")
    public ResponseEntity<?> myHallAttendance(
            @PathVariable String hallId,
            @RequestParam String examId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String format) {
        String resolved = resolve(email);
        if (TableDownloader.wantsJson(format)) {
            return ResponseEntity.ok(ApiResponse.ok(dutyService.attendance(resolved, examId, hallId)));
        }
        return TableDownloader.download(
                dutyService.attendanceTable(resolved, examId, hallId), format,
                "attendance", examId + "-" + hallId);
    }

    @PostMapping("/duties/my/hall/{hallId}/attendance")
    @Operation(summary = "Save present/absent marks for a hall this faculty member supervises. "
            + "Idempotent per allocationId; returns the refreshed sheet.")
    public ApiResponse<AttendanceSheet> markAttendance(
            @PathVariable String hallId,
            @RequestParam String examId,
            @RequestParam(required = false) String email,
            @Valid @RequestBody MarkAttendanceRequest request) {
        AttendanceSheet saved = dutyService.saveAttendance(resolve(email), examId, hallId, request);
        return ApiResponse.ok(saved, saved.getSummary().getMarked() + " of "
                + saved.getSummary().getTotal() + " seats marked");
    }

    @GetMapping("/duties/my/upcoming")
    @Operation(summary = "Upcoming duties within a date window")
    public ApiResponse<List<DutyResponse>> upcoming(
            @RequestParam(required = false) String email,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(dutyService.upcoming(resolve(email), from, to));
    }

    /* ==================================================================== helpers == */

    /**
     * Plans the faculty is allowed to see. When no exam is given we fall back to the
     * most recent exam they hold a duty for, so the faculty hall-plan page opens
     * straight onto real data.
     */
    private List<HallPlanResponse> seatingPlans(String email, String examId, List<String> allowedHalls) {
        String targetExam = examId;
        if (targetExam == null || targetExam.isBlank()) {
            targetExam = dutyService.forFaculty(email).stream()
                    .map(DutyResponse::getExamId)
                    .distinct()
                    .findFirst()
                    .orElse(null);
        }
        if (targetExam == null) return List.of();

        return seatingService.listPlans(targetExam).stream()
                .filter(plan -> allowedHalls.contains(plan.getHallId()))
                .toList();
    }

    /** Admins may inspect any faculty account; everyone else is scoped to themselves. */
    private String resolve(String requested) {
        return CurrentUser.resolveTarget(requested);
    }

    private String stringValue(Map<String, Object> body, String key) {
        if (body == null) return null;
        Object value = body.get(key);
        return value == null ? null : String.valueOf(value);
    }
}
