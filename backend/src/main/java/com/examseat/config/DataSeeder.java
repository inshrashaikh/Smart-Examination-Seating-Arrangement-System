package com.examseat.config;

import com.examseat.algorithm.SeatingAlgorithm;
import com.examseat.algorithm.SeatCell;
import com.examseat.algorithm.SeatingResult;
import com.examseat.algorithm.SeatingRules;
import com.examseat.entity.DutyRole;
import com.examseat.entity.DutyStatus;
import com.examseat.entity.Exam;
import com.examseat.entity.ExamHall;
import com.examseat.entity.ExamStatus;
import com.examseat.entity.Hall;
import com.examseat.entity.InvigilationDuty;
import com.examseat.entity.Notification;
import com.examseat.entity.Role;
import com.examseat.entity.SeatAllocation;
import com.examseat.entity.Student;
import com.examseat.entity.User;
import com.examseat.repository.ExamHallRepository;
import com.examseat.repository.ExamRepository;
import com.examseat.repository.HallRepository;
import com.examseat.repository.InvigilationDutyRepository;
import com.examseat.repository.NotificationRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import com.examseat.repository.UserRepository;
import com.examseat.util.IdFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Loads a complete demo dataset on first boot so the React UI has something to show.
 * Disable with {@code app.seed.enabled=false}.
 *
 * <p>Credentials: {@code admin@exam.com / admin123} and
 * {@code faculty1@exam.com … faculty5@exam.com / faculty123}.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String[] DEPARTMENTS = {"CSE", "IT", "ECE", "MECH", "CIVIL"};
    private static final int[] YEARS = {1, 2, 3, 4};
    private static final String[] SECTIONS = {"A", "B", "C"};
    private static final String[] GENDERS = {"Male", "Female", "Other"};

    private static final String[] FIRST_NAMES = {
            "Aarav", "Aditi", "Ahmed", "Ananya", "Arjun", "Bhavya", "Chaitanya", "Divya",
            "Farhan", "Fatima", "Gaurav", "Harsh", "Ishaan", "Ishita", "Jaya", "Kabir",
            "Kavya", "Lakshmi", "Manish", "Meera", "Mohit", "Nandini", "Neha", "Nikhil",
            "Omkar", "Pavithra", "Pranav", "Priya", "Rahul", "Ramesh", "Rehana", "Riya",
            "Rohan", "Sai", "Sameer", "Sanjana", "Shreya", "Siddharth", "Sneha", "Soham"
    };

    private static final String[] LAST_NAMES = {
            "Sharma", "Verma", "Khan", "Iyer", "Nair", "Patel", "Reddy", "Das",
            "Bose", "Gupta", "Mehta", "Joshi", "Kulkarni", "Rao", "Menon", "Kapoor"
    };

    private static final String[] FACULTY_NAMES = {
            "Ananya Iyer", "Rahul Menon", "Priya Nair", "Sandeep Kulkarni", "Fatima Khan"
    };

    private static final String[] DESIGNATIONS = {
            "Professor", "Associate Professor", "Assistant Professor",
            "Associate Professor", "Assistant Professor"
    };

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final HallRepository hallRepository;
    private final ExamRepository examRepository;
    private final ExamHallRepository examHallRepository;
    private final SeatAllocationRepository allocationRepository;
    private final InvigilationDutyRepository dutyRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final SeatingAlgorithm seatingAlgorithm;

    @Value("${app.seed.enabled:true}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            log.info("Seed data disabled (app.seed.enabled=false)");
            return;
        }
        if (userRepository.count() > 0) {
            log.info("Seed data skipped — {} user(s) already present", userRepository.count());
            return;
        }

        Instant now = Instant.now();
        List<User> faculty = seedUsers(now);
        seedHalls();
        List<Student> students = seedStudents();
        List<Exam> exams = seedExams(now);
        List<SeatAllocation> allocations = seedPlans(exams);
        seedDuties(faculty, exams, now);
        seedNotifications(faculty, now);

        log.info("""

                ------------------------------------------------------------------
                 Seed complete
                   users        : {} (1 admin + {} faculty)
                   students     : {}
                   halls        : {}
                   exams        : {}
                   allocations  : {}
                   duties       : {}
                ------------------------------------------------------------------
                 admin    : admin@exam.com / admin123
                 faculty  : faculty1@exam.com … faculty5@exam.com / faculty123
                ------------------------------------------------------------------""",
                userRepository.count(), faculty.size(), students.size(),
                hallRepository.count(), exams.size(), allocations.size(),
                dutyRepository.count());
    }

    /* =============================================================== users == */

    private List<User> seedUsers(Instant now) {
        userRepository.save(User.builder()
                .id("U-0001")
                .name("Exam Officer")
                .email("admin@exam.com")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN)
                .department("Examination Cell")
                .phone("+91 90000 00000")
                .title("Examination Officer")
                .employeeId("EMP-0001")
                .enabled(true)
                .createdAt(now)
                .build());

        List<User> faculty = new ArrayList<>();
        for (int i = 0; i < FACULTY_NAMES.length; i += 1) {
            int number = i + 1;
            faculty.add(userRepository.save(User.builder()
                    .id(String.format("U-%04d", number + 1))
                    .name(FACULTY_NAMES[i])
                    .email("faculty" + number + "@exam.com")
                    .password(passwordEncoder.encode("faculty123"))
                    .role(Role.FACULTY)
                    .department(DEPARTMENTS[i % DEPARTMENTS.length])
                    .phone(String.format("+91 90000 001%02d", number))
                    .title(DESIGNATIONS[i])
                    .employeeId(String.format("EMP-%04d", number + 1))
                    .enabled(true)
                    .createdAt(now)
                    .build()));
        }
        return faculty;
    }

    /* =============================================================== halls == */

    private void seedHalls() {
        Object[][] specs = {
                // code, name, building, block, floor, rows, cols, type, blockedSeatRow, blockedSeatCol
                {"A-101", "Lecture Hall A-101", "Academic Block A", "A", 1, 5, 6, "LECTURE", -1, -1},
                {"A-102", "Lecture Hall A-102", "Academic Block A", "A", 1, 5, 6, "LECTURE", -1, -1},
                {"A-201", "Seminar Hall A-201", "Academic Block A", "A", 2, 4, 8, "SEMINAR", -1, -1},
                {"A-202", "Seminar Hall A-202", "Academic Block A", "A", 2, 4, 8, "SEMINAR", -1, -1},
                {"B-101", "Exam Hall B-101", "Science Block B", "B", 1, 6, 6, "EXAM", -1, -1},
                {"B-102", "Exam Hall B-102", "Science Block B", "B", 1, 6, 6, "EXAM", 2, 4},
                {"C-001", "Centre Hall C-001", "Central Block C", "C", 0, 6, 4, "EXAM", -1, -1},
                {"C-002", "Centre Hall C-002", "Central Block C", "C", 0, 6, 4, "EXAM", 4, 2}
        };

        List<String> facilities = List.of("PROJECTOR", "FAN", "LIGHTING", "WHITEBOARD");

        int index = 0;
        for (Object[] spec : specs) {
            index += 1;
            int rows = (int) spec[5];
            int cols = (int) spec[6];
            int blockedRow = (int) spec[8];
            int blockedCol = (int) spec[9];

            List<Hall.BlockedSeat> blocked = new ArrayList<>();
            if (blockedRow >= 0) {
                blocked.add(Hall.BlockedSeat.builder()
                        .row(blockedRow).col(blockedCol)
                        .reason("Broken desk — awaiting repair")
                        .build());
            }

            hallRepository.save(Hall.builder()
                    .id("H-" + index)
                    .code((String) spec[0])
                    .name((String) spec[1])
                    .building((String) spec[2])
                    .block((String) spec[3])
                    .floor((int) spec[4])
                    .capacity(rows * cols)
                    .rowsCount(rows)
                    .colsCount(cols)
                    .type((String) spec[7])
                    .board("GREEN BOARD")
                    .facilities(new ArrayList<>(facilities))
                    .blockedSeats(blocked)
                    .build());
        }
    }

    /* ============================================================ students == */

    private List<Student> seedStudents() {
        Random random = new Random(20260101L);
        List<Student> students = new ArrayList<>(200);
        int sequence = 0;

        // 40 students per department keeps the mix even, which makes the department
        // charts and the hall-wise report meaningful.
        for (int deptIndex = 0; deptIndex < DEPARTMENTS.length; deptIndex += 1) {
            String department = DEPARTMENTS[deptIndex];
            for (int n = 0; n < 40; n += 1) {
                sequence += 1;
                String first = FIRST_NAMES[random.nextInt(FIRST_NAMES.length)];
                String last = LAST_NAMES[random.nextInt(LAST_NAMES.length)];
                int year = YEARS[random.nextInt(YEARS.length)];
                String section = SECTIONS[random.nextInt(SECTIONS.length)];
                String rollNo = String.format("%d%s%04d", year, department, n + 1);

                students.add(Student.builder()
                        .id(String.format("S-%04d", sequence))
                        .rollNo(rollNo)
                        .name(first + " " + last)
                        .email(first.toLowerCase(Locale.ROOT) + "." + last.toLowerCase(Locale.ROOT)
                                + sequence + "@university.edu")
                        .phone(String.format("+91 8%09d", 100000000L + random.nextInt(899999999)))
                        .department(department)
                        .year(year)
                        .section(section)
                        .gender(GENDERS[random.nextInt(GENDERS.length)])
                        .prn(String.format("202%d%s%05d", year, department, sequence))
                        .createdAt(Instant.now())
                        .build());
            }
        }
        studentRepository.saveAll(students);
        return students;
    }

    /* ================================================================ exams == */

    private List<Exam> seedExams(Instant now) {
        LocalDate today = LocalDate.now();
        List<Exam> exams = new ArrayList<>();

        Exam[] specs = {
                Exam.builder().code("EX-001").subject("Data Structures & Algorithms")
                        .subjectCode("CS301").title("Data Structures & Algorithms — Final")
                        .course("B.Tech CSE").departments(List.of("CSE", "IT")).years(List.of(2, 3, 4))
                        .minYear(2).date(today.minusDays(9)).startTime(LocalTime.of(9, 30))
                        .endTime(LocalTime.of(12, 30)).durationHours(3)
                        .status(ExamStatus.COMPLETED).build(),
                Exam.builder().code("EX-002").subject("Digital Logic Design")
                        .subjectCode("EC210").title("Digital Logic Design — Mid-term")
                        .course("B.Tech ECE").departments(List.of("ECE", "CSE")).years(List.of(2, 3))
                        .minYear(2).date(today.minusDays(2)).startTime(LocalTime.of(10, 0))
                        .endTime(LocalTime.of(13, 0)).durationHours(3)
                        .status(ExamStatus.COMPLETED).build(),
                Exam.builder().code("EX-003").subject("Thermodynamics")
                        .subjectCode("ME301").title("Thermodynamics — Final")
                        .course("B.Tech MECH").departments(List.of("MECH", "CIVIL")).years(List.of(2, 3, 4))
                        .minYear(2).date(today.plusDays(1)).startTime(LocalTime.of(9, 0))
                        .endTime(LocalTime.of(12, 0)).durationHours(3)
                        .status(ExamStatus.PUBLISHED).build(),
                Exam.builder().code("EX-004").subject("Computer Networks")
                        .subjectCode("IT305").title("Computer Networks — Final")
                        .course("B.Tech IT").departments(List.of("CSE", "IT")).years(List.of(3, 4))
                        .minYear(3).date(today.plusDays(4)).startTime(LocalTime.of(14, 0))
                        .endTime(LocalTime.of(17, 0)).durationHours(3)
                        .status(ExamStatus.SCHEDULED).build(),
                Exam.builder().code("EX-005").subject("Structural Analysis")
                        .subjectCode("CV220").title("Structural Analysis — Mid-term")
                        .course("B.Tech CIVIL").departments(List.of("CIVIL", "MECH")).years(List.of(2, 3))
                        .minYear(2).date(today.plusDays(7)).startTime(LocalTime.of(9, 30))
                        .endTime(LocalTime.of(12, 30)).durationHours(3)
                        .status(ExamStatus.SCHEDULED).build()
        };

        for (int i = 0; i < specs.length; i += 1) {
            Exam spec = specs[i];
            spec.setId(String.format("EX-%03d", i + 1));
            spec.setCreatedAt(now);
            exams.add(examRepository.save(spec));
        }
        return exams;
    }

    /* =============================================================== plans == */

    private List<SeatAllocation> seedPlans(List<Exam> exams) {
        List<Hall> halls = hallRepository.findAllByOrderByCodeAsc();
        Map<String, Hall> hallsById = halls.stream()
                .collect(Collectors.toMap(Hall::getId, Function.identity()));
        Map<String, Student> studentsById = studentRepository.findAll().stream()
                .collect(Collectors.toMap(Student::getId, Function.identity()));
        Instant now = Instant.now();
        List<SeatAllocation> saved = new ArrayList<>();

        // Plans for the three exams that already ran, so the hall-plan and reports
        // screens open with content.
        Map<String, List<String>> hallsByExam = Map.of(
                "EX-001", List.of("H-1", "H-2"),
                "EX-002", List.of("H-5"),
                "EX-003", List.of("H-3", "H-4"));

        for (Exam exam : exams) {
            List<String> hallIds = hallsByExam.get(exam.getId());
            if (hallIds == null) continue;

            List<Hall> selected = hallIds.stream()
                    .map(hallsById::get)
                    .filter(java.util.Objects::nonNull)
                    .toList();
            List<Student> eligible = studentRepository.findAll().stream()
                    .filter(student -> exam.getDepartments().contains(student.getDepartment()))
                    .filter(student -> student.getYear() >= exam.getMinYear())
                    .toList();

            SeatingResult result = seatingAlgorithm.allocate(exam, selected, eligible,
                    SeatingRules.builder()
                            .avoidSameDeptAdjacent(true)
                            .avoidSameDeptDiagonal(true)
                            .mixDepartments(true)
                            .shuffle(true)
                            .strictCapacity(false)
                            .build());

            ExamStatus status = exam.getStatus() == ExamStatus.PUBLISHED
                    ? ExamStatus.PUBLISHED : ExamStatus.COMPLETED;

            List<SeatAllocation> batch = new ArrayList<>();
            for (var allocation : result.getHalls()) {
                Hall hall = hallsById.get(allocation.getHallId());
                if (hall == null) continue;

                for (List<SeatCell> row : allocation.getGrid()) {
                    for (SeatCell cell : row) {
                        if (!cell.isOccupied()) continue;
                        Student student = studentsById.get(cell.getStudentId());
                        if (student == null) continue;

                        batch.add(SeatAllocation.builder()
                                .id(IdFactory.allocation(exam.getId(), hall.getId(),
                                        cell.getRow(), cell.getCol()))
                                .exam(exam)
                                .hall(hall)
                                .student(student)
                                .rowNo(cell.getRow())
                                .colNo(cell.getCol())
                                .seatLabel(cell.getLabel())
                                .planStatus(status)
                                .createdAt(now)
                                .build());
                    }
                }
            }

            saved.addAll(allocationRepository.saveAll(batch));

            Instant createdAt = Instant.now();
            for (Hall hall : selected) {
                examHallRepository.save(ExamHall.builder()
                        .id(IdFactory.examHall(exam.getId(), hall.getId()))
                        .exam(exam)
                        .hall(hall)
                        .createdAt(createdAt)
                        .build());
            }
        }
        return saved;
    }

    /* =============================================================== duties == */

    private void seedDuties(List<User> faculty, List<Exam> exams, Instant now) {
        if (faculty.isEmpty()) return;
        Instant assignedAt = now;
        int sequence = 0;

        for (Exam exam : exams) {
            List<ExamHall> links = examHallRepository.findByExamId(exam.getId());
            if (links.isEmpty()) continue;

            for (int i = 0; i < links.size(); i += 1) {
                sequence += 1;
                User member = faculty.get((i + exam.getId().hashCode()) % faculty.size());
                ExamHall link = links.get(i);

                dutyRepository.save(InvigilationDuty.builder()
                        .id(String.format("D-%04d", sequence))
                        .faculty(member)
                        .exam(exam)
                        .hall(link.getHall())
                        .date(exam.getDate())
                        .startTime(exam.getStartTime())
                        .endTime(exam.getEndTime())
                        .role(i == 0 ? DutyRole.CHIEF_INVIGILATOR : DutyRole.INVIGILATOR)
                        .status(exam.getDate().isBefore(LocalDate.now())
                                ? DutyStatus.COMPLETED : DutyStatus.ASSIGNED)
                        .assignedAt(assignedAt)
                        .build());
            }
        }
    }

    /* ======================================================== notifications == */

    private void seedNotifications(List<User> faculty, Instant now) {
        int sequence = 0;
        for (User member : faculty) {
            sequence += 1;
            notificationRepository.save(Notification.builder()
                    .id(String.format("N-%05d", sequence))
                    .user(member)
                    .type("duty")
                    .title("Welcome to the examination cell")
                    .message(member.getName().split(" ")[0]
                            + ", your invigilation roster for this term is now available.")
                    .href("/faculty/duties")
                    .read(false)
                    .createdAt(now.minusSeconds(3600L * sequence))
                    .build());
        }
    }
}
