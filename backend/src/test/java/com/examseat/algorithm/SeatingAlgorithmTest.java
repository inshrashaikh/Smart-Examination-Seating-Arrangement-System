package com.examseat.algorithm;

import com.examseat.entity.Exam;
import com.examseat.entity.Hall;
import com.examseat.entity.Student;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Behavioural tests for {@link SeatingAlgorithm}.
 *
 * <p>No Spring context: the engine is a pure function of (exam, halls, students,
 * rules), so plain unit tests cover it fully and run in milliseconds.</p>
 */
class SeatingAlgorithmTest {

    private static final String[] DEPARTMENTS = {"CSE", "IT", "ECE"};

    private final SeatingAlgorithm algorithm = new SeatingAlgorithm();

    /* ======================================================== happy path ====== */

    @Test
    @DisplayName("seats every eligible student exactly once when capacity allows")
    void seatsEveryoneOnce() {
        Exam exam = exam("EX-T1");
        List<Hall> halls = List.of(hall("H-1", "A-101", 6, 6));
        List<Student> students = students(36, DEPARTMENTS);

        SeatingResult result = algorithm.allocate(exam, halls, students, SeatingRules.defaults());

        assertThat(result.getTotalSeated()).isEqualTo(36);
        assertThat(result.getUnallocated()).isZero();
        assertThat(result.getClashCount()).isZero();
        assertThat(result.getHalls()).hasSize(1);
        assertThat(distinctStudentsIn(result)).hasSize(36);
    }

    @Test
    @DisplayName("a two-department exam produces a clean grid: no clashes, no adjacency violations")
    void twoDepartmentsAreClean() {
        Exam exam = exam("EX-T2");
        List<Hall> halls = List.of(hall("H-1", "A-101", 6, 6), hall("H-2", "A-102", 5, 6));
        List<Student> students = students(60, new String[]{"CSE", "IT"});

        SeatingResult result = algorithm.allocate(exam, halls, students, SeatingRules.defaults());

        assertThat(result.isClean()).isTrue();
        assertThat(result.getClashCount()).isZero();
        assertThat(result.getTotalSeated()).isEqualTo(60);
        assertThat(result.getHalls()).allSatisfy(hall -> {
            assertThat(hall.getVerification().getAdjacentSameDept())
                    .as("adjacency violations in %s", hall.getHallCode()).isZero();
            assertThat(hall.getVerification().getClashes()).isZero();
        });
        // A two-department exam must fall back to a checkerboard, which always puts
        // same-department students on the diagonals. The diagonal penalty is capped
        // at 50% precisely so such a plan floors at 90 instead of being punished.
        assertThat(result.getScore()).isEqualTo(90);
        assertThat(result.getHalls()).allSatisfy(hall ->
                assertThat(hall.getVerification().getDiagonalSameDept()).isPositive());
    }

    @Test
    @DisplayName("spills into a second hall rather than double-booking the first")
    void spillsAcrossHalls() {
        Exam exam = exam("EX-T3");
        List<Hall> halls = List.of(hall("H-1", "A-101", 3, 4), hall("H-2", "B-101", 6, 6));
        List<Student> students = students(40, DEPARTMENTS);

        SeatingResult result = algorithm.allocate(exam, halls, students, SeatingRules.defaults());

        assertThat(result.getTotalSeated()).isEqualTo(40);
        assertThat(result.getHalls()).hasSize(2);
        assertThat(distinctStudentsIn(result)).hasSize(40);
        // Smallest hall fills first so the tight fit is not wasted.
        assertThat(result.getHalls().get(0).getHallId()).isEqualTo("H-1");
        assertThat(result.getHalls().get(0).getAllocated()).isEqualTo(12);
    }

