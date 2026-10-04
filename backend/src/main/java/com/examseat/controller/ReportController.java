package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.service.ReportService;
import com.examseat.util.TableDownloader;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Every report is reachable two ways:
 *
 * <ul>
 *   <li>{@code GET /api/reports/hall-wise?examId=EX-001} — JSON, the shape the
 *       React client consumes via {@code src/services/index.js}.</li>
 *   <li>{@code GET /api/reports/hall-wise/EX-001} — the documented REST shape.</li>
 * </ul>
 *
 * Add {@code ?format=pdf|excel|csv} to either form to download the file instead of
 * receiving the JSON envelope.
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Hall-wise, department-wise, student-wise and attendance exports")
public class ReportController {

    private final ReportService reportService;

    /* ================================ hall-wise ================================= */

    @GetMapping("/hall-wise")
    @Operation(summary = "Hall-wise report (React contract: ?examId=, optional ?format=)")
    public ResponseEntity<?> hallWiseJson(@RequestParam String examId,
                                          @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.hallWise(examId));
        }
        return download(reportService.hallWiseTable(examId), format, "hall-wise", examId);
    }

    @GetMapping("/hall-wise/{examId}")
    @Operation(summary = "Hall-wise report by path; ?format=pdf|excel|csv downloads the file")
    public ResponseEntity<?> hallWise(@PathVariable String examId,
                                      @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.hallWise(examId));
        }
        return download(reportService.hallWiseTable(examId), format, "hall-wise", examId);
    }

    /* ============================== department-wise ============================= */

    @GetMapping("/department-wise")
    @Operation(summary = "Department-wise report (React contract: ?examId=, optional ?format=)")
    public ResponseEntity<?> departmentWiseJson(@RequestParam String examId,
                                                @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.departmentWise(examId));
        }
        return download(reportService.departmentWiseTable(examId), format,
                "department-wise", examId);
    }

    @GetMapping("/department-wise/{examId}")
    @Operation(summary = "Department-wise report by path; ?format=pdf|excel|csv downloads the file")
    public ResponseEntity<?> departmentWise(@PathVariable String examId,
                                            @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.departmentWise(examId));
        }
        return download(reportService.departmentWiseTable(examId), format,
                "department-wise", examId);
    }

    /* ================================ student-wise =============================== */

    @GetMapping("/student-wise")
    @Operation(summary = "Student-wise report (React contract: ?examId=, optional ?search=)")
    public ResponseEntity<?> studentWiseJson(
            @RequestParam String examId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.studentWise(examId, search, department));
        }
        return download(reportService.studentWiseTable(examId, search, department),
                format, "student-wise", examId);
    }

    @GetMapping("/student-wise/{examId}")
    @Operation(summary = "Student-wise report by path; ?format=pdf|excel|csv downloads the file")
    public ResponseEntity<?> studentWise(
            @PathVariable String examId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.studentWise(examId, search, department));
        }
        return download(reportService.studentWiseTable(examId, search, department),
                format, "student-wise", examId);
    }

    /* ================================ attendance ================================ */

    @GetMapping("/attendance")
    @Operation(summary = "Attendance sheet (React contract: ?examId=, optional ?hallId=)")
    public ResponseEntity<?> attendanceJson(@RequestParam String examId,
                                            @RequestParam(required = false) String hallId,
                                            @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.attendance(examId, hallId));
        }
        return download(reportService.attendanceTable(examId, hallId), format,
                "attendance", examId + "-" + (hallId == null ? "all-halls" : hallId));
    }

    @GetMapping("/attendance/{examId}/{hallId}")
    @Operation(summary = "Attendance sheet by path; ?format=pdf|excel|csv downloads the file")
    public ResponseEntity<?> attendance(@PathVariable String examId,
                                        @PathVariable String hallId,
                                        @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.attendance(examId, hallId));
        }
        return download(reportService.attendanceTable(examId, hallId), format,
                "attendance", examId + "-" + hallId);
    }

    @GetMapping("/attendance-sheet/{examId}/{hallId}")
    @Operation(summary = "Documented alias for the attendance sheet")
    public ResponseEntity<?> attendanceSheet(@PathVariable String examId,
                                             @PathVariable String hallId,
                                             @RequestParam(required = false) String format) {
        if (isJson(format)) {
            return json(reportService.attendance(examId, hallId));
        }
        return download(reportService.attendanceTable(examId, hallId), format,
                "attendance-sheet", examId + "-" + hallId);
    }

    /* ================================================================== helpers == */

    private boolean isJson(String format) {
        return TableDownloader.wantsJson(format);
    }

    private ResponseEntity<Object> json(Object payload) {
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    /**
     * Shared with {@code DutyController}. The faculty attendance routes live under
     * {@code /api/duties/my/**} so they can be scoped to the invigilator's own hall,
     * but the file handling is identical — keeping one implementation is what stops
     * {@code ?format=} from being honoured in one place and ignored in the other.
     */
    private ResponseEntity<byte[]> download(ReportService.TableData table, String format,
                                            String slug, String suffix) {
        return TableDownloader.download(table, format, slug, suffix);
    }
}
