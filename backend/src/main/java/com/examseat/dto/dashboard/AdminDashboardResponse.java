package com.examseat.dto.dashboard;

import com.examseat.dto.exam.ExamResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/** Payload behind {@code GET /api/dashboard/admin} (and {@code /api/dashboard/stats}). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    private Stats stats;
    private List<TrendPoint> allocationsOverTime;
    private List<NameValue> departmentDistribution;
    private List<HallUtilisation> hallUtilisation;
    private List<ExamResponse> upcoming;
    private List<ActivityEntry> activity;
    private List<NameValue> examsByStatus;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Stats {
        private Integer totalStudents;
        private Integer totalHalls;
        private Integer examsScheduled;
        private Integer seatsAllocated;
        private Integer totalCapacity;
        private Integer facultyCount;
        private Integer activePlans;
        private Integer clashes;
        private Integer avgUtilisation;
        private Integer unallocatedNotifications;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private String month;
        private Integer seats;
        private Integer students;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NameValue {
        private String name;
        private Integer value;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HallUtilisation {
        private String hall;
        private Integer utilisation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityEntry {
        private String id;
        private String type;
        private String title;
        private String detail;
        private Instant at;
        private String actor;
    }
}