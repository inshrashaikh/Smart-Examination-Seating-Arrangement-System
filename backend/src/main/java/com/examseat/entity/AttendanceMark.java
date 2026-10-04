package com.examseat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * One invigilator's present/absent decision for one seated candidate.
 *
 * <p>Keyed by {@code id} of the form {@code <allocationId>:<examId>} rather than by a
 * generated sequence, which makes the mark naturally idempotent: marking the same
 * candidate twice in the same exam updates the one row, and re-uploading or
 * regenerating a plan cannot produce duplicates for the same seat.
 *
 * <p>The unique constraint on {@code (allocation_id, exam_id)} is the database-level
 * guarantee of that. It is declared explicitly rather than relied upon from the id
 * shape so the invariant survives an id-format change.
 *
 * <p>Rows are keyed to the <em>allocation</em>, not to the student: a student can be
 * allocated into several halls across different exams, and each exam needs its own
 * independent decision.
 */
@Entity
@Table(name = "attendance_marks",
        indexes = {
                @Index(name = "idx_attendance_exam_hall", columnList = "exam_id,hall_id"),
                @Index(name = "idx_attendance_faculty", columnList = "marked_by")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_attendance_allocation_exam",
                        columnNames = {"allocation_id", "exam_id"})
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceMark {

    @Id
    @Column(name = "id", nullable = false, length = 80)
    private String id;

    @Column(name = "allocation_id", nullable = false, length = 40)
    private String allocationId;

    @Column(name = "exam_id", nullable = false, length = 40)
    private String examId;

    @Column(name = "hall_id", nullable = false, length = 40)
    private String hallId;

    @Column(name = "roll_no", length = 40)
    private String rollNo;

    /** True when the candidate was marked present. Never {@code null} once persisted. */
    @Column(name = "present", nullable = false)
    private boolean present;

    /** Free-text reason, e.g. "left after the first half". Optional. */
    @Column(name = "note", length = 240)
    private String note;

    /** Email of the invigilator who recorded the decision, for the audit trail. */
    @Column(name = "marked_by", length = 160)
    private String markedBy;

    @Column(name = "marked_at", nullable = false)
    private Instant markedAt;

    /**
     * Value of {@link AttendanceStatus} as text.
     *
     * <p>Stored as its own column rather than derived from {@link #present} so the
     * database is queryable with the same vocabulary the API uses, and so a future
     * status (e.g. {@code ON_DUTY_OTHER_HALL}) can be added without a migration.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private AttendanceStatus status;

    /** Canonical id for a mark. Public so the service and tests agree on the format. */
    public static String idFor(String allocationId, String examId) {
        return allocationId + ":" + examId;
    }

    /** Derives {@link #status} from {@link #present}; call after changing either. */
    public void syncStatus() {
        this.status = present ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
    }
}