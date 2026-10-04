package com.examseat.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/** A scheduled examination. */
@Entity
@Table(
        name = "exams",
        indexes = @Index(name = "idx_exam_code", columnList = "code", unique = true)
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Exam {

    @Id
    @Column(length = 32)
    private String id;

    @Column(length = 40)
    private String code;

    @Column(length = 160)
    private String subject;

    @Column(name = "subject_code", length = 40)
    private String subjectCode;

    @Column(length = 200)
    private String title;

    @Column(length = 120)
    private String course;

    @Column(name = "exam_date", nullable = false)
    private LocalDate date;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "duration_hours")
    private Integer durationHours;

    @Column(name = "min_year")
    @Builder.Default
    private Integer minYear = 1;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "exam_departments", joinColumns = @JoinColumn(name = "exam_id"))
    @Column(name = "department", length = 16)
    @Builder.Default
    private List<String> departments = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "exam_years", joinColumns = @JoinColumn(name = "exam_id"))
    @Column(name = "study_year")
    @Builder.Default
    private List<Integer> years = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private ExamStatus status = ExamStatus.SCHEDULED;

    /**
     * Which engine produced the current plan: {@code JAVA} (the built-in
     * algorithm) or {@code PYTHON} (the OR-Tools optimizer service). Recorded
     * per exam so the analytics page can compare engine quality.
     */
    @Column(name = "engine", length = 16)
    @Builder.Default
    private String engine = "JAVA";

    @Column(name = "seats_per_hall")
    private Integer seatsPerHall;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}