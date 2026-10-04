package com.examseat.dto.seating;

import com.examseat.entity.ExamStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * A single hall's plan. The React hall-plan viewer reads {@code seats} as a
 * row-major 2D array, so the shape is kept exactly as the mock produced it.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallPlanResponse {

    /** Composite id {@code EX-001-H-1}; also accepted by {@code GET /seating/plans/{id}}. */
    private String id;
    private String examId;
    private String examCode;
    private String examTitle;
    private String subject;
    private String course;
    private String date;
    private String startTime;
    private String endTime;

    private String hallId;
    private String hallName;
    private String hallCode;

    private Integer rows;
    private Integer cols;

    /** Row-major grid of {@code rows * cols} seats, blocked seats included. */
    private List<List<SeatDto>> seats;

    private PlanStatsDto stats;
    private VerificationDto verification;

    private ExamStatus status;
    private Instant createdAt;
    private Instant publishedAt;
    private List<PlanHistoryEntry> history;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanHistoryEntry {
        private String id;
        private Instant at;
        private String action;
        private String detail;
    }
}