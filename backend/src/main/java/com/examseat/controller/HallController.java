package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.hall.HallRequest;
import com.examseat.dto.hall.HallResponse;
import com.examseat.service.HallService;
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
@RequestMapping("/api/halls")
@RequiredArgsConstructor
@Tag(name = "Halls", description = "Examination hall CRUD and the seating grid definition")
public class HallController {

    private final HallService hallService;

    @GetMapping
    @Operation(summary = "Every hall, ordered by code")
    public ApiResponse<List<HallResponse>> list() {
        return ApiResponse.ok(hallService.list());
    }

    @GetMapping("/availability")
    @Operation(summary = "Halls with their allocated flag resolved for a given exam")
    public ApiResponse<List<HallResponse>> availability(@RequestParam(required = false) String examId) {
        return ApiResponse.ok(hallService.availability(examId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "One hall by id")
    public ApiResponse<HallResponse> get(@PathVariable String id) {
        return ApiResponse.ok(hallService.get(id));
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "One hall by code, e.g. A-101")
    public ApiResponse<HallResponse> getByCode(@PathVariable String code) {
        return ApiResponse.ok(hallService.getByCode(code));
    }

    @PostMapping
    @Operation(summary = "Create a hall")
    public ResponseEntity<ApiResponse<HallResponse>> create(@Valid @RequestBody HallRequest request) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(hallService.create(request), "Hall created"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a hall")
    public ApiResponse<HallResponse> update(@PathVariable String id,
                                            @Valid @RequestBody HallRequest request) {
        return ApiResponse.ok(hallService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a hall (blocked while it is attached to an exam or a plan)")
    public ApiResponse<Map<String, Object>> delete(@PathVariable String id) {
        hallService.delete(id);
        return ApiResponse.ok(Map.of("id", id, "deleted", true));
    }
}
