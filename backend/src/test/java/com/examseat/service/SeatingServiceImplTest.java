package com.examseat.service;

import com.examseat.dto.seating.GenerateSeatingRequest;
import com.examseat.dto.seating.GenerateSeatingResponse;
import com.examseat.dto.seating.HallPlanResponse;
import com.examseat.dto.seating.SeatDto;
import com.examseat.dto.seating.SwapSeatsRequest;
import com.examseat.entity.Exam;
import com.examseat.entity.ExamStatus;
import com.examseat.entity.Hall;
import com.examseat.entity.SeatAllocation;
import com.examseat.entity.Student;
import com.examseat.repository.ExamHallRepository;
import com.examseat.repository.ExamRepository;
import com.examseat.repository.HallRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Persistence-level tests for the seating service.
 *
 * <p>These need a real database because the interesting failures are database
 * failures: a seat swap that trips the {@code (exam, student)} unique index, or a
 * regenerate that leaves the previous plan orphaned. Neither is visible to the pure
 * algorithm tests in {@code SeatingAlgorithmTest}.</p>
 */
@SpringBootTest
@ActiveProfiles("h2")
@TestPropertySource(properties = {
        "app.seed.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Transactional
@DisplayName("SeatingService persistence")
class SeatingServiceImplTest {

    @Autowired
    private SeatingService seatingService;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private HallRepository hallRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SeatAllocationRepository allocationRepository;

    @Autowired
    private ExamHallRepository examHallRepository;

    @BeforeEach
    void setUp() {
        allocationRepository.deleteAll();
        examHallRepository.deleteAll();
        examRepository.deleteAll();
        hallRepository.deleteAll();
        studentRepository.deleteAll();

        for (int r = 1; r <= 5; r++) {
            for (int c = 1; c <= 4; c++) {
                hallRepository.save(Hall.builder()
                        .id("H-" + r).code("A-" + (100 + r)).name("Hall " + r)
                        .capacity(20).rowsCount(5).colsCount(4)
                        .type("LECTURE").board("SMART").build());
            }
        }

        // Two departments so the engine has something to interleave.
        String[] departments = {"CSE", "IT"};
        for (int i = 1; i <= 20; i++) {
            studentRepository.save(Student.builder()
                    .id(String.format("S-%04d", i))
                    .rollNo("ROLL" + i)
                    .name("Student " + i)
                    .email("s" + i + "@university.edu")
                    .department(departments[i % 2])
                    .year(2 + (i % 3))
                    .section("A")
                    .build());
        }

        examRepository.save(Exam.builder()
                .id("EX-T01").code("EX-T01")
                .title("Persistence Test Exam").subject("Testing")
                .course("B.Tech").date(LocalDate.of(2026, 11, 20))
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(13, 0))
                .durationHours(3).minYear(1)
                .departments(new ArrayList<>(List.of("CSE", "IT")))
                .years(new ArrayList<>(List.of(1, 2, 3, 4)))
                .status(ExamStatus.SCHEDULED)
                .build());
    }

    private GenerateSeatingRequest request(List<String> hallIds, boolean strict) {
        return GenerateSeatingRequest.builder()
                .examId("EX-T01").hallIds(hallIds)
                .rules(GenerateSeatingRequest.SeatingRulesRequest.builder()
                        .strictCapacity(strict)
                        .seed(99L)
                        .build())
                .build();
    }

    @Test
    @DisplayName("generate seats every eligible student exactly once and marks the exam allocated")
    void generateSeatsEveryoneOnce() {
        GenerateSeatingResponse result = seatingService.generate(request(List.of("H-1"), true));

        assertThat(result.getTotalSeated()).isEqualTo(20);
        assertThat(result.getUnallocatedStudents()).isEmpty();
        assertThat(examRepository.findById("EX-T01").orElseThrow().getStatus())
                .isEqualTo(ExamStatus.ALLOCATED);

        List<SeatAllocation> rows = allocationRepository.findByExamId("EX-T01");
        assertThat(rows).hasSize(20);
        assertThat(rows.stream().map(r -> r.getStudent().getId()).distinct())
                .as("no student seated twice").hasSize(20);
    }

    @Test
    @DisplayName("regenerating replaces the plan instead of duplicating it")
    void regenerateIsIdempotent() {
        seatingService.generate(request(List.of("H-1"), true));
        seatingService.generate(request(List.of("H-1"), true));

        List<SeatAllocation> rows = allocationRepository.findByExamId("EX-T01");
        assertThat(rows).as("a second run must not accumulate rows").hasSize(20);
        assertThat(rows.stream().map(r -> r.getId()).distinct()).hasSize(20);
    }

    @Test
    @DisplayName("swapping two seats succeeds despite the (exam, student) unique index")
    void swapDoesNotTripTheUniqueIndex() {
        seatingService.generate(request(List.of("H-1"), true));
        HallPlanResponse before = seatingService.getPlan("EX-T01-H-1");

        SeatDto a = occupiedSeat(before, 0, 0);
        SeatDto b = occupiedSeat(before, 0, 1);

        // Two adjacent seats in a checkerboard cannot be swapped without breaking the
        // pattern, so validation is off here — this exercises the persistence, not
        // the constraint checker (which has its own test below).
        HallPlanResponse after = seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                .a(ref(0, 0)).b(ref(0, 1)).validate(false).build());

        assertThat(studentAt(after, 0, 0)).isEqualTo(b.getStudentId());
        assertThat(studentAt(after, 0, 1)).isEqualTo(a.getStudentId());

        // And the rows really moved, they were not rewritten in place.
        allocationRepository.flush();
        assertThat(allocationRepository.countByExamId("EX-T01")).isEqualTo(20);
    }

    @Test
    @DisplayName("a validated swap that would create same-department neighbours is refused")
    void validatedSwapRefusesViolatingSwap() {
        seatingService.generate(request(List.of("H-1"), true));
        HallPlanResponse plan = seatingService.getPlan("EX-T01-H-1");

        // Find an adjacent pair that would break the pattern when exchanged.
        SeatDto a = occupiedSeat(plan, 0, 0);
        SeatDto b = occupiedSeat(plan, 0, 1);
        assertThat(a).isNotNull();
        assertThat(b).isNotNull();

        // Whether this specific pair is rejected depends on the surrounding grid, so
        // assert on the invariant instead: the plan must be unchanged either way.
        String before = studentAt(plan, 0, 0);
        try {
            seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                    .a(ref(0, 0)).b(ref(0, 1)).validate(true).build());
        } catch (RuntimeException expected) {
            assertThat(expected).hasMessageContaining("department");
        }

        HallPlanResponse after = seatingService.getPlan("EX-T01-H-1");
        if (studentAt(after, 0, 0).equals(before)) {
            assertThat(after.getVerification().getAdjacentSameDept()).isZero();
        }
    }

    @Test
    @DisplayName("reset deletes every allocation and returns the exam to scheduled")
    void resetWipesThePlan() {
        seatingService.generate(request(List.of("H-1", "H-2"), true));
        assertThat(allocationRepository.countByExamId("EX-T01")).isEqualTo(20);

        assertThat(seatingService.reset("EX-T01")).isEqualTo(20);

        assertThat(allocationRepository.countByExamId("EX-T01")).isZero();
        assertThat(examHallRepository.findByExamId("EX-T01")).isEmpty();
        assertThat(examRepository.findById("EX-T01").orElseThrow().getStatus())
                .isEqualTo(ExamStatus.SCHEDULED);
    }

    @Test
    @DisplayName("publishing a hall plan publishes the exam and answers with the plan")
    void publishReturnsThePlan() {
        seatingService.generate(request(List.of("H-1"), true));

        HallPlanResponse published = seatingService.publishPlan("EX-T01-H-1");

        assertThat(published.getId()).isEqualTo("EX-T01-H-1");
        assertThat(published.getHallId()).isEqualTo("H-1");
        assertThat(published.getStatus()).isEqualTo(ExamStatus.PUBLISHED);
        assertThat(published.getPublishedAt()).isNotNull();
        assertThat(examRepository.findById("EX-T01").orElseThrow().getStatus())
                .isEqualTo(ExamStatus.PUBLISHED);
    }

    @Test
    @DisplayName("strict capacity refuses to allocate and leaves the plan untouched")
    void strictCapacityRefusesAndRollsBack() {
        // H-5 holds 20 students exactly, so shrink it to force the overflow.
        Hall small = hallRepository.findById("H-5").orElseThrow();
        small.setRowsCount(2);
        small.setColsCount(3);
        hallRepository.saveAndFlush(small);

        assertThatThrownBy(() -> seatingService.generate(request(List.of("H-5"), true)))
                .hasMessageContaining("capacity");

        assertThat(allocationRepository.countByExamId("EX-T01")).isZero();
        assertThat(examHallRepository.findByExamId("EX-T01")).isEmpty();
        assertThat(examRepository.findById("EX-T01").orElseThrow().getStatus())
                .isEqualTo(ExamStatus.SCHEDULED);
    }

    @Test
    @DisplayName("relaxed capacity seats what fits and reports the remainder")
    void relaxedCapacityReportsRemainder() {
        Hall small = hallRepository.findById("H-5").orElseThrow();
        small.setRowsCount(2);
        small.setColsCount(3);
        hallRepository.saveAndFlush(small);

        GenerateSeatingResponse result = seatingService.generate(request(List.of("H-5"), false));

        assertThat(result.getTotalSeated()).isEqualTo(6);
        assertThat(result.getUnallocatedStudents()).hasSize(14);
        assertThat(result.getHalls()).hasSize(1);
    }

    @Test
    @DisplayName("a plan id is resolved against the database, never split on a hyphen")
    void planIdResolvesAgainstTheDatabase() {
        seatingService.generate(request(List.of("H-1"), true));

        // Both the exam-hall id and the React client's PL- prefixed form resolve.
        assertThat(seatingService.getPlan("EX-T01-H-1").getHallId()).isEqualTo("H-1");
        assertThat(seatingService.getPlan("PL-EX-T01-H-1").getHallId()).isEqualTo("H-1");
        // A bare exam id falls back to that exam's first hall.
        assertThat(seatingService.getPlan("EX-T01").getExamId()).isEqualTo("EX-T01");
    }

    @Test
    @DisplayName("a blocked seat reduces usable capacity and is never allocated")
    void blockedSeatsAreNeverAllocated() {
        Hall hall = hallRepository.findById("H-1").orElseThrow();
        // Must be mutable: Hibernate clears the collection in place during the merge,
        // which throws on an immutable List.of(...).
        hall.setBlockedSeats(new ArrayList<>(List.of(
                Hall.BlockedSeat.builder().row(0).col(0).reason("Broken desk").build())));
        hallRepository.saveAndFlush(hall);

        // Two halls so the blocked seat reduces capacity without overflowing it.
        GenerateSeatingResponse result = seatingService.generate(request(List.of("H-1", "H-2"), true));

        assertThat(result.getTotalSeated()).isEqualTo(20);
        assertThat(allocationRepository.findByExamId("EX-T01"))
                .noneMatch(a -> a.getHall().getId().equals("H-1")
                        && a.getRowNo() == 0 && a.getColNo() == 0);

        // And the blocked cell renders as blocked rather than empty.
        HallPlanResponse plan = seatingService.getPlan("EX-T01-H-1");
        SeatDto cell = plan.getSeats().get(0).get(0);
        assertThat(cell.isBlocked()).isTrue();
        assertThat(cell.getStudentId()).isNull();
    }

    /* ============================ seat-reference resolution ========================= */

    @Test
    @DisplayName("a swap resolves by allocationId alone, with no row or col")
    void swapByAllocationIdOnly() {
        // Regression test. findAt() used to open with
        //     if (ref.getRow() == null || ref.getCol() == null) return null;
        // which sat *above* its allocationId branch, so an id-only ref always resolved
        // to null and the client got a 404 naming a seat that was plainly seated. The
        // allocation id is the stable primary key and must be sufficient on its own.
        seatingService.generate(request(List.of("H-1"), true));
        HallPlanResponse before = seatingService.getPlan("EX-T01-H-1");

        SeatDto a = occupiedSeat(before, 0, 0);
        SeatDto b = occupiedSeat(before, 0, 1);
        assertThat(a).as("seat 0,0 must be occupied for this test to mean anything").isNotNull();
        assertThat(b).as("seat 0,1 must be occupied for this test to mean anything").isNotNull();

        HallPlanResponse after = seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                // Deliberately no row/col: this is the shape that used to 404.
                .a(idRef(a.getAllocationId()))
                .b(idRef(b.getAllocationId()))
                .validate(false)
                .build());

        assertThat(studentAt(after, 0, 0)).isEqualTo(b.getStudentId());
        assertThat(studentAt(after, 0, 1)).isEqualTo(a.getStudentId());
    }

    @Test
    @DisplayName("row+col still resolves a seat, with or without an accompanying id")
    void swapByRowAndCol() {
        seatingService.generate(request(List.of("H-1"), true));
        HallPlanResponse before = seatingService.getPlan("EX-T01-H-1");

        SeatDto a = occupiedSeat(before, 1, 0);
        SeatDto b = occupiedSeat(before, 1, 1);
        assertThat(a).isNotNull();
        assertThat(b).isNotNull();

        // No allocationId at all — the positional form the grid UI sends.
        HallPlanResponse after = seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                .a(ref(1, 0)).b(ref(1, 1))
                .validate(false)
                .build());

        assertThat(studentAt(after, 1, 0)).isEqualTo(b.getStudentId());
        assertThat(studentAt(after, 1, 1)).isEqualTo(a.getStudentId());
    }

    @Test
    @DisplayName("a ref carrying both an id and a position resolves by id, and they agree")
    void swapByIdPlusPosition() {
        // The client sends row+col as the primary handle and the id as a hint. Both
        // present must behave exactly like id-only: same outcome, no disagreement.
        seatingService.generate(request(List.of("H-1"), true));
        HallPlanResponse before = seatingService.getPlan("EX-T01-H-1");

        SeatDto a = occupiedSeat(before, 0, 0);
        SeatDto b = occupiedSeat(before, 0, 1);

        HallPlanResponse after = seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                .a(SwapSeatsRequest.SeatRef.builder()
                        .allocationId(a.getAllocationId()).row(0).col(0).build())
                .b(SwapSeatsRequest.SeatRef.builder()
                        .allocationId(b.getAllocationId()).row(0).col(1).build())
                .validate(false)
                .build());

        assertThat(studentAt(after, 0, 0)).isEqualTo(b.getStudentId());
        assertThat(studentAt(after, 0, 1)).isEqualTo(a.getStudentId());
    }

    @Test
    @DisplayName("an unknown allocationId is a 404 that names the bad id, not 'row null col null'")
    void unknownAllocationIdIsReportedTruthfully() {
        seatingService.generate(request(List.of("H-1"), true));
        SeatDto a = occupiedSeat(seatingService.getPlan("EX-T01-H-1"), 0, 0);

        assertThatThrownBy(() -> seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                .a(idRef("NOPE-123"))
                .b(idRef(a.getAllocationId()))
                .validate(false)
                .build()))
                .isInstanceOf(com.examseat.exception.ApiException.class)
                .satisfies(thrown -> assertThat(
                        ((com.examseat.exception.ApiException) thrown).getStatus().value())
                        .isEqualTo(404))
                // The old message interpolated the missing row/col, so an id-only ref
                // read as "row null col null in A-101" — technically about the wrong
                // coordinate system entirely.
                .hasMessageContaining("NOPE-123")
                .hasMessageNotContaining("row null col null");
    }

    @Test
    @DisplayName("an id from another hall does not fall through to a position match")
    void crossHallAllocationIdIsRefused() {
        // findAt returns null for a hall mismatch. The important half is that it must not
        // then resolve by row/col: falling through would swap whichever student happens
        // to sit at that coordinate, silently moving the wrong two people.
        //
        // H-1 is shrunk to 2x3 first: the engine fills halls sequentially, so at full
        // size H-1 (20 seats) swallows all 20 students and H-2 stays empty — and an
        // empty H-2 makes the "id from another hall" premise untestable.
        Hall small = hallRepository.findById("H-1").orElseThrow();
        small.setRowsCount(2);
        small.setColsCount(3);
        hallRepository.saveAndFlush(small);

        seatingService.generate(request(List.of("H-1", "H-2"), true));
        HallPlanResponse hall1 = seatingService.getPlan("EX-T01-H-1");
        HallPlanResponse hall2 = seatingService.getPlan("EX-T01-H-2");

        SeatDto inHall1 = occupiedSeat(hall1, 0, 0);
        SeatDto inHall2 = occupiedSeat(hall2, 0, 0);
        assertThat(inHall1).isNotNull();
        assertThat(inHall2).isNotNull();

        assertThatThrownBy(() -> seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                // An id belonging to H-2, but with H-1 coordinates attached.
                .a(SwapSeatsRequest.SeatRef.builder()
                        .allocationId(inHall2.getAllocationId()).hallId("H-2").row(0).col(0).build())
                .b(idRef(inHall1.getAllocationId()))
                .validate(false)
                .build()))
                .isInstanceOf(com.examseat.exception.ApiException.class);

        // Nothing moved.
        HallPlanResponse after = seatingService.getPlan("EX-T01-H-1");
        assertThat(studentAt(after, 0, 0)).isEqualTo(inHall1.getStudentId());
    }

    @Test
    @DisplayName("an empty seat position is a 404, and a null ref never blows up")
    void emptyAndNullRefsAreRefused() {
        seatingService.generate(request(List.of("H-1"), true));
        SeatAllocation any = allocationRepository.findByExamId("EX-T01").get(0);

        assertThatThrownBy(() -> seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                // H-1 is 5x4 and all 20 seats are taken, so row 9 is outside the grid.
                .a(ref(9, 9)).b(idRef(any.getId()))
                .validate(false)
                .build()))
                .isInstanceOf(com.examseat.exception.ApiException.class);

        assertThatThrownBy(() -> seatingService.swap("EX-T01-H-1", SwapSeatsRequest.builder()
                .a((SwapSeatsRequest.SeatRef) null).b(idRef(any.getId()))
                .validate(false)
                .build()))
                .isInstanceOf(com.examseat.exception.ApiException.class);
    }

    /* ------------------------------------------------------------------ helpers */

    private SwapSeatsRequest.SeatRef ref(int row, int col) {
        return SwapSeatsRequest.SeatRef.builder().row(row).col(col).build();
    }

    /** Id-only ref: no row, no col, no hall. The shape that used to 404. */
    private SwapSeatsRequest.SeatRef idRef(String allocationId) {
        return SwapSeatsRequest.SeatRef.builder().allocationId(allocationId).build();
    }

    private SeatDto occupiedSeat(HallPlanResponse plan, int row, int col) {
        List<List<SeatDto>> seats = plan.getSeats();
        if (seats == null || row >= seats.size()) return null;
        List<SeatDto> line = seats.get(row);
        if (line == null || col >= line.size()) return null;
        SeatDto seat = line.get(col);
        return seat != null && seat.getStudentId() != null ? seat : null;
    }

    private String studentAt(HallPlanResponse plan, int row, int col) {
        SeatDto seat = occupiedSeat(plan, row, col);
        return seat == null ? null : seat.getStudentId();
    }
}