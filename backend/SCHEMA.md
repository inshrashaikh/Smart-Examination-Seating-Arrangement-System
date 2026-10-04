# Database Schema

Reference DDL for the MySQL 8 schema this application expects. Hibernate creates the
schema itself from the entities (`spring.jpa.hibernate.ddl-auto=update`), so this file
is documentation and a starting point for a hand-managed database — not something the
application executes.

Key facts:

- **String primary keys** with human-readable prefixes. No sequences, no auto-increment.
  `IdFactory` mints them (`U-0001`, `S-0001`, `H-1`, `EX-001`, `D-0001`, `N-00001`).
- **Enum columns are stored as `VARCHAR`** (`EnumType.STRING`), never ordinals, so
  reordering an enum cannot silently corrupt existing rows.
- **Timestamps are `TIMESTAMP(6)`** holding UTC instants.
- **`year` is spelled `study_year`** on both `students` and `exam_years`: `YEAR` is a
  reserved word in H2 2.x and a data-type keyword in MySQL.
- **Four child tables** back the `@ElementCollection` lists: `exam_departments`,
  `exam_years`, `hall_facilities`, `hall_blocked_seats`.
- **Allocation ids are derived from coordinates**, never random, so regenerating a
  seating plan replaces rows instead of accumulating orphans.

---

## ER overview

```
users ──< invigilation_duties >── halls
  │            │                  │
  │            └──< exam_halls >──┤
  │                    │           │
  └──< notifications   └──< exams ──┘
                         │      │
students ───────────────┘      └──< seat_allocations >── halls
```

---

## `users`

One row per admin or faculty account. Students are **not** users — they live in
`students` and cannot log in.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `VARCHAR(32)` | PK | `U-0001` |
| `name` | `VARCHAR(120)` | no | |
| `email` | `VARCHAR(160)` | no | **unique**, login identifier |
| `password` | `VARCHAR(100)` | no | BCrypt hash |
| `role` | `VARCHAR(16)` | no | `ADMIN` \| `FACULTY` |
| `department` | `VARCHAR(80)` | yes | |
| `phone` | `VARCHAR(40)` | yes | |
| `title` | `VARCHAR(120)` | yes | e.g. "Associate Professor" |
| `employee_id` | `VARCHAR(40)` | yes | |
| `photo` | `VARCHAR(400)` | yes | data URL or object key |
| `enabled` | `BOOLEAN` | no | default `1` |
| `created_at` | `TIMESTAMP(6)` | no | immutable |

```sql
CREATE TABLE users (
  id            VARCHAR(32)  NOT NULL,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL,
  password      VARCHAR(100) NOT NULL,
  role          VARCHAR(16)  NOT NULL,
  department    VARCHAR(80),
  phone         VARCHAR(40),
  title         VARCHAR(120),
  employee_id   VARCHAR(40),
  photo         VARCHAR(400),
  enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_users_email UNIQUE (email)
);
```

---

## `students`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `VARCHAR(32)` | PK | `S-0001` |
| `roll_no` | `VARCHAR(40)` | no | **unique** — the human identifier |
| `name` | `VARCHAR(120)` | no | |
| `email` | `VARCHAR(160)` | yes | |
| `phone` | `VARCHAR(40)` | yes | |
| `department` | `VARCHAR(16)` | no | `CSE`, `IT`, `ECE`, `MECH`, `CIVIL` |
| `study_year` | `INT` | no | 1–4 |
| `section` | `VARCHAR(8)` | yes | `A`, `B`, `C` |
| `gender` | `VARCHAR(16)` | yes | |
| `prn` | `VARCHAR(40)` | yes | programme registration number |
| `photo` | `VARCHAR(400)` | yes | |
| `created_at` | `TIMESTAMP(6)` | no | immutable |

Indexes: `idx_student_roll` on `roll_no` (unique), `idx_student_dept_year` on
`(department, study_year)` — the second one backs the eligible-student query, which
filters on exactly those two columns.

