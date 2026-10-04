package com.examseat.entity;

/**
 * The outcome recorded against a candidate for one exam.
 *
 * <p>Only {@link #PRESENT} and {@link #ABSENT} are settable today. The enum exists as a
 * separate type from the {@code present} boolean on {@link AttendanceMark} so the
 * vocabulary can grow (medical leave, on duty in another hall, …) without a schema
 * change; the boolean is kept in sync via {@link AttendanceMark#syncStatus()} and is
 * what the existing {@code AttendanceSheet.Row} contract already exposes.
 */
public enum AttendanceStatus {
    PRESENT,
    ABSENT
}