package com.examseat.dto.seating;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Plan quality counters. Field names match the frontend's {@code verification} object. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationDto {

    private Integer clashes;
    private Integer adjacentSameDept;
    private Integer diagonalSameDept;
    private Integer adjacentSameYear;
    private Integer uniqueStudents;
    private Integer comparableEdges;
    private Integer comparableDiagonal;
    private Double adjacencyRate;
    private Double diagonalRate;
    private Integer score;
    private Boolean isClean;
}