    @Test
    @DisplayName("returns a plan for every selected hall, leaving the surplus ones empty")
    void leavesTrailingHallsEmpty() {
        Exam exam = exam("EX-T4");
        List<Hall> halls = List.of(hall("H-1", "A-101", 5, 5), hall("H-2", "B-101", 6, 6),
                hall("H-3", "C-001", 6, 6));
        List<Student> students = students(20, DEPARTMENTS);

        SeatingResult result = algorithm.allocate(exam, halls, students, SeatingRules.defaults());

        assertThat(result.getTotalSeated()).isEqualTo(20);
        // All three halls get an entry so the UI can render every grid it asked for.
        assertThat(result.getHalls()).hasSize(3);
        assertThat(result.getHalls()).extracting(HallAllocation::getAllocated)
                .containsExactly(20, 0, 0);
        assertThat(result.getHalls().get(1).getGrid()).hasSize(6);
    }

    /* ==================================================== determinism ========= */

    @Test
    @DisplayName("same inputs produce an identical plan")
    void isDeterministic() {
        Exam exam = exam("EX-T5");
        List<Hall> halls = List.of(hall("H-1", "A-101", 5, 6), hall("H-2", "A-102", 4, 6));
        List<Student> students = students(48, DEPARTMENTS);

        SeatingResult first = algorithm.allocate(exam, halls, students, SeatingRules.defaults());
        SeatingResult second = algorithm.allocate(exam, halls, students, SeatingRules.defaults());

        assertThat(layout(first)).isEqualTo(layout(second));
    }

    @Test
    @DisplayName("an explicit seed makes the plan independent of the caller")
    void explicitSeedIsRespected() {
        Exam exam = exam("EX-T6");
        List<Hall> halls = List.of(hall("H-1", "A-101", 5, 6));
        List<Student> students = students(30, DEPARTMENTS);

        SeatingResult a = algorithm.allocate(exam, halls, students,
                SeatingRules.builder().seed(4242L).build());
        SeatingResult b = algorithm.allocate(exam, halls, students,
                SeatingRules.builder().seed(4242L).build());
        SeatingResult c = algorithm.allocate(exam, halls, students,
                SeatingRules.builder().seed(99L).build());

        assertThat(layout(a)).isEqualTo(layout(b));
        assertThat(layout(a)).isNotEqualTo(layout(c));
    }

    /* ================================================ capacity behaviour ====== */

    @Test
    @DisplayName("strictCapacity throws when the halls are too small")
    void strictCapacityThrows() {
        Exam exam = exam("EX-T7");
        List<Hall> halls = List.of(hall("H-1", "A-101", 3, 4)); // 12 seats
        List<Student> students = students(20, DEPARTMENTS);

        assertThatThrownBy(() -> algorithm.allocate(exam, halls, students, SeatingRules.defaults()))
                .isInstanceOf(InsufficientCapacityException.class)
                .hasMessageContaining("20")
                .hasMessageContaining("12");
    }

    @Test
    @DisplayName("strictCapacity=false seats what fits and reports the rest")
    void relaxedCapacityReportsLeftovers() {
        Exam exam = exam("EX-T8");
        List<Hall> halls = List.of(hall("H-1", "A-101", 3, 4)); // 12 seats
        List<Student> students = students(20, DEPARTMENTS);

        SeatingResult result = algorithm.allocate(exam, halls, students,
                SeatingRules.builder().strictCapacity(false).build());

        assertThat(result.getTotalSeated()).isEqualTo(12);
        assertThat(result.getUnallocated()).isEqualTo(8);
        assertThat(result.getUnallocatedStudents()).hasSize(8);
        assertThat(result.getUnallocatedStudents())
                .allSatisfy(row -> assertThat(row.getReason()).isNotBlank());
        assertThat(distinctStudentsIn(result)).hasSize(12);
    }

