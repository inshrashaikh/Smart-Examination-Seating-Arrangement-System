package com.examseat.security;

import com.examseat.dto.seating.GenerateSeatingRequest;
import com.examseat.entity.Exam;
import com.examseat.entity.DutyRole;
import com.examseat.entity.DutyStatus;
import com.examseat.entity.ExamStatus;
import com.examseat.entity.Hall;
import com.examseat.entity.InvigilationDuty;
import com.examseat.entity.Role;
import com.examseat.entity.Student;
import com.examseat.entity.User;
import com.examseat.repository.InvigilationDutyRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import com.examseat.service.SeatingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Minimal, deterministic dataset for the access-control tests: one admin, two
 * faculty, two halls, one exam with a generated plan, and one duty per faculty.
 *
 * <p>Deliberately small. The security assertions care about which hall each person
 * can see, not about volume.</p>
 */
public class DataSeederFixture {

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private SeatingService seatingService;

    public static final String ADMIN = "admin@exam.com";
    public static final String FACULTY_ONE = "faculty1@exam.com";
    public static final String FACULTY_TWO = "faculty2@exam.com";
    public static final String EXAM_ID = "EX-S01";
    public static final String HALL_ONE = "H-S1";
    public static final String HALL_TWO = "H-S2";

    /** Rebuilds the dataset from scratch so every test starts identically. */
    public void seedAccounts() {
        List<InvigilationDuty> duties = dutyRepository.findAll();
        if (!duties.isEmpty()) {
            return; // already seeded
        }

        user(ADMIN, "Admin Person", Role.ADMIN);
        user(FACULTY_ONE, "Faculty One", Role.FACULTY);
        user(FACULTY_TWO, "Faculty Two", Role.FACULTY);

        hall(HALL_ONE, "S-A-1", 3, 4);
        hall(HALL_TWO, "S-A-2", 3, 4);

        String[] departments = {"CSE", "IT"};
        for (int i = 1; i <= 8; i++) {
            studentRepository.save(Student.builder()
                    .id(String.format("S-S%03d", i))
                    .rollNo("SCR" + i)
                    .name("Seeded " + i)
                    .department(departments[i % 2])
                    .year(2)
                    .section("A")
                    .build());
        }

        examRepository.save(Exam.builder()
                .id(EXAM_ID).code(EXAM_ID)
                .title("Security Fixture Exam").subject("Testing")
                .course("B.Tech").date(LocalDate.of(2026, 12, 15))
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(12, 0))
                .durationHours(3).minYear(1)
                .departments(new ArrayList<>(Arrays.asList("CSE", "IT")))
                .years(new ArrayList<>(Arrays.asList(1, 2, 3, 4)))
                .status(ExamStatus.SCHEDULED)
                .build());

        seatingService.generate(GenerateSeatingRequest.builder()
                .examId(EXAM_ID)
                .hallIds(List.of(HALL_ONE, HALL_TWO))
                .rules(GenerateSeatingRequest.SeatingRulesRequest.builder()
                        .strictCapacity(true).seed(11L).build())
                .build());

        dutyRepository.save(duty(FACULTY_ONE, HALL_ONE));
        dutyRepository.save(duty(FACULTY_TWO, HALL_TWO));
    }

    /**
     * Halls the given faculty member supervises.
     *
     * <p>Looks the duty rows up by email rather than filtering {@code findAll()} in
     * memory: the faculty association is lazy, so touching it outside a
     * transaction would fail to initialise.</p>
     */
    public String[] hallsDutiedBy(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> dutyRepository.findByFacultyIdOrderByDateDesc(user.getId()).stream()
                        .map(d -> d.getHall().getId())
                        .toArray(String[]::new))
                .orElse(new String[0]);
    }

    /**
     * The composite plan id of a hall that has a seating plan but is not this
     * person's duty — {@code EX-S01-H-S2}, not the bare hall id, because plans are
     * addressed by the exam-hall pair.
     */
    public String hallNotDutiedBy(String email) {
        List<String> mine = Arrays.asList(hallsDutiedBy(email));
        String hall = List.of(HALL_ONE, HALL_TWO).stream()
                .filter(h -> !mine.contains(h))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hall is excluded for " + email));
        return EXAM_ID + "-" + hall;
    }

    /* ------------------------------------------------------------------ writers */

    @Autowired
    private com.examseat.repository.ExamHallRepository examHallRepository;
    @Autowired
    private com.examseat.repository.ExamRepository examRepository;
    @Autowired
    private com.examseat.repository.HallRepository hallRepository;
    @Autowired
    private InvigilationDutyRepository dutyRepository;
    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private com.examseat.repository.UserRepository userRepository;
    @Autowired
    private SeatAllocationRepository allocationRepository;

    private void user(String email, String name, Role role) {
        userRepository.save(User.builder()
                .id("U-" + email.hashCode())
                .email(email)
                .name(name)
                .password(encoder.encode(email.equals(ADMIN) ? "admin123" : "faculty123"))
                .role(role)
                .department("Computer Science")
                .enabled(true)
                .build());
    }

    private void hall(String id, String code, int rows, int cols) {
        hallRepository.save(Hall.builder()
                .id(id).code(code).name("Fixture Hall " + code)
                .capacity(rows * cols).rowsCount(rows).colsCount(cols)
                .type("LECTURE").board("SMART")
                .build());
    }

    private InvigilationDuty duty(String email, String hallId) {
        return InvigilationDuty.builder()
                .id("D-" + email + "-" + hallId)
                .faculty(userRepository.findByEmailIgnoreCase(email).orElseThrow())
                .exam(examRepository.findById(EXAM_ID).orElseThrow())
                .hall(hallRepository.findById(hallId).orElseThrow())
                .role(DutyRole.INVIGILATOR)
                .date(LocalDate.of(2026, 12, 15))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(12, 0))
                .status(DutyStatus.ASSIGNED)
                .build();
    }
}
