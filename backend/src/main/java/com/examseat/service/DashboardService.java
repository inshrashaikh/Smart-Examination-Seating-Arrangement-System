package com.examseat.service;

import com.examseat.dto.dashboard.AdminDashboardResponse;
import com.examseat.dto.dashboard.FacultyDashboardResponse;
import com.examseat.dto.dashboard.SettingsRequest;

import java.util.List;

public interface DashboardService {

    AdminDashboardResponse admin();

    /** Alias target for {@code GET /api/dashboard/stats}. */
    AdminDashboardResponse stats();

    FacultyDashboardResponse faculty(String email);

    List<AdminDashboardResponse.ActivityEntry> recentActivity(int limit);

    SettingsRequest getSettings();

    SettingsRequest updateSettings(SettingsRequest request);
}
