package com.examseat.dto.hall;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallRequest {

    @Size(max = 40, message = "must be at most 40 characters")
    private String code;

    @NotBlank(message = "is required")
    @Size(max = 120, message = "must be at most 120 characters")
    private String name;

    @Size(max = 80, message = "must be at most 80 characters")
    private String building;

    @Size(max = 80, message = "must be at most 80 characters")
    private String block;

    @Min(value = -1, message = "must be -1 or greater")
    @Max(value = 50, message = "must be 50 or less")
    private Integer floor;

    @NotNull(message = "is required")
    @Min(value = 1, message = "must be at least 1")
    @Max(value = 500, message = "must be 500 or less")
    private Integer capacity;

    @NotNull(message = "is required")
    @Min(value = 1, message = "must be at least 1")
    @Max(value = 50, message = "must be 50 or less")
    private Integer rows;

    @NotNull(message = "is required")
    @Min(value = 1, message = "must be at least 1")
    @Max(value = 50, message = "must be 50 or less")
    private Integer cols;

    @Size(max = 24, message = "must be at most 24 characters")
    private String type;

    @Size(max = 60, message = "must be at most 60 characters")
    private String board;

    private List<String> facilities;

    private List<BlockedSeatRequest> blockedSeats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BlockedSeatRequest {
        @NotNull(message = "is required")
        private Integer row;
        @NotNull(message = "is required")
        private Integer col;
        private String reason;
    }
}