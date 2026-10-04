package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.seating.HallPlanResponse;
import com.examseat.dto.seating.QualityResponse;
import com.examseat.entity.Exam;
import com.examseat.repository.ExamRepository;
import com.examseat.service.SeatingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Plan-quality aggregates for the analytics page.
 *
 * <p>{@code GET /api/seating/quality} returns one row per exam that has a plan
 * plus a per-engine roll-up. The engine roll-up is the comparison the
 * examination cell needs: both engines' plans are verified by the same
 * {@code SeatingAlgorithm.verify}, so a JAVA score and a PYTHON score mean the
 * same thing.</p>
 */
@RestController
@RequestMapping("/api/seating")
@RequiredArgsConstructor
@Tag(name = "Seating", description = "Seat allocation engine, hall plans, swaps, reset and quality analytics")
public class QualityController {

    private final SeatingService seatingService;
    private final ExamRepository examRepository;

    /** Mutable per-engine accumulator — Lombok builders expose no read accessors. */
    private static final class EngineStats {
        String engine;
        int exams;
        int plans;
        int allocated;
        int capacity;
        int clashes;
        int adjacentSameDept;
        int cleanPlans;
        int scoreSum;
    }

    @GetMapping("/quality")
    @Operation(summary = "Per-exam plan quality and per-engine comparison")
    public ApiResponse<QualityResponse> quality() {
        List<HallPlanResponse> plans = seatingService.listPlans(null);

        // Exam id -> plan rows, so an exam with several halls aggregates once.
        Map<String, List<HallPlanResponse>> byExam = new LinkedHashMap<>();
        for (HallPlanResponse plan : plans) {
            byExam.computeIfAbsent(plan.getExamId(), k -> new ArrayList<>()).add(plan);
        }

        List<QualityResponse.ExamQuality> exams = new ArrayList<>();
        Map<String, EngineStats> engineStats = new LinkedHashMap<>();

        for (Exam exam : examRepository.findAll()) {
            List<HallPlanResponse> examPlans = byExam.get(exam.getId());
            if (examPlans == null || examPlans.isEmpty()) continue;

            int allocated = 0;
            int capacity = 0;
            int clashes = 0;
            int adjacent = 0;
            int minScore = 100;
            boolean clean = true;
            for (HallPlanResponse plan : examPlans) {
                allocated += plan.getStats().getAllocated();
                capacity += plan.getStats().getCapacity();
                clashes += plan.getVerification().getClashes();
                adjacent += plan.getVerification().getAdjacentSameDept();
                minScore = Math.min(minScore, plan.getVerification().getScore());
                clean = clean && Boolean.TRUE.equals(plan.getVerification().getIsClean());
            }
            int utilisation = capacity == 0 ? 0 : (int) Math.round((allocated * 100.0) / capacity);
            String engine = exam.getEngine() == null ? "JAVA" : exam.getEngine();

            exams.add(QualityResponse.ExamQuality.builder()
                    .examId(exam.getId())
                    .examCode(exam.getCode())
                    .examTitle(exam.getTitle() == null ? exam.getSubject() : exam.getTitle())
                    .engine(engine)
                    .halls(examPlans.size())
                    .allocated(allocated)
                    .capacity(capacity)
                    .utilisation(utilisation)
                    .clashes(clashes)
                    .adjacentSameDept(adjacent)
                    .score(minScore)
                    .clean(clean)
                    .build());

            EngineStats stats = engineStats.computeIfAbsent(engine, k -> {
                EngineStats s = new EngineStats();
                s.engine = k;
                return s;
            });
            stats.exams += 1;
            stats.plans += examPlans.size();
            stats.allocated += allocated;
            stats.capacity += capacity;
            stats.clashes += clashes;
            stats.adjacentSameDept += adjacent;
            stats.scoreSum += minScore;
            if (clean) stats.cleanPlans += 1;
        }

        List<QualityResponse.EngineQuality> engines = new ArrayList<>();
        for (EngineStats stats : engineStats.values()) {
            engines.add(QualityResponse.EngineQuality.builder()
                    .engine(stats.engine)
                    .exams(stats.exams)
                    .plans(stats.plans)
                    .allocated(stats.allocated)
                    .capacity(stats.capacity)
                    .averageScore(stats.exams == 0 ? 0d
                            : Math.round((stats.scoreSum * 10.0) / stats.exams) / 10.0)
                    .clashes(stats.clashes)
                    .adjacentSameDept(stats.adjacentSameDept)
                    .cleanPlans(stats.cleanPlans)
                    .build());
        }

        return ApiResponse.ok(QualityResponse.builder()
                .exams(exams)
                .engines(engines)
                .build());
    }
}
