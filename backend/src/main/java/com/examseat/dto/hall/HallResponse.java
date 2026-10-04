package com.examseat.dto.hall;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * The frontend reads {@code rows} / {@code cols} and {@code block} for the grid,
 * while the entity uses {@code rowsCount} / {@code colsCount}. Both are emitted.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallResponse {

    private String id;
    private String code;
    private String name;
    private String building;
    private String block;
    private Integer floor;
    private Integer capacity;
    private Integer rows;
    private Integer cols;
    private Integer rowsCount;
    private Integer colsCount;
    private Integer usable;
    private String type;
    private String board;
    private List<String> facilities;
    private List<BlockedSeat> blockedSeats;

    /** True when the hall already hosts at least one published/allocation plan. */
    private boolean allocated;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BlockedSeat {
        private Integer row;
        private Integer col;
        private String reason;
    }
}