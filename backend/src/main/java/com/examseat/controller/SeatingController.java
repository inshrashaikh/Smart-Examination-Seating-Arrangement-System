package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.duty.DutyResponse;
import com.examseat.dto.seating.GenerateSeatingRequest;
import com.examseat.dto.seating.GenerateSeatingResponse;
import com.examseat.dto.seating.HallPlanResponse;
import com.examseat.dto.seating.SwapSeatsRequest;
import com.examseat.exception.ApiException;
import com.examseat.security.CurrentUser;
import com.examseat.service.DutyService;
import com.examseat.service.SeatingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/seating")
@RequiredArgsConstructor
@Tag(name = "Seating", description = "Seat allocation engine, hall plans, swaps and reset")
public class SeatingController {

    private final SeatingService seatingService;
    private final DutyService dutyService;

    /* ============================ React client contract ============================ */

    @PostMapping("/generate")
    @Operation(summary = "Run the seating engine and persist the plan")
    public ApiResponse<GenerateSeatingResponse> generate(
            @Valid @RequestBody GenerateSeatingRequest request) {
        return ApiResponse.ok(seatingService.generate(request));
    }

    @GetMapping("/plans")
    @Operation(summary = "Every hall plan, optionally filtered by exam. "
            + "Faculty receive only the halls they are duty-assigned to.")
    public ApiResponse<List<HallPlanResponse>> listPlans(@RequestParam(required = false) String examId) {
        List<HallPlanResponse> plans = seatingService.listPlans(examId);
        if (CurrentUser.isAdmin()) {
            return ApiResponse.ok(plans);
        }
        Set<String> allowed = myHallIds(examId);
        return ApiResponse.ok(plans.stream()
                .filter(plan -> allowed.contains(plan.getHallId()))
                .toList());
    }

    @GetMapping("/plans/{planId}")
    @Operation(summary = "One hall plan by composite id, e.g. EX-001-H-1. "
            + "Faculty may only read plans for their own halls.")
    public ApiResponse<HallPlanResponse> getPlan(@PathVariable String planId) {
        HallPlanResponse plan = seatingService.getPlan(planId);
        if (!CurrentUser.isAdmin() && !myHallIds(plan.getExamId()).contains(plan.getHallId())) {
            throw ApiException.forbidden("You are not invigilating hall "
                    + plan.getHallId() + " for exam " + plan.getExamId());
        }
        return ApiResponse.ok(plan);
    }

    /** Halls the signed-in faculty member supervises, for one exam or across all of them. */
    private Set<String> myHallIds(String examId) {
        List<DutyResponse> mine = dutyService.forFaculty(CurrentUser.requireEmail());
        Set<String> halls = new LinkedHashSet<>();
        for (DutyResponse duty : mine) {
            if (examId == null || examId.isBlank() || examId.equals(duty.getExamId())) {
                halls.add(duty.getHallId());
            }
        }
        return halls;
    }

    @PostMapping("/plans/{planId}/swap")
    @Operation(summary = "Swap two seats inside the hall identified by the composite plan id")
    public ApiResponse<HallPlanResponse> swapByPlan(@PathVariable String planId,
                                                    @Valid @RequestBody SwapSeatsRequest request) {
        return ApiResponse.ok(seatingService.swap(planId, request));
    }

    @PostMapping("/plans/{planId}/publish")
    @Operation(summary = "Publish the plan — invigilators are notified")
    public ApiResponse<HallPlanResponse> publishPlan(@PathVariable String planId) {
        return ApiResponse.ok(seatingService.publishPlan(planId));
    }

    /* ============================== Documented aliases ============================= */

    @GetMapping("/exam/{examId}/hall/{hallId}")
    @Operation(summary = "Grid data for one hall of one exam (alias for GET /seating/plans/{examId}-{hallId})")
    public ApiResponse<HallPlanResponse> getHallPlan(@PathVariable String examId,
                                                     @PathVariable String hallId) {
        return ApiResponse.ok(seatingService.getHallPlan(examId, hallId));
    }

    @PutMapping("/swap")
    @Operation(summary = "Swap two seats addressed by allocation id")
    public ApiResponse<HallPlanResponse> swapByAllocationId(@Valid @RequestBody Map<String, Object> body) {
        String examId = string(body, "examId");
        String first = firstOf(string(body, "allocationId1"), string(body, "a"), string(body, "first"));
        String second = firstOf(string(body, "allocationId2"), string(body, "b"), string(body, "second"));
        boolean validate = !Boolean.FALSE.equals(body.get("validate"));

        if (examId == null || first == null || second == null) {
            throw com.examseat.exception.ApiException.badRequest(
                    "Provide examId plus allocationId1 and allocationId2 (or a / b)");
        }
        return ApiResponse.ok(seatingService.swapByAllocationIds(examId, first, second, validate));
    }

    @DeleteMapping("/exam/{examId}")
    @Operation(summary = "Reset an exam — deletes every allocation and returns it to SCHEDULED")
    public ApiResponse<Map<String, Object>> reset(@PathVariable String examId) {
        int removed = seatingService.reset(examId);
        return ApiResponse.ok(Map.of("examId", examId, "removed", removed));
    }

    @GetMapping("/exam/{examId}/students")
    @Operation(summary = "Every student seated for this exam")
    public ApiResponse<List<com.examseat.dto.student.StudentResponse>> seatedStudents(
            @PathVariable String examId) {
        return ApiResponse.ok(seatingService.seatedStudents(examId));
    }

    /* ==================================== helpers =================================== */

    private String string(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private String firstOf(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return null;
    }
}
