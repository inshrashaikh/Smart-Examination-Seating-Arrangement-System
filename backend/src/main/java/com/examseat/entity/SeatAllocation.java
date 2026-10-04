package com.examseat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * One student occupying one seat of one hall for one exam. The triple
 * {@code (exam, hall, rowNo, colNo)} is unique and {@code (exam, student)} is
 * unique so a student can never be seated twice in the same exam.
 */
@Entity
@Table(
        name = "seat_allocations",
        indexes = {
                @Index(name = "idx_alloc_exam_hall", columnList = "exam_id, hall_id"),
                @Index(name = "idx_alloc_student", columnList = "student_id"),
                @Index(name = "idx_alloc_seat", columnList = "exam_id, hall_id, row_no, col_no", unique = true),
                @Index(name = "idx_alloc_exam_student", columnList = "exam_id, student_id", unique = true)
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatAllocation {

    @Id
    @Column(length = 40)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hall_id", nullable = false)
    private Hall hall;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "row_no", nullable = false)
    private Integer rowNo;

    @Column(name = "col_no", nullable = false)
    private Integer colNo;

    /** Human readable label, e.g. {@code B3}. */
    @Column(name = "seat_label", nullable = false, length = 8)
    private String seatLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_status", nullable = false, length = 16)
    @Builder.Default
    private ExamStatus planStatus = ExamStatus.ALLOCATED;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}