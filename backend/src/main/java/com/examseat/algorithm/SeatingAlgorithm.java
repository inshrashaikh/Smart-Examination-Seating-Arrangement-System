package com.examseat.algorithm;

import com.examseat.entity.Exam;
import com.examseat.entity.Hall;
import com.examseat.entity.Student;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;

/**
 * Constraint-based seat allocation engine.
 *
 * <p>Students are bucketed per department, then halls are filled row by row. For
 * every seat the engine picks the department with the most students left that does
 * not clash with the already-placed left / front / back (and optionally diagonal)
 * neighbours. When no department satisfies the constraint it degrades gracefully by
 * choosing the department that sits furthest from the occupied neighbours, which
 * keeps a checkerboard pattern intact instead of collapsing into blocks.</p>
 */
@Component
public class SeatingAlgorithm {

    /** Letter prefix used by seat labels — A1, B1, C2 ... */
    public static String seatLabel(int row, int col) {
        return String.valueOf((char) ('A' + row)) + (col + 1);
    }

    /**
     * Runs the whole allocation.
     *
     * @throws InsufficientCapacityException when strict capacity is on and the
     *                                        halls cannot hold every eligible student
     */
    public SeatingResult allocate(Exam exam, List<Hall> halls, List<Student> eligible, SeatingRules rules) {
        if (halls == null || halls.isEmpty()) {
            throw new IllegalArgumentException("Select at least one hall");
        }
        SeatingRules r = rules == null ? SeatingRules.defaults() : rules;
        List<Student> pool = eligible == null ? List.of() : eligible;

        // ---- 1. capacity guard -------------------------------------------------
        int usableCapacity = halls.stream().mapToInt(Hall::usableCapacity).sum();
        int totalCapacity = halls.stream()
                .mapToInt(h -> (h.getRowsCount() == null ? 0 : h.getRowsCount())
                        * (h.getColsCount() == null ? 0 : h.getColsCount()))
                .sum();
        if (r.isStrictCapacity() && usableCapacity < pool.size()) {
            throw new InsufficientCapacityException(pool.size(), usableCapacity);
        }

        // ---- 2. one queue per department --------------------------------------
        // TreeMap keeps department iteration order stable (and therefore reproducible).
        Map<String, Deque<Student>> queues = new TreeMap<>();
        for (Student student : pool) {
            queues.computeIfAbsent(student.getDepartment(), k -> new ArrayDeque<>()).addLast(student);
        }
        Random random = new Random(seedFor(exam, halls, r));
        if (r.isShuffle()) {
            for (Deque<Student> queue : queues.values()) {
                List<Student> list = new ArrayList<>(queue);
                java.util.Collections.shuffle(list, random);
                queue.clear();
                queue.addAll(list);
            }
        }

        // ---- 3. per-hall, seat-by-seat fill ------------------------------------
        List<Hall> orderedHalls = orderHalls(halls, r);
        List<HallAllocation> allocations = new ArrayList<>();

        for (Hall hall : orderedHalls) {
            // Every selected hall gets a plan entry even when the queues have run
            // dry, so the UI can render the full set of grids it asked for.
            allocations.add(fillHall(hall, queues, r));
        }

        // ---- 4. leftovers -------------------------------------------------------
        List<SeatingResult.UnallocatedStudent> leftovers = new ArrayList<>();
        queues.forEach((dept, queue) -> {
            for (Student student : queue) {
                leftovers.add(SeatingResult.UnallocatedStudent.builder()
                        .studentId(student.getId())
                        .rollNo(student.getRollNo())
                        .name(student.getName())
                        .department(student.getDepartment())
                        .year(student.getYear())
                        .reason("No usable seat left in the selected halls")
                        .build());
            }
        });

        int totalSeated = allocations.stream().mapToInt(HallAllocation::getAllocated).sum();
        int clashes = allocations.stream().mapToInt(a -> a.getVerification().getClashes()).sum();
        int minScore = allocations.stream()
                .mapToInt(a -> a.getVerification().getScore())
                .min().orElse(0);

        return SeatingResult.builder()
                .examId(exam == null ? null : exam.getId())
                .examCode(exam == null ? null : exam.getCode())
                .examTitle(exam == null ? null : firstNonBlank(exam.getTitle(), exam.getSubject()))
                .totalSeated(totalSeated)
                .unallocated(leftovers.size())
                .clashCount(clashes)
                .capacity(totalCapacity)
                .usableCapacity(usableCapacity)
                .utilisation(totalCapacity == 0 ? 0
                        : (int) Math.round((totalSeated * 100.0) / totalCapacity))
                .score(minScore)
                .clean(clashes == 0
                        && allocations.stream().allMatch(a -> a.getVerification().getAdjacentSameDept() == 0))
                .halls(allocations)
                .unallocatedStudents(leftovers)
                .build();
    }