    @Test
    @DisplayName("blocked seats are never allocated and shrink usable capacity")
    void blockedSeatsAreSkipped() {
        Exam exam = exam("EX-T9");
        Hall hall = hall("H-1", "A-101", 3, 4);
        hall.setBlockedSeats(List.of(
                Hall.BlockedSeat.builder().row(0).col(0).reason("Broken").build(),
                Hall.BlockedSeat.builder().row(2).col(3).reason("Broken").build()));

        SeatingResult result = algorithm.allocate(exam, List.of(hall), students(10, DEPARTMENTS),
                SeatingRules.defaults());

        HallAllocation plan = result.getHalls().get(0);
        assertThat(plan.getCapacity()).isEqualTo(12);
        assertThat(plan.getBlocked()).isEqualTo(2);
        assertThat(plan.getUsable()).isEqualTo(10);
        assertThat(result.getTotalSeated()).isEqualTo(10);
        assertThat(plan.getGrid().get(0).get(0).isOccupied()).isFalse();
        assertThat(plan.getGrid().get(2).get(3).isOccupied()).isFalse();
    }

    @Test
    @DisplayName("blocked seats count against the strict-capacity check")
    void blockedSeatsTriggerStrictFailure() {
        Exam exam = exam("EX-T10");
        Hall hall = hall("H-1", "A-101", 3, 4);
        hall.setBlockedSeats(List.of(
                Hall.BlockedSeat.builder().row(0).col(0).reason("Broken").build()));

        assertThatThrownBy(() -> algorithm.allocate(exam, List.of(hall), students(12, DEPARTMENTS),
                SeatingRules.defaults()))
                .isInstanceOf(InsufficientCapacityException.class);
    }

    /* ==================================================== rule toggles ========= */

    @Test
    @DisplayName("keepLastRowClear leaves the rear row empty")
    void keepLastRowClear() {
        Exam exam = exam("EX-T11");
        Hall hall = hall("H-1", "A-101", 5, 6); // 30 seats, 24 usable with the rule on

        SeatingResult result = algorithm.allocate(exam, List.of(hall), students(24, DEPARTMENTS),
                SeatingRules.builder().keepLastRowClear(true).build());

        List<SeatCell> lastRow = result.getHalls().get(0).getGrid().get(4);
        assertThat(lastRow).allSatisfy(cell -> assertThat(cell.isOccupied()).isFalse());
        assertThat(result.getTotalSeated()).isEqualTo(24);
    }

    @Test
    @DisplayName("avoidSameDeptAdjacent=false allows adjacent same-department students")
    void adjacencyRuleCanBeRelaxed() {
        Exam exam = exam("EX-T12");
        Hall hall = hall("H-1", "A-101", 5, 6);
        List<Student> students = students(30, new String[]{"CSE", "IT"});

        SeatingResult relaxed = algorithm.allocate(exam, List.of(hall), students,
                SeatingRules.builder()
                        .avoidSameDeptAdjacent(false)
                        .avoidSameDeptDiagonal(false)
                        .mixDepartments(false)
                        .build());

        assertThat(relaxed.getTotalSeated()).isEqualTo(30);
        // No constraint at all means same-department neighbours are expected.
        assertThat(relaxed.getHalls().get(0).getVerification().getAdjacentSameDept()).isPositive();
    }

    @Test
    @DisplayName("mixDepartments=true spreads departments more evenly than block filling")
    void mixDepartmentsSpreadsTheMix() {
        Exam exam = exam("EX-T13");
        Hall hall = hall("H-1", "A-101", 6, 6);

        SeatingResult mixed = algorithm.allocate(exam, List.of(hall), students(36, DEPARTMENTS),
                SeatingRules.builder().mixDepartments(true).build());
        SeatingResult blocked = algorithm.allocate(exam, List.of(hall), students(36, DEPARTMENTS),
                SeatingRules.builder().mixDepartments(false).build());

        assertThat(mixed.getHalls().get(0).getVerification().getAdjacentSameDept())
                .isLessThanOrEqualTo(blocked.getHalls().get(0).getVerification().getAdjacentSameDept());
    }

