package com.examseat.dto.student;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentResponse {

    private String id;
    private String rollNo;
    private String name;
    private String email;
    private String phone;
    private String department;
    private Integer year;
    private String section;
    private String gender;
    private String prn;
    private String photo;
    private String avatar;
    private Instant createdAt;
}