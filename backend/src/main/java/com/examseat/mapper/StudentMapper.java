package com.examseat.mapper;

import com.examseat.dto.student.StudentRequest;
import com.examseat.dto.student.StudentResponse;
import com.examseat.entity.Student;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class StudentMapper {

    public StudentResponse toResponse(Student student) {
        if (student == null) return null;
        return StudentResponse.builder()
                .id(student.getId())
                .rollNo(student.getRollNo())
                .name(student.getName())
                .email(student.getEmail())
                .phone(student.getPhone())
                .department(student.getDepartment())
                .year(student.getYear())
                .section(student.getSection())
                .gender(student.getGender())
                .prn(student.getPrn())
                .photo(student.getPhoto())
                // The UI's <Avatar> falls back to initials when photo is empty.
                .avatar(student.getPhoto() == null ? "" : student.getPhoto())
                .createdAt(student.getCreatedAt())
                .build();
    }

    public List<StudentResponse> toResponses(List<Student> students) {
        return students == null ? List.of() : students.stream().map(this::toResponse).toList();
    }

    /** Copies the request onto an existing row (leaves id/createdAt alone). */
    public void updateEntity(StudentRequest request, Student student) {
        student.setRollNo(request.getRollNo());
        student.setName(request.getName());
        student.setEmail(request.getEmail());
        student.setPhone(request.getPhone());
        student.setDepartment(request.getDepartment());
        student.setYear(request.getYear());
        student.setSection(request.getSection());
        student.setGender(request.getGender());
        student.setPrn(request.getPrn());
        student.setPhoto(request.getPhoto());
    }

    public Student toEntity(StudentRequest request) {
        return Student.builder()
                .rollNo(request.getRollNo())
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .department(request.getDepartment())
                .year(request.getYear())
                .section(request.getSection())
                .gender(request.getGender())
                .prn(request.getPrn())
                .photo(request.getPhoto())
                .build();
    }
}