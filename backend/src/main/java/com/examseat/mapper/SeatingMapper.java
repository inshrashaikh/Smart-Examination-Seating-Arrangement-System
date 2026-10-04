package com.examseat.mapper;

import com.examseat.algorithm.HallAllocation;
import com.examseat.algorithm.SeatCell;
import com.examseat.algorithm.VerificationResult;
import com.examseat.dto.seating.HallPlanResponse;
import com.examseat.dto.seating.PlanStatsDto;
import com.examseat.dto.seating.SeatDto;
import com.examseat.dto.seating.VerificationDto;
import com.examseat.entity.Exam;
import com.examseat.entity.ExamStatus;
import com.examseat.entity.Hall;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Builds the hall-plan payloads the React viewer consumes. */
@Component
public class SeatingMapper {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    /** Composite plan id used as the primary key of a hall plan: {@code EX-001-H-1}. */
    public String planId(String examId, String hallId) {
        return examId == null || hallId == null ? null : examId + "-" + hallId;
    }

    public String planId(Exam exam, Hall hall) {
        return planId(exam == null ? null : exam.getId(), hall == null ? null : hall.getId());
    }

    /** Converts an in-memory allocation (produced before persisting) into a response. */
    public HallPlanResponse fromAllocation(Exam exam, HallAllocation allocation, ExamStatus status) {
        List<List<SeatDto>> seats = new ArrayList<>();
        for (List<SeatCell> row : allocation.getGrid()) {
            List<SeatDto> dtoRow = new ArrayList<>(row.size());
            for (SeatCell cell : row) {
                dtoRow.add(SeatDto.from(cell, null));
            }
            seats.add(dtoRow);
        }

        PlanStatsDto stats = PlanStatsDto.builder()
                .capacity(allocation.getCapacity())
                .blocked(allocation.getBlocked())
                .usable(allocation.getUsable())
                .allocated(allocation.getAllocated())
                .utilisation(allocation.getUtilisation())
                .departments(allocation.getDepartments() == null ? Map.of() : allocation.getDepartments())
                .build();

        return base(exam, allocation.getHallId(), allocation.getHallName(), allocation.getHallCode())
                .id(planId(exam == null ? null : exam.getId(), allocation.getHallId()))
                .rows(allocation.getRows())
                .cols(allocation.getCols())
                .seats(seats)
                .stats(stats)
                .verification(toVerificationDto(allocation.getVerification()))
                .status(status == null ? ExamStatus.ALLOCATED : status)
                .createdAt(Instant.now())
                .publishedAt(null)
                .history(List.of())
                .build();
    }

    /**
     * Rehydrates a persisted plan into a response. {@code departmentCounts} comes from
     * the stored allocations so the metric chips match what was actually saved.
     */
    public HallPlanResponse fromStoredPlan(Exam exam, Hall hall,
                                           List<List<SeatCell>> grid,
                                           int rows, int cols,
                                           Map<String, Integer> departmentCounts,
                                           VerificationResult verification,
                                           ExamStatus status,
                                           Instant createdAt,
                                           Map<String, String> allocationIdByStudentId) {
        List<List<SeatDto>> seats = new ArrayList<>(rows);
        int allocated = 0;
        int blocked = 0;
        for (int r = 0; r < rows; r += 1) {
            List<SeatCell> row = grid.get(r);
            List<SeatDto> dtoRow = new ArrayList<>(cols);
            for (int c = 0; c < cols; c += 1) {
                SeatCell cell = row.get(c);
                if (cell.isBlocked()) blocked += 1;
                if (cell.isOccupied()) allocated += 1;
                String allocationId = cell.isOccupied() && allocationIdByStudentId != null
                        ? allocationIdByStudentId.get(cell.getStudentId())
                        : null;
                dtoRow.add(SeatDto.from(cell, allocationId));
            }
            seats.add(dtoRow);
        }

        int capacity = rows * cols;
        PlanStatsDto stats = PlanStatsDto.builder()
                .capacity(capacity)
                .blocked(blocked)
                .usable(capacity - blocked)
                .allocated(allocated)
                .utilisation(capacity == 0 ? 0 : (int) Math.round(allocated * 100.0 / capacity))
                .departments(departmentCounts == null ? Map.of() : departmentCounts)
                .build();

        return base(exam, hall.getId(), hall.getName(), hall.getCode())
                .id(planId(exam, hall))
                .rows(rows)
                .cols(cols)
                .seats(seats)
                .stats(stats)
                .verification(toVerificationDto(verification))
                .status(status == null ? ExamStatus.ALLOCATED : status)
                .createdAt(createdAt)
                .publishedAt(status == ExamStatus.PUBLISHED ? createdAt : null)
                .history(List.of())
                .build();
    }

    private HallPlanResponse.HallPlanResponseBuilder base(Exam exam, String hallId,
                                                          String hallName, String hallCode) {
        return HallPlanResponse.builder()
                .examId(exam == null ? null : exam.getId())
                .examCode(exam == null ? null : exam.getCode())
                .examTitle(exam == null ? null : titleOf(exam))
                .subject(exam == null ? null : exam.getSubject())
                .course(exam == null ? null : exam.getCourse())
                .date(exam == null || exam.getDate() == null ? null : exam.getDate().toString())
                .startTime(exam == null || exam.getStartTime() == null ? null : exam.getStartTime().format(TIME))
                .endTime(exam == null || exam.getEndTime() == null ? null : exam.getEndTime().format(TIME))
                .hallId(hallId)
                .hallName(hallName)
                .hallCode(hallCode);
    }

    private String titleOf(Exam exam) {
        if (exam.getTitle() != null && !exam.getTitle().isBlank()) return exam.getTitle();
        return exam.getSubject();
    }

    public VerificationDto toVerificationDto(VerificationResult verification) {
        if (verification == null) return null;
        return VerificationDto.builder()
                .clashes(verification.getClashes())
                .adjacentSameDept(verification.getAdjacentSameDept())
                .diagonalSameDept(verification.getDiagonalSameDept())
                .adjacentSameYear(verification.getAdjacentSameYear())
                .uniqueStudents(verification.getUniqueStudents())
                .comparableEdges(verification.getComparableEdges())
                .comparableDiagonal(verification.getComparableDiagonal())
                .adjacencyRate(verification.getAdjacencyRate())
                .diagonalRate(verification.getDiagonalRate())
                .score(verification.getScore())
                .isClean(verification.isClean())
                .build();
    }
}