package com.examseat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A student eligible to be seated for an examination. */
@Entity
@Table(
        name = "students",
        indexes = {
                @Index(name = "idx_student_roll", columnList = "roll_no", unique = true),
                @Index(name = "idx_student_dept_year", columnList = "department, study_year")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Student {

    @Id
    @Column(length = 32)
    private String id;

    @Column(name = "roll_no", nullable = false, unique = true, length = 40)
    private String rollNo;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 160)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(nullable = false, length = 16)
    private String department;

    // "year" is a reserved word in H2 2.x and a data-type keyword in MySQL,
    // so the column is named study_year while the JSON field stays "year".
    @Column(name = "study_year", nullable = false)
    private Integer year;

    @Column(length = 8)
    private String section;

    @Column(length = 16)
    private String gender;

    @Column(length = 40)
    private String prn;

    @Column(length = 400)
    private String photo;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}