    /* ==================================================== verification ========= */

    @Test
    @DisplayName("verify counts a hand-built grid exactly")
    void verifyCountsHandBuiltGrid() {
        List<List<SeatCell>> grid = gridOf(
                //  row 0: A1 CSE, B1 CSE  -> one adjacency violation
                //  row 1: A2 IT,  B2 ECE
                cell(0, 0, "S-1", "CSE", 2),
                cell(0, 1, "S-2", "CSE", 3),
                cell(1, 0, "S-3", "IT", 2),
                cell(1, 1, "S-4", "ECE", 4));

        VerificationResult result = algorithm.verify(grid, 2, 2);

        assertThat(result.getClashes()).isZero();
        assertThat(result.getUniqueStudents()).isEqualTo(4);
        assertThat(result.getAdjacentSameDept()).isEqualTo(1);           // S-1 next to S-2
        assertThat(result.getAdjacentSameYear()).isEqualTo(1);            // S-1 (2) next to S-3 (2)
        assertThat(result.getDiagonalSameDept()).isZero();
        assertThat(result.getComparableEdges()).isEqualTo(4);
        assertThat(result.isClean()).isFalse();
    }

    @Test
    @DisplayName("verify flags a student seated twice as a clash")
    void verifyDetectsClashes() {
        List<List<SeatCell>> grid = gridOf(
                cell(0, 0, "S-1", "CSE", 2),
                cell(0, 1, "S-1", "CSE", 2));

        VerificationResult result = algorithm.verify(grid, 1, 2);

        assertThat(result.getClashes()).isEqualTo(1);
        assertThat(result.getUniqueStudents()).isEqualTo(1);
        assertThat(result.isClean()).isFalse();
        assertThat(result.getScore()).isLessThan(100);
    }

    @Test
    @DisplayName("verify scores a fully clean grid at 100")
    void verifyScoresCleanGrid() {
        // Four distinct departments means no shared department anywhere, not even
        // diagonally, so nothing is penalised.
        List<List<SeatCell>> grid = gridOf(
                cell(0, 0, "S-1", "CSE", 2),
                cell(0, 1, "S-2", "IT", 3),
                cell(1, 0, "S-3", "ECE", 4),
                cell(1, 1, "S-4", "MECH", 3));

        VerificationResult result = algorithm.verify(grid, 2, 2);

        assertThat(result.getAdjacentSameDept()).isZero();
        assertThat(result.getDiagonalSameDept()).isZero();
        assertThat(result.getClashes()).isZero();
        assertThat(result.getScore()).isEqualTo(100);
        assertThat(result.isClean()).isTrue();
    }

    /* ==================================================== labels ============== */

    @Test
    @DisplayName("seat labels are letter + one-based column")
    void seatLabels() {
        assertThat(SeatingAlgorithm.seatLabel(0, 0)).isEqualTo("A1");
        assertThat(SeatingAlgorithm.seatLabel(0, 5)).isEqualTo("A6");
        assertThat(SeatingAlgorithm.seatLabel(2, 3)).isEqualTo("C4");
        assertThat(SeatingAlgorithm.seatLabel(25, 0)).isEqualTo("Z1");
    }

    /* ==================================================== edge cases =========== */