    /* ------------------------------------------------------------------ */

    private HallAllocation fillHall(Hall hall, Map<String, Deque<Student>> queues, SeatingRules rules) {
        int rows = hall.getRowsCount() == null ? 0 : hall.getRowsCount();
        int cols = hall.getColsCount() == null ? 0 : hall.getColsCount();

        Set<String> blockedKeys = new HashSet<>();
        if (hall.getBlockedSeats() != null) {
            hall.getBlockedSeats().forEach(bs ->
                    blockedKeys.add(bs.getRow() + "-" + bs.getCol()));
        }

        List<List<SeatCell>> grid = buildGrid(rows, cols, blockedKeys);

        int allocated = 0;
        Map<String, Integer> departments = new HashMap<>();

        if (allQueuesEmpty(queues)) {
            // Everybody is already seated — hand back the empty grid without walking
            // the seats again.
            return HallAllocation.builder()
                    .hallId(hall.getId())
                    .hallCode(hall.getCode())
                    .hallName(hall.getName())
                    .rows(rows).cols(cols)
                    .grid(grid)
                    .capacity(rows * cols)
                    .blocked(blockedKeys.size())
                    .usable(rows * cols - blockedKeys.size())
                    .allocated(0)
                    .utilisation(0)
                    .departments(departments)
                    .verification(VerificationResult.builder()
                            .comparableEdges(0).comparableDiagonal(0)
                            .adjacencyRate(0d).diagonalRate(0d)
                            .score(100).clean(true)
                            .build())
                    .build();
        }

        for (int row = 0; row < rows; row += 1) {
            for (int col = 0; col < cols; col += 1) {
                SeatCell cell = grid.get(row).get(col);
                if (cell.isBlocked()) continue;
                if (rules.isKeepLastRowClear() && row == rows - 1) continue;

                SeatCell left = at(grid, row, col - 1);
                SeatCell up = at(grid, row - 1, col);
                SeatCell front = at(grid, row + 1, col);
                // Arrays.asList, not List.of: out-of-bounds neighbours are null and
                // List.of() rejects null elements.
                List<SeatCell> diagonals = Arrays.asList(
                        at(grid, row - 1, col - 1),
                        at(grid, row - 1, col + 1),
                        at(grid, row + 1, col - 1),
                        at(grid, row + 1, col + 1));

                // Which neighbours are hard constraints depends on the active rules.
                List<SeatCell> orthogonal = new ArrayList<>(Arrays.asList(left, up, front));
                List<SeatCell> hard = new ArrayList<>();
                if (rules.isAvoidSameDeptAdjacent()) hard.addAll(orthogonal);
                if (rules.isAvoidSameDeptDiagonal()) hard.addAll(diagonals);

                Set<String> bannedDepts = new HashSet<>();
                hard.stream().filter(java.util.Objects::nonNull)
                        .forEach(n -> bannedDepts.add(n.getDepartment()));

                Set<Integer> bannedYears = new HashSet<>();
                if (rules.isAvoidSameYearAdjacent()) {
                    orthogonal.stream().filter(java.util.Objects::nonNull)
                            .forEach(n -> bannedYears.add(n.getYear()));
                }

                Student chosen = pickStrictly(queues, rules, bannedDepts, bannedYears);
                if (chosen == null) {
                    chosen = pickLeastCostly(queues, rules, orthogonal, diagonals);
                }
                if (chosen == null) {
                    continue;
                }

                cell.setStudentId(chosen.getId());
                cell.setRollNo(chosen.getRollNo());
                cell.setName(chosen.getName());
                cell.setDepartment(chosen.getDepartment());
                cell.setYear(chosen.getYear());
                cell.setSection(chosen.getSection());
                cell.setGender(chosen.getGender());
                cell.setPrn(chosen.getPrn());
                allocated += 1;
                departments.merge(chosen.getDepartment(), 1, Integer::sum);
            }
        }

        int usable = rows * cols - blockedKeys.size();
        VerificationResult verification = verify(grid, rows, cols);

        return HallAllocation.builder()
                .hallId(hall.getId())
                .hallCode(hall.getCode())
                .hallName(hall.getName())
                .rows(rows).cols(cols)
                .grid(grid)
                .capacity(rows * cols)
                .blocked(blockedKeys.size())
                .usable(usable)
                .allocated(allocated)
                .utilisation(rows * cols == 0 ? 0 : (int) Math.round((allocated * 100.0) / (rows * cols)))
                .departments(departments)
                .verification(verification)
                .build();
    }

    /** Row-major {@code rows x cols} grid with blocked seats already flagged. */
    private List<List<SeatCell>> buildGrid(int rows, int cols, Set<String> blockedKeys) {
        List<List<SeatCell>> grid = new ArrayList<>(rows);
        for (int r = 0; r < rows; r += 1) {
            List<SeatCell> row = new ArrayList<>(cols);
            for (int c = 0; c < cols; c += 1) {
                row.add(SeatCell.builder()
                        .row(r).col(c)
                        .label(seatLabel(r, c))
                        .blocked(blockedKeys.contains(r + "-" + c))
                        .build());
            }
            grid.add(row);
        }
        return grid;
    }

    /** Honours every hard rule; returns null when no department can be placed. */
    private Student pickStrictly(Map<String, Deque<Student>> queues,
                                 SeatingRules rules,
                                 Set<String> bannedDepts,
                                 Set<Integer> bannedYears) {
        List<Map.Entry<String, Deque<Student>>> candidates = new ArrayList<>();
        queues.forEach((dept, queue) -> {
            if (!queue.isEmpty() && !bannedDepts.contains(dept)) {
                candidates.add(Map.entry(dept, queue));
            }
        });
        sortCandidates(candidates, rules);

        for (Map.Entry<String, Deque<Student>> entry : candidates) {
            Deque<Student> queue = entry.getValue();
            Student head = queue.peekFirst();
            if (head == null) continue;
            if (!bannedYears.isEmpty() && bannedYears.contains(head.getYear())) {
                Student alternative = queue.stream()
                        .filter(s -> !bannedYears.contains(s.getYear()))
                        .findFirst()
                        .orElse(null);
                if (alternative == null) continue;
                queue.remove(alternative);
                return alternative;
            }
            queue.pollFirst();
            return head;
        }
        return null;
    }

    /**
     * Graceful degradation: no department satisfies the strict rules, so pick the
     * one whose students sit furthest from the neighbours already placed. Without
     * this the engine dumps everybody into the largest queue and a two-department
     * exam ends up ~50% adjacency violations instead of a clean checkerboard.
     */
    private Student pickLeastCostly(Map<String, Deque<Student>> queues,
                                    SeatingRules rules,
                                    List<SeatCell> orthogonal,
                                    List<SeatCell> diagonals) {
        record Candidate(String dept, Deque<Student> queue, int cost) { }

        List<Candidate> ranked = new ArrayList<>();
        queues.forEach((dept, queue) -> {
            if (queue.isEmpty()) return;
            int cost = 0;
            if (rules.isAvoidSameDeptAdjacent()) {
                cost += (int) orthogonal.stream()
                        .filter(n -> n != null && dept.equals(n.getDepartment())).count() * 2;
            }
            if (rules.isAvoidSameDeptDiagonal()) {
                cost += (int) diagonals.stream()
                        .filter(n -> n != null && dept.equals(n.getDepartment())).count();
            }
            ranked.add(new Candidate(dept, queue, cost));
        });
        ranked.sort(Comparator.comparingInt(Candidate::cost)
                .thenComparing(Comparator.comparingInt((Candidate c) -> c.queue().size()).reversed()));

        Candidate best = ranked.isEmpty() ? null : ranked.get(0);
        return best == null ? null : best.queue().pollFirst();
    }

    private void sortCandidates(List<Map.Entry<String, Deque<Student>>> candidates, SeatingRules rules) {
        if (rules.isMixDepartments()) {
            // Most students remaining first — keeps halls evenly mixed.
            candidates.sort(Comparator
                    .comparingInt((Map.Entry<String, Deque<Student>> e) -> e.getValue().size())
                    .reversed()
                    .thenComparing(Map.Entry::getKey));
        } else {
            candidates.sort(Comparator.comparing(Map.Entry::getKey));
        }
    }

