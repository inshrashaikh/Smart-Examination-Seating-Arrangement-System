package com.examseat.service.impl;

import com.examseat.dto.report.AttendanceSheet;
import com.examseat.dto.report.DepartmentWiseReport;
import com.examseat.dto.report.ExamSummary;
import com.examseat.dto.report.HallWiseReport;
import com.examseat.dto.report.StudentWiseRow;
import com.examseat.entity.AttendanceMark;
import com.examseat.entity.Exam;
import com.examseat.entity.Hall;
import com.examseat.entity.SeatAllocation;
import com.examseat.entity.Student;
import com.examseat.exception.ApiException;
import com.examseat.mapper.ExamMapper;
import com.examseat.repository.AttendanceMarkRepository;
import com.examseat.repository.ExamHallRepository;
import com.examseat.repository.ExamRepository;
import com.examseat.repository.HallRepository;
import com.examseat.repository.InvigilationDutyRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import com.examseat.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    /** Matches the palette the React charts use, so PDFs line up with the UI. */
    private static final Map<String, String> DEPARTMENT_COLORS = Map.of(
            "CSE", "#4F46E5",
            "IT", "#14B8A6",
            "ECE", "#F59E0B",
            "MECH", "#EC4899",
            "CIVIL", "#0EA5E9");

    private static final Map<String, String> DEPARTMENT_NAMES = Map.of(
            "CSE", "Computer Science & Engineering",
            "IT", "Information Technology",
            "ECE", "Electronics & Communication",
            "MECH", "Mechanical Engineering",
            "CIVIL", "Civil Engineering");

    private final ExamRepository examRepository;
    private final HallRepository hallRepository;
    private final ExamHallRepository examHallRepository;
    private final StudentRepository studentRepository;
    private final SeatAllocationRepository allocationRepository;
    private final InvigilationDutyRepository dutyRepository;
    private final AttendanceMarkRepository attendanceMarkRepository;
    private final ExamMapper examMapper;

    /* ============================================================ hall-wise */

    @Override
    @Transactional(readOnly = true)
    public HallWiseReport hallWise(String examId) {
        Exam exam = requireExam(examId);
        Map<String, List<SeatAllocation>> byHall = allocationsOf(examId);

        // Include halls linked to the exam that ended up empty so the totals still add up.
        Map<String, Hall> halls = examHallRepository.findByExamId(examId).stream()
                .collect(Collectors.toMap(eh -> eh.getHall().getId(), eh -> eh.getHall(),
                        (a, b) -> a, LinkedHashMap::new));
        byHall.forEach((hallId, allocations) ->
                halls.computeIfAbsent(hallId, id -> allocations.get(0).getHall()));

        int totalAllocated = 0;
        int totalCapacity = 0;
        int totalInvigilators = 0;

        List<HallWiseReport.Row> rows = new ArrayList<>();
        for (Hall hall : halls.values()) {
            List<SeatAllocation> allocations = byHall.getOrDefault(hall.getId(), List.of());
            int capacity = (hall.getRowsCount() == null ? 0 : hall.getRowsCount())
                    * (hall.getColsCount() == null ? 0 : hall.getColsCount());
            int allocated = allocations.size();
            int invigilators = (int) dutyRepository.findByExamIdAndHallId(examId, hall.getId()).size();

            Map<String, Integer> departments = allocations.stream()
                    .collect(Collectors.groupingBy(a -> a.getStudent().getDepartment(),
                            TreeMap::new, Collectors.summingInt(a -> 1)));

            rows.add(HallWiseReport.Row.builder()
                    .examCode(exam.getCode())
                    .examTitle(titleOf(exam))
                    .hallCode(hall.getCode())
                    .hallName(hall.getName())
                    .capacity(capacity)
                    .allocated(allocated)
                    .utilisation(capacity == 0 ? 0 : (int) Math.round(allocated * 100.0 / capacity))
                    .invigilators(invigilators)
                    .departments(departments)
                    .status(exam.getStatus() == null ? null : exam.getStatus().name())
                    .build());

            totalAllocated += allocated;
            totalCapacity += capacity;
            totalInvigilators += invigilators;
        }

        HallWiseReport.Totals totals = HallWiseReport.Totals.builder()
                .halls(rows.size())
                .allocated(totalAllocated)
                .capacity(totalCapacity)
                .utilisation(totalCapacity == 0 ? 0
                        : (int) Math.round(totalAllocated * 100.0 / totalCapacity))
                .invigilators(totalInvigilators)
                .build();

        return HallWiseReport.builder()
                .exam(examMapper.toSummary(exam))
                .rows(rows)
                .totals(totals)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TableData hallWiseTable(String examId) {
        HallWiseReport report = hallWise(examId);
        List<String> headers = List.of("Exam", "Hall", "Capacity", "Allocated",
                "Utilisation %", "Invigilators");
        // Arrays.asList rather than List.of: a hall with no invigilator assigned
        // legitimately yields null cells, and List.of rejects nulls.
        // ArrayList because the totals row is appended below (Stream.toList is immutable).
        List<List<Object>> rows = new ArrayList<>(report.getRows().stream()
                .map(row -> Arrays.<Object>asList(
                        row.getExamCode() + " — " + row.getExamTitle(),
                        row.getHallCode() + " — " + row.getHallName(),
                        row.getCapacity(),
                        row.getAllocated(),
                        row.getUtilisation(),
                        row.getInvigilators()))
                .toList());

        HallWiseReport.Totals totals = report.getTotals();
        rows.add(Arrays.<Object>asList("TOTAL", totals.getHalls() + " hall(s)",
                totals.getCapacity(), totals.getAllocated(),
                totals.getUtilisation(), totals.getInvigilators()));

        return new TableData("Hall-wise Seating Report", subtitleOf(report.getExam()),
                headers, rows);
    }

    /* ======================================================= department-wise */

    @Override
    @Transactional(readOnly = true)
    public DepartmentWiseReport departmentWise(String examId) {
        Exam exam = requireExam(examId);
        Integer minYear = exam.getMinYear() == null ? 1 : exam.getMinYear();

        Map<String, Integer> eligibleByDept = new TreeMap<>();
        for (String dept : new LinkedHashSet<>(exam.getDepartments())) {
            eligibleByDept.merge(dept,
                    (int) studentRepository.findEligible(Set.of(dept), minYear).size(),
                    Integer::sum);
        }

        Map<String, List<SeatAllocation>> byDept = allocationsOf(examId).values().stream()
                .flatMap(List::stream)
                .collect(Collectors.groupingBy(a -> a.getStudent().getDepartment(),
                        TreeMap::new, Collectors.toList()));

        Set<String> allDepartments = new LinkedHashSet<>(eligibleByDept.keySet());
        allDepartments.addAll(byDept.keySet());

        int totalAllocated = byDept.values().stream().mapToInt(List::size).sum();

        List<DepartmentWiseReport.Row> rows = new ArrayList<>();
        for (String dept : allDepartments) {
            List<SeatAllocation> allocations = byDept.getOrDefault(dept, List.of());
            int eligible = eligibleByDept.getOrDefault(dept, 0);
            int allocated = allocations.size();
            Set<String> hallsUsed = allocations.stream()
                    .map(a -> a.getHall().getId())
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            rows.add(DepartmentWiseReport.Row.builder()
                    .department(dept)
                    .departmentName(DEPARTMENT_NAMES.getOrDefault(dept, dept))
                    .color(DEPARTMENT_COLORS.getOrDefault(dept, "#64748B"))
                    .eligible(eligible)
                    .allocated(allocated)
                    .unallocated(Math.max(0, eligible - allocated))
                    .hallsUsed(hallsUsed.size())
                    .share(totalAllocated == 0 ? 0
                            : (int) Math.round(allocated * 100.0 / totalAllocated))
                    .build());
        }

        return DepartmentWiseReport.builder()
                .exam(examMapper.toSummary(exam))
                .rows(rows)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TableData departmentWiseTable(String examId) {
        DepartmentWiseReport report = departmentWise(examId);
        List<String> headers = List.of("Department", "Eligible", "Allocated",
                "Unallocated", "Halls Used", "Share %");
        List<List<Object>> rows = report.getRows().stream()
                .map(row -> Arrays.<Object>asList(
                        row.getDepartment() + " — " + row.getDepartmentName(),
                        row.getEligible(),
                        row.getAllocated(),
                        row.getUnallocated(),
                        row.getHallsUsed(),
                        row.getShare()))
                .toList();
        return new TableData("Department-wise Seating Report", subtitleOf(report.getExam()),
                headers, rows);
    }

    /* ========================================================== student-wise */

    @Override
    @Transactional(readOnly = true)
    public List<StudentWiseRow> studentWise(String examId, String search, String department) {
        return studentWiseRows(examId, search, department);
    }

    @Override
    @Transactional(readOnly = true)
    public TableData studentWiseTable(String examId, String search, String department) {
        List<StudentWiseRow> rows = studentWiseRows(examId, search, department);
        List<String> headers = List.of("Roll No", "Name", "Department", "Year",
                "Section", "Hall", "Seat");
        List<List<Object>> body = rows.stream()
                .map(row -> Arrays.<Object>asList(row.getRollNo(), row.getName(), row.getDepartment(),
                        row.getYear(), row.getSection(),
                        row.getHallCode() + " — " + row.getHall(), row.getSeat()))
                .toList();
        ExamSummary summary = examMapper.toSummary(requireExam(examId));
        return new TableData("Student-wise Seating Report",
                subtitleOf(summary) + " · " + body.size() + " student(s)",
                headers, body);
    }

    private List<StudentWiseRow> studentWiseRows(String examId, String search, String department) {
        requireExam(examId);
        String needle = search == null || search.isBlank()
                ? null : search.trim().toLowerCase(Locale.ROOT);
        String dept = department == null || department.isBlank() ? null : department.trim();

        return allocationRepository.findByExamIdOrderByHallIdAscRowNoAscColNoAsc(examId).stream()
                .map(this::toStudentWiseRow)
                .filter(row -> dept == null || dept.equalsIgnoreCase(row.getDepartment()))
                .filter(row -> needle == null
                        || (row.getName() != null && row.getName().toLowerCase(Locale.ROOT).contains(needle))
                        || (row.getRollNo() != null && row.getRollNo().toLowerCase(Locale.ROOT).contains(needle))
                        || (row.getHallCode() != null && row.getHallCode().toLowerCase(Locale.ROOT).contains(needle))
                        || (row.getSeat() != null && row.getSeat().toLowerCase(Locale.ROOT).contains(needle)))
                .toList();
    }

    private StudentWiseRow toStudentWiseRow(SeatAllocation allocation) {
        Student student = allocation.getStudent();
        return StudentWiseRow.builder()
                .rollNo(student.getRollNo())
                .name(student.getName())
                .department(student.getDepartment())
                .year(student.getYear())
                .section(student.getSection())
                .hall(allocation.getHall().getName())
                .hallCode(allocation.getHall().getCode())
                .seat(allocation.getSeatLabel())
                .status(allocation.getPlanStatus() == null ? null : allocation.getPlanStatus().name())
                .build();
    }

    /* =========================================================== attendance */

    @Override
    @Transactional(readOnly = true)
    public AttendanceSheet attendance(String examId, String hallId) {
        Exam exam = requireExam(examId);

        List<String> hallIds = hallId == null || hallId.isBlank()
                ? examHallRepository.findByExamId(examId).stream()
                        .map(eh -> eh.getHall().getId()).toList()
                : List.of(hallId);

        // One query for every mark on the exam, keyed by allocation id, rather than one
        // per candidate. Null value means "nobody has marked this seat yet", which is
        // distinct from `false` ("marked absent") and is preserved as null on the row.
        Map<String, AttendanceMark> marks = new java.util.HashMap<>();
        for (AttendanceMark m : attendanceMarkRepository.findByExamId(examId)) {
            marks.put(m.getAllocationId(), m);
        }

        List<AttendanceSheet.HallRef> halls = new ArrayList<>();
        List<AttendanceSheet.Row> rows = new ArrayList<>();
        int total = 0;
        int presentCount = 0;
        int absentCount = 0;

        for (String id : hallIds) {
            Hall hall = hallRepository.findById(id).orElse(null);
            if (hall == null) continue;
            halls.add(AttendanceSheet.HallRef.builder()
                    .id(hall.getId()).name(hall.getName()).code(hall.getCode()).build());

            List<SeatAllocation> allocations =
                    allocationRepository.findByExamIdAndHallIdOrderByRowNoAscColNoAsc(examId, hall.getId());
            total += allocations.size();

            for (SeatAllocation allocation : allocations) {
                Student student = allocation.getStudent();
                AttendanceMark mark = marks.get(allocation.getId());
                if (mark != null) {
                    if (mark.isPresent()) presentCount++; else absentCount++;
                }
                rows.add(AttendanceSheet.Row.builder()
                        .allocationId(allocation.getId())
                        .rollNo(student.getRollNo())
                        .name(student.getName())
                        .department(student.getDepartment())
                        .year(student.getYear())
                        .section(student.getSection())
                        .hall(hall.getName())
                        .hallCode(hall.getCode())
                        .seat(allocation.getSeatLabel())
                        // null  = nobody has marked this seat yet
                        // true  = recorded present
                        // false = recorded absent
                        .present(mark == null ? null : mark.isPresent())
                        .markedAt(mark == null ? null : mark.getMarkedAt())
                        .markedBy(mark == null ? null : mark.getMarkedBy())
                        .note(mark == null ? null : mark.getNote())
                        .build());
            }
        }

        return AttendanceSheet.builder()
                .exam(examMapper.toSummary(exam))
                .halls(halls)
                .rows(rows)
                .summary(AttendanceSheet.Summary.builder()
                        .total(total)
                        .present(presentCount)
                        .absent(absentCount)
                        // Decided seats. `total - marked` is still pending, which is not
                        // the same as absent — reporting absent as 0 while nothing is
                        // marked is truthful but easy to misread, so all three go out.
                        .marked(presentCount + absentCount)
                        .pending(total - presentCount - absentCount)
                        .build())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TableData attendanceTable(String examId, String hallId) {
        AttendanceSheet sheet = attendance(examId, hallId);
        List<String> headers = List.of("Roll No", "Name", "Department", "Year",
                "Hall", "Seat", "Present");
        List<List<Object>> rows = sheet.getRows().stream()
                .map(row -> Arrays.<Object>asList(row.getRollNo(), row.getName(), row.getDepartment(),
                        row.getYear(), row.getHallCode(), row.getSeat(),
                        row.getPresent() == null ? "—" : (row.getPresent() ? "Yes" : "No")))
                .toList();
        String hallLabel = sheet.getHalls().size() == 1
                ? sheet.getHalls().get(0).getName() : "All halls";
        return new TableData("Attendance Sheet",
                subtitleOf(sheet.getExam()) + " · " + hallLabel,
                headers, rows);
    }

    /* ================================================================= helpers */

    private Map<String, List<SeatAllocation>> allocationsOf(String examId) {
        return allocationRepository.findByExamIdOrderByHallIdAscRowNoAscColNoAsc(examId).stream()
                .collect(Collectors.groupingBy(a -> a.getHall().getId(),
                        LinkedHashMap::new, Collectors.toList()));
    }

    private Exam requireExam(String examId) {
        return examRepository.findById(examId)
                .orElseThrow(() -> ApiException.notFound("Exam", examId));
    }

    private String titleOf(Exam exam) {
        return exam.getTitle() == null || exam.getTitle().isBlank() ? exam.getSubject() : exam.getTitle();
    }

    private String subtitleOf(ExamSummary summary) {
        if (summary == null) return "";
        return String.join(" · ",
                java.util.stream.Stream.of(summary.getCode(), summary.getTitle(),
                                summary.getDate(), summary.getTimeRange())
                        .filter(Objects::nonNull)
                        .filter(s -> !s.isBlank())
                        .toList());
    }
}
