# Smart Examination Seating Arrangement System — Frontend

React + Vite frontend for the **Smart Examination Seating Arrangement System**: an
examination-cell dashboard that allocates exam seats clash-free, prints hall plans
and hands invigilation duties to faculty.

It is wired to the **real Spring Boot backend**. Every page reads and writes through
`src/services/*`, which own the REST paths; no page builds a URL. A demo data layer is
still available behind a single env flag when you want to work on the UI without the JVM
running.

The backend lives in [`backend/`](backend) — see [`backend/README.md`](backend/README.md)
for the API contract and [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) for an end-to-end
verification script.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Build | Vite 5 |
| UI | React 18 |
| Routing | react-router-dom 6 |
| Styling | Tailwind CSS 3 + design tokens |
| Animation | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts |
| HTTP | Axios, one instance, interceptors for auth + errors |
| Toasts | `react-hot-toast` (API errors) + an animated `ToastContext` (in-page feedback) |
| Extras | `cn()` helper, `useFetch` / `useDebounce` hooks, context providers |

---

## Install & run

### Prerequisites
- JDK 17+ ([Temurin](https://adoptium.net))
- Maven 3.8+ (or use the included `mvnw` wrapper if present)
- Node.js 18+

### Clone
```bash
git clone https://github.com/inshrashaikh/Smart-Examination-Seating-Arrangement-System.git
cd Smart-Examination-Seating-Arrangement-System
```

### Backend (H2 profile, no MySQL needed)
Open terminal 1 in the project root:
```bash
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=h2"
```
H2 is auto-seeded on first run (200 students, 8 halls, 5 exams).
Console: http://localhost:8080/h2-console (JDBC URL `jdbc:h2:mem:examseat`, user `sa`, no password).

### Frontend
Open terminal 2 in the project root:
```bash
npm install
npm run dev
```
Open http://localhost:5173

### Demo logins
- Admin: `admin@exam.com` / `admin123`
- Faculty: `faculty1@exam.com` / `faculty123`
### Full demo flow (end-to-end)

1. **Backend** starts on `http://localhost:8080` (H2 profile)
2. **Frontend** opens at `http://localhost:5173`
3. Log in as **Examination cell** (`admin@exam.com` / `admin123`)
4. Go to **Students list** → add/verify students
5. Go to **Generate Seating** → select exam & halls → generate plan
6. Go to **Hall Plan Viewer** → swap two seats → verify conflict highlighting
7. Export PDF from the hall plan
8. Log in as **Faculty** (`faculty1@exam.com` / `faculty123`)
9. View **My Duties** → view hall plan (scoped to their halls)
10. Mark attendance → marks persist server-side → download sheet

### Health checks

```powershell
curl http://localhost:8080/api/health    # 200 {"status":"UP"}
curl http://localhost:5173/api/health    # 200 — Vite proxy live
```

Swagger is at <http://localhost:8080/swagger-ui.html>, the raw spec at
<http://localhost:8080/v3/api-docs>, and the seeded database at
<http://localhost:8080/h2-console> (`jdbc:h2:mem:examseat`, user `sa`, no password).

```powershell
npm run build      # production build into dist/
npm run preview    # serve the built dist/
```

Requires Node 18+ (developed on Node 24).

---

## Demo accounts

Seeded by `backend/…/config/DataSeeder.java`. The login screen lists them and has
one-click fill buttons.

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Examination cell (ADMIN) | `admin@exam.com` | `admin123` | `/admin` |
| Faculty | `faculty1@exam.com` | `faculty123` | `/faculty` |
| Faculty | `faculty2@exam.com` … `faculty5@exam.com` | `faculty123` | `/faculty` |

`faculty1` invigilates **H-4 / EX-003** (29 candidates) — useful for testing the
duty-scoped pages. `faculty3` invigilates **H-1 / EX-001**, so it is the right
account for verifying that a faculty member cannot read another hall's plan.

The seed also provides 200 students, 8 halls (two with a blocked seat), 5 exams, 154
allocations and 5 duties, so every page has real content on first load.

---

## Configuration

`.env` (committed) / `.env.example`:

```bash
# Base URL every service builds its path on. Keep `/api` for the Vite dev proxy;
# use the absolute URL when serving a production build from a different origin.
VITE_API_URL=/api

# Where the backend actually lives — used by the proxy and the "backend down" banner.
VITE_API_ORIGIN=http://localhost:8080

# false = real Spring Boot API (default)
# true  = in-memory demo dataset from src/services/mockApi.js, no backend needed
VITE_USE_MOCKS=false
```

`vite.config.js` proxies `/api` → `VITE_API_ORIGIN`, so in development the browser only
ever talks to the dev server and CORS never comes up.

Switching to demo mode is a one-line change: `VITE_USE_MOCKS=true`.

---

## The service layer

One module per domain. Each owns its REST paths; pages import from the barrel and never
touch axios.

| File | Owns |
| --- | --- |
| `services/config.js` | env reads, `USE_MOCKS` toggle, storage keys, debounce constant |
| `services/api.js` | the axios instance — `Authorization` header, envelope unwrapping, error toast, 401 → clear session + redirect, network-down/up signals |
| `services/authService.js` | login, register, getMe, updateProfile, logout, forgot/reset password |
| `services/studentService.js` | paged list, CRUD, bulk upload with progress, CSV template, `triggerDownload` |
| `services/hallService.js` | hall CRUD, availability |
| `services/examService.js` | exam CRUD, eligible students, publish, complete |
| `services/seatingService.js` | generate, hall plan, swap, reset |
| `services/facultyService.js` | directory, duty assign/remove/status, my duties, my hall plan, my attendance |
| `services/reportService.js` | report previews + blob downloads |
| `services/dashboardService.js` | admin/faculty aggregates, settings |
| `services/notificationService.js` | inbox, mark read, mark all read, unread count |
| `services/mockApi.js` | demo dataset behind the same interface |
| `services/index.js` | barrel; exports every service plus legacy aliases |

### Two things worth knowing before you extend it

**Unknown response fields are silently dropped.** Spring Boot's Jackson does not fail on
unrecognised properties, so a request key the server does not declare vanishes without an
error. During this wiring `DEFAULT_RULES` carried a `balanceAcrossHalls` toggle that
`SeatingRulesRequest` has no property for — the switch rendered and did nothing. When
adding a request field, add it to the backend DTO and verify by observing a *behaviour
change*, not a `200`.

**Boolean request defaults are not the UI's defaults.** `SeatingRulesRequest.strictCapacity`
defaults to `true` server-side, which makes `POST /api/seating/generate` answer `409`
whenever the halls cannot seat every eligible student. The wizard sends
`strictCapacity: false` explicitly and exposes it as "Refuse partial allocations" — its
whole purpose is to list who could not be seated. Assume any new server-side default is
the *conservative* one.

---

## Routes

### Public
| Path | Screen |
| --- | --- |
| `/` | Landing page (hero, features, workflow, screenshots, testimonials, FAQ) |
| `/login` | Sign in with ADMIN / FACULTY role toggle, validated against the returned role |
| `*` | 404 |

`ProtectedRoute` sends unauthenticated visitors to `/login`, and a role mismatch to that
role's own home (`/admin` or `/faculty`).

### Examination cell — requires `role=ADMIN`
| Path | Screen |
| --- | --- |
| `/admin` | KPI dashboard, allocation trends, department mix, hall utilisation, activity feed |
| `/admin/students` | Student register — server-side pagination, debounced search, CRUD, CSV bulk upload with row-level errors |
| `/admin/halls` | Hall & room configuration — rows, columns, blocked seats, facilities |
| `/admin/exams` | Exam schedule — departments, years, slots, status |
| `/admin/generate` | **4-step allocation wizard** (exam → halls → rules → generate) |
| `/admin/hall-plan` | Visual hall plan — zoom, search, two-seat swap, publish, audit trail |
| `/admin/reports` | Hall-wise / department-wise / student-wise / attendance reports + PDF/Excel/CSV |
| `/admin/faculty` | Faculty roster and invigilation duty allocation |
| `/admin/settings` | Profile, theme, notifications, institution metadata |

### Faculty — requires `role=FACULTY`
| Path | Screen |
| --- | --- |
| `/faculty` | Today's duty hero, upcoming duties, workload, notifications |
| `/faculty/duties` | Month calendar + duty list + duty detail sheet |
| `/faculty/hall-plan` | Read-only seating grid, scoped server-side to halls they invigilate |
| `/faculty/attendance` | Mark present/absent, print or export the sheet |
| `/faculty/notifications` | Filterable inbox with server-persisted read state |
| `/faculty/profile` | Profile, appearance, duty history |

Faculty scoping is enforced by the backend, not just hidden in the UI: `GET
/api/seating/plans` returns only plans for halls the caller holds a duty for, and asking
for another hall's plan is a `403` naming the hall and exam — not a `404`.

---

## Data fetching

`useFetch(serviceFn, deps)` → `{ data, loading, error, refetch }`, used for every server
read:

```jsx
const { data, loading, error, refetch } = useFetch(
  () => reportService.get('hall-wise', { examId, search: debouncedSearch }),
  [examId, debouncedSearch]
);
```

- Skeletons while `loading` and there is no data yet.
- A retry card on `error` — pages never silently render an empty table.
- `EmptyState` when a request succeeds with nothing in it.
- `useDebounce(value)` defaults to **400 ms**, so a search box issues one request per
  pause rather than one per keystroke.
- `DataContext` hydrates the shared reference data (students, halls, exams, faculty,
  plans, duties) once per session via `Promise.allSettled`, so one 403 cannot blank the
  app. Faculty get `/api/duties/my`; admins get the full `/api/duties` roster.

Writes are not uniformly optimistic. CRUD on halls/exams/students updates the local list
first and reconciles with the server response, rolling back on failure. A **seat swap is
not** optimistic — it refetches the plan, because a swap can be rejected for creating a
department clash and a guessed layout would be a lie.

---

## Exports

PDF, Excel and CSV are produced **by the server** and fetched as blobs
(`responseType: 'blob'`), then saved via an object URL and a detached anchor click in
`triggerDownload`.

- `GET /api/reports/{type}?examId=&hallId=&format=pdf|excel|csv`
- The duty-scoped attendance route (`/api/duties/my/hall/{id}/attendance`) deliberately
  does **not** support `format` — `DutyController` hard-codes the JSON response, so
  asking it for a PDF would save a JSON blob under a `.pdf` name. Faculty exports go
  through `/api/reports/attendance?hallId=`, which is still narrowed to their own hall.
- `format=json` is **not** supported — the backend answers `400 Unsupported format 'json'.
  Use pdf, excel or csv.` JSON previews are therefore built client-side from the payload
  already in hand.
- Printing the on-screen sheet uses `window.print()` scoped to `.print-area`.

---

## Design system

Tokens live in `tailwind.config.js`.

| Token | Value |
| --- | --- |
| Primary | `#4F46E5` indigo |
| Accent | `#14B8A6` teal |
| Surface | `#F8FAFC` |
| Text | `#0F172A` |
| Cards | white, `rounded-2xl`, soft shadows |
| Dark mode | `.dark` class strategy, persisted, no flash on boot |

Department colours are centralised in `src/data/departments.js` and reused by badges,
charts and the seat grid.

### Reusable components

`Button`, `Card` (+ `Stagger`), `StatCard`, `Modal`, `Table` (+ `FilterBar`), `Tabs`,
`Badge` (+ `DeptBadge` / `StatusBadge` / `Avatar`), `Field` (Input, Select, Textarea,
PasswordInput, Checkbox, Switch, RadioCard), `Progress` (bar + ring), `Skeleton`,
`EmptyState`, `Spinner` (+ `SeatAllocationLoader`, `SuccessCheck`, `Confetti`),
`ConfirmDialog`, `PageHeader`, `Tooltip`, `Dropzone`, `NetworkBanner`, `Logo`,
`RouteLoader`.

### Animations

Page transitions (fade + slide), staggered card entrances, hover lift, animated counters,
scroll reveal, floating gradient blobs, seat-by-seat fill animations, an animated
"Allocating seats…" sequence during generation, and confetti on a successful plan.

---

## Project structure

```
src/
├─ components/
│  ├─ charts/      Recharts wrappers
│  ├─ exams/       ExamFormModal
│  ├─ faculty/     DutyAssignModal
│  ├─ halls/       HallFormModal
│  ├─ landing/     Hero, Features, HowItWorks, Screenshots, …
│  ├─ layout/      Sidebar, Topbar, Navbar, Footer, ProtectedRoute, transitions
│  ├─ seating/     HallPlanGrid, HallPlanViewer
│  ├─ students/    StudentFormModal, BulkUploadModal
│  └─ ui/          design-system primitives
├─ context/        Auth (JWT + session restore), Theme, Toast, Data
├─ data/           departments, mockDatabase (demo mode only), content
├─ hooks/          useFetch, useDebounce, useTable, useCountUp, useLocalStorage, useMediaQuery
├─ pages/          Landing, Login, NotFound, admin/, faculty/
├─ services/       config, api + nine domain services, mockApi, index
├─ utils/          cn, format, seating (demo-mode engine + the shared rules catalog)
├─ App.jsx         routes + lazy loading
├─ index.css       design tokens, utilities, print styles
└─ main.jsx        providers + <Toaster />
```

`utils/seating.js` holds `DEFAULT_RULES` / `RULE_CATALOG`, which the wizard sends to the
server, **and** a self-contained allocation engine used only by `mockApi.js` in demo
mode. In normal mode all allocation happens on the backend; the rules catalog is shared
so both paths honour the same vocabulary.

---

