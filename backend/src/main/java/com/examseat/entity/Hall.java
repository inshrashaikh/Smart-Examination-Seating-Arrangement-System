package com.examseat.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/** An examination hall. {@code rowsCount * colsCount} normally equals {@code capacity}. */
@Entity
@Table(
        name = "halls",
        indexes = @Index(name = "idx_hall_code", columnList = "code", unique = true)
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Hall {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    /** Building / block the hall sits in (frontend calls this `block`). */
    @Column(length = 80)
    private String building;

    @Column(name = "block", length = 80)
    private String block;

    @Column
    private Integer floor;

    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "rows_count", nullable = false)
    private Integer rowsCount;

    @Column(name = "cols_count", nullable = false)
    private Integer colsCount;

    @Column(length = 24)
    private String type;

    @Column(length = 60)
    private String board;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "hall_facilities", joinColumns = @JoinColumn(name = "hall_id"))
    @Column(name = "facility", length = 60)
    @Builder.Default
    private List<String> facilities = new ArrayList<>();

    /** Seats that physically exist but must not be used (damaged desk, sealed window...). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "hall_blocked_seats", joinColumns = @JoinColumn(name = "hall_id"))
    @Builder.Default
    private List<BlockedSeat> blockedSeats = new ArrayList<>();

    /** Usable seats = rowsCount * colsCount - blockedSeats. */
    public int usableCapacity() {
        int grid = (rowsCount == null ? 0 : rowsCount) * (colsCount == null ? 0 : colsCount);
        return Math.max(0, grid - (blockedSeats == null ? 0 : blockedSeats.size()));
    }

    /** A single unusable coordinate inside the hall grid. */
    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BlockedSeat {
        @Column(name = "row_no", nullable = false)
        private Integer row;

        @Column(name = "col_no", nullable = false)
        private Integer col;

        @Column(length = 120)
        private String reason;
    }
}