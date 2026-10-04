package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.dashboard.AdminDashboardResponse;
import com.examseat.dto.dashboard.FacultyDashboardResponse;
import com.examseat.dto.dashboard.SettingsRequest;
import com.examseat.security.CurrentUser;
import com.examseat.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Aggregated statistics for the admin and faculty home screens")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/dashboard/admin")
    @Operation(summary = "Admin dashboard — totals, allocation trend, department mix, upcoming exams")
    public ApiResponse<AdminDashboardResponse> admin() {
        return ApiResponse.ok(dashboardService.admin());
    }

    @GetMapping("/dashboard/stats")
    @Operation(summary = "Documented alias for GET /api/dashboard/admin")
    public ApiResponse<AdminDashboardResponse> stats() {
        return ApiResponse.ok(dashboardService.stats());
    }

    @GetMapping("/dashboard/faculty")
    @Operation(summary = "Faculty dashboard — duty stats, next duty, notifications")
    public ApiResponse<FacultyDashboardResponse> faculty(
            @RequestParam(required = false) String email) {
        // Clamped: a faculty member reading ?email= for a colleague is a 403.
        return ApiResponse.ok(dashboardService.faculty(CurrentUser.resolveTarget(email)));
    }

    @GetMapping("/activity")
    @Operation(summary = "Recent activity feed")
    public ApiResponse<List<AdminDashboardResponse.ActivityEntry>> activity(
            @RequestParam(defaultValue = "10") Integer limit) {
        return ApiResponse.ok(dashboardService.recentActivity(limit));
    }

    @GetMapping("/settings")
    @Operation(summary = "Current settings")
    public ApiResponse<SettingsRequest> getSettings() {
        return ApiResponse.ok(dashboardService.getSettings());
    }

    @PutMapping("/settings")
    @Operation(summary = "Update settings — omitted fields keep their current value")
    public ApiResponse<SettingsRequest> updateSettings(@RequestBody SettingsRequest request) {
        return ApiResponse.ok(dashboardService.updateSettings(request));
    }

    @PostMapping("/settings")
    @Operation(summary = "Alias for PUT /api/settings")
    public ApiResponse<SettingsRequest> saveSettings(@RequestBody SettingsRequest request) {
        return ApiResponse.ok(dashboardService.updateSettings(request));
    }

    @GetMapping("/health")
    @Operation(summary = "Liveness probe")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.ok(Map.of(
                "status", "UP",
                "service", "exam-seating-backend",
                "timestamp", java.time.Instant.now().toString()));
    }
}
