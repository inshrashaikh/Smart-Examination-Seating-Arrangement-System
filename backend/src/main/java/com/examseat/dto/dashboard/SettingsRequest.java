package com.examseat.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/** {@code PUT /api/settings} — the admin settings form posts a flat object. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettingsRequest {

    private String theme;
    private String density;
    private Boolean emailNotifications;
    private Boolean pushNotifications;
    private Boolean smsNotifications;
    private Boolean weeklyDigest;
    private Boolean clashAlerts;
    private Boolean autoPublish;
    private String language;
    private String institution;
    private String academicYear;
    private LocalDate academicStartDate;
    private LocalTime dailyUploadDeadline;
}