    @Test
    @DisplayName("an empty hall list is rejected up front")
    void emptyHallListIsRejected() {
        assertThatThrownBy(() -> algorithm.allocate(exam("EX-T14"), List.of(),
                students(5, DEPARTMENTS), SeatingRules.defaults()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least one hall");
    }

    @Test
    @DisplayName("no eligible students produces an empty plan rather than an error")
    void noStudentsProducesEmptyPlan() {
        SeatingResult result = algorithm.allocate(exam("EX-T15"),
                List.of(hall("H-1", "A-101", 4, 4)), List.of(), SeatingRules.defaults());

        assertThat(result.getTotalSeated()).isZero();
        assertThat(result.getUnallocated()).isZero();
        assertThat(result.getHalls()).hasSize(1);
        assertThat(result.getHalls().get(0).getAllocated()).isZero();
    }

    @Test
    @DisplayName("a single-department exam fills every seat")
    void singleDepartmentFillsHall() {
        SeatingResult result = algorithm.allocate(exam("EX-T16"),
                List.of(hall("H-1", "A-101", 4, 5)), students(20, new String[]{"CSE"}),
                SeatingRules.defaults());

        assertThat(result.getTotalSeated()).isEqualTo(20);
        // Adjacency violations are unavoidable when there is only one department,
        // but the engine must still fill the hall and never double-book anyone.
        assertThat(result.getClashCount()).isZero();
        assertThat(distinctStudentsIn(result)).hasSize(20);
    }

    /* ==================================================== helpers ============== */

    private static Exam exam(String id) {
        return Exam.builder()
                .id(id).code(id)
                .title("Seating Algorithm Test")
                .subject("Testing")
                .departments(new ArrayList<>(List.of(DEPARTMENTS)))
                .build();
    }

    private static Hall hall(String id, String code, int rows, int cols) {
        return Hall.builder()
                .id(id).code(code).name("Hall " + code)
                .rowsCount(rows).colsCount(cols)
                .capacity(rows * cols)
                .blockedSeats(new ArrayList<>())
                .build();
    }

    /** Evenly spreads {@code count} students across the supplied departments. */
    private static List<Student> students(int count, String[] departments) {
        List<Student> students = new ArrayList<>(count);
        for (int i = 0; i < count; i += 1) {
            String department = departments[i % departments.length];
            students.add(Student.builder()
                    .id(String.format("S-%04d", i + 1))
                    .rollNo(String.format("%s%04d", department, i + 1))
                    .name("Student " + (i + 1))
                    .department(department)
                    .year(2 + (i % 3))
                    .section("A")
                    .build());
        }
        return students;
    }

    private static Set<String> distinctStudentsIn(SeatingResult result) {
        Set<String> ids = new HashSet<>();
        for (HallAllocation hall : result.getHalls()) {
            for (List<SeatCell> row : hall.getGrid()) {
                for (SeatCell cell : row) {
                    if (cell.isOccupied()) ids.add(cell.getStudentId());
                }
            }
        }
        return ids;
    }

    /** Flattened "hall/row/col:studentId" fingerprint used for determinism checks. */
    private static String layout(SeatingResult result) {
        StringBuilder sb = new StringBuilder();
        for (HallAllocation hall : result.getHalls()) {
            for (List<SeatCell> row : hall.getGrid()) {
                for (SeatCell cell : row) {
                    sb.append(hall.getHallId()).append('/').append(cell.getLabel())
                            .append('=').append(cell.getStudentId()).append(';');
                }
            }
        }
        return sb.toString();
    }

    private static List<List<SeatCell>> gridOf(SeatCell... cells) {
        int rows = 0;
        int cols = 0;
        for (SeatCell cell : cells) {
            rows = Math.max(rows, cell.getRow() + 1);
            cols = Math.max(cols, cell.getCol() + 1);
        }
        List<List<SeatCell>> grid = new ArrayList<>(rows);
        for (int r = 0; r < rows; r += 1) {
            List<SeatCell> row = new ArrayList<>(java.util.Collections.nCopies(cols, null));
            grid.add(row);
        }
        for (SeatCell cell : cells) {
            grid.get(cell.getRow()).set(cell.getCol(), cell);
        }
        return grid;
    }

    private static SeatCell cell(int row, int col, String studentId, String department, int year) {
        return SeatCell.builder()
                .row(row).col(col)
                .label(SeatingAlgorithm.seatLabel(row, col))
                .studentId(studentId)
                .name(studentId)
                .rollNo(studentId)
                .department(department)
                .year(year)
                .build();
    }
}
