package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.common.PageResponse;
import com.examseat.dto.student.StudentRequest;
import com.examseat.dto.student.StudentResponse;
import com.examseat.dto.student.StudentUploadResult;
import com.examseat.service.StudentService;
import com.examseat.util.TableExporter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Tag(name = "Students", description = "Student roster CRUD and bulk upload")
public class StudentController {

    private static final List<String> UPLOAD_COLUMNS =
            List.of("rollNo", "name", "email", "phone", "department", "year", "section", "gender", "prn");

    private final StudentService studentService;

    @GetMapping
    @Operation(summary = "Paginated roster with search, department and year filters")
    public ApiResponse<PageResponse<StudentResponse>> list(
            @Parameter(description = "Free-text match on name, roll number or email")
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "25") Integer pageSize,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir) {
        return ApiResponse.ok(studentService.list(
                search, department, year, page, pageSize, sortBy, sortDir));
    }

    @GetMapping("/all")
    @Operation(summary = "Every matching student, unpaginated (used by the export menus)")
    public ApiResponse<List<StudentResponse>> listAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer year) {
        return ApiResponse.ok(studentService.listAll(search, department, year));
    }

    @GetMapping("/{id}")
    @Operation(summary = "One student by id")
    public ApiResponse<StudentResponse> get(@PathVariable String id) {
        return ApiResponse.ok(studentService.get(id));
    }

    @GetMapping("/search")
    @Operation(summary = "Free-text search across name, roll number and email")
    public ApiResponse<List<StudentResponse>> search(@RequestParam String q) {
        return ApiResponse.ok(studentService.listAll(q, null, null));
    }

    @GetMapping("/roll/{rollNo}")
    @Operation(summary = "One student by exact roll number")
    public ApiResponse<StudentResponse> byRollNo(@PathVariable String rollNo) {
        return ApiResponse.ok(studentService.getByRollNo(rollNo));
    }

    @PostMapping
    @Operation(summary = "Create a student")
    public ResponseEntity<ApiResponse<StudentResponse>> create(
            @Valid @RequestBody StudentRequest request) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(studentService.create(request), "Student created"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a student")
    public ApiResponse<StudentResponse> update(@PathVariable String id,
                                               @Valid @RequestBody StudentRequest request) {
        return ApiResponse.ok(studentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a student (blocked while they hold a seat)")
    public ApiResponse<Map<String, Object>> delete(@PathVariable String id) {
        studentService.delete(id);
        return ApiResponse.ok(Map.of("id", id, "deleted", true));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Bulk import a CSV or Excel roster; invalid rows come back in the error report")
    public ApiResponse<StudentUploadResult> upload(@RequestParam("file") MultipartFile file) {
        StudentUploadResult result = studentService.upload(file);
        return ApiResponse.ok(result);
    }

    @PostMapping("/import")
    @Operation(summary = "Bulk import structured rows (the wizard posts JSON, not a file)")
    public ApiResponse<StudentUploadResult> importRows(@RequestBody List<StudentRequest> rows) {
        return ApiResponse.ok(studentService.importRows(rows));
    }

    @GetMapping("/template")
    @Operation(summary = "Download the roster template as CSV")
    public ResponseEntity<byte[]> template(
            @RequestParam(defaultValue = "csv") String format) {
        List<List<Object>> rows = new ArrayList<>();
        rows.add(List.of("S-0001", "Aarav Sharma", "aarav@university.edu", "+91 90000 00001",
                "CSE", 3, "A", "Male", "2021CSE0001"));
        rows.add(List.of("S-0002", "Aditi Verma", "aditi@university.edu", "+91 90000 00002",
                "IT", 2, "B", "Female", "2022IT0002"));

        byte[] body = "excel".equalsIgnoreCase(format)
                ? TableExporter.toExcel("Students", UPLOAD_COLUMNS, rows)
                : TableExporter.toCsv(UPLOAD_COLUMNS, rows);

        String filename = "student-template." + ("excel".equalsIgnoreCase(format) ? "xlsx" : "csv");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType("excel".equalsIgnoreCase(format)
                        ? MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                        : new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }
}
