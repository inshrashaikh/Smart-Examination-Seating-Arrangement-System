package com.examseat.service.impl;

import com.examseat.dto.dashboard.AdminDashboardResponse;
import com.examseat.dto.dashboard.AdminDashboardResponse.ActivityEntry;
import com.examseat.dto.dashboard.AdminDashboardResponse.HallUtilisation;
import com.examseat.dto.dashboard.AdminDashboardResponse.NameValue;
import com.examseat.dto.dashboard.AdminDashboardResponse.Stats;
import com.examseat.dto.dashboard.AdminDashboardResponse.TrendPoint;
import com.examseat.dto.dashboard.FacultyDashboardResponse;
import com.examseat.dto.dashboard.SettingsRequest;
import com.examseat.dto.duty.DutyResponse;
import com.examseat.dto.duty.FacultyResponse;
import com.examseat.dto.exam.ExamResponse;
import com.examseat.dto.notification.NotificationResponse;
import com.examseat.entity.Exam;
import com.examseat.entity.ExamStatus;
import com.examseat.entity.Hall;
import com.examseat.entity.InvigilationDuty;
import com.examseat.entity.Notification;
import com.examseat.entity.Role;
import com.examseat.entity.SeatAllocation;
import com.examseat.entity.Student;
import com.examseat.entity.User;
import com.examseat.exception.ApiException;
import com.examseat.mapper.ExamMapper;
import com.examseat.mapper.UserMapper;
import com.examseat.repository.ExamRepository;
import com.examseat.repository.HallRepository;
import com.examseat.repository.InvigilationDutyRepository;
import com.examseat.repository.NotificationRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import com.examseat.repository.UserRepository;
import com.examseat.service.DashboardService;
import com.examseat.service.DutyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final Map<String, String> DEPARTMENT_COLORS = Map.of(
            "CSE", "#4F46E5",
            "IT", "#14B8A6",
            "ECE", "#F59E0B",
            "MECH", "#EC4899",
            "CIVIL", "#0EA5E9");

    /** In-memory settings; a real deployment would persist this in a single-row table. */
    private volatile SettingsRequest settings = SettingsRequest.builder()
            .theme("light")
            .density("comfortable")
            .emailNotifications(true)
            .pushNotifications(true)
            .smsNotifications(false)
            .weeklyDigest(true)
            .clashAlerts(true)
            .autoPublish(false)
            .language("en")
            .institution("University Examination Cell")
            .academicYear("2025-26")
            .academicStartDate(LocalDate.now().withDayOfYear(1))
            .build();

    private final ExamRepository examRepository;
    private final HallRepository hallRepository;
    private final StudentRepository studentRepository;
    private final SeatAllocationRepository allocationRepository;
    private final InvigilationDutyRepository dutyRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ExamMapper examMapper;
    private final UserMapper userMapper;
    private final DutyService dutyService;

    /* ================================================================== admin */

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse admin() {
        List<Exam> exams = examRepository.findAllByOrderByDateAsc();
        List<Hall> halls = hallRepository.findAll();
        List<SeatAllocation> allocations = allocationRepository.findAll();

        int totalCapacity = halls.stream()
                .mapToInt(h -> (h.getRowsCount() == null ? 0 : h.getRowsCount())
                        * (h.getColsCount() == null ? 0 : h.getColsCount()))
                .sum();
        int seatsAllocated = allocations.size();
        long facultyCount = userRepository.countByRole(Role.FACULTY);
        int scheduled = (int) exams.stream().filter(e -> e.getStatus() == ExamStatus.SCHEDULED).count();
        int clashes = countClashes(allocations);
        double avgUtilisation = halls.isEmpty() || totalCapacity == 0 ? 0
                : halls.stream().mapToDouble(hall -> utilisationOf(allocations, hall)).average().orElse(0);

        Stats stats = Stats.builder()
                .totalStudents((int) studentRepository.count())
                .totalHalls(halls.size())
                .examsScheduled(scheduled)
                .seatsAllocated(seatsAllocated)
                .totalCapacity(totalCapacity)
                .facultyCount((int) facultyCount)
                .activePlans((int) allocations.stream()
                        .map(a -> a.getExam().getId()).distinct().count())
                .clashes(clashes)
                .avgUtilisation((int) Math.round(avgUtilisation))
                .unallocatedNotifications((int) notificationRepository.findAll().stream()
                        .filter(n -> !n.isRead()).count())
                .build();

        return AdminDashboardResponse.builder()
                .stats(stats)
                .allocationsOverTime(trend(exams, allocations))
                .departmentDistribution(departmentDistribution(allocations))
                .hallUtilisation(hallUtilisation(allocations, halls))
                .upcoming(upcoming(exams, 5))
                .activity(recentActivity(8))
                .examsByStatus(examsByStatus(exams))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse stats() {
        // Annotated here too: a self-call bypasses the proxy, so admin()'s own
        // @Transactional would not apply and the lazy proxies would fail to load.
        return admin();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ActivityEntry> recentActivity(int limit) {
        List<ActivityEntry> entries = new ArrayList<>();

        // Recent notifications make the best activity feed: they already describe
        // publishes, duty assignments and regenerations in plain language.
        notificationRepository.findAll().stream()
                .sorted(Comparator.comparing(Notification::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit <= 0 ? 10 : limit)
                .forEach(notification -> entries.add(ActivityEntry.builder()
                        .id(notification.getId())
                        .type(notification.getType() == null ? "info" : notification.getType())
                        .title(notification.getTitle())
                        .detail(notification.getMessage())
                        .at(notification.getCreatedAt())
                        .actor(notification.getUser() == null ? null : notification.getUser().getName())
                        .build()));

        return entries;
    }

    /* =============================================================== faculty */

    @Override
    @Transactional(readOnly = true)
    public FacultyDashboardResponse faculty(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.notFound("Faculty", email));

        List<DutyResponse> duties = dutyService.forFaculty(email);
        LocalDate today = LocalDate.now();

        DutyResponse todayDuty = duties.stream()
                .filter(d -> d.getDate() != null && d.getDate().equals(today))
                .findFirst()
                .orElse(null);

        DutyResponse nextDuty = duties.stream()
                .filter(d -> d.getDate() != null && d.getDate().isAfter(today))
                .min(Comparator.comparing(DutyResponse::getDate))
                .orElse(null);

        int completed = (int) duties.stream()
                .filter(d -> d.getDate() != null && d.getDate().isBefore(today)).count();
        int studentsInvigilated = (int) duties.stream()
                .filter(d -> d.getDate() != null && !d.getDate().isAfter(today))
                .mapToInt(d -> d.getSeatCount() == null ? 0 : d.getSeatCount())
                .sum();
        Set<String> hallsCovered = duties.stream()
                .map(DutyResponse::getHallId)
                .collect(Collectors.toSet());

        FacultyDashboardResponse.Stats stats = FacultyDashboardResponse.Stats.builder()
                .upcomingDuties(duties.size() - completed)
                .completedDuties(completed)
                .studentsInvigilated(studentsInvigilated)
                .hallsCovered(hallsCovered.size())
                .build();

        List<NotificationResponse> notifications = notificationRepository
                .findTop20ByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toNotificationResponse)
                .toList();

        return FacultyDashboardResponse.builder()
                .faculty(facultyProfile(user))
                .stats(stats)
                .todayDuty(todayDuty)
                .nextDuty(nextDuty)
                .upcoming(duties.stream()
                        .filter(d -> d.getDate() != null && !d.getDate().isBefore(today))
                        .limit(6)
                        .toList())
                .dutyTrend(dutyTrend(duties))
                .workload(workload())
                .notifications(notifications)
                .build();
    }

    /**
     * Directory row for the given user, synthesised from the account when they are
     * not in the faculty directory.
     *
     * <p>An administrator has no directory entry, but the dashboard is still valid
     * for them — it simply reports whatever duties they hold. Falling back to the
     * account keeps the endpoint working instead of failing on the profile lookup.</p>
     */
    private FacultyResponse facultyProfile(User user) {
        return dutyService.listFaculty().stream()
                .filter(row -> row.getId().equals(user.getId()))
                .findFirst()
                .orElseGet(() -> FacultyResponse.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .department(user.getDepartment())
                        .designation(user.getTitle())
                        .employeeId(user.getEmployeeId())
                        .phone(user.getPhone())
                        .photo(user.getPhoto())
                        .build());
    }

    /* ============================================================== settings */

    @Override
    public SettingsRequest getSettings() {
        return settings;
    }

    @Override
    public SettingsRequest updateSettings(SettingsRequest request) {
        SettingsRequest merged = SettingsRequest.builder()
                .theme(request.getTheme() == null ? settings.getTheme() : request.getTheme())
                .density(request.getDensity() == null ? settings.getDensity() : request.getDensity())
                .emailNotifications(request.getEmailNotifications() == null
                        ? settings.getEmailNotifications() : request.getEmailNotifications())
                .pushNotifications(request.getPushNotifications() == null
                        ? settings.getPushNotifications() : request.getPushNotifications())
                .smsNotifications(request.getSmsNotifications() == null
                        ? settings.getSmsNotifications() : request.getSmsNotifications())
                .weeklyDigest(request.getWeeklyDigest() == null
                        ? settings.getWeeklyDigest() : request.getWeeklyDigest())
                .clashAlerts(request.getClashAlerts() == null
                        ? settings.getClashAlerts() : request.getClashAlerts())
                .autoPublish(request.getAutoPublish() == null
                        ? settings.getAutoPublish() : request.getAutoPublish())
                .language(request.getLanguage() == null ? settings.getLanguage() : request.getLanguage())
                .institution(request.getInstitution() == null
                        ? settings.getInstitution() : request.getInstitution())
                .academicYear(request.getAcademicYear() == null
                        ? settings.getAcademicYear() : request.getAcademicYear())
                .academicStartDate(request.getAcademicStartDate() == null
                        ? settings.getAcademicStartDate() : request.getAcademicStartDate())
                .dailyUploadDeadline(request.getDailyUploadDeadline() == null
                        ? settings.getDailyUploadDeadline() : request.getDailyUploadDeadline())
                .build();
        settings = merged;
        log.info("Settings updated: theme={} autoPublish={}", merged.getTheme(), merged.getAutoPublish());
        return merged;
    }

    /* ================================================================= helpers */

    private List<TrendPoint> trend(List<Exam> exams, List<SeatAllocation> allocations) {
        YearMonth first = exams.stream()
                .map(Exam::getDate)
                .filter(java.util.Objects::nonNull)
                .map(date -> YearMonth.from(date))
                .min(Comparator.naturalOrder())
                .orElse(YearMonth.now());
        YearMonth last = YearMonth.now();

        Map<YearMonth, Integer> seatsByMonth = allocations.stream()
                .filter(a -> a.getExam().getDate() != null)
                .collect(Collectors.groupingBy(a -> YearMonth.from(a.getExam().getDate()),
                        TreeMap::new, Collectors.summingInt(a -> 1)));

        List<TrendPoint> points = new ArrayList<>();
        for (YearMonth month = first; !month.isAfter(last); month = month.plusMonths(1)) {
            String label = month.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            points.add(TrendPoint.builder()
                    .month(label)
                    .seats(seatsByMonth.getOrDefault(month, 0))
                    .students((int) studentRepository.count())
                    .build());
        }
        if (points.isEmpty()) {
            points.add(TrendPoint.builder().month("This month").seats(0)
                    .students((int) studentRepository.count()).build());
        }
        return points;
    }

    private List<NameValue> departmentDistribution(List<SeatAllocation> allocations) {
        Map<String, Integer> counts;

        if (allocations.isEmpty()) {
            // Nothing allocated yet — fall back to the live roster so the chart is useful.
            counts = new TreeMap<>();
            for (Student student : studentRepository.findAll()) {
                counts.merge(student.getDepartment(), 1, Integer::sum);
            }
        } else {
            counts = allocations.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getDepartment(),
                            TreeMap::new, Collectors.summingInt(a -> 1)));
        }

        return counts.entrySet().stream()
                .map(entry -> NameValue.builder()
                        .name(entry.getKey())
                        .value(entry.getValue())
                        .color(DEPARTMENT_COLORS.getOrDefault(entry.getKey(), "#64748B"))
                        .build())
                .toList();
    }

    private List<HallUtilisation> hallUtilisation(List<SeatAllocation> allocations, List<Hall> halls) {
        Map<String, Integer> allocatedByHall = allocations.stream()
                .collect(Collectors.groupingBy(a -> a.getHall().getId(),
                        Collectors.summingInt(a -> 1)));

        return halls.stream()
                .map(hall -> {
                    int capacity = (hall.getRowsCount() == null ? 0 : hall.getRowsCount())
                            * (hall.getColsCount() == null ? 0 : hall.getColsCount());
                    int allocated = allocatedByHall.getOrDefault(hall.getId(), 0);
                    return HallUtilisation.builder()
                            .hall(hall.getName())
                            .utilisation(capacity == 0 ? 0
                                    : (int) Math.round(allocated * 100.0 / capacity))
                            .build();
                })
                .sorted(Comparator.comparingInt(HallUtilisation::getUtilisation).reversed())
                .toList();
    }

    private List<ExamResponse> upcoming(List<Exam> exams, int limit) {
        return exams.stream()
                .filter(exam -> exam.getDate() != null && !exam.getDate().isBefore(LocalDate.now()))
                .limit(limit)
                .map(exam -> examMapper.toResponse(exam,
                        List.of(), List.of(), 0,
                        (int) allocationRepository.countByExamId(exam.getId())))
                .toList();
    }

    private List<NameValue> examsByStatus(List<Exam> exams) {
        Map<ExamStatus, Long> counts = exams.stream()
                .collect(Collectors.groupingBy(Exam::getStatus, TreeMap::new, Collectors.counting()));
        return counts.entrySet().stream()
                .map(entry -> NameValue.builder()
                        .name(capitalise(entry.getKey().name()))
                        .value(entry.getValue().intValue())
                        .build())
                .toList();
    }

    private List<FacultyDashboardResponse.TrendPoint> dutyTrend(List<DutyResponse> duties) {
        Map<YearMonth, Integer> byMonth = duties.stream()
                .filter(d -> d.getDate() != null)
                .collect(Collectors.groupingBy(d -> YearMonth.from(d.getDate()),
                        TreeMap::new, Collectors.summingInt(a -> 1)));

        YearMonth last = YearMonth.now();
        List<FacultyDashboardResponse.TrendPoint> points = new ArrayList<>();
        for (int back = 5; back >= 0; back -= 1) {
            YearMonth month = last.minusMonths(back);
            points.add(FacultyDashboardResponse.TrendPoint.builder()
                    .month(month.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH))
                    .duties(byMonth.getOrDefault(month, 0))
                    .build());
        }
        return points;
    }

    private List<NameValue> workload() {
        Map<String, List<InvigilationDuty>> byFaculty = dutyRepository.findAll().stream()
                .filter(duty -> duty.getFaculty() != null)
                .collect(Collectors.groupingBy(d -> d.getFaculty().getName(),
                        LinkedHashMap::new, Collectors.toList()));

        return byFaculty.entrySet().stream()
                .map(entry -> NameValue.builder()
                        .name(entry.getKey())
                        .value(entry.getValue().size())
                        .build())
                .sorted(Comparator.comparingInt(NameValue::getValue).reversed())
                .toList();
    }

    private double utilisationOf(List<SeatAllocation> allocations, Hall hall) {
        int capacity = (hall.getRowsCount() == null ? 0 : hall.getRowsCount())
                * (hall.getColsCount() == null ? 0 : hall.getColsCount());
        if (capacity == 0) return 0;
        int used = (int) allocations.stream()
                .filter(a -> a.getHall().getId().equals(hall.getId()))
                .count();
        return used * 100.0 / capacity;
    }

    /** A student seated in two places inside the same exam is the only hard failure. */
    private int countClashes(List<SeatAllocation> allocations) {
        return (int) allocations.stream()
                .collect(Collectors.groupingBy(a -> a.getExam().getId() + "::" + a.getStudent().getId(),
                        Collectors.counting()))
                .values().stream()
                .filter(count -> count > 1)
                .mapToInt(count -> count.intValue() - 1)
                .sum();
    }

    private String capitalise(String value) {
        if (value == null || value.isEmpty()) return "";
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1).toLowerCase(Locale.ROOT);
    }

    private NotificationResponse toNotificationResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .read(notification.isRead())
                .href(notification.getHref())
                .createdAt(notification.getCreatedAt())
                .at(notification.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> facultyDirectorySummary() {
        return Map.of(
                "faculty", (int) userRepository.countByRole(Role.FACULTY),
                "duties", dutyRepository.count());
    }
}
