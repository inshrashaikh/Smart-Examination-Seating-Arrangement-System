package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.common.PageResponse;
import com.examseat.entity.AuditLog;
import com.examseat.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The audit trail — every noteworthy action the system has taken.
 *
 * <p>Admin-only: the trail names who did what, which is exactly the kind of
 * record an examination cell must control tightly.</p>
 */
@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@Tag(name = "Audit", description = "Audit trail of seating, duty and plan changes")
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    @Operation(summary = "Audit trail, newest first (paged)")
    public ApiResponse<PageResponse<AuditLog>> page(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ApiResponse.ok(auditService.page(page, size));
    }

    @GetMapping("/recent")
    @Operation(summary = "The 200 most recent audit entries")
    public ApiResponse<List<AuditLog>> recent() {
        return ApiResponse.ok(auditService.recent());
    }
}
