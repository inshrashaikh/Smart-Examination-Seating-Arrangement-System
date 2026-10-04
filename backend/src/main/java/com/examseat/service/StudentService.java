package com.examseat.service;

import com.examseat.dto.common.PageResponse;
import com.examseat.dto.student.StudentRequest;
import com.examseat.dto.student.StudentResponse;
import com.examseat.dto.student.StudentUploadResult;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface StudentService {

    PageResponse<StudentResponse> list(String search, String department, Integer year,
                                       Integer page, Integer pageSize, String sortBy, String sortDir);

    StudentResponse get(String id);

    StudentResponse getByRollNo(String rollNo);

    List<StudentResponse> listAll(String search, String department, Integer year);

    StudentResponse create(StudentRequest request);

    StudentResponse update(String id, StudentRequest request);

    void delete(String id);

    StudentUploadResult upload(MultipartFile file);

    /** Parsed rows uploaded from the browser (already structured, no file involved). */
    StudentUploadResult importRows(List<StudentRequest> rows);

    long count();
}
