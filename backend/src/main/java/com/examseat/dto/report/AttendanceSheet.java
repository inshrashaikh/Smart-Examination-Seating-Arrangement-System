package com.examseat.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** {@code GET /api/reports/attendance} — used by the faculty attendance screen. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSheet {

    private ExamSummary exam;
    private List<HallRef> halls;
    private List<Row> rows;
    private Summary summary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HallRef {
        private String id;
        private String name;
        private String code;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Row {
        private String allocationId;
        private String rollNo;
        private String name;
        private String department;
        private Integer year;
        private String section;
        private String hall;
        private String hallCode;
        private String seat;
        /**
         * Tri-state, and the distinction matters:
         * {@code null} = nobody has marked this seat yet,
         * {@code true} = recorded present,
         * {@code false} = recorded absent.
         *
         * <p>Collapsing "unmarked" into "absent" would make a sheet where nobody has
         * started look identical to one where every candidate is absent.
         */
        private Boolean present;
        /** When the mark was recorded. Null while {@link #present} is null. */
        private java.time.Instant markedAt;
        /** Email of the invigilator who recorded it, for the audit trail. */
        private String markedBy;
        /** Optional free-text remark attached to the mark. */
        private String note;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Integer total;
        private Integer present;
        private Integer absent;
        /**
         * Seats with a decision recorded ({@code present + absent}).
         *
         * <p>Absent from the original contract, added alongside
         * {@link AttendanceMark} so a client can distinguish "not started" from
         * "everyone is absent" without re-counting the rows.
         */
        private Integer marked;
        /** {@code total - marked}: the sheet is not finished yet. */
        private Integer pending;
    }
}