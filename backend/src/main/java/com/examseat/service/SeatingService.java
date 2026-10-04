package com.examseat.service;

import com.examseat.dto.exam.ExamResponse;
import com.examseat.dto.seating.GenerateSeatingRequest;
import com.examseat.dto.seating.GenerateSeatingResponse;
import com.examseat.dto.seating.HallPlanResponse;
import com.examseat.dto.seating.SwapSeatsRequest;
import com.examseat.dto.student.StudentResponse;

import java.util.List;

public interface SeatingService {

    /** Runs the engine, persists the plan in one transaction and flips the exam to ALLOCATED. */
    GenerateSeatingResponse generate(GenerateSeatingRequest request);

    /** Every hall plan that currently holds allocations, optionally filtered by exam. */
    List<HallPlanResponse> listPlans(String examId);

    /**
     * Plan by composite id ({@code EX-001-H-1}) — this is what the React hall-plan
     * viewer requests.
     */
    HallPlanResponse getPlan(String planId);

    /** Alias endpoint: {@code GET /api/seating/exam/{examId}/hall/{hallId}}. */
    HallPlanResponse getHallPlan(String examId, String hallId);

    /** Swaps two seats inside the same hall, re-checking adjacency when asked to. */
    HallPlanResponse swap(String planId, SwapSeatsRequest request);

    /** Swaps two seats across the whole exam, addressed by allocation id. */
    HallPlanResponse swapByAllocationIds(String examId, String allocationId1, String allocationId2,
                                         boolean validate);

    /** {@code POST /api/seating/plans/{examId}/publish} — publishes the whole exam. */
    ExamResponse publish(String examId);

    /**
     * {@code POST /api/seating/plans/{planId}/publish} where {@code planId} is a
     * hall-scoped id such as {@code EX-001-H-1}. Publishes the exam and answers with
     * the plan, which is what the React client substitutes into its own plan list.
     */
    HallPlanResponse publishPlan(String planId);

    /** {@code DELETE /api/seating/exam/{examId}} — wipes the plan. */
    int reset(String examId);

    /** Every seated student for an exam, used by reports and the student-wise export. */
    List<StudentResponse> seatedStudents(String examId);
}
