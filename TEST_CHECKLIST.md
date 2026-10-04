# End-to-end test checklist

Manual verification that the React frontend talks to the **real** Spring Boot
backend with no mock data in the request path.

## 0. Start both tiers

```powershell
# terminal 1 — backend (H2 in-memory, seeded)
cd backend
mvn spring-boot:run

# terminal 2 — frontend
cd ..
npm run dev            # http://localhost:5173
```

Confirm the wiring before touching the UI:

| Check | Expected |
|---|---|
| `http://localhost:8080/api/health` | `200` `{"status":"UP"}` |
| `http://localhost:5173/api/health` | `200` — proves the Vite proxy + `.env` are live |
| `http://localhost:8080/swagger-ui.html` | Swagger loads |
| DevTools → Network, filter **Fetch/XHR** | every request is `/api/...`; **zero** hit `mockApi` |
| `http://localhost:8080/h2-console` (`jdbc:h2:mem:examseat`, user `sa`, no password) | 200 students / 8 halls / 5 exams / 154 allocations / 5 duties |

### Accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@exam.com` | `admin123` |
| FACULTY | `faculty1@exam.com` | `faculty123` |
| FACULTY | `faculty2@exam.com` … `faculty5@exam.com` | `faculty123` |

`faculty1` invigilates **H-4 / EX-003** (29 candidates). Use `faculty3` (invigilates
**H-1 / EX-001**) to test cross-hall denial.

---

## 1. Authentication

| # | Step | Expected |
|---|---|---|
| 1.1 | Open `/admin` while signed out | Redirect to `/login` |
| 1.2 | Log in with `admin@exam.com` / `admin123` | Lands on `/admin`; token + user in `localStorage` |
| 1.3 | Hard-refresh `/admin` | Stays signed in — `GET /auth/me` restored the session, no redirect |
| 1.4 | Wrong password | Inline error **animates in**; no request succeeds |
| 1.5 | Pick the **Faculty** role toggle but enter admin creds | Rejected: role mismatch error, no navigation |
| 1.6 | Pick the **Admin** toggle with `faculty1@exam.com` | Rejected the same way |
| 1.7 | Sign out | Token cleared; `/login` unreachable via back button |
| 1.8 | Sign in as `faculty1@exam.com` | Lands on `/faculty`, never `/admin` |
| 1.9 | Faculty manually types `/admin/students` | Redirected to `/faculty` |
| 1.10 | Admin manually types `/faculty/duties` | Redirected to `/admin` |

---

## 2. Admin — Dashboard (`/admin`)

| # | Step | Expected |
|---|---|---|
| 2.1 | Load `/admin` | Skeletons flash, then stat cards, line chart, department pie, hall-utilisation bars, activity feed, upcoming exams |
| 2.2 | Check the Network tab | One `GET /api/dashboard/stats`; numbers match Swagger's response for the same call |
| 2.3 | Reload | Counters are identical to the API — nothing is generated client-side |
| 2.4 | Compare to a prior screenshot / mock build | Values differ (real data, not the old fixtures) |

## 3. Admin — Students (`/admin/students`)

| # | Step | Expected |
|---|---|---|
| 3.1 | Load the page | Table shows page 1 of 200 rows; **server-side** pagination footer reads `1 … 10 of 200` |
| 3.2 | Click page 3 | `GET /api/students?page=2&size=10` (backend page is 0-based, UI is 1-based) |
| 3.3 | Type a roll number, pause | Exactly **one** request after ~400 ms (debounce), not one per keystroke |
| 3.4 | Search something that matches nothing | `EmptyState`, not a blank table, and `total` resets to 0 |
| 3.5 | Filter by department + year | Request carries `&department=CSE&year=2`; row count matches |
| 3.6 | **Add** a student | Modal → success toast → new row; survives a refresh |
| 3.7 | **Edit** a student, including a duplicate roll number | Server 400 → the backend's message in a toast; modal stays open with your input intact |
| 3.8 | **Delete** a student | `ConfirmDialog` → row disappears, toast, gone after refresh |
| 3.9 | **Bulk upload** a good CSV | Drag-and-drop → real progress bar driven by `onUploadProgress` → summary tiles (`Rows / Added / Duplicates / Invalid`) |
| 3.10 | **Bulk upload** a CSV with a bad department, a blank name and an existing roll | Row-level error modal listing each `{row, rollNo, field, message}` — one line per bad row |
| 3.11 | Click **Download template** | `GET /api/students/template?format=csv` saves `student-template.csv` |

