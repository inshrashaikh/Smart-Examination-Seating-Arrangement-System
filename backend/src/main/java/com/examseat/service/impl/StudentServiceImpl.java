package com.examseat.service.impl;

import com.examseat.dto.common.PageResponse;
import com.examseat.dto.student.StudentRequest;
import com.examseat.dto.student.StudentResponse;
import com.examseat.dto.student.StudentUploadResult;
import com.examseat.entity.Student;
import com.examseat.exception.ApiException;
import com.examseat.mapper.StudentMapper;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import com.examseat.service.StudentService;
import com.examseat.util.IdFactory;
import com.examseat.util.StudentFileReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudentServiceImpl implements StudentService {

    private static final int MAX_PAGE_SIZE = 2000;

    private final StudentRepository studentRepository;
    private final SeatAllocationRepository allocationRepository;
    private final StudentMapper studentMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StudentResponse> list(String search, String department, Integer year,
                                              Integer page, Integer pageSize,
                                              String sortBy, String sortDir) {
        int pageNumber = Math.max(1, page == null ? 1 : page);
        int size = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize == null ? 25 : pageSize));
        Pageable pageable = PageRequest.of(pageNumber - 1, size, resolveSort(sortBy, sortDir));

        Page<StudentResponse> result = studentRepository
                .search(blankToNull(search), blankToNull(department), year, pageable)
                .map(studentMapper::toResponse);

        return PageResponse.<StudentResponse>builder()
                .items(result.getContent())
                .total(result.getTotalElements())
                .page(result.getNumber() + 1)
                .pageSize(result.getSize())
                .totalPages(Math.max(1, result.getTotalPages()))
                .first(result.isFirst())
                .last(result.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentResponse get(String id) {
        return studentMapper.toResponse(require(id));
    }

    @Override
    @Transactional(readOnly = true)
    public StudentResponse getByRollNo(String rollNo) {
        return studentRepository.findByRollNoIgnoreCase(rollNo)
                .map(studentMapper::toResponse)
                .orElseThrow(() -> ApiException.notFound("Student", rollNo));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentResponse> listAll(String search, String department, Integer year) {
        Pageable pageable = PageRequest.of(0, MAX_PAGE_SIZE, Sort.by(Sort.Direction.ASC, "rollNo"));
        return studentRepository.search(blankToNull(search), blankToNull(department), year, pageable)
                .getContent().stream().map(studentMapper::toResponse).toList();
    }

    @Override
    @Transactional
    public StudentResponse create(StudentRequest request) {
        if (studentRepository.existsByRollNoIgnoreCase(request.getRollNo().trim())) {
            throw ApiException.conflict("Roll number " + request.getRollNo() + " is already registered");
        }
        Student student = studentMapper.toEntity(request);
        student.setId(IdFactory.next("S-", studentRepository.findAll().stream()
                .map(Student::getId).toList(), 4));
        student.setRollNo(request.getRollNo().trim().toUpperCase(Locale.ROOT));
        student.setCreatedAt(java.time.Instant.now());
        return studentMapper.toResponse(studentRepository.save(student));
    }

    @Override
    @Transactional
    public StudentResponse update(String id, StudentRequest request) {
        Student student = require(id);
        String newRoll = request.getRollNo().trim().toUpperCase(Locale.ROOT);
        studentRepository.findByRollNoIgnoreCase(newRoll)
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw ApiException.conflict("Roll number " + newRoll + " belongs to another student");
                });

        studentMapper.updateEntity(request, student);
        student.setRollNo(newRoll);
        return studentMapper.toResponse(studentRepository.save(student));
    }

    @Override
    @Transactional
    public void delete(String id) {
        Student student = require(id);
        long allocated = allocationRepository.findByStudentId(id).size();
        if (allocated > 0) {
            throw ApiException.conflict(student.getName() + " is seated in " + allocated
                    + " seating plan(s). Reset those exams before deleting the student.");
        }
        studentRepository.delete(student);
    }

    @Override
    @Transactional
    public StudentUploadResult upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("No file was uploaded");
        }
        String fileName = file.getOriginalFilename();
        String lower = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
            throw ApiException.badRequest("Only .csv and .xlsx uploads are supported (received " + fileName + ")");
        }

        StudentFileReader.Parsed parsed;
        try {
            parsed = StudentFileReader.read(file);
        } catch (IOException ex) {
            throw ApiException.badRequest("Could not read " + fileName + ": " + ex.getMessage());
        }
        return persist(parsed.students(), parsed.errors(), parsed.total(), fileName);
    }

    @Override
    @Transactional
    public StudentUploadResult importRows(List<StudentRequest> rows) {
        if (rows == null || rows.isEmpty()) {
            throw ApiException.badRequest("No student rows were supplied");
        }
        List<Student> students = new ArrayList<>(rows.size());
        List<StudentUploadResult.RowError> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i += 1) {
            StudentRequest row = rows.get(i);
            int lineNumber = i + 1;
            if (row == null || isBlank(row.getRollNo()) || isBlank(row.getName())) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(lineNumber).rollNo(row == null ? "" : nullSafe(row.getRollNo()))
                        .field("rollNo").message("rollNo and name are both required").build());
                continue;
            }
            if (isBlank(row.getDepartment())) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(lineNumber).rollNo(row.getRollNo()).field("department")
                        .message("department is required").build());
                continue;
            }
            if (row.getYear() == null || row.getYear() < 1 || row.getYear() > 5) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(lineNumber).rollNo(row.getRollNo()).field("year")
                        .message("year must be between 1 and 5").build());
                continue;
            }
            Student student = studentMapper.toEntity(row);
            student.setRollNo(row.getRollNo().trim().toUpperCase(Locale.ROOT));
            students.add(student);
        }

        return persist(students, errors, rows.size(), "inline upload");
    }

    /* ------------------------------------------------------------------ */

    private StudentUploadResult persist(List<Student> candidates,
                                        List<StudentUploadResult.RowError> preErrors,
                                        int total,
                                        String fileName) {
        List<StudentUploadResult.RowError> errors = new ArrayList<>(preErrors);
        Set<String> seenInFile = new HashSet<>();
        List<Student> toSave = new ArrayList<>();

        for (Student candidate : candidates) {
            String rollNo = candidate.getRollNo();
            if (!seenInFile.add(rollNo)) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(0).rollNo(rollNo).field("rollNo")
                        .message("Roll number " + rollNo + " appears more than once in the file").build());
                continue;
            }
            if (studentRepository.existsByRollNoIgnoreCase(rollNo)) {
                errors.add(StudentUploadResult.RowError.builder()
                        .row(0).rollNo(rollNo).field("rollNo")
                        .message("Roll number " + rollNo + " is already registered").build());
                continue;
            }
            toSave.add(candidate);
        }

        int duplicates = (int) errors.stream().filter(e -> e.getMessage() != null
                && e.getMessage().contains("already")).count();

        if (!toSave.isEmpty()) {
            // new ArrayList, not Stream.toList(): the loop below appends each minted id,
            // and Stream.toList hands back an immutable list that rejects add().
            List<String> existingIds = new ArrayList<>(
                    studentRepository.findAll().stream().map(Student::getId).toList());
            java.time.Instant now = java.time.Instant.now();
            for (Student student : toSave) {
                student.setId(IdFactory.next("S-", existingIds, 4));
                existingIds.add(student.getId());
                student.setCreatedAt(now);
            }
            studentRepository.saveAll(toSave);
        }

        return StudentUploadResult.builder()
                .total(total)
                .added(toSave.size())
                .duplicates(duplicates)
                .invalid(errors.size())
                .fileName(fileName)
                .errors(errors)
                .build();
    }

    private Student require(String id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Student", id));
    }

    @Override
    @Transactional(readOnly = true)
    public long count() {
        return studentRepository.count();
    }

    private Sort resolveSort(String sortBy, String sortDir) {
        boolean asc = !"desc".equalsIgnoreCase(sortDir);
        String column = switch (sortBy == null ? "" : sortBy.toLowerCase(Locale.ROOT)) {
            case "name" -> "name";
            case "year" -> "year";
            case "department", "dept" -> "department";
            case "email" -> "email";
            default -> "rollNo";
        };
        return Sort.by(asc ? Sort.Direction.ASC : Sort.Direction.DESC, column);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
