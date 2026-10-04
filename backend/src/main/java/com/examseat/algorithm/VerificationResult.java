package com.examseat.algorithm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Outcome of re-checking a filled grid. Scores are normalised against the number
 * of neighbour pairs that could actually be compared, so a well-packed plan is
 * never punished simply for having many seats.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationResult {

    /** A student seated more than once in the same exam — must always be 0. */
    @Builder.Default
    private int clashes = 0;

    /** Orthogonal same-department pairs (left / front / back). */
    @Builder.Default
    private int adjacentSameDept = 0;

    /** Diagonal same-department pairs — unavoidable in a two-department exam. */
    @Builder.Default
    private int diagonalSameDept = 0;

    @Builder.Default
    private int adjacentSameYear = 0;

    @Builder.Default
    private int uniqueStudents = 0;

    /** Orthogonal pairs where both seats were occupied and therefore comparable. */
    @Builder.Default
    private int comparableEdges = 0;

    @Builder.Default
    private int comparableDiagonal = 0;

    @Builder.Default
    private double adjacencyRate = 0d;

    @Builder.Default
    private double diagonalRate = 0d;

    /** 0–100 quality score; clashes dominate, adjacency is secondary. */
    @Builder.Default
    private int score = 0;

    /** True when the plan has no clashes and no orthogonal adjacency violations. */
    @Builder.Default
    private boolean clean = false;
}