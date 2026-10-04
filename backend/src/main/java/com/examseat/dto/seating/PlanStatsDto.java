package com.examseat.dto.seating;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/** Counters shown in the hall-plan metrics row. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanStatsDto {

    private Integer capacity;
    private Integer blocked;
    private Integer usable;
    private Integer allocated;
    private Integer utilisation;
    private Map<String, Integer> departments;
}