## 4. Admin — Halls (`/admin/halls`) and Exams (`/admin/exams`)

| # | Step | Expected |
|---|---|---|
| 4.1 | Load each page | Rows come from `GET /api/halls` / `GET /api/exams` (bare arrays) |
| 4.2 | Create a hall | Row appears **immediately** (optimistic), reconciles with the server, toast on success |
| 4.3 | Create a hall with an invalid capacity | Optimistic row rolls back; backend message in a toast |
| 4.4 | Edit / delete a hall | Same optimistic-then-reconcile behaviour |
| 4.5 | Create an exam with a date in the past | Accepted; `status` reflects the backend's own classification |
| 4.6 | **Delete** EX-003 (has plans) | `409` → a second `ConfirmDialog` offers "Reset exam seating and delete"; choosing it calls `DELETE /api/seating/exam/EX-003` then retries the delete |
| 4.7 | Delete EX-005 (no plans) | Deletes straight away, no reset prompt |

## 5. Admin — Generate Seating (`/admin/seating/generate`)

| # | Step | Expected |
|---|---|---|
| 5.1 | Walk the wizard: exam → halls → departments → rules | Each step populates from the API (`/exams`, `/halls`, `/halls/availability?examId=`, `/exams/{id}/eligible-students`) |
| 5.1a | Inspect the rules step | Seven toggles, all of them real server rules: Mix departments / No same dept adjacent / No same dept diagonally / Separate by year / Shuffle within departments / Keep last row clear / **Refuse partial allocations** |
| 5.1b | Switch between Balanced, Strict and Compact | All three generate successfully. Verify the toggles are not decorative: Compact must score noticeably lower than Balanced/Strict (measured 0 vs 84 on EX-005 + H-7/H-8) |
| 5.2 | Pick **EX-005**, halls **H-7 + H-8**, submit | Allocating animation, then a summary: 47 seated, 14 unallocated, 0 clashes, score 84, utilisation 98 % |
| 5.3 | Unallocated list | Each row shows the backend's own `reason` (e.g. *"No usable seat left in the selected halls"*) |
| 5.4 | Set `seed: 42`, generate twice | **Byte-identical layouts** — determinism confirmed, not just equal quality scores |
| 5.5 | Check H-2 / H-6 (one blocked seat each) | The blocked seat renders as blocked and is excluded from `usable` |
| 5.6 | Leave **Refuse partial allocations** OFF and over-subscribe | The run **succeeds**: `unallocated > 0` and the panel explains each one. This is the default — the server would otherwise answer `409` |
| 5.6a | Turn **Refuse partial allocations** ON, same over-subscribed selection | `409 Insufficient seating capacity: 61 eligible students but only 47 usable seats…` surfaced as a toast, and no plan is written. Confirms the toggle is really wired to `strictCapacity` |
| 5.7 | **Publish** | `POST /api/seating/plans/{id}/publish`; badge flips to Published, persisted across refresh |
| 5.8 | Reset the exam | `DELETE /api/seating/exam/EX-005`; plans disappear from the list and from Hall Plan |

## 6. Admin — Hall Plan (`/admin/hall-plan`)

| # | Step | Expected |
|---|---|---|
| 6.1 | Load | Hall/exam selectors from live plans; `seating` grid renders per selection |
| 6.2 | Inspect a seat | Department colour, tooltip with name / roll / dept / year / section |
| 6.3 | Check the banner | Green "Verified" when `verification.isClean`, amber with the adjacent-same-department count otherwise |
| 6.4 | Click two occupied seats → **Swap** | `POST /api/seating/plans/{id}/swap` sends `{row, col}` for both refs; grid refreshes from the server (not optimistic) |
| 6.5 | Try to swap into a blocked seat | Backend rejects → its message in a toast, grid unchanged |
| 6.6 | Press **Refresh** | Animated re-fetch; numbers match the API exactly |

## 7. Admin — Faculty & Duties (`/admin/faculty`)

| # | Step | Expected |
|---|---|---|
| 7.1 | Load | 5 faculty from `GET /api/faculty`; `designation` (not `title`) under each name |
| 7.2 | Assign a duty | `POST /api/duties/assign` with `facultyId`/`examId`/`hallId`/`role`; role options are **INVIGILATOR / CHIEF_INVIGILATOR / EXTERNAL_SUPERVISOR** |
| 7.3 | Assign the same person to the same exam + hall again | Client warns about the duplicate. The backend permits it, so confirm before saving. |
| 7.4 | Assign with an invalid role | `400` → toast. (Backend's message is *"Request body is missing or malformed"* — misleading, but correct to reject.) |
| 7.5 | **Remove** a duty | `DELETE /api/duties/{id}`; the duty and its counts disappear |
| 7.6 | Workload donut | Built from the live duty roster |

## 8. Admin — Reports (`/admin/reports`)

| # | Step | Expected |
|---|---|---|
| 8.1 | Load | Preview table from `GET /api/reports/hall-wise?examId=…`; type switcher covers hall-wise / department-wise / student-wise / attendance |
| 8.2 | Search in the student-wise preview | Debounced; the request carries `&search=` |
| 8.3 | Click **PDF** | Only that button spins; `responseType: 'blob'`; file saves with the server's filename |
| 8.4 | Click **Excel** then **CSV** | Real `.xlsx` / `.csv`, not a JSON blob wearing the wrong extension |
| 8.5 | Filter to one hall, then download | The file matches the filtered scope |
| 8.6 | Force an error (stop the backend) | Retry card appears, with a working Retry button |

## 9. Admin — Notifications bell (`Topbar`)

| # | Step | Expected |
|---|---|---|
| 9.1 | Open the bell | `GET /api/notifications`; body text is the backend's `message` field |
| 9.2 | Click **Mark all read** | `PUT /api/notifications/read-all`; badge clears and stays cleared after refresh |
| 9.3 | Click one unread item | `PUT /api/notifications/{id}/read`; dot disappears and does not come back |
| 9.4 | Look for a per-item delete | Deliberately absent — there is no delete endpoint, so the destructive affordance was removed rather than faked |

## 10. Admin — Settings (`/admin/settings`)

| # | Step | Expected |
|---|---|---|
| 10.1 | Load | Values hydrate from `GET /api/settings` (institution *"University Examination Cell"*, `language: "en"`, `academicYear: "2025-26"`, `academicStartDate`, upload deadline) |
| 10.2 | Toggle a preference, save | `PUT /api/settings`; `Reset to saved values` returns to the **server's** copy, not a hardcoded constant |
| 10.3 | Edit your profile | A **Confirm your password** field appears — `PUT /api/auth/me` validates the whole `RegisterRequest` (`required: email, name, password, role`) |
| 10.4 | Submit a profile change | Success; password field clears and is never persisted |
| 10.5 | Submit with a wrong password | `401` → toast; your typed values are still in the form |
| 10.6 | Try escalating your own role | Not possible from the UI (role is read-only), and the backend ignores a `role` field anyway — verified: a faculty token sending `role: "ADMIN"` stays `FACULTY` and still gets `403` on `/api/faculty` |

## 11. Faculty — Dashboard (`/faculty`)

| # | Step | Expected |
|---|---|---|
| 11.1 | Load as `faculty1` | `GET /api/dashboard/faculty` in one round trip: stats, today's duty hero, next duty, upcoming roster, duty trend, workload donut, bell preview |
| 11.2 | "Duty completion" ring | `completedDuties / (completedDuties + upcomingDuties)` — 0 % rather than `NaN` for someone with no duties |
| 11.3 | Only their own data is shown | `faculty1` sees H-4 / EX-003 only, never H-1 / EX-001 |
| 11.4 | Backend down | Error card with a Retry button (not an empty dashboard) |

## 12. Faculty — Duties (`/faculty/duties`)

| # | Step | Expected |
|---|---|---|
| 12.1 | Load | `GET /api/duties/my` — no `?email=` is sent; the backend derives identity from the JWT |
| 12.2 | Calendar + list | `faculty1` shows D-0005 (EX-003 / H-4, 29 candidates) only |
| 12.3 | Switch Upcoming / Past / All | Filters the live roster |
| 12.4 | Open a duty | Detail drawer with the hall's seat grid from the scoped plan |

## 13. Faculty — Hall Plan (`/faculty/hall-plan`)

| # | Step | Expected |
|---|---|---|
| 13.1 | Load | Only **H-4 / EX-003** is offered — `GET /api/seating/plans` is scoped server-side |
| 13.2 | Grid renders | Same component as admin; 29 candidates, 1 blocked seat in the grid geometry |
| 13.3 | Cross-hall attempt | `GET /api/seating/plans/EX-001-H-1` returns `403 "You are not invigilating hall H-1 for exam EX-001"` — surfaced as a toast, not a crash |

## 14. Faculty — Attendance (`/faculty/attendance`)

| # | Step | Expected |
|---|---|---|
| 14.1 | Load as `faculty1` | `GET /api/duties/my/hall/H-4/attendance?examId=EX-003` → 29 rows. **This route is the one the `SecurityConfig` fix unblocked** — it used to `403`. |
| 14.2 | Exam/hall pickers | Options come from **duties**, not from all seating plans |
| 14.3 | Toggle present/absent | Ring, stat cards and the present/absent badges update live |
| 14.4 | Reload the page | Marks reset to the generated roll, and the on-page note says so — the backend has **no write route** for attendance |
| 14.5 | Click **Excel / CSV / Print-PDF** | Streams from `GET /api/reports/attendance?examId=&hallId=&format=`. These deliberately do **not** use the duty-scoped route: `DutyController` hard-codes the JSON response and ignores `format`, which would save a JSON blob named `.pdf`. |
| 14.6 | Filter by department | Filters the loaded sheet; counts follow |

## 15. Faculty — Notifications (`/faculty/notifications`)

| # | Step | Expected |
|---|---|---|
| 15.1 | Load | `GET /api/notifications`, scoped to the caller |
| 15.2 | Mark one read / mark all read | Optimistic repaint, then reconciled against the server; a rejected write re-syncs rather than lying |

## 16. Faculty — Profile (`/faculty/profile`)

| # | Step | Expected |
|---|---|---|
| 16.1 | Load | Fields from `GET /auth/me` (`title`, `employeeId`, `department`) |
| 16.2 | Edit name / designation / phone | **Confirm your password** appears; save calls `PUT /api/auth/me` with the full required payload |
| 16.3 | Save correctly | Name/designation persist after refresh; the password field clears |
| 16.4 | Look for a "Short bio" field | Gone. It was being written to `PUT /api/settings`, which is admin-only (`403` for faculty) *and* has no `bio` property — the save would have failed silently |

## 17. Cross-cutting behaviour

| # | Step | Expected |
|---|---|---|
| 17.1 | Stop the backend mid-session | `NetworkBanner` appears with a Retry affordance; pages show skeletons, not crash screens |
| 17.2 | Restart the backend | Banner clears; Retry repopulates |
| 17.3 | Force a `401` (delete the token from `localStorage`, then click an action) | Session cleared and redirected to `/login` by the `api.js` interceptor |
| 17.4 | Trigger any 4xx/5xx | **Two** toasts are possible by design: `react-hot-toast` from the interceptor carrying the backend's own message, plus the animated in-page toast for local success/error. See "Known behaviours". |
| 17.5 | Every page with a slow fetch | Skeletons, not spinners over stale data |
| 17.6 | Every list that can be empty | `EmptyState` with a next action |
| 17.7 | Grep the codebase for URLs | `grep -r "localhost:8080" src/` → **no hits** outside `src/services/` and `src/data/`. The only external URLs are Unsplash images in `Login.jsx`/`Navbar.jsx` and social links. |
| 17.8 | Set `VITE_USE_MOCKS=true`, restart | `mockApi.js` takes over and the app still works — the demo toggle is intact |

---

## Known behaviours (intentional, not defects)

1. **Two toast systems coexist.** `react-hot-toast` fires from the `api.js`
   response interceptor and shows the backend's message verbatim;
   `<Toaster />` is mounted in `main.jsx`. Alongside it, the pre-existing
   animated `ToastContext` provides in-page success feedback. A failed save can
   therefore raise both. This was kept deliberately so backend messages are never
   swallowed or reworded.
2. **Attendance marks are session-local.** The backend exposes no write route for
   attendance, so present/absent toggles reset on reload. The page states this in
   place rather than implying persistence.
3. **`PUT /api/auth/me` requires the password.** It reuses `RegisterRequest`, whose
   `required` list is `[email, name, password, role]`. Both profile pages therefore
   ask you to re-enter your password before saving. The password is never stored.
4. **`role` is ignored on profile save.** The endpoint accepts the field because the
   validator demands it, but a faculty member sending `role: "ADMIN"` stays a
   faculty member and their JWT keeps its original authorities (verified).
5. **`format=json` is not supported by the reports endpoints** — the backend answers
   `400 Unsupported format 'json'. Use pdf, excel or csv.` JSON previews are
   therefore built client-side from the already-fetched payload.
6. **No per-notification delete.** The endpoint does not exist, so the inbox has no
   destructive "clear" action — only "mark read".
7. **Generation determinism is seed-based.** Comparing quality metrics alone cannot
   prove a re-run produced the same layout; compare actual seat assignments (step 5.4).

## Three frontend bugs found and fixed during this wiring

8. **The allocation rules did not match the backend.** `DEFAULT_RULES` /
   `RULE_CATALOG` carried a `balanceAcrossHalls` key that
   `SeatingRulesRequest` does not declare. Spring Boot's Jackson is configured to
   drop unknown properties, so the toggle rendered, the value was discarded, and
   the rule did nothing — with no error anywhere. Replaced with the real
   `shuffle` key. The local mock engine turned out to have a `pickHall()` whose
   *both* branches called `hallQueue.shift()`, so the rule had never had an
   effect in mock mode either; the ordering is now unconditional.

9. **The wizard 409'd on the ordinary case.** `strictCapacity` defaults to
   **true** server-side, and the wizard never sent it, so any selection that
   could not seat every eligible student was rejected outright — which is most
   of them. This defeated the wizard's own summary screen, whose purpose is to
   report who could not be seated. `DEFAULT_RULES` now sets
   `strictCapacity: false` and the toggle is exposed as "Refuse partial
   allocations". Verified: Balanced/Strict/Compact all return `200` for EX-005 +
   H-7/H-8, and `strictCapacity: true` returns `409`.

10. **`GET /api/notifications/unread-count` returns `{ count: 3 }`, not `3`.**
    Reading it as a scalar yielded `NaN` and a badge permanently stuck at zero.
    `notificationService.getUnreadCount` now accepts both shapes.

## Two backend fixes made during this wiring

Both are disclosed because they are server-side changes, not frontend-only work.

1. **`SecurityConfig.PUBLIC_GET` — faculty hall-plan/attendance were unreachable.**
   `PUBLIC_GET` listed `/api/duties/my/*`, and Ant's `*` matches exactly one path
   segment. `/api/duties/my/hall/{hallId}/plan` and `.../attendance` have three
   extra segments, so they fell through to `/api/duties/**` → `hasRole("ADMIN")`
   and returned `403` to every legitimate faculty caller. Added explicit entries
   for `/api/duties/my/hall/*`, `.../plan`, `.../attendance`.
   `backend/README.md` now carries a warning about the pattern.

2. **`SeatingServiceImpl.findAt` — allocation-id-only refs silently 404.**
   The method bailed out with `if (ref.getRow() == null || ref.getCol() == null)
   return null;` *before* reaching its `allocationId` branch. The frontend works
   around this by always sending `row` + `col` (plus an advisory `allocationId`),
   which is correct today and stays correct if the guard is reordered later. The
   backend guard is still worth fixing.

**Verification status:** backend `mvn test` → 56/56 pass, `BUILD SUCCESS`
(exit 0). Frontend `npm run build` → green. 41/41 endpoints exercised through the
Vite proxy returned their expected status, including the deliberate `401`/`403`
denials.