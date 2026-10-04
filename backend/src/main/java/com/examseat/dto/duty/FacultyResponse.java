package com.examseat.dto.duty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Faculty directory row returned by {@code GET /api/faculty}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacultyResponse {

    private String id;
    private String name;
    private String email;
    private String department;
    private String designation;
    private String employeeId;
    private String phone;
    private String photo;
    private String dutyPreference;
    private Integer maxDutiesPerDay;

    /** Aggregates used by the admin workload chart and roster table. */
    private Integer dutyCount;
    private Integer hallsCovered;
    private Integer upcomingDuties;
    private String status;
}