package com.examseat.algorithm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/** Everything the engine produced for a single hall. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallAllocation {

    private String hallId;
    private String hallCode;
    private String hallName;
    private int rows;
    private int cols;

    /** Row-major grid of {@code rows * cols} cells, blocked seats included. */
    private List<List<SeatCell>> grid;

    private int capacity;
    private int blocked;
    private int usable;
    private int allocated;

    /** Percentage of total capacity (blocked seats included) that is in use. */
    private int utilisation;

    /** Students seated in this hall, keyed by department code. */
    private Map<String, Integer> departments;

    private VerificationResult verification;
}