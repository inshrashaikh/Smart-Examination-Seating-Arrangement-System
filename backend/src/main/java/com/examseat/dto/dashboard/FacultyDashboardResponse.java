package com.examseat.dto.dashboard;

import com.examseat.dto.duty.DutyResponse;
import com.examseat.dto.duty.FacultyResponse;
import com.examseat.dto.notification.NotificationResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Payload behind {@code GET /api/dashboard/faculty}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacultyDashboardResponse {

    private FacultyResponse faculty;
    private Stats stats;
    private DutyResponse todayDuty;
    private DutyResponse nextDuty;
    private List<DutyResponse> upcoming;
    private List<TrendPoint> dutyTrend;
    private List<AdminDashboardResponse.NameValue> workload;
    private List<NotificationResponse> notifications;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Stats {
        private Integer upcomingDuties;
        private Integer completedDuties;
        private Integer studentsInvigilated;
        private Integer hallsCovered;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private String month;
        private Integer duties;
    }
}