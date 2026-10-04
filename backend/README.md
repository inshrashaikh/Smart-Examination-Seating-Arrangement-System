# Smart Examination Seating Arrangement System — Backend

Spring Boot 3 REST API for the Smart Examination Seating Arrangement System. It owns
students, halls, exams, the constraint-based seating engine, invigilation duties,
notifications, dashboards and downloadable reports.

The React frontend in `../src` is the reference client: every response shape here is
built to match what `src/services/index.js` calls and what `src/services/mockApi.js`
returns.

---

## 1. Requirements

| | |
|---|---|
| JDK | 17+ (build target `17`; runs fine on newer JDKs) |
| Maven | 3.8+ |
| Database | H2 by default (zero setup), MySQL 8 optional for persistence |

## 2. Running it

### H2 (default, zero setup)

```bash
mvn spring-boot:run
```

In-memory, wiped on shutdown, MySQL compatibility mode. The H2 console is at
<http://localhost:8080/h2-console> (JDBC URL `jdbc:h2:mem:examseat`, user `sa`,
no password). For an extra explicit run, this is equivalent:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

### MySQL (persistent profile)

Create the database, then start the app with the MySQL profile:

```sql
CREATE DATABASE examseat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Edit `src/main/resources/application.properties` if your MySQL credentials differ,
then:

```bash
mvn spring-boot:run -Dspring.profiles.active=mysql
```

Hibernate creates the schema automatically (`ddl-auto=update`). To start from an empty
database, drop the existing tables first — or see [§7 Schema](#7-schema).

### Build and test

```bash
mvn clean package          # runs the algorithm test suite, produces the jar
java -jar target/exam-seating-backend-1.0.0.jar --spring.profiles.active=h2
```

## 3. Demo accounts

Seeded by `DataSeeder` on first boot. Controlled by `app.seed.enabled=true`.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@exam.com` | `admin123` |
| Faculty 1 | `faculty1@exam.com` | `faculty123` |
| Faculty 2 | `faculty2@exam.com` | `faculty123` |
| Faculty 3 | `faculty3@exam.com` | `faculty123` |
| Faculty 4 | `faculty4@exam.com` | `faculty123` |
| Faculty 5 | `faculty5@exam.com` | `faculty123` |

Seed contents: 200 students (40 each in CSE / IT / ECE / MECH / CIVIL, years 1–4),
8 halls `H-1`…`H-8`, 5 exams `EX-001`…`EX-005`, generated seating plans for
`EX-001`/`EX-002`/`EX-003`, invigilation duties, and notifications.

The seeder is idempotent — it skips creation entirely when the `users` table already
has rows, so restarting never duplicates data.

## 4. Connecting the frontend

The Vite dev server already proxies `/api` → `http://localhost:8080`. Turn off the
mock backend:

```bash
# frontend/.env
VITE_USE_MOCKS=false
```

CORS is configured for `http://localhost:*` and `http://127.0.0.1:*` (`app.cors.allowed-origins`), with credentials enabled.

## 5. Authentication

`POST /api/auth/login` returns a bearer token:

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "token": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": { "id": "U-0001", "name": "…", "email": "admin@exam.com", "role": "ADMIN" }
  },
  "timestamp": "2026-01-01T10:00:00Z",
  "path": "/api/auth/login",
  "errors": null
}
```

Send it on every other call:

```
Authorization: Bearer <token>
```

Tokens are stateless HS256 JWTs validated by `JwtAuthenticationFilter`; there is no
server-side session. Passwords are BCrypt hashes.

A failed login returns `401` with `Invalid email or password` **whatever** went wrong —
unknown email, wrong password, or an account that has been disabled. The responses are
byte-identical apart from the timestamp, so the endpoint cannot be used to enumerate
accounts. The password-length rule lives on registration only: enforcing it at login
too would lock out anyone whose password was reset to something short, and would blame
their password policy for what is really a wrong password.

## 6. Response envelope

Every JSON endpoint returns the same wrapper, which the frontend's axios interceptor
unwraps:

```json
{
  "status": 200,
  "message": "OK",
  "data": { "…": "…" },
  "timestamp": "2026-01-01T10:00:00Z",
  "path": "/api/students",
  "errors": null
}
```

`status` mirrors the HTTP status code. Failures keep the same shape with a non-null
`message`, a 4xx/5xx `status`, and a populated `errors` map for validation problems —
so the client never has to branch on the transport-level status:

```json
{
  "status": 409,
  "message": "Capacity exceeded: 20 eligible students need 20 seats but only 12 are usable across 1 hall(s)",
  "data": null,
  "timestamp": "…",
  "path": "/api/seating/generate",
  "errors": { "required": 20, "available": 12 }
}
```

`path` is filled in by `ApiResponseAdvice` on success and by
`GlobalExceptionHandler` on failure. Report **downloads**
(`?format=pdf` / `?format=excel`) deliberately return raw bytes with a
`Content-Disposition` header instead of the envelope.

Handled in `GlobalExceptionHandler`:

| Situation | HTTP |
|---|---|
| `ApiException` (bad input, not found, conflict, forbidden) | 400 / 404 / 409 / 403 as thrown |
| `InsufficientCapacityException` | 409 |
| `SeatConstraintException` | 409 |
| `MethodArgumentNotValidException`, `ConstraintViolationException` | 400 + `errors` |
| `MaxUploadSizeExceededException` | 413 |
| `HttpRequestMethodNotSupportedException` | 405 |
| `HttpMediaTypeNotSupportedException` | 415 |
| `NoResourceFoundException` (unknown URL) | 404 |
| `AccessDeniedException` | 403 |
| Anything else | 500 |

## 7. Schema

Eight tables, created by Hibernate from the entities in
`src/main/java/com/examseat/entity`. IDs are **strings** with human-readable prefixes,
not database sequences.

| Table | Entity | ID pattern | Notes |
|---|---|---|---|
| `users` | `User` | `U-0001` | `role` enum, BCrypt `password`, `enabled` |
| `students` | `Student` | `S-0001` | unique `roll_no`; `department`, `year`, `section` |
| `halls` | `Hall` | `H-1` | `rows_count` × `cols_count` |
| `exams` | `Exam` | `EX-001` | `status` enum; eligibility in child tables |
| `exam_halls` | `ExamHall` | `EX-001-H-1` | exam↔hall link, unique on `(exam_id, hall_id)` |
| `seat_allocations` | `SeatAllocation` | `EX-001-H-1-3-5` | unique on `(exam_id, hall_id, row_no, col_no)` **and** `(exam_id, student_id)` |
| `invigilation_duties` | `InvigilationDuty` | `D-0001` | faculty↔exam↔hall, `status` enum |
| `notifications` | `Notification` | `N-00001` | per-user, `read_flag`, optional `href` |

Four child tables back the `@ElementCollection` lists: `exam_departments`,
`exam_years`, `hall_facilities` and `hall_blocked_seats`.

**[SCHEMA.md](SCHEMA.md) has the full column-by-column reference with DDL** for each
table, the foreign keys, the bootstrap order for a hand-managed database, and what is
deliberately *not* modelled as a table.

Notes:

- **`hall_blocked_seats`** holds unusable coordinates as
  `(hall_id, row_no, col_no, reason)`. `Hall.usableCapacity()` subtracts them from
  `rows × cols` everywhere capacity is computed, so a broken desk reduces capacity
  and shows as a hatched cell in the grid.
- **`year` is a reserved word** in H2 2.x and a data-type keyword in MySQL, so the
  column is named `study_year` on both `students` and `exam_years`. The Java field,
  the JPQL property (`s.year`) and the JSON field are all still `year`.
- **Two unique indexes on `seat_allocations`, and the second one shapes the swap
  implementation.** `(exam_id, hall_id, row_no, col_no)` stops two students sharing a
  desk; `(exam_id, student_id)` stops one student being seated twice in an exam.
  Swapping two seats therefore cannot simply assign each student to the other's row —
  the database checks uniqueness after every statement, so between the first and second
  `UPDATE` both rows would briefly carry the same student and the constraint would
  fail. `SeatingServiceImpl.applySwap` instead moves the *coordinates*, parking one row
  at `(-1, -1)` — off-grid, so it cannot collide — flushing three times, and leaving
  every student id untouched.
- **Deterministic allocation IDs.** Seat and exam-hall IDs are derived from their
  coordinates, not generated randomly, so regenerating a plan overwrites cleanly
  instead of accumulating orphans.
- **Enums are stored as `VARCHAR`**, never ordinals, so reordering an enum cannot
  silently corrupt existing rows.
- **`@Version` / optimistic locking** is not used; seating generation runs inside a
  single transaction and deletes the previous plan first.
- Dashboard settings are held in a `volatile` in-memory field on
  `DashboardServiceImpl` rather than a table, so they reset on restart. Promoting them
  to a single-row `app_settings` table is the obvious next step.

## 8. The seating algorithm

`com.examseat.algorithm.SeatingAlgorithm` is a pure function of
`(exam, halls, students, rules)` — no Spring beans, no database, no clock. That is why
it is covered by 20 fast unit tests in
`src/test/java/com/examseat/algorithm/SeatingAlgorithmTest.java`.

**Pipeline**

1. **Fetch** eligible students — department *and* year must be in the exam's lists.
2. **Bucket** them into one queue per department, each shuffled with a seeded RNG so
   runs are reproducible.
3. **Order halls** smallest-usable-capacity first, so the tightest fit is filled
   before slack is wasted.
4. **Fill seat by seat**, row-major. For each seat the engine scores every candidate
   department and prefers the one that violates no active rule against its left / up /
   front (and optionally diagonal) neighbours.
5. **Degrade gracefully.** When no department satisfies every rule it picks the least
   costly one — the department furthest from the occupied neighbours — so a
   checkerboard survives instead of collapsing into one solid block.
6. **Capacity gate.** If `strictCapacity` is on (the default) and the halls cannot
   hold everybody, it throws `InsufficientCapacityException` naming both numbers. Turn
   it off to seat what fits and return the remainder in `unallocatedStudents`.
7. **Verify** each grid afterwards and report adjacency violations, diagonal
   violations, clashes and a 0–100 score.

**Rule toggles** (`SeatingRules`, settable per request via `POST /api/seating/generate`):

| Rule | Default | Effect |
|---|---|---|
| `mixDepartments` | `true` | Spread departments instead of filling one block |
| `avoidSameDeptAdjacent` | `true` | No same-department left / front / back neighbours |
| `avoidSameDeptDiagonal` | `true` | Also excludes diagonals |
| `avoidSameYearAdjacent` | `false` | No same-year neighbours |
| `keepLastRowClear` | `false` | Leave the rearmost row empty |
| `strictCapacity` | `true` | Fail instead of partially allocating |
| `seed` | derived | RNG seed; fix it to get byte-identical plans |

**Scoring.** Clashes dominate, orthogonal adjacency is primary, diagonals are a soft
signal capped at a 50% rate:

```
score = max(0, round(100 - adjacencyRate * 100 - min(diagonalRate, 0.5) * 20 - clashRate * 300))
```

The diagonal cap matters: with two departments a perfect checkerboard *always* puts
same-department students on the diagonals, so uncapped scoring would punish the
optimal plan. Such a plan scores exactly 90.

**Known limitation — the fill is greedy, not optimal.** The engine walks the grid in
row-major order and, for each seat, takes the first student whose department is not
already present among that seat's left / front / back / diagonal neighbours. That is a
single pass with no backtracking, so it is not guaranteed to find a zero-clash layout
even when one exists. It reports what it achieved honestly rather than hiding it, and
the seeded data shows both cases:

| Seeded plan | Split | Adjacency clashes | Zero-clash possible? |
|---|---|---|---|
| `EX-001-H-1` | 15 IT / 15 CSE | 0 | yes — achieved |
| `EX-001-H-2` | 15 IT / 12 CSE | 3 | **yes — missed** |
| `EX-002-H-5` | 18 ECE / 18 CSE | 0 | yes — achieved |
| `EX-003-H-3` | 16 MECH / 16 CIVIL | 0 | yes — achieved |
| `EX-003-H-4` | 18 MECH / 11 CIVIL | 9 | no — forced |

`EX-001-H-2` is the one genuine miss: its 5x6 grid has 15 free even-parity and 15 free
odd-parity cells, and a grid graph is bipartite by `(row + col)` parity with no two
same-parity cells orthogonally adjacent, so seating 15 IT on odd cells and 12 CSE on
even cells would clash zero times.

`EX-003-H-4` is *not* a miss. Its split is 18 MECH to 11 CIVIL, but a 4x8 grid has only
16 cells of each parity, so 18 MECH students cannot all sit within one parity class —
some clashes are unavoidable there no matter how the fill is ordered.

If you need provably optimal layouts rather than a good greedy pass, the fix is a
bounded repair stage after the fill: find a violating adjacent pair and swap one of its
occupants with a distant student whenever the total violation count drops. That is
deliberately *not* implemented here, because it changes layouts the existing algorithm
tests assert and your spec described the single-pass fill with graceful fallback.

**Swapping seats.** `POST /api/seating/plans/{planId}/swap` re-validates the
constraint that would be broken by the swap against an in-memory department map of the
affected halls, and rejects it with `SeatConstraintException` (`409`) rather than
silently producing a broken plan. Send `"validate": false` to override — validation is
on unless you explicitly turn it off.

What counts as "broken" is narrower than it looks, because only **orthogonal**
neighbours are checked:

- **Same-department pairs always pass.** Exchanging two CSE students cannot create a
  same-department neighbour that was not already there, so it is always accepted — and
  in a checkerboard plan roughly half of all pairs are same-department. There is
  therefore no shortage of legal swaps; in the seeded data 210 of 435 pairs in a
  30-seat hall qualify.
- **Horizontally or vertically adjacent pairs from different departments always fail**,
  because swapping a checkerboard puts like beside like by definition.
- **Diagonals are ignored on purpose.** With only two departments a checkerboard always
  produces diagonal pairs, so banning them would make every swap illegal.

The unresolvable-plan-id message is the same for `get`, `swap` and `publish`, so a typo
reads identically whichever route you hit.

## 9. API reference

Base URL `http://localhost:8080`. Everything below `/api` needs a bearer token except
`/api/auth/**` and `/api/health`.

### Auth
| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/register` | public |
| GET | `/api/auth/me` | any |
| PUT | `/api/auth/me` | any |
| POST | `/api/auth/logout` | any |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password` | public |

### Students — admin
| Method | Path | Notes |
|---|---|---|
| GET | `/api/students` | paged: `page`, `pageSize`, `search`, `department`, `year`, `sortBy`, `sortDir` |
| GET | `/api/students/all` | unpaged, for dropdowns; same filters minus paging |
| GET | `/api/students/search?q=` | free-text across name / roll number / email |
| GET | `/api/students/roll/{rollNo}` | one student by exact roll number |
| GET | `/api/students/template` | download CSV import template |
| POST | `/api/students` | create |
| PUT | `/api/students/{id}` | update |
| DELETE | `/api/students/{id}` | delete |
| POST | `/api/students/upload` | `multipart/form-data`, field `file` (`.csv` / `.xlsx`) |
| POST | `/api/students/import` | JSON array of rows |

Bulk import is **partial-success**: valid rows are inserted, invalid ones come back in
`data.errors` as `{row, rollNo, field, message}`. Duplicate roll numbers inside the
file are caught too.

### Halls — admin
`GET /api/halls`, `GET /api/halls/availability`, `GET /api/halls/{id}`,
`GET /api/halls/code/{code}`, `POST /api/halls`, `PUT /api/halls/{id}`,
`DELETE /api/halls/{id}`

### Exams — admin
`GET /api/exams`, `GET /api/exams/upcoming`, `GET /api/exams/{id}`,
`GET /api/exams/code/{code}`, `GET /api/exams/{id}/eligible-students`,
`POST /api/exams`, `PUT /api/exams/{id}`, `DELETE /api/exams/{id}`,
`POST /api/exams/{id}/publish`, `POST /api/exams/{id}/complete`

Publishing flips the status to `PUBLISHED` and notifies every assigned invigilator.

### Seating — admin
| Method | Path | Notes |
|---|---|---|
| POST | `/api/seating/generate` | body: `examId`, `hallIds?`, `rules?` |
| GET | `/api/seating/plans` | all generated plans, optionally `?examId=` |
| GET | `/api/seating/plans/{planId}` | one plan with grid + stats |
| GET | `/api/seating/exam/{examId}/hall/{hallId}` | single-hall grid |
| GET | `/api/seating/exam/{examId}/students` | per-student seat lookup |
| POST | `/api/seating/plans/{planId}/swap` | `{a, b}` seat refs `{row, col}` |
| PUT | `/api/seating/swap` | by allocation id instead |
| POST | `/api/seating/plans/{planId}/publish` | publishes the exam, returns the plan |
| DELETE | `/api/seating/exam/{examId}` | reset (delete) the plan |

A **plan id is hall-scoped**: `EX-001-H-1`. It is the `exam_halls` primary key, so
`GET /api/seating/plans` hands the frontend exactly the ids it needs to pass back into
`swap` and `publish`. Because both the exam id and the hall id contain a hyphen, the
id is *resolved against the database*, never split on `-`. A bare exam id is also
accepted by `GET /seating/plans/{id}` and resolves to that exam's first hall.

Regeneration is idempotent: seat and exam-hall ids are derived from their coordinates,
so re-running `generate` replaces the previous plan instead of accumulating rows.

### Duties and faculty — admin, plus scoped views for faculty
| Method | Path | Role |
|---|---|---|
| GET | `/api/faculty` | admin |
| GET | `/api/faculty/{id}` | admin |
| GET | `/api/duties` | admin |
| POST | `/api/duties` (or `/api/duties/assign`) | admin |
| DELETE | `/api/duties/{id}` | admin |
| PATCH | `/api/duties/{id}/status` | admin |
| GET | `/api/duties/faculty?email=` | any user — own duties; admin may name anyone |
| GET | `/api/duties/my` | faculty — own duties |
| GET | `/api/duties/my/upcoming` | faculty |
| GET | `/api/duties/my/hall/{hallId}` | faculty, only for halls they invigilate |
| GET | `/api/duties/my/hall/{hallId}/plan` | faculty — seat grid |
| GET | `/api/duties/my/hall/{hallId}/attendance` | faculty — attendance sheet |

`PATCH /api/duties/{id}/status` accepts the new status either way round — as a query
parameter or as a JSON body, whichever the client finds convenient:

```
PATCH /api/duties/D-0001/status?status=COMPLETED
PATCH /api/duties/D-0001/status      {"status": "COMPLETED"}
```

Sending neither is a `400` naming both forms rather than a `500`.

**`?email=` is clamped.** An admin may pass any address; a faculty member passing
anyone else's gets a `403`. The parameter exists so an admin can look somebody up —
honouring it unconditionally would let any signed-in user read a colleague's duties
and dashboard by editing one query string. The same clamp applies to
`/api/dashboard/faculty`.

Faculty-scoped hall endpoints are gated on an actual duty existing for the caller, not
just on the role.

### Reports — `?format=pdf|excel` on all of them
| Method | Path | `data` shape |
|---|---|---|
| GET | `/api/reports/hall-wise?examId=` | `{exam, rows, totals}` |
| GET | `/api/reports/hall-wise/{examId}` | alias |
| GET | `/api/reports/department-wise?examId=` | `{exam, rows}` |
| GET | `/api/reports/department-wise/{examId}` | alias |
| GET | `/api/reports/student-wise?examId=` | bare **array** of rows |
| GET | `/api/reports/student-wise/{examId}` | alias |
| GET | `/api/reports/attendance?examId=` | `{exam, halls, rows, summary}` |
| GET | `/api/reports/attendance/{examId}/{hallId}` | one hall |
| GET | `/api/reports/attendance-sheet/{examId}/{hallId}` | printable sheet |

### Dashboard
`GET /api/dashboard/admin`, `GET /api/dashboard/stats`, `GET /api/dashboard/faculty`,
`GET /api/activity`, `GET /api/settings`, `PUT|POST /api/settings`, `GET /api/health`

`/dashboard/faculty` is readable by faculty: with no `?email=` they always get their
own, and naming anyone else is a `403`. `/dashboard/admin` and `/dashboard/stats` stay
admin-only.

### Notifications — any authenticated user, own rows only
`GET /api/notifications`, `GET /api/notifications/unread-count`,
`PUT /api/notifications/{id}/read`, `PUT /api/notifications/read-all`

### What a faculty member can read

Faculty are not admins, so the read surface is deliberately narrow. It is enough for
every page in the faculty half of the app and nothing more:

| Area | Faculty | Admin |
|---|---|---|
| `/api/halls`, `/api/exams` | read all | read all |
| `/api/duties/my*`, `/api/duties/faculty?email=self` | own duties only | any |
| `/api/dashboard/faculty` | own | any |
| `/api/notifications*` | own rows | own rows |
| `/api/seating/plans`, `/api/seating/plans/{id}` | **plans for halls they invigilate only** | every plan |
| `/api/reports/*` | read | read |
| `/api/students/**`, `/api/faculty/**`, `/api/settings/**` | `403` | full access |

The seating-plan scoping is worth spelling out: `GET /api/seating/plans` returns only
the plans whose hall the caller holds a duty for, and asking for a specific plan
outside that set is a `403`, not a `404` — "you may not see this" and "this does not
exist" are different answers and the client can act on the first one.

> **Careful with Ant path patterns when adding a faculty route.**
> In `SecurityConfig`, `*` matches **exactly one** path segment and `**` matches any
> number. A permit rule for `/api/duties/my/*` therefore covers
> `/api/duties/my/upcoming` (one extra segment) but **not**
> `/api/duties/my/hall/{hallId}/plan`, which has three. Anything deeper than one
> segment under a permit-listed prefix silently falls through to the
> `/api/duties/**` → `hasRole("ADMIN")` rule and returns `403` to a legitimate
> faculty caller. The duty-scoped hall routes are listed explicitly
> (`/api/duties/my/hall/*`, `.../plan`, `.../attendance`) for that reason; add any
> new nested faculty route to the permit list by its full path.

## 10. Compatibility aliases

The frontend and the original spec named a few routes differently. Both are served,
so neither client breaks:

| Spec path | Frontend path (canonical) |
|---|---|
| `GET /reports/hall-wise/{examId}` | `GET /reports/hall-wise?examId=` |
| `GET /duties/my` | `GET /duties/faculty?email=` |
| `GET /dashboard/stats` | `GET /dashboard/admin` |
| `POST /exams/{id}/publish` | `POST /seating/plans/{planId}/publish` |
| `GET /seating/exam/{examId}/hall/{hallId}` | `GET /seating/plans/{planId}` |
| `PUT /seating/swap` | `POST /seating/plans/{planId}/swap` |
| — | `DELETE /seating/exam/{examId}` |
| — | `GET /reports/attendance-sheet/{examId}/{hallId}` |

## 11. Swagger / OpenAPI

- UI: <http://localhost:8080/swagger-ui.html>
- JSON: <http://localhost:8080/v3/api-docs>

## 12. Tests

```bash
mvn test
```

56 tests in four classes. The split is deliberate: the pure algorithm is tested
without Spring because it is where the combinatorics live, and everything involving
persistence or access control is tested against a real H2 database because those are
exactly the bugs a mock will happily wave through.

**`SeatingAlgorithmTest` — 20 tests, no Spring.** The engine end to end: seating
everyone exactly once, spilling across halls, determinism (identical inputs →
identical layout, and different seeds → different layouts), strict vs. relaxed
capacity, blocked seats, `keepLastRowClear`, each rule toggle, hand-built grid
verification, clash detection, seat labels, and degenerate inputs.

Two bugs were found this way and fixed: `List.of()` was rejecting the null
out-of-bounds neighbours (an NPE on the very first seat of the first hall), and halls
past the point where every student was seated were being dropped from the result
instead of returned as empty grids.

**`SeatingServiceImplTest` — 10 tests, real database.** Generate, regenerate
(idempotence), swap, publish, reset, strict-capacity rollback, relaxed-capacity
remainder, plan-id resolution against the database, and blocked seats.

**`StudentServiceImplTest` — 10 tests.** Roster import from CSV and Excel: id
minting, a UTF-8 BOM, header-name matching and column order, bad rows reported
without discarding the good ones, duplicates within a file and against the database,
and a full field-by-field mapping check.

**`SecurityScopingTest` — 16 tests, through the real filter chain.** Login success,
wrong password, unknown email, short password, registration policy, missing and
forged tokens, faculty reading their own dashboard, faculty being refused a
colleague's, admins inspecting anyone, seating plans scoped to the caller's own halls,
and faculty being refused every admin domain.

Four more bugs came out of the last three classes, none of which any amount of
code-reading would have surfaced:

- **Every seat swap was a `500`.** Assigning the two students to each other's rows
  transiently duplicates `(exam_id, student_id)` between the two `UPDATE`s. Fixed by
  moving coordinates instead, parking one row off-grid and flushing three times.
- **`POST /api/seating/plans/{id}/swap` rejected the frontend's own request** with
  `examId is required` — the field was `@NotBlank` even though the plan-scoped route
  takes the exam from its path. And `validate` defaulted to `false` when omitted
  (Jackson builds through the no-args constructor, so `@Builder.Default` does not
  apply), silently disabling the adjacency check the field's own comment promised
  would be on by default.
- **Every roster upload was a `500`.** The id-minting loop appended to a list built by
  `Stream.toList()`, which is immutable.
- **Any faculty member could read any other faculty member's dashboard and duties**
  just by changing `?email=`. The clamp now lives in one place,
  `CurrentUser.resolveTarget`, used by every controller that takes the parameter.

A third pattern showed up across all three: `List.of(...)` throws on null elements,
`Stream.toList()` is immutable, and Hibernate clears `@ElementCollection` lists in
place during a merge. All three now use `Arrays.asList` or an explicit
`new ArrayList<>(...)`, with a comment saying why at each site.

## 13. Postman

`postman_collection.json` in this directory has every endpoint pre-populated, with
test scripts that chain the token from login into the rest of the collection.