    /**
     * Re-checks a filled grid and returns violation counts plus a 0–100 score.
     * Mirrors the frontend engine so plan quality reads identically in both.
     */
    public VerificationResult verify(List<List<SeatCell>> grid, int rows, int cols) {
        int adjacentSameDept = 0;
        int diagonalSameDept = 0;
        int adjacentSameYear = 0;
        int clashes = 0;
        int comparableEdges = 0;
        int comparableDiagonal = 0;
        Set<String> seen = new HashSet<>();

        for (int r = 0; r < rows; r += 1) {
            for (int c = 0; c < cols; c += 1) {
                SeatCell seat = at(grid, r, c);
                if (seat == null || seat.isBlocked()) continue;
                if (seat.isOccupied()) {
                    if (!seen.add(seat.getStudentId())) {
                        clashes += 1;
                    }
                }

                for (SeatCell neighbour : Arrays.asList(
                        at(grid, r, c + 1), at(grid, r + 1, c))) {
                    if (neighbour == null || neighbour.isBlocked() || !neighbour.isOccupied()) continue;
                    comparableEdges += 1;
                    if (java.util.Objects.equals(neighbour.getDepartment(), seat.getDepartment())) {
                        adjacentSameDept += 1;
                    }
                    if (seat.getYear() != null && java.util.Objects.equals(neighbour.getYear(), seat.getYear())) {
                        adjacentSameYear += 1;
                    }
                }

                for (SeatCell diagonal : Arrays.asList(
                        at(grid, r - 1, c - 1), at(grid, r - 1, c + 1),
                        at(grid, r + 1, c - 1), at(grid, r + 1, c + 1))) {
                    if (diagonal == null || diagonal.isBlocked() || !diagonal.isOccupied()) continue;
                    comparableDiagonal += 1;
                    if (java.util.Objects.equals(diagonal.getDepartment(), seat.getDepartment())) {
                        diagonalSameDept += 1;
                    }
                }
            }
        }

        // Clashes are a hard failure and dominate. Orthogonal adjacency is the
        // primary metric. Diagonal pairs are only a soft signal: with two
        // departments a checkerboard always puts same-department students on the
        // diagonal, so that rate can never reach zero.
        double adjacencyRate = comparableEdges == 0 ? 0d : (double) adjacentSameDept / comparableEdges;
        double diagonalRate = comparableDiagonal == 0 ? 0d : (double) diagonalSameDept / comparableDiagonal;
        double clashRate = seen.isEmpty() ? 0d : (double) clashes / seen.size();
        int score = Math.max(0, (int) Math.round(
                100 - adjacencyRate * 100 - Math.min(diagonalRate, 0.5d) * 20 - clashRate * 300));

        return VerificationResult.builder()
                .clashes(clashes)
                .adjacentSameDept(adjacentSameDept)
                .diagonalSameDept(diagonalSameDept)
                .adjacentSameYear(adjacentSameYear)
                .uniqueStudents(seen.size())
                .comparableEdges(comparableEdges)
                .comparableDiagonal(comparableDiagonal)
                .adjacencyRate(round4(adjacencyRate))
                .diagonalRate(round4(diagonalRate))
                .score(score)
                .clean(adjacentSameDept == 0 && clashes == 0)
                .build();
    }

    /** Smallest halls first so the tightest fits are filled before slack is wasted. */
    private List<Hall> orderHalls(List<Hall> halls, SeatingRules rules) {
        List<Hall> ordered = new ArrayList<>(halls);
        if (rules.isMixDepartments()) {
            ordered.sort(Comparator.comparingInt(Hall::usableCapacity)
                    .thenComparing(Hall::getCode, Comparator.nullsLast(String::compareToIgnoreCase)));
        } else {
            ordered.sort(Comparator.comparing(Hall::getCode, Comparator.nullsLast(String::compareToIgnoreCase)));
        }
        return ordered;
    }

    /** Occupied cell at (r, c) or {@code null} when out of bounds / empty / blocked. */
    private SeatCell at(List<List<SeatCell>> grid, int r, int c) {
        if (r < 0 || c < 0 || r >= grid.size() || c >= grid.get(r).size()) return null;
        SeatCell cell = grid.get(r).get(c);
        return cell == null || cell.isBlocked() ? null : cell;
    }

    private boolean allQueuesEmpty(Map<String, Deque<Student>> queues) {
        for (Deque<Student> queue : queues.values()) {
            if (!queue.isEmpty()) return false;
        }
        return true;
    }

    private long seedFor(Exam exam, List<Hall> halls, SeatingRules rules) {
        if (rules.getSeed() != 0L) return rules.getSeed();
        StringBuilder key = new StringBuilder();
        key.append(exam == null ? "" : exam.getId());
        halls.stream().map(Hall::getId).sorted().forEach(id -> key.append('-').append(id));
        key.append('-').append(rules.isAvoidSameDeptAdjacent())
                .append(rules.isAvoidSameDeptDiagonal())
                .append(rules.isAvoidSameYearAdjacent())
                .append(rules.isMixDepartments())
                .append(rules.isKeepLastRowClear())
                .append(rules.isShuffle());
        return key.toString().hashCode();
    }

    private static double round4(double value) {
        return Math.round(value * 10000d) / 10000d;
    }

    private static String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) return first;
        if (second != null && !second.isBlank()) return second;
        return null;
    }
}