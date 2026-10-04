package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.exam.ExamRequest;
import com.examseat.dto.exam.ExamResponse;
import com.examseat.dto.student.StudentResponse;
import com.examseat.service.ExamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
import java.util.Map;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
@Tag(name = "Exams", description = "Examination CRUD, publishing and eligibility")
public class ExamController {

    private final ExamService examService;

    @GetMapping
    @Operation(summary = "Every exam, optionally filtered by status, search text or department")
    public ApiResponse<List<ExamResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department) {
        return ApiResponse.ok(examService.list(status, search, department));
    }

    @GetMapping("/upcoming")
    @Operation(summary = "The next few exams, soonest first")
    public ApiResponse<List<ExamResponse>> upcoming(@RequestParam(defaultValue = "5") Integer limit) {
        return ApiResponse.ok(examService.upcoming(limit));
    }

    @GetMapping("/{id}")
    @Operation(summary = "One exam by id")
    public ApiResponse<ExamResponse> get(@PathVariable String id) {
        return ApiResponse.ok(examService.get(id));
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "One exam by code, e.g. EX-001")
    public ApiResponse<ExamResponse> getByCode(@PathVariable String code) {
        return ApiResponse.ok(examService.getByCode(code));
    }

    @GetMapping("/{id}/eligible-students")
    @Operation(summary = "Students eligible to sit this exam (department + min-year filter)")
    public ApiResponse<List<StudentResponse>> eligibleStudents(@PathVariable String id) {
        return ApiResponse.ok(examService.eligibleStudents(id));
    }

    @PostMapping
    @Operation(summary = "Create an exam")
    public ResponseEntity<ApiResponse<ExamResponse>> create(@Valid @RequestBody ExamRequest request) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(examService.create(request), "Exam created"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an exam")
    public ApiResponse<ExamResponse> update(@PathVariable String id,
                                            @Valid @RequestBody ExamRequest request) {
        return ApiResponse.ok(examService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an exam (blocked while a plan or duty exists)")
    public ApiResponse<Map<String, Object>> delete(@PathVariable String id) {
        examService.delete(id);
        return ApiResponse.ok(Map.of("id", id, "deleted", true));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Publish the seating plan — invigilators are notified")
    public ApiResponse<ExamResponse> publish(@PathVariable String id) {
        return ApiResponse.ok(examService.publish(id));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Mark an exam COMPLETED")
    public ApiResponse<ExamResponse> complete(@PathVariable String id) {
        return ApiResponse.ok(examService.complete(id));
    }
}
