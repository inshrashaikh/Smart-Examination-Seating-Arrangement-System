package com.examseat.algorithm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A single coordinate inside a hall grid — either occupied, empty or blocked. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatCell {

    private int row;
    private int col;

    /** True when the seat physically exists but must not be used. */
    @Builder.Default
    private boolean blocked = false;

    /** Seat label such as {@code B3}. */
    @Builder.Default
    private String label = "";

    private String studentId;
    private String rollNo;
    private String name;
    private String department;
    private Integer year;
    private String section;
    private String gender;
    private String prn;

    public boolean isOccupied() {
        return studentId != null && !studentId.isBlank();
    }
}