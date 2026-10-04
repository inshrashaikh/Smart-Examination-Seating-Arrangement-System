package com.examseat.service.impl;

import com.examseat.algorithm.HallAllocation;
import com.examseat.algorithm.InsufficientCapacityException;
import com.examseat.algorithm.SeatCell;
import com.examseat.algorithm.SeatConstraintException;
import com.examseat.algorithm.SeatingAlgorithm;
import com.examseat.algorithm.SeatingResult;
import com.examseat.algorithm.SeatingRules;
import com.examseat.dto.exam.ExamResponse;
import com.examseat.dto.seating.GenerateSeatingRequest;
import com.examseat.dto.seating.GenerateSeatingResponse;
import com.examseat.dto.seating.HallPlanResponse;
import com.examseat.dto.seating.OptimizerRequest;
import com.examseat.dto.seating.OptimizerResponse;
import com.examseat.dto.seating.SwapSeatsRequest;
import com.examseat.dto.student.StudentResponse;
import com.examseat.entity.Exam;
import com.examseat.entity.ExamHall;
import com.examseat.entity.ExamStatus;
import com.examseat.entity.Hall;
import com.examseat.entity.SeatAllocation;
import com.examseat.entity.Student;
import com.examseat.exception.ApiException;
import com.examseat.exception.OptimizerUnavailableException;
import com.examseat.mapper.SeatingMapper;
import com.examseat.mapper.StudentMapper;
import com.examseat.repository.ExamHallRepository;
import com.examseat.repository.ExamRepository;
import com.examseat.repository.HallRepository;
import com.examseat.repository.SeatAllocationRepository;
import com.examseat.repository.StudentRepository;
import com.examseat.service.ExamService;
import com.examseat.service.SeatingService;
import com.examseat.util.IdFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeatingServiceImpl implements SeatingService {

    private static final int[][] ORTHOGONAL = {{0, 1}, {1, 0}, {0, -1}, {-1, 0}};

    /** Optional prefix the React client uses in its own plan ids. */
    private static final String PLAN_ID_PREFIX = "PL-";

    /**
     * Off-grid coordinate used to park an allocation mid-swap. No real seat can
     * occupy it, so the {@code (exam, hall, row, col)} index can never collide.
     */
    private static final int PARKED_ROW = -1;
    private static final int PARKED_COL = -1;

    private final SeatingAlgorithm algorithm;
    private final ExamRepository examRepository;
    private final HallRepository hallRepository;
    private final ExamHallRepository examHallRepository;
    private final StudentRepository studentRepository;
    private final SeatAllocationRepository allocationRepository;
    private final SeatingMapper seatingMapper;
    private final StudentMapper studentMapper;
    private final ExamService examService;
    private final com.examseat.client.OptimizerClient optimizerClient;
    private final com.examseat.service.AuditService auditService;

    /* ================================================================ generate */

    @Override
    @Transactional
    public GenerateSeatingResponse generate(GenerateSeatingRequest request) {
        Exam exam = requireExam(request.getExamId());

        List<String> hallIds = request.getHallIds().stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .toList();
        if (hallIds.isEmpty()) {
            throw ApiException.badRequest("Select at least one hall");
        }

        List<Hall> halls = hallRepository.findByIdIn(hallIds);
        if (halls.size() != hallIds.size()) {
            Set<String> found = halls.stream().map(Hall::getId).collect(Collectors.toSet());
            throw ApiException.badRequest("Unknown hall id(s): "
                    + hallIds.stream().filter(id -> !found.contains(id)).toList());
        }

        Set<String> departments = request.getDepartments() == null || request.getDepartments().isEmpty()
                ? new LinkedHashSet<>(exam.getDepartments())
                : new LinkedHashSet<>(request.getDepartments());

        List<Student> eligible = studentRepository.findEligible(departments, minYearOf(exam));
        if (eligible.isEmpty()) {
            throw ApiException.badRequest("No students match " + departments
                    + " from year " + minYearOf(exam) + " onwards");
        }

        SeatingRules rules = toRules(request.getRules());

        // Regenerating replaces the previous plan outright so a student can never end
        // up holding two seats in the same exam.
        allocationRepository.deleteByExamId(exam.getId());

        SeatingResult result = allocateWithEngine(exam, halls, eligible, rules, request.getEngine());
        // Recorded on the exam so the analytics page can compare engines; the
        // save below (after the status flip) persists it.
        exam.setEngine(result.getEngine());

        Map<String, Hall> hallsById = halls.stream()
                .collect(Collectors.toMap(Hall::getId, Function.identity()));
        Map<String, Student> studentsById = eligible.stream()
                .collect(Collectors.toMap(Student::getId, Function.identity(), (a, b) -> a));

        Instant now = Instant.now();
        List<SeatAllocation> toSave = new ArrayList<>(result.getTotalSeated());

        for (HallAllocation allocation : result.getHalls()) {
            Hall hall = hallsById.get(allocation.getHallId());
            for (List<SeatCell> row : allocation.getGrid()) {
                for (SeatCell cell : row) {
                    if (!cell.isOccupied()) continue;
                    Student student = studentsById.get(cell.getStudentId());
                    if (student == null) {
                        throw ApiException.badRequest("Engine produced an unknown student id "
                                + cell.getStudentId());
                    }
                    toSave.add(SeatAllocation.builder()
                            .id(IdFactory.allocation(exam.getId(), hall.getId(), cell.getRow(), cell.getCol()))
                            .exam(exam)
                            .hall(hall)
                            .student(student)
                            .rowNo(cell.getRow())
                            .colNo(cell.getCol())
                            .seatLabel(cell.getLabel())
                            .planStatus(ExamStatus.ALLOCATED)
                            .createdAt(now)
                            .build());
                }
            }
        }
        allocationRepository.saveAll(toSave);

        replaceExamHallLinks(exam, halls);
        exam.setStatus(ExamStatus.ALLOCATED);
        examRepository.save(exam);

        log.info("Generated plan for {}: {} seated across {} hall(s), {} unallocated, {} clashes, score {}, engine {}",
                exam.getCode(), result.getTotalSeated(), result.getHalls().size(),
                result.getUnallocated(), result.getClashCount(), result.getScore(), result.getEngine());

        auditService.record("seating.generate", exam.getCode() + ": " + result.getTotalSeated()
                + " seated across " + result.getHalls().size() + " hall(s), engine " + result.getEngine());

        return toResponse(exam, result);
    }

    /* ============================================================ engine choice */

    /**
     * Picks the engine the caller asked for and runs it.
     *
     * <ul>
     *   <li>{@code JAVA} — the built-in algorithm, always;</li>
     *   <li>{@code PYTHON} — the optimizer service, and a failure is a hard
     *       error: the caller explicitly asked for it;</li>
     *   <li>{@code AUTO} (default) — the optimizer when it answers, the
     *       built-in algorithm when it does not. The fallback is logged so the
     *       examination cell can see why a run is not comparable with the
     *       optimizer's.</li>
     * </ul>
     *
     * @return the result, tagged with the engine that produced it
     */
    private SeatingResult allocateWithEngine(Exam exam, List<Hall> halls,
                                             List<Student> eligible, SeatingRules rules,
                                             String requested) {
        String engine = requested == null || requested.isBlank()
                ? "AUTO"
                : requested.trim().toUpperCase(Locale.ROOT);

        if ("PYTHON".equals(engine)) {
            return runOptimizer(exam, halls, eligible, rules, true);
        }
        if ("JAVA".equals(engine)) {
            return javaResult(exam, halls, eligible, rules, "JAVA");
        }
        if (!"AUTO".equals(engine)) {
            throw ApiException.badRequest("Unknown engine '" + requested
                    + "'. Use JAVA, PYTHON or AUTO.");
        }

        if (optimizerClient.isAvailable()) {
            try {
                return runOptimizer(exam, halls, eligible, rules, false);
            } catch (com.examseat.exception.OptimizerUnavailableException ex) {
                log.warn("Optimizer unavailable for {} — falling back to the Java engine: {}",
                        exam.getCode(), ex.getMessage());
            }
        } else {
            log.info("No optimizer configured for {} — using the Java engine", exam.getCode());
        }
        return javaResult(exam, halls, eligible, rules, "JAVA");
    }

    /** The built-in algorithm, tagged with its engine name. */
    private SeatingResult javaResult(Exam exam, List<Hall> halls,
                                     List<Student> eligible, SeatingRules rules, String engine) {
        SeatingResult result = algorithm.allocate(exam, halls, eligible, rules);
        result.setEngine(engine);
        return result;
    }

    /**
     * Runs the Python optimizer and maps its answer onto the same
     * {@link SeatingResult} the Java engine produces, so everything downstream —
     * persistence, verification, response building — is engine-agnostic.
     *
     * <p>The optimizer's own score is discarded: the rebuilt grids are verified
     * by {@link SeatingAlgorithm#verify}, which is the single scoring
     * implementation. A plan from either engine is therefore scored by the same
     * rules and the analytics comparison is honest.</p>
     */
    private SeatingResult runOptimizer(Exam exam, List<Hall> halls,
                                       List<Student> eligible, SeatingRules rules,
                                       boolean strict) {
        int usableCapacity = halls.stream().mapToInt(Hall::usableCapacity).sum();
        if (rules.isStrictCapacity() && usableCapacity < eligible.size()) {
            throw new InsufficientCapacityException(eligible.size(), usableCapacity);
        }

        OptimizerRequest payload = buildOptimizerRequest(exam, halls, eligible, rules);
        OptimizerResponse response = optimizerClient.optimize(payload);

        Map<String, Hall> hallsById = halls.stream()
                .collect(Collectors.toMap(Hall::getId, Function.identity()));
        Map<String, Student> studentsById = eligible.stream()
                .collect(Collectors.toMap(Student::getId, Function.identity(), (a, b) -> a));

        List<HallAllocation> allocations = new ArrayList<>(response.getHalls().size());
        Set<String> seatedIds = new HashSet<>();

        for (OptimizerResponse.HallResult hallResult : response.getHalls()) {
            Hall hall = hallsById.get(hallResult.getHallId());
            if (hall == null) {
                throw new OptimizerUnavailableException(
                        "The optimizer returned an unknown hall id: " + hallResult.getHallId());
            }
            allocations.add(buildHallAllocation(hall, hallResult, studentsById, seatedIds));
        }

        List<SeatingResult.UnallocatedStudent> leftovers = new ArrayList<>();
        for (String studentId : response.getUnallocated()) {
            Student student = studentsById.get(studentId);
            if (student == null || seatedIds.contains(studentId)) continue;
            leftovers.add(SeatingResult.UnallocatedStudent.builder()
                    .studentId(student.getId())
                    .rollNo(student.getRollNo())
                    .name(student.getName())
                    .department(student.getDepartment())
                    .year(student.getYear())
                    .reason("No usable seat left in the selected halls")
                    .build());
        }

        // Strict capacity means the optimizer must seat everybody; a partial
        // result is a capacity failure, not a plan to store.
        if (rules.isStrictCapacity() && !leftovers.isEmpty()) {
            throw new InsufficientCapacityException(eligible.size(), usableCapacity);
        }

        int totalSeated = allocations.stream().mapToInt(HallAllocation::getAllocated).sum();
        int clashes = allocations.stream().mapToInt(a -> a.getVerification().getClashes()).sum();
        int minScore = allocations.stream()
                .mapToInt(a -> a.getVerification().getScore())
                .min().orElse(0);
        int totalCapacity = halls.stream()
                .mapToInt(h -> (h.getRowsCount() == null ? 0 : h.getRowsCount())
                        * (h.getColsCount() == null ? 0 : h.getColsCount()))
                .sum();

        SeatingResult result = SeatingResult.builder()
                .examId(exam.getId())
                .examCode(exam.getCode())
                .examTitle(firstNonBlank(exam.getTitle(), exam.getSubject()))
                .totalSeated(totalSeated)
                .unallocated(leftovers.size())
                .clashCount(clashes)
                .capacity(totalCapacity)
                .usableCapacity(usableCapacity)
                .utilisation(totalCapacity == 0 ? 0 : (int) Math.round((totalSeated * 100.0) / totalCapacity))
                .score(minScore)
                .clean(clashes == 0
                        && allocations.stream().allMatch(a -> a.getVerification().getAdjacentSameDept() == 0))
                .engine("PYTHON")
                .halls(allocations)
                .unallocatedStudents(leftovers)
                .build();

        if (strict && response.getUnallocated() != null && !response.getUnallocated().isEmpty()) {
            // Unreachable when the guard above holds, but the optimizer is an
            // external service — never trust its output shape.
            throw new OptimizerUnavailableException(
                    "The optimizer returned " + response.getUnallocated().size()
                            + " unallocated students despite strict capacity");
        }
        return result;
    }

    private OptimizerRequest buildOptimizerRequest(Exam exam, List<Hall> halls,
                                                   List<Student> eligible, SeatingRules rules) {
        List<OptimizerRequest.Hall> hallPayloads = halls.stream()
                .map(hall -> OptimizerRequest.Hall.builder()
                        .hallId(hall.getId())
                        .rows(hall.getRowsCount() == null ? 0 : hall.getRowsCount())
                        .cols(hall.getColsCount() == null ? 0 : hall.getColsCount())
                        .blocked(hall.getBlockedSeats() == null ? new ArrayList<>()
                                : hall.getBlockedSeats().stream()
                                        .map(bs -> new int[]{bs.getRow(), bs.getCol()})
                                        .collect(Collectors.toList()))
                        .build())
                .toList();

        List<OptimizerRequest.Student> studentPayloads = eligible.stream()
                .map(student -> OptimizerRequest.Student.builder()
                        .id(student.getId())
                        .department(student.getDepartment())
                        .year(student.getYear())
                        .build())
                .toList();

        OptimizerRequest.Rules rulePayload = OptimizerRequest.Rules.builder()
                .avoidSameDeptAdjacent(rules.isAvoidSameDeptAdjacent())
                .avoidSameDeptDiagonal(rules.isAvoidSameDeptDiagonal())
                .avoidSameYearAdjacent(rules.isAvoidSameYearAdjacent())
                .keepLastRowClear(rules.isKeepLastRowClear())
                .strictCapacity(rules.isStrictCapacity())
                .build();

        return OptimizerRequest.builder()
                .examId(exam.getId())
                .halls(hallPayloads)
                .students(studentPayloads)
                .rules(rulePayload)
                .build();
    }

    /**
     * Rebuilds one hall's grid from the optimizer's seat list and verifies it
     * with the same code the Java engine's output goes through.
     */
    private HallAllocation buildHallAllocation(Hall hall, OptimizerResponse.HallResult hallResult,
                                               Map<String, Student> studentsById,
                                               Set<String> seatedIds) {
        int rows = hall.getRowsCount() == null ? 0 : hall.getRowsCount();
        int cols = hall.getColsCount() == null ? 0 : hall.getColsCount();
        Set<Integer> blocked = blockedKeys(hall);

        List<List<SeatCell>> grid = new ArrayList<>(rows);
        for (int r = 0; r < rows; r += 1) {
            List<SeatCell> row = new ArrayList<>(cols);
            for (int c = 0; c < cols; c += 1) {
                row.add(SeatCell.builder()
                        .row(r).col(c)
                        .label(SeatingAlgorithm.seatLabel(r, c))
                        .blocked(blocked.contains(cellKey(r, c)))
                        .build());
            }
            grid.add(row);
        }

        Map<String, Integer> departments = new HashMap<>();
        int allocated = 0;

        for (OptimizerResponse.HallResult.Seat seat : hallResult.getSeats()) {
            Student student = studentsById.get(seat.getStudentId());
            if (student == null) {
                throw new OptimizerUnavailableException(
                        "The optimizer returned an unknown student id: " + seat.getStudentId());
            }
            if (seat.getRow() < 0 || seat.getRow() >= rows || seat.getCol() < 0 || seat.getCol() >= cols) {
                throw new OptimizerUnavailableException(
                        "The optimizer placed " + student.getId() + " outside hall "
                                + hall.getCode() + "'s grid (row " + seat.getRow() + " col " + seat.getCol() + ")");
            }
            if (blocked.contains(cellKey(seat.getRow(), seat.getCol()))) {
                throw new OptimizerUnavailableException(
                        "The optimizer placed " + student.getId() + " on a blocked seat in "
                                + hall.getCode() + " (row " + seat.getRow() + " col " + seat.getCol() + ")");
            }
            SeatCell cell = grid.get(seat.getRow()).get(seat.getCol());
            if (cell.isOccupied()) {
                throw new OptimizerUnavailableException(
                        "The optimizer placed two students on seat " + cell.getLabel()
                                + " in " + hall.getCode());
            }
            cell.setStudentId(student.getId());
            cell.setRollNo(student.getRollNo());
            cell.setName(student.getName());
            cell.setDepartment(student.getDepartment());
            cell.setYear(student.getYear());
            cell.setSection(student.getSection());
            cell.setGender(student.getGender());
            cell.setPrn(student.getPrn());
            seatedIds.add(student.getId());
            allocated += 1;
            departments.merge(student.getDepartment(), 1, Integer::sum);
        }

        int usable = rows * cols - blocked.size();
        return HallAllocation.builder()
                .hallId(hall.getId())
                .hallCode(hall.getCode())
                .hallName(hall.getName())
                .rows(rows).cols(cols)
                .grid(grid)
                .capacity(rows * cols)
                .blocked(blocked.size())
                .usable(usable)
                .allocated(allocated)
                .utilisation(rows * cols == 0 ? 0 : (int) Math.round((allocated * 100.0) / (rows * cols)))
                .departments(departments)
                .verification(algorithm.verify(grid, rows, cols))
                .build();
    }

    private static String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) return first;
        if (second != null && !second.isBlank()) return second;
        return null;
    }

    /* ================================================================= reads */

    @Override
    @Transactional(readOnly = true)
    public List<HallPlanResponse> listPlans(String examId) {
        List<SeatAllocation> allocations = examId == null || examId.isBlank()
                ? allocationRepository.findAll()
                : allocationRepository.findByExamIdOrderByHallIdAscRowNoAscColNoAsc(examId);

        Map<String, List<SeatAllocation>> grouped = allocations.stream()
                .collect(Collectors.groupingBy(a -> a.getExam().getId() + "::" + a.getHall().getId(),
                        LinkedHashMap::new, Collectors.toList()));

        List<HallPlanResponse> plans = new ArrayList<>(grouped.size());
        for (List<SeatAllocation> group : grouped.values()) {
            plans.add(buildPlan(group.get(0).getExam(), group.get(0).getHall(), group));
        }

        // Exams whose halls hold no students yet still deserve an empty plan view,
        // otherwise the hall-plan page renders blank.
        if (examId != null && !examId.isBlank()) {
            Set<String> rendered = plans.stream().map(HallPlanResponse::getId)
                    .collect(Collectors.toCollection(HashSet::new));
            examHallRepository.findByExamId(examId).stream()
                    .filter(link -> !rendered.contains(IdFactory.examHall(examId, link.getHall().getId())))
                    .forEach(link -> plans.add(buildPlan(link.getExam(), link.getHall(), List.of())));
        }
        return plans;
    }

    @Override
    @Transactional(readOnly = true)
    public HallPlanResponse getPlan(String planId) {
        ExamHall link = resolveExamHall(planId);
        if (link != null) {
            return buildPlan(link.getExam(), link.getHall(),
                    allocationRepository.findByExamIdAndHallIdOrderByRowNoAscColNoAsc(
                            link.getExam().getId(), link.getHall().getId()));
        }
        // A bare exam id resolves to that exam's first hall, which is what the
        // React client means when it holds only an exam-scoped identifier.
        Exam exam = examRepository.findById(planId).orElse(null);
        if (exam == null) {
            throw unresolvablePlan(planId);
        }
        List<ExamHall> halls = examHallRepository.findByExamId(exam.getId());
        if (halls.isEmpty()) {
            throw ApiException.notFound("Seating plan",
                    planId + " has no halls allocated yet — generate the plan first");
        }
        ExamHall first = halls.get(0);
        return buildPlan(first.getExam(), first.getHall(),
                allocationRepository.findByExamIdAndHallIdOrderByRowNoAscColNoAsc(
                        exam.getId(), first.getHall().getId()));
    }

    /**
     * Resolves a composite plan id ({@code EX-001-H-1}, optionally prefixed with
     * {@code PL-}) to its exam-hall link.
     *
     * <p>Splitting on a hyphen would be wrong: both exam and hall ids contain one,
     * so {@code EX-001-H-1} is genuinely ambiguous as a string. The id is resolved
     * against the {@code exam_halls} table instead of parsed.</p>
     */
    private ExamHall resolveExamHall(String planId) {
        if (planId == null || planId.isBlank()) return null;
        String candidate = planId.startsWith(PLAN_ID_PREFIX)
                ? planId.substring(PLAN_ID_PREFIX.length())
                : planId;
        return examHallRepository.findById(candidate).orElse(null);
    }

    /**
     * The single failure for an unresolvable plan id. Every caller shares it so a
     * typo reads the same whether the client called get, swap or publish.
     */
    private ApiException unresolvablePlan(String planId) {
        return ApiException.notFound("Seating plan",
                "\"" + planId + "\" matches neither a hall plan (EX-001-H-1) nor an exam id");
    }

    @Override
    @Transactional(readOnly = true)
    public HallPlanResponse getHallPlan(String examId, String hallId) {
        Exam exam = requireExam(examId);
        Hall hall = hallRepository.findById(hallId)
                .orElseThrow(() -> ApiException.notFound("Hall", hallId));
        return buildPlan(exam, hall,
                allocationRepository.findByExamIdAndHallIdOrderByRowNoAscColNoAsc(examId, hallId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentResponse> seatedStudents(String examId) {
        return studentMapper.toResponses(
                allocationRepository.findByExamIdOrderByHallIdAscRowNoAscColNoAsc(examId).stream()
                        .map(SeatAllocation::getStudent)
                        .toList());
    }

    /* ================================================================== swap */

    @Override
    @Transactional
    public HallPlanResponse swap(String planId, SwapSeatsRequest request) {
        ExamHall link = resolveExamHall(planId);
        if (link == null) {
            throw unresolvablePlan(planId);
        }
        return swapWithinHall(link.getExam().getId(), link.getHall().getId(),
                request.getA(), request.getB(), request.shouldValidate());
    }

    @Override
    @Transactional
    public HallPlanResponse swapByAllocationIds(String examId, String allocationId1,
                                                String allocationId2, boolean validate) {
        SeatAllocation first = requireAllocation(allocationId1);
        SeatAllocation second = requireAllocation(allocationId2);

        if (!first.getExam().getId().equals(examId) || !second.getExam().getId().equals(examId)) {
            throw ApiException.badRequest("Both allocations must belong to exam " + examId);
        }
        if (!first.getHall().getId().equals(second.getHall().getId())) {
            throw ApiException.badRequest("Allocations are in different halls ("
                    + first.getHall().getName() + " and " + second.getHall().getName()
                    + "). Swap two seats inside the same hall instead.");
        }

        return swapWithinHall(examId, first.getHall().getId(), refOf(first), refOf(second), validate);
    }

    /**
     * Exchanges the coordinates of two allocation rows, one flush at a time.
     *
     * <p>Assigning the two students to each other's rows instead — the obvious
     * implementation — deadlocks the {@code idx_alloc_exam_student} unique index:
     * the database checks uniqueness after every statement, and between the first
     * and second UPDATE both rows momentarily carry the same student.</p>
     *
     * <p>Moving coordinates instead keeps every student id untouched, so that index
     * cannot be violated. The parked coordinate is off-grid and therefore always
     * free, and each of the three steps lands on a valid state: park, fill, then
     * take the seat just vacated.</p>
     */
    private void applySwap(SeatAllocation first, SeatAllocation second) {
        int rowA = first.getRowNo();
        int colA = first.getColNo();
        int rowB = second.getRowNo();
        int colB = second.getColNo();

        if (rowA == rowB && colA == colB) return;

        first.setRowNo(PARKED_ROW);
        first.setColNo(PARKED_COL);
        allocationRepository.saveAndFlush(first);

        second.setRowNo(rowA);
        second.setColNo(colA);
        second.setSeatLabel(SeatingAlgorithm.seatLabel(rowA, colA));
        allocationRepository.saveAndFlush(second);

        first.setRowNo(rowB);
        first.setColNo(colB);
        first.setSeatLabel(SeatingAlgorithm.seatLabel(rowB, colB));
        allocationRepository.saveAndFlush(first);
    }

    private HallPlanResponse swapWithinHall(String examId, String hallId,
                                             SwapSeatsRequest.SeatRef refA,
                                             SwapSeatsRequest.SeatRef refB,
                                             boolean validate) {
        Exam exam = requireExam(examId);
        Hall hall = hallRepository.findById(hallId)
                .orElseThrow(() -> ApiException.notFound("Hall", hallId));

        List<SeatAllocation> allocations =
                allocationRepository.findByExamIdAndHallIdOrderByRowNoAscColNoAsc(examId, hallId);

        SeatAllocation first = findAt(allocations, refA, hallId);
        SeatAllocation second = findAt(allocations, refB, hallId);

        if (first == null || second == null) {
            SwapSeatsRequest.SeatRef missing = first == null ? refA : refB;
            throw ApiException.notFound("Seated allocation",
                    // `describe` keeps the message truthful for id-only refs, which
                    // the old "row " + getRow() + " col " + getCol() rendered as
                    // "row null col null".
                    describe(missing) + " in " + hall.getCode());
        }
        if (first.getId().equals(second.getId())) {
            throw ApiException.badRequest("Both references point at seat " + first.getSeatLabel());
        }

        Student studentA = first.getStudent();
        Student studentB = second.getStudent();

        if (validate) {
            assertSwapIsLegal(allocations, hall, first, second, studentA, studentB);
        }

        applySwap(first, second);

        log.info("Swapped {} <-> {} in {} ({})", first.getSeatLabel(), second.getSeatLabel(),
                hall.getCode(), exam.getCode());
        auditService.record("seating.swap", exam.getCode() + " · " + hall.getCode() + ": "
                + first.getSeatLabel() + " <-> " + second.getSeatLabel()
                + (validate ? "" : " (forced, constraints not checked)"));

        return buildPlan(exam, hall,
                allocationRepository.findByExamIdAndHallIdOrderByRowNoAscColNoAsc(examId, hallId));
    }

    /**
     * Plays the swap on an in-memory department map and counts orthogonal
     * same-department collisions around the two new positions. Diagonals are
     * ignored on purpose: with only two departments a checkerboard always produces
     * some diagonal pairs, so banning them would make every swap illegal.
     */
    private void assertSwapIsLegal(List<SeatAllocation> allocations, Hall hall,
                                   SeatAllocation first, SeatAllocation second,
                                   Student studentA, Student studentB) {
        Map<Integer, String> departmentByCell = new HashMap<>();
        for (SeatAllocation allocation : allocations) {
            departmentByCell.put(cellKey(allocation.getRowNo(), allocation.getColNo()),
                    allocation.getStudent().getDepartment());
        }
        // Apply the swap.
        departmentByCell.put(cellKey(first.getRowNo(), first.getColNo()), studentB.getDepartment());
        departmentByCell.put(cellKey(second.getRowNo(), second.getColNo()), studentA.getDepartment());

        Set<Integer> blocked = blockedKeys(hall);
        int clashes = 0;
        for (SeatAllocation moved : List.of(first, second)) {
            Student student = moved == first ? studentB : studentA;
            int row = moved.getRowNo();
            int col = moved.getColNo();
            for (int[] delta : ORTHOGONAL) {
                int nr = row + delta[0];
                int nc = col + delta[1];
                if (blocked.contains(cellKey(nr, nc))) continue;
                if (student.getDepartment().equals(departmentByCell.get(cellKey(nr, nc)))) {
                    clashes += 1;
                }
            }
        }

        if (clashes > 0) {
            throw new SeatConstraintException("This swap would put " + studentA.getName()
                    + " and/or " + studentB.getName() + " next to a classmate from the same department ("
                    + clashes + " adjacency clash" + (clashes == 1 ? "" : "es")
                    + "). Pick a different seat, or resend with \"validate\": false to override.");
        }
    }

    /* ============================================================ publish/reset */

    @Override
    @Transactional
    public ExamResponse publish(String examId) {
        return examService.publish(examId);
    }

    @Override
    @Transactional
    public HallPlanResponse publishPlan(String planId) {
        ExamHall link = resolveExamHall(planId);
        if (link == null) {
            throw unresolvablePlan(planId);
        }
        String examId = link.getExam().getId();
        String hallId = link.getHall().getId();

        examService.publish(examId);

        auditService.record("seating.publish", link.getExam().getCode() + ": plan " + planId + " published to faculty");

        // The React client replaces the plan it holds by id, so publishing has to
        // answer with that same plan rather than the exam.
        return buildPlan(link.getExam(), link.getHall(),
                allocationRepository.findByExamIdAndHallIdOrderByRowNoAscColNoAsc(examId, hallId));
    }

    @Override
    @Transactional
    public int reset(String examId) {
        Exam exam = requireExam(examId);
        int removed = (int) allocationRepository.countByExamId(examId);
        if (removed == 0) {
            throw ApiException.conflict(exam.getCode() + " has no seating plan to reset");
        }
        allocationRepository.deleteByExamId(examId);
        examHallRepository.deleteByExamId(examId);
        exam.setStatus(ExamStatus.SCHEDULED);
        examRepository.save(exam);
        log.info("Reset plan for {} ({} allocations removed)", exam.getCode(), removed);
        auditService.record("seating.reset", exam.getCode() + ": " + removed + " allocations removed, plan cleared");
        return removed;
    }

    /* ================================================================= helpers */

    private GenerateSeatingResponse toResponse(Exam exam, SeatingResult result) {
        Map<String, Integer> departments = new HashMap<>();
        for (HallAllocation hall : result.getHalls()) {
            hall.getDepartments().forEach((dept, count) -> departments.merge(dept, count, Integer::sum));
        }
        List<GenerateSeatingResponse.UnallocatedStudent> unallocated =
                result.getUnallocatedStudents().stream()
                        .map(u -> GenerateSeatingResponse.UnallocatedStudent.builder()
                                .studentId(u.getStudentId())
                                .rollNo(u.getRollNo())
                                .name(u.getName())
                                .department(u.getDepartment())
                                .year(u.getYear())
                                .reason(u.getReason())
                                .build())
                        .toList();

        return GenerateSeatingResponse.builder()
                .examId(exam.getId())
                .examCode(exam.getCode())
                .examTitle(exam.getTitle() == null ? exam.getSubject() : exam.getTitle())
                .totalSeated(result.getTotalSeated())
                .unallocated(result.getUnallocated())
                .clashCount(result.getClashCount())
                .capacity(result.getCapacity())
                .usableCapacity(result.getUsableCapacity())
                .utilisation(result.getUtilisation())
                .score(result.getScore())
                .clean(result.isClean())
                .engine(result.getEngine())
                .departments(departments)
                .halls(result.getHalls())
                .unallocatedStudents(unallocated)
                .build();
    }

    private SeatingRules toRules(GenerateSeatingRequest.SeatingRulesRequest request) {
        SeatingRules rules = SeatingRules.defaults();
        if (request == null) return rules;

        if (request.getMixDepartments() != null) rules.setMixDepartments(request.getMixDepartments());
        if (request.getAvoidSameDeptAdjacent() != null) {
            rules.setAvoidSameDeptAdjacent(request.getAvoidSameDeptAdjacent());
        }
        if (request.getAvoidSameDeptDiagonal() != null) {
            rules.setAvoidSameDeptDiagonal(request.getAvoidSameDeptDiagonal());
        }
        if (request.getAvoidSameYearAdjacent() != null) {
            rules.setAvoidSameYearAdjacent(request.getAvoidSameYearAdjacent());
        }
        if (request.getKeepLastRowClear() != null) {
            rules.setKeepLastRowClear(request.getKeepLastRowClear());
        }
        if (request.getShuffle() != null) rules.setShuffle(request.getShuffle());
        if (request.getStrictCapacity() != null) rules.setStrictCapacity(request.getStrictCapacity());
        if (request.getSeed() != null) rules.setSeed(request.getSeed());
        return rules;
    }

    /** Rehydrates a persisted plan (possibly empty) into the viewer's response shape. */
    private HallPlanResponse buildPlan(Exam exam, Hall hall, List<SeatAllocation> allocations) {
        int rows = hall.getRowsCount() == null ? 0 : hall.getRowsCount();
        int cols = hall.getColsCount() == null ? 0 : hall.getColsCount();
        Set<Integer> blocked = blockedKeys(hall);

        List<List<SeatCell>> grid = new ArrayList<>(rows);
        for (int r = 0; r < rows; r += 1) {
            List<SeatCell> row = new ArrayList<>(cols);
            for (int c = 0; c < cols; c += 1) {
                row.add(SeatCell.builder()
                        .row(r).col(c)
                        .label(SeatingAlgorithm.seatLabel(r, c))
                        .blocked(blocked.contains(cellKey(r, c)))
                        .build());
            }
            grid.add(row);
        }

        Map<String, String> allocationIdByStudent = new HashMap<>();
        Map<String, Integer> departmentCounts = new HashMap<>();
        Instant createdAt = null;
        ExamStatus planStatus = exam.getStatus() == null ? ExamStatus.ALLOCATED : exam.getStatus();

        for (SeatAllocation allocation : allocations) {
            int r = allocation.getRowNo();
            int c = allocation.getColNo();
            if (r < 0 || r >= rows || c < 0 || c >= cols) continue;

            Student student = allocation.getStudent();
            SeatCell cell = grid.get(r).get(c);
            cell.setStudentId(student.getId());
            cell.setRollNo(student.getRollNo());
            cell.setName(student.getName());
            cell.setDepartment(student.getDepartment());
            cell.setYear(student.getYear());
            cell.setSection(student.getSection());
            cell.setGender(student.getGender());
            cell.setPrn(student.getPrn());

            allocationIdByStudent.put(student.getId(), allocation.getId());
            departmentCounts.merge(student.getDepartment(), 1, Integer::sum);
            if (allocation.getCreatedAt() != null
                    && (createdAt == null || allocation.getCreatedAt().isBefore(createdAt))) {
                createdAt = allocation.getCreatedAt();
            }
            if (allocation.getPlanStatus() != null) planStatus = allocation.getPlanStatus();
        }

        return seatingMapper.fromStoredPlan(exam, hall, grid, rows, cols, departmentCounts,
                algorithm.verify(grid, rows, cols),
                planStatus == null ? ExamStatus.ALLOCATED : planStatus,
                createdAt == null ? Instant.now() : createdAt, allocationIdByStudent);
    }

    private void replaceExamHallLinks(Exam exam, List<Hall> halls) {
        examHallRepository.deleteAll(examHallRepository.findByExamId(exam.getId()));
        Instant now = Instant.now();
        for (Hall hall : halls) {
            examHallRepository.save(ExamHall.builder()
                    .id(IdFactory.examHall(exam.getId(), hall.getId()))
                    .exam(exam)
                    .hall(hall)
                    .createdAt(now)
                    .build());
        }
    }

    private static Set<Integer> blockedKeys(Hall hall) {
        Set<Integer> blocked = new HashSet<>();
        if (hall.getBlockedSeats() != null) {
            hall.getBlockedSeats().forEach(bs -> blocked.add(cellKey(bs.getRow(), bs.getCol())));
        }
        return blocked;
    }

    private static int cellKey(int row, int col) {
        return row * 1000 + col;
    }

    /**
     * Resolves a {@code SeatRef} to the allocation it names.
     *
     * <p>A ref may identify a seat in either of two ways, and <strong>either one
     * is sufficient on its own</strong>:
     * <ul>
     *   <li>by {@code allocationId} — the stable primary key;</li>
     *   <li>by {@code row} + {@code col} — the grid position the seat occupies
     *       <em>right now</em>.</li>
     * </ul>
     *
     * <p>The {@code allocationId} lookup is therefore tried <em>first</em> and is
     * not gated on row/col being present. It used to sit behind
     * {@code if (ref.getRow() == null || ref.getCol() == null) return null;},
     * which made every id-only ref resolve to {@code null} — a client sending a
     * perfectly valid id got a 404 for a seat that was plainly seated. row/col now
     * act as a fallback for refs that carry no id at all (which is what the UI
     * sends, since it holds grid positions).
     *
     * <p>Returns {@code null} — never throws — when the ref names a different
     * hall, or matches no allocation. Callers turn that into a 404 whose message
     * describes the ref as it was actually sent.
     */
    private SeatAllocation findAt(List<SeatAllocation> allocations,
                                  SwapSeatsRequest.SeatRef ref, String hallId) {
        if (ref == null) return null;
        if (ref.getHallId() != null && !ref.getHallId().equals(hallId)) return null;

        if (ref.getAllocationId() != null) {
            for (SeatAllocation allocation : allocations) {
                if (allocation.getId().equals(ref.getAllocationId())) return allocation;
            }
            // An id was given and it does not name a seat in this hall. Do not fall
            // through to row/col: the caller asked for one specific seat, and
            // resolving it to a different one by position would swap the wrong
            // students. Returning null yields a 404 that names the bad id.
            return null;
        }

        if (ref.getRow() == null || ref.getCol() == null) return null;
        for (SeatAllocation allocation : allocations) {
            if (allocation.getRowNo() == ref.getRow() && allocation.getColNo() == ref.getCol()) {
                return allocation;
            }
        }
        return null;
    }

    /**
     * Human-readable rendering of a ref for error messages. Row/col refs read as
     * "row 2 col 3"; id-only refs read as "allocation AL-7" rather than the
     * "row null col null" this used to produce.
     */
    private static String describe(SwapSeatsRequest.SeatRef ref) {
        if (ref == null) return "<null>";
        boolean hasCell = ref.getRow() != null && ref.getCol() != null;
        if (ref.getAllocationId() != null && hasCell) {
            return "allocation " + ref.getAllocationId()
                    + " (row " + ref.getRow() + " col " + ref.getCol() + ")";
        }
        if (ref.getAllocationId() != null) return "allocation " + ref.getAllocationId();
        if (hasCell) return "row " + ref.getRow() + " col " + ref.getCol();
        return "<empty reference>";
    }

    private SwapSeatsRequest.SeatRef refOf(SeatAllocation allocation) {
        return SwapSeatsRequest.SeatRef.builder()
                .hallId(allocation.getHall().getId())
                .allocationId(allocation.getId())
                .row(allocation.getRowNo())
                .col(allocation.getColNo())
                .build();
    }

    private SeatAllocation requireAllocation(String id) {
        return allocationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Seat allocation", id));
    }

    private Exam requireExam(String id) {
        return examRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Exam", id));
    }

    private Integer minYearOf(Exam exam) {
        return exam.getMinYear() == null ? 1 : exam.getMinYear();
    }
}
