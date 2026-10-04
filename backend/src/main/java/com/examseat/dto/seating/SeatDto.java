package com.examseat.dto.seating;

import com.examseat.algorithm.SeatCell;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One seat of the hall-plan grid, exactly as {@code HallPlanGrid.jsx} expects it. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatDto {

    private Integer row;
    private Integer col;
    private String label;
    private boolean blocked;

    private String studentId;
    private String rollNo;
    private String name;
    private String department;
    private Integer year;
    private String section;
    private String gender;

    /** Present only when a swap or regeneration moved the student. */
    private String allocationId;

    public static SeatDto from(SeatCell cell, String allocationId) {
        return SeatDto.builder()
                .row(cell.getRow())
                .col(cell.getCol())
                .label(cell.getLabel())
                .blocked(cell.isBlocked())
                .studentId(cell.getStudentId())
                .rollNo(cell.getRollNo())
                .name(cell.getName())
                .department(cell.getDepartment())
                .year(cell.getYear())
                .section(cell.getSection())
                .gender(cell.getGender())
                .allocationId(allocationId)
                .build();
    }
}