```sql
CREATE TABLE students (
  id          VARCHAR(32)  NOT NULL,
  roll_no     VARCHAR(40)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(160),
  phone       VARCHAR(40),
  department  VARCHAR(16)  NOT NULL,
  study_year  INT          NOT NULL,
  section     VARCHAR(8),
  gender      VARCHAR(16),
  prn         VARCHAR(40),
  photo       VARCHAR(400),
  created_at  TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_students_roll_no UNIQUE (roll_no)
);
CREATE INDEX idx_student_dept_year ON students (department, study_year);
```

---

## `halls`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `VARCHAR(32)` | PK | `H-1` |
| `code` | `VARCHAR(40)` | no | **unique** — `A-101` |
| `name` | `VARCHAR(120)` | no | |
| `building` | `VARCHAR(80)` | yes | |
| `block` | `VARCHAR(80)` | yes | `A`, `B` |
| `capacity` | `INT` | no | nominal; `rows × cols` is authoritative |
| `rows_count` | `INT` | no | grid height |
| `cols_count` | `INT` | no | grid width |
| `type` | `VARCHAR(24)` | yes | `LECTURE`, `SEMINAR`, `LAB` |
| `board` | `VARCHAR(60)` | yes | `SMART`, `WHITEBOARD` |

```sql
CREATE TABLE halls (
  id          VARCHAR(32) NOT NULL,
  code        VARCHAR(40) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  building    VARCHAR(80),
  block       VARCHAR(80),
  capacity    INT NOT NULL,
  rows_count  INT NOT NULL,
  cols_count  INT NOT NULL,
  type        VARCHAR(24),
  board       VARCHAR(60),
  PRIMARY KEY (id),
  CONSTRAINT uk_halls_code UNIQUE (code)
);
```

### `hall_facilities`

```sql
CREATE TABLE hall_facilities (
  hall_id VARCHAR(32)  NOT NULL,
  facility VARCHAR(60) NOT NULL,
  PRIMARY KEY (hall_id, facility),
  CONSTRAINT fk_facilities_hall FOREIGN KEY (hall_id) REFERENCES halls (id)
);
```

### `hall_blocked_seats`

Unusable desks — a broken chair, a desk under repair. Coordinates are **zero-based**,
matching the seating grid, so `(row_no, col_no)` is directly renderable.

```sql
CREATE TABLE hall_blocked_seats (
  hall_id VARCHAR(32)  NOT NULL,
  row_no  INT          NOT NULL,
  col_no  INT          NOT NULL,
  reason  VARCHAR(120),
  PRIMARY KEY (hall_id, row_no, col_no),
  CONSTRAINT fk_blocked_hall FOREIGN KEY (hall_id) REFERENCES halls (id)
);
```

`Hall.usableCapacity()` is `rows × cols − blocked count`. Every capacity check, the
strict-capacity gate and the dashboard's utilisation figures all use the usable value,
never the nominal one.

---

## `exams`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `VARCHAR(32)` | PK | `EX-001` |
| `code` | `VARCHAR(40)` | **unique** | display code |
| `subject` | `VARCHAR(160)` | yes | |
| `subject_code` | `VARCHAR(40)` | yes | |
| `title` | `VARCHAR(200)` | yes | |
| `course` | `VARCHAR(120)` | yes | |
| `exam_date` | `DATE` | no | |
| `start_time` | `TIME` | no | |
| `end_time` | `TIME` | no | |
| `duration_hours` | `INT` | yes | |
| `min_year` | `INT` | yes | lowest eligible year |
| `status` | `VARCHAR(16)` | no | `SCHEDULED`, `ALLOCATED`, `PUBLISHED`, `COMPLETED` |
| `created_at` | `TIMESTAMP(6)` | no | immutable |

```sql
CREATE TABLE exams (
  id              VARCHAR(32)  NOT NULL,
  code            VARCHAR(40)  NOT NULL,
  subject         VARCHAR(160),
  subject_code    VARCHAR(40),
  title           VARCHAR(200),
  course          VARCHAR(120),
  exam_date       DATE         NOT NULL,
  start_time      TIME         NOT NULL,
  end_time        TIME         NOT NULL,
  duration_hours  INT,
  min_year        INT,
  status          VARCHAR(16)  NOT NULL,
  created_at      TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_exams_code UNIQUE (code)
);
```

### `exam_departments` / `exam_years`

Eligibility is denormalised onto the exam rather than inferred from the course, so an
exam can span departments.

```sql
CREATE TABLE exam_departments (
  exam_id    VARCHAR(32) NOT NULL,
  department VARCHAR(16) NOT NULL,
  PRIMARY KEY (exam_id, department),
  CONSTRAINT fk_dept_exam FOREIGN KEY (exam_id) REFERENCES exams (id)
);

CREATE TABLE exam_years (
  exam_id     VARCHAR(32) NOT NULL,
  study_year  INT NOT NULL,
  PRIMARY KEY (exam_id, study_year),
  CONSTRAINT fk_years_exam FOREIGN KEY (exam_id) REFERENCES exams (id)
);
```

A student is eligible when `students.department IN (exam_departments)` **and**
`students.study_year >= exams.min_year`. The service prefers an explicit
`exam_years` list when one is present and falls back to `min_year` otherwise.

---

## `exam_halls`

The exam↔hall join. Its primary key is also the **plan id** the API exposes
(`EX-001-H-1`), which is why `GET /api/seating/plans` can hand the frontend exactly the
identifiers it needs to pass back into `swap` and `publish`.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `VARCHAR(64)` | PK | `EX-001-H-1` |
| `exam_id` | `VARCHAR(32)` | no | → `exams` |
| `hall_id` | `VARCHAR(32)` | no | → `halls` |
| `created_at` | `TIMESTAMP(6)` | no | immutable |

```sql
CREATE TABLE exam_halls (
  id          VARCHAR(64)  NOT NULL,
  exam_id     VARCHAR(32)  NOT NULL,
  hall_id     VARCHAR(32)  NOT NULL,
  created_at  TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_exam_hall UNIQUE (exam_id, hall_id),
  CONSTRAINT fk_exam_halls_exam  FOREIGN KEY (exam_id) REFERENCES exams (id),
  CONSTRAINT fk_exam_halls_hall  FOREIGN KEY (hall_id) REFERENCES halls (id)
);
```

Because both the exam id and the hall id contain a hyphen, `EX-001-H-1` is ambiguous as
a string. The service therefore **resolves** plan ids against this table instead of
splitting on `-`.

---

## `seat_allocations`

One row per occupied seat. The id is derived from its coordinates, so writing the same
plan twice is an upsert rather than a duplicate.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `VARCHAR(80)` | PK | `EX-001-H-1-3-5` |
| `exam_id` | `VARCHAR(32)` | no | |
| `hall_id` | `VARCHAR(32)` | no | |
| `student_id` | `VARCHAR(32)` | no | → `students` |
| `row_no` | `INT` | no | zero-based |
| `col_no` | `INT` | no | zero-based |
| `seat_label` | `VARCHAR(16)` | yes | human label, e.g. `D4` |
| `created_at` | `TIMESTAMP(6)` | no | immutable |

```sql
CREATE TABLE seat_allocations (
  id          VARCHAR(80)  NOT NULL,
  exam_id     VARCHAR(32)  NOT NULL,
  hall_id     VARCHAR(32)  NOT NULL,
  student_id  VARCHAR(32)  NOT NULL,
  row_no      INT          NOT NULL,
  col_no      INT          NOT NULL,
  seat_label  VARCHAR(16),
  created_at  TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_seat UNIQUE (exam_id, hall_id, row_no, col_no),
  CONSTRAINT fk_seat_exam    FOREIGN KEY (exam_id)    REFERENCES exams (id),
  CONSTRAINT fk_seat_hall    FOREIGN KEY (hall_id)    REFERENCES halls (id),
  CONSTRAINT fk_seat_student FOREIGN KEY (student_id) REFERENCES students (id)
);
CREATE INDEX idx_seat_student ON seat_allocations (student_id);
CREATE INDEX idx_seat_exam    ON seat_allocations (exam_id);
```

The `(exam_id, hall_id, row_no, col_no)` unique constraint is what makes a swap safe
and what prevents a plan from ever seating the same student twice in a hall.

---

## `invigilation_duties`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `VARCHAR(32)` | PK | `D-0001` |
| `faculty_id` | `VARCHAR(32)` | no | → `users` |
| `exam_id` | `VARCHAR(32)` | no | → `exams` |
| `hall_id` | `VARCHAR(32)` | no | → `halls` |
| `role` | `VARCHAR(24)` | no | `INVIGILATOR`, `INTERNAL`, `EXTERNAL` |
| `duty_date` | `DATE` | no | |
| `status` | `VARCHAR(16)` | no | `ASSIGNED`, `CONFIRMED`, `COMPLETED`, `CANCELLED` |
| `assigned_at` | `TIMESTAMP(6)` | no | immutable |

```sql
CREATE TABLE invigilation_duties (
  id          VARCHAR(32)  NOT NULL,
  faculty_id  VARCHAR(32)  NOT NULL,
  exam_id     VARCHAR(32)  NOT NULL,
  hall_id     VARCHAR(32)  NOT NULL,
  role        VARCHAR(24)  NOT NULL,
  duty_date   DATE         NOT NULL,
  status      VARCHAR(16)  NOT NULL,
  assigned_at TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_duty UNIQUE (faculty_id, exam_id, hall_id, duty_date),
  CONSTRAINT fk_duty_faculty FOREIGN KEY (faculty_id) REFERENCES users (id),
  CONSTRAINT fk_duty_exam    FOREIGN KEY (exam_id)    REFERENCES exams (id),
  CONSTRAINT fk_duty_hall    FOREIGN KEY (hall_id)    REFERENCES halls (id)
);
CREATE INDEX idx_duty_faculty ON invigilation_duties (faculty_id);
CREATE INDEX idx_duty_date    ON invigilation_duties (duty_date);
```

---

## `notifications`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `VARCHAR(32)` | PK | `N-00001` |
| `user_id` | `VARCHAR(32)` | no | → `users` |
| `type` | `VARCHAR(24)` | yes | `INFO`, `SUCCESS`, `WARNING`, `ERROR` |
| `title` | `VARCHAR(160)` | no | |
| `message` | `VARCHAR(500)` | no | |
| `read_flag` | `BOOLEAN` | no | default `0` |
| `href` | `VARCHAR(300)` | yes | deep link the UI can navigate to |
| `created_at` | `TIMESTAMP(6)` | no | |

```sql
CREATE TABLE notifications (
  id          VARCHAR(32)  NOT NULL,
  user_id     VARCHAR(32)  NOT NULL,
  type        VARCHAR(24),
  title       VARCHAR(160) NOT NULL,
  message     VARCHAR(500) NOT NULL,
  read_flag   BOOLEAN      NOT NULL DEFAULT FALSE,
  href        VARCHAR(300),
  created_at  TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (id)
);
CREATE INDEX idx_notification_user ON notifications (user_id, read_flag);
```

Every notification query is scoped by `user_id`, so one user can never read another's.

---

## Not modelled as a table

**Dashboard settings** (`institutionName`, `sessionName`, `allowRescheduling`, …) live
in a `volatile` field on `DashboardServiceImpl` and reset on restart. They are read far
more often than written and never joined, so a table would be pure overhead here; the
obvious next step, if they ever need persistence, is a single-row `app_settings` table
keyed on a constant id.

**Attendance marks** are not persisted. The attendance sheet is derived from the seating
plan — every allocated student starts "present" — and the printable PDF is generated on
demand. Adding real attendance capture later means a new `attendance` table keyed on
`(exam_id, student_id)`, not a change here.

---

## Bootstrap order

Foreign keys dictate the order a hand-managed database must be populated in:

1. `users`
2. `students`
3. `halls`, then `hall_facilities`, `hall_blocked_seats`
4. `exams`, then `exam_departments`, `exam_years`
5. `exam_halls`
6. `seat_allocations`
7. `invigilation_duties`
8. `notifications`

For a fresh database the application needs none of this — `ddl-auto=update` creates it,
and `DataSeeder` populates it with 200 students, 8 halls, 5 exams, generated plans,
duties and notifications on first boot.