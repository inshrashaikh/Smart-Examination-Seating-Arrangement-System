/**
 * Seat allocation engine (pure functions — no React, no network).
 *
 * Strategy
 * --------
 * 1. Eligible students are grouped into per-department FIFO queues.
 * 2. Halls are filled seat-by-seat. For every seat the engine builds a set of
 *    "forbidden" departments/years taken from the already-placed neighbours
 *    (left, up, and optionally the 4 diagonals).
 * 3. Among the remaining queues it picks the largest one that satisfies the
 *    constraints — this mixes departments *and* keeps hall utilisation even.
 * 4. `verifySeatingPlan` re-checks the produced grid and reports violations so
 *    the UI can prove "0 clashes".
 */

/** Deterministic PRNG so the same exam + halls always yields the same plan. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashSeed = (value) => {
  const str = String(value ?? '');
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Allocation rules, sent verbatim as `GenerateSeatingRequest.rules`.
 *
 * These keys MUST match the backend's
 * `dto.seating.GenerateSeatingRequest.SeatingRulesRequest` exactly:
 *
 *   mixDepartments, avoidSameDeptAdjacent, avoidSameDeptDiagonal,
 *   avoidSameYearAdjacent, keepLastRowClear, shuffle, strictCapacity, seed
 *
 * Jackson is configured to drop unknown properties, so a key that the server
 * does not declare (this file used to carry a `balanceAcrossHalls`) is
 * **silently discarded** — the toggle renders, the value never arrives, and
 * the rule quietly does nothing. When adding a rule here, add it to the DTO too.
 *
 * `strictCapacity: false` is deliberate and load-bearing. The server defaults it
 * to **true**, which makes `POST /api/seating/generate` answer
 * `409 Insufficient seating capacity` whenever the selected halls cannot seat
 * every eligible student. Leaving it at the server default would make the wizard
 * fail on the ordinary case, while the whole point of the success screen is to
 * report exactly which students could not be seated. Set it to true only when
 * the user explicitly asks to refuse a partial allocation.
 */
export const DEFAULT_RULES = {
  mixDepartments: true,
  avoidSameDeptAdjacent: true,
  avoidSameDeptDiagonal: true,
  avoidSameYearAdjacent: false,
  shuffle: true,
  keepLastRowClear: false,
  strictCapacity: false,
};

/**
 * One toggle per user-visible rule. `seed` is intentionally absent — it is a
 * reproducibility escape hatch, not a rule, and is sent separately when a seed
 * is supplied.
 */
export const RULE_CATALOG = [
  {
    key: 'mixDepartments',
    label: 'Mix departments',
    description: 'Round-robin the departments instead of filling one block at a time.',
  },
  {
    key: 'avoidSameDeptAdjacent',
    label: 'No same department adjacent',
    description: 'Blocks a student sitting directly left of / behind another of the same department.',
  },
  {
    key: 'avoidSameDeptDiagonal',
    label: 'No same department diagonally',
    description: 'Also blocks diagonal neighbours (front-left, front-right, …).',
  },
  {
    key: 'avoidSameYearAdjacent',
    label: 'Separate by year',
    description: 'Never place two students of the same year next to each other.',
  },
  {
    key: 'shuffle',
    label: 'Shuffle within departments',
    description: 'Randomises student order inside each department so repeat runs do not follow roll-number order.',
  },
  {
    key: 'keepLastRowClear',
    label: 'Keep last row clear',
    description: 'Reserves the final row for extraInvigilators / reserved candidates.',
  },
  {
    key: 'strictCapacity',
    label: 'Refuse partial allocations',
    description:
      'Off by default: students who cannot be seated are listed on the summary. Turn this on to have the server reject the whole run with 409 instead.',
  },
];

const at = (grid, row, col) => (grid[row] && grid[row][col]) || null;

/**
 * @param {object} state   mock database slice (needs students, halls, exams)
 * @param {object} options { examId, hallIds, rules, departments }
 * @returns {Array}        array of seating plans, one per hall
 */
export function generateSeatingPlan(state, { examId, hallIds, rules = {}, departments }) {
  const mergedRules = { ...DEFAULT_RULES, ...rules };
  const exam = state.exams.find((e) => e.id === examId);
  const halls = state.halls.filter((h) => hallIds.includes(h.id));
  if (!exam) throw { message: 'Exam not found', status: 404 };
  if (!halls.length) throw { message: 'Select at least one hall', status: 400 };

  const wantedDepts = departments?.length ? departments : exam.departments;
  const wantedYears = exam.years?.length ? exam.years : null;
  const random = mulberry32(hashSeed(`${examId}-${hallIds.join('-')}-${JSON.stringify(mergedRules)}`));

  const eligible = state.students.filter(
    (s) =>
      wantedDepts.includes(s.department) &&
      (!wantedYears || wantedYears.includes(Number(s.year))) &&
      Number(s.year) >= Number(exam.minYear ?? 1)
  );

  /**
   * Hall visit order: smallest first, so the part-full hall is the one that ends
   * up under-filled rather than the large one.
   *
   * This used to be gated on a `balanceAcrossHalls` rule. That key was removed
   * from `DEFAULT_RULES`/`RULE_CATALOG` because the backend's
   * `SeatingRulesRequest` has no such property — Jackson drops it silently, so
   * the toggle rendered but the value never reached the server. The ordering is
   * kept unconditional here; note also that the `pickHall` helper it used to
   * feed called `hallQueue.shift()` on *both* branches, so it was a no-op in
   * mock mode too and the rule never had an effect anywhere.
   */
  const hallQueue = [...halls].sort((a, b) =>
    a.capacity - b.capacity || a.id.localeCompare(b.id)
  );

  // ---- 1. per-department queues -------------------------------------------
  const queues = new Map();
  eligible.forEach((student) => {
    if (!queues.has(student.department)) queues.set(student.department, []);
    queues.get(student.department).push(student);
  });
  // `shuffle: false` keeps roll-number order within a department, which is a
  // useful thing to eyeball when debugging a plan. Matches the server key.
  if (mergedRules.shuffle !== false) {
    queues.forEach((value, key) => queues.set(key, shuffle(value, random)));
  }

  /**
   * Divergence from the server, stated rather than hidden: the local engine
   * always allows partial allocation and reports the overflow, whereas the
   * server refuses with `409` when `strictCapacity` is true. Mock mode is a demo
   * aid, and making it refuse would mean the demo cannot show the summary screen
   * that real mode shows by default.
   */

  // ---- 2. seat-by-seat allocation -----------------------------------------
  const plans = [];
  const overflow = [];

  hallQueue.forEach(() => {
    const hall = pickHall();
    if (!hall) return;
    const rows = hall.rows;
    const cols = hall.cols;
    const blocked = new Set((hall.blockedSeats ?? []).map((s) => `${s.row}-${s.col}`));
    const usable = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (blocked.has(`${r}-${c}`)) continue;
        if (mergedRules.keepLastRowClear && r === rows - 1) continue;
        usable.push({ row: r, col: c });
      }
    }

    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

    usable.forEach(({ row, col }) => {
      const left = at(grid, row, col - 1);
      const up = at(grid, row - 1, col);
      const front = at(grid, row + 1, col);
      const diagonals = [
        at(grid, row - 1, col - 1),
        at(grid, row - 1, col + 1),
        at(grid, row + 1, col - 1),
        at(grid, row + 1, col + 1),
      ];

      // Which neighbours are "hard" depends on the active rules. Previously the
      // diagonal rule was always applied, which made the constraint unsatisfiable
      // for exams with only two departments.
      const orthogonal = [left, up, front];
      const hardNeighbours = [
        ...(mergedRules.avoidSameDeptAdjacent ? orthogonal : []),
        ...(mergedRules.avoidSameDeptDiagonal ? diagonals : []),
      ];
      const bannedDepts = new Set(
        hardNeighbours.filter(Boolean).map((n) => n.department)
      );
      const bannedYears = mergedRules.avoidSameYearAdjacent
        ? new Set(orthogonal.filter(Boolean).map((n) => n.year))
        : new Set();

      const candidates = [...queues.entries()]
        .filter(([dept, list]) => list.length > 0 && !bannedDepts.has(dept))
        .sort((a, b) => {
          if (mergedRules.mixDepartments) return b[1].length - a[1].length;
          return a[0].localeCompare(b[0]);
        });

      let chosen = null;
      for (const [, list] of candidates) {
        const next = list[0];
        if (!next) continue;
        if (bannedYears.size && bannedYears.has(next.year)) {
          const idx = list.findIndex((s) => !bannedYears.has(s.year));
          if (idx === -1) continue;
          list.splice(idx, 1);
          chosen = next;
          break;
        }
        list.shift();
        chosen = next;
        break;
      }

      if (!chosen) {
        // No department satisfies the hard rules. Rather than dumping the student
        // into the biggest queue (which produced ~50% adjacency violations on
        // two-department exams), pick the department whose placement sits
        // furthest from the seats already taken. This keeps a checkerboard
        // pattern going even once the strict rule becomes unsatisfiable.
        const ranked = [...queues.entries()]
          .filter(([, list]) => list.length)
          .map(([dept, list]) => {
            let cost = 0;
            if (mergedRules.avoidSameDeptAdjacent) {
              cost += orthogonal.filter((n) => n && n.department === dept).length * 2;
            }
            if (mergedRules.avoidSameDeptDiagonal) {
              cost += diagonals.filter((n) => n && n.department === dept).length;
            }
            return { dept, list, cost };
          })
          .sort((a, b) => a.cost - b.cost || b.list.length - a.list.length);
        if (!ranked.length) return;
        chosen = ranked[0].list.shift();
      }

      grid[row][col] = {
        studentId: chosen.id,
        rollNo: chosen.rollNo,
        name: chosen.name,
        department: chosen.department,
        year: chosen.year,
        section: chosen.section,
        gender: chosen.gender,
      };
    });

    const flat = grid.flat().filter(Boolean);
    plans.push(
      buildPlan({
        exam,
        hall,
        grid,
        blocked: [...blocked].map((key) => {
          const [r, c] = key.split('-').map(Number);
          return { row: r, col: c };
        }),
        seatsFilled: flat.length,
        rules: mergedRules,
      })
    );
  });

  // Any student who could not be seated (halls full).
  queues.forEach((list) => {
    list.forEach((student) => overflow.push(student));
  });

  return { plans, unallocated: overflow };
}

function buildPlan({ exam, hall, grid, blocked, seatsFilled, rules }) {
  const seats = grid.map((row, r) =>
    row.map((seat, c) => {
      const isBlocked = blocked.some((b) => b.row === r && b.col === c);
      return {
        id: `${hall.id}-R${r + 1}C${c + 1}`,
        row: r,
        col: c,
        blocked: isBlocked,
        ...(seat ?? {}),
      };
    })
  );

  const departments = {};
  let allocated = 0;
  seats.forEach((row) =>
    row.forEach((seat) => {
      if (!seat.department) return;
      allocated += 1;
      departments[seat.department] = (departments[seat.department] ?? 0) + 1;
    })
  );

  const verification = verifySeatingPlan({ seats, rows: hall.rows, cols: hall.cols });

  return {
    id: `PL-${exam.id}-${hall.id}`,
    examId: exam.id,
    examCode: exam.code,
    examTitle: exam.title,
    subject: exam.subject,
    course: exam.course,
    date: exam.date,
    startTime: exam.startTime,
    endTime: exam.endTime,
    hallId: hall.id,
    hallName: hall.name,
    hallCode: hall.code,
    rows: hall.rows,
    cols: hall.cols,
    seats,
    stats: {
      capacity: hall.capacity,
      blocked: blocked.length,
      usable: seats.flat().filter((s) => !s.blocked).length,
      allocated,
      utilisation: Math.round((allocated / Math.max(1, hall.capacity)) * 100),
      departments,
    },
    verification,
    rules,
    status: 'GENERATED',
    createdAt: new Date().toISOString(),
    publishedAt: null,
    history: [
      {
        id: `H-${Date.now()}`,
        at: new Date().toISOString(),
        action: 'Plan generated',
        detail: `${allocated} students allocated`,
      },
    ],
  };
}

/** Re-checks a grid and returns violation counts + a 0–100 quality score. */
export function verifySeatingPlan({ seats, rows, cols }) {
  let adjacentSameDept = 0;
  let diagonalSameDept = 0;
  let adjacentSameYear = 0;
  let clashes = 0;
  // Number of neighbour pairs that could be checked — used to normalise the
  // score so a well-packed plan is not punished for having many adjacencies.
  let comparableEdges = 0;
  let comparableDiagonal = 0;
  const seen = new Map();

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const seat = seats[r]?.[c];
      if (!seat || seat.blocked) continue;
      if (seat.studentId) {
        if (seen.has(seat.studentId)) clashes += 1;
        seen.set(seat.studentId, `${r}-${c}`);
      }
      const right = seats[r]?.[c + 1];
      const down = seats[r + 1]?.[c];
      const orthogonal = [right, down].filter((s) => s && !s.blocked && s.studentId);
      comparableEdges += orthogonal.length;
      for (const neighbour of orthogonal) {
        if (neighbour.department && neighbour.department === seat.department) adjacentSameDept += 1;
        if (neighbour.year && seat.year && neighbour.year === seat.year) adjacentSameYear += 1;
      }
      const diagonals = [
        seats[r - 1]?.[c - 1],
        seats[r - 1]?.[c + 1],
        seats[r + 1]?.[c - 1],
        seats[r + 1]?.[c + 1],
      ].filter((d) => d && !d.blocked && d.studentId);
      comparableDiagonal += diagonals.length;
      for (const d of diagonals) {
        if (d.department && d.department === seat.department) diagonalSameDept += 1;
      }
    }
  }

  const totalIssues = adjacentSameDept + diagonalSameDept + clashes;
  // A duplicate placement is a hard failure and dominates the score.
  // Orthogonal adjacency is the primary metric (what `avoidSameDeptAdjacent`
  // targets). Diagonal same-department pairs are only a soft signal: in a
  // two-department exam a checkerboard necessarily puts same-department
  // students on diagonals, so that case can never reach zero.
  const adjacencyRate = comparableEdges ? adjacentSameDept / comparableEdges : 0;
  const diagonalRate = comparableDiagonal ? diagonalSameDept / comparableDiagonal : 0;
  const clashRate = seen.size ? clashes / seen.size : 0;
  const score = Math.max(
    0,
    Math.round(100 - adjacencyRate * 100 - Math.min(diagonalRate, 0.5) * 20 - clashRate * 300)
  );

  return {
    clashes,
    adjacentSameDept,
    diagonalSameDept,
    adjacentSameYear,
    uniqueStudents: seen.size,
    comparableEdges,
    comparableDiagonal,
    adjacencyRate: Number(adjacencyRate.toFixed(4)),
    diagonalRate: Number(diagonalRate.toFixed(4)),
    score,
    isClean: adjacentSameDept === 0 && clashes === 0,
  };
}