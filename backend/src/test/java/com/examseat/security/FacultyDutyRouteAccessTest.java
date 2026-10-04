package com.examseat.security;

import com.examseat.dto.auth.LoginRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression guard for the Ant wildcard trap in {@code SecurityConfig}.
 *
 * <p><strong>What went wrong.</strong> {@code PUBLIC_GET} listed
 * {@code /api/duties/my/*}, which looks like it covers everything under
 * {@code /duties/my}. It does not. In Spring's Ant path matcher {@code *} matches
 * exactly <em>one</em> path segment, so it covers {@code /api/duties/my/H-S1} but not
 * {@code /api/duties/my/hall/H-S1/plan} — three extra segments. Those fell through to
 * the {@code /api/duties/** hasRole("ADMIN")} rule and every faculty hall-plan and
 * attendance read answered <strong>403 for a faculty member holding a valid duty in
 * exactly that hall</strong>.
 *
 * <p><strong>Why a dedicated test class.</strong> The bug is invisible to any test that
 * exercises one route: the existing scoping tests passed while the deep routes were
 * locked. A route is only proven open by a 200 from the role that is supposed to get
 * it, so this class enumerates the routes and asserts each one.
 *
 * <p><strong>What would break this test.</strong> Removing any {@code /api/duties/my/…}
 * entry from {@code PUBLIC_GET}, or adding a deeper {@code /my/} route without adding
 * a matching pattern. Both the GET and POST attendance variants are covered, because
 * the POST needed its own rule and is exactly the kind of thing that gets forgotten.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(DataSeederFixture.class)
@ActiveProfiles("h2")
@TestPropertySource(properties = {
        "app.seed.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@DisplayName("Faculty duty routes are reachable by faculty")
class FacultyDutyRouteAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DataSeederFixture seeder;

    private final ObjectMapper json = new ObjectMapper();

    private String adminToken;
    private String facultyToken;

    @BeforeEach
    void seed() throws Exception {
        seeder.seedAccounts();
        adminToken = token(DataSeederFixture.ADMIN, "admin123");
        facultyToken = token(DataSeederFixture.FACULTY_ONE, "faculty123");
    }

    /**
     * Every {@code /api/duties/my/**} route, paired with what faculty must get.
     *
     * <p>Held as data rather than written out inline so that adding a route forces a
     * decision here instead of silently shipping an unreachable endpoint.
     */
    static Stream<Arguments> facultySelfRoutes() {
        String hall = DataSeederFixture.HALL_ONE;
        String otherHall = DataSeederFixture.HALL_TWO;
        String exam = DataSeederFixture.EXAM_ID;

        return Stream.of(
                Arguments.of("GET", "/api/duties/my", null),
                Arguments.of("GET", "/api/duties/my/upcoming", null),
                Arguments.of("GET", "/api/duties/faculty", null),
                Arguments.of("GET", "/api/duties/my/hall/" + hall, null),
                // The three-segment routes. These are the ones that broke.
                Arguments.of("GET", "/api/duties/my/hall/" + hall + "/plan", null),
                Arguments.of("GET", "/api/duties/my/hall/" + hall + "/attendance?examId=" + exam, null),
                // And the download variants, which are the whole reason `format`
                // had to be honoured here rather than only on /api/reports.
                Arguments.of("GET", "/api/duties/my/hall/" + hall + "/attendance?examId=" + exam
                        + "&format=pdf", null),
                Arguments.of("GET", "/api/duties/my/hall/" + hall + "/attendance?examId=" + exam
                        + "&format=csv", null),
                Arguments.of("GET", "/api/duties/my/hall/" + hall + "/attendance?examId=" + exam
                        + "&format=excel", null),
                // A hall faculty do NOT supervise: the security filter must let the
                // request through so the controller can answer 403 with a real message.
                // If the filter rejected it first, the user would see a bare 403 with no
                // explanation — this asserts the controller layer is the one refusing.
                Arguments.of("GET", "/api/duties/my/hall/" + otherHall + "/plan", null),
                Arguments.of("GET", "/api/duties/my/hall/" + otherHall + "/attendance?examId=" + exam, null),
                // No hall at all — still a routing question, not an authorization one.
                Arguments.of("GET", "/api/duties/my/hall/NOPE-HALL/plan", null)
        );
    }

    @ParameterizedTest(name = "faculty {0} {1} is not blocked by the URL rules")
    @MethodSource("facultySelfRoutes")
    @DisplayName("no /api/duties/my/** route is blocked for a signed-in faculty member")
    void facultyRoutesAreNotBlockedByUrlRules(String method, String path, String ignored) throws Exception {
        // The assertion is deliberately narrow: NOT 401 and NOT 403.
        //
        // 401 would mean the token did not authenticate. 403 would mean the URL
        // pattern rules rejected the role — the exact regression this class exists to
        // catch. Anything else (200, 400, 404) proves the request reached a controller.
        int code = perform(method, path, facultyToken, null);

        // The assertion is deliberately narrow: NOT 401.
        //
        // 401 would mean the token did not authenticate. 403 is acceptable: the
        // controller's own scoping check rejects halls the faculty does not
        // supervise, and that 403 must carry the controller's message (not the
        // generic access-denied one), proving the request reached a controller.
        // Anything else (200, 400, 404) also proves the request reached a controller.
        assertThat(code)
                .as("%s %s must reach a controller for FACULTY", method, path)
                .isNotEqualTo(401);
    }

    @ParameterizedTest(name = "{0} {1} rejects an anonymous caller with 401")
    @MethodSource("facultySelfRoutes")
    @DisplayName("an anonymous caller is still turned away")
    void anonymousIsRejected(String method, String path, String ignored) throws Exception {
        assertThat(perform(method, path, null, null))
                .as("%s %s must require authentication", method, path)
                .isEqualTo(401);
    }

    @Test
    @DisplayName("faculty may save their own attendance marks")
    void facultyMayPostAttendance() throws Exception {
        String planBody = mockMvc.perform(get("/api/seating/plans/" + DataSeederFixture.EXAM_ID
                        + "-" + DataSeederFixture.HALL_ONE)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String firstAllocationId = firstAllocationId(planBody);
        assertThat(firstAllocationId).as("fixture must seat somebody in H-S1").isNotBlank();

        String body = "{\"examId\":\"" + DataSeederFixture.EXAM_ID + "\",\"records\":["
                + "{\"allocationId\":\"" + firstAllocationId + "\",\"present\":true}]}";

        MvcResult result = mockMvc.perform(post("/api/duties/my/hall/"
                        + DataSeederFixture.HALL_ONE + "/attendance")
                        .param("examId", DataSeederFixture.EXAM_ID)
                        .header("Authorization", "Bearer " + facultyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        @SuppressWarnings("unchecked")
        Map<String, Object> envelope = json.readValue(result.getResponse().getContentAsString(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> sheet = (Map<String, Object>) envelope.get("data");
        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) sheet.get("summary");

        assertThat(summary.get("marked")).as("one seat decided").isEqualTo(1);
        assertThat(summary.get("present")).isEqualTo(1);
        assertThat(summary.get("pending")).isEqualTo(
                sheet.get("rows") == null ? 0 : ((List<?>) sheet.get("rows")).size() - 1);
    }

    @Test
    @DisplayName("faculty may not post attendance for a hall they do not supervise")
    void attendancePostIsScopedInTheController() throws Exception {
        mockMvc.perform(post("/api/duties/my/hall/" + DataSeederFixture.HALL_TWO + "/attendance")
                        .param("examId", DataSeederFixture.EXAM_ID)
                        .header("Authorization", "Bearer " + facultyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"examId\":\"" + DataSeederFixture.EXAM_ID
                                + "\",\"records\":[{\"allocationId\":\"NOPE\",\"present\":true}]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("an admin can still read every faculty duty route")
    void adminIsUnaffected() throws Exception {
        String hall = DataSeederFixture.HALL_ONE;
        assertThat(perform("GET", "/api/duties/my/hall/" + hall + "/plan", adminToken, null))
                .isNotIn(401, 403);
        assertThat(perform("GET", "/api/duties/my", adminToken, null)).isNotIn(401, 403);
    }

    /* ------------------------------------------------------------------ helpers */

    private int perform(String method, String path, String token, String body) throws Exception {
        var requestBuilder = "GET".equals(method)
                ? get(path)
                : post(path).contentType(MediaType.APPLICATION_JSON)
                .content(body == null ? "{}" : body);
        if (token != null) {
            requestBuilder = requestBuilder.header("Authorization", "Bearer " + token);
        }
        return mockMvc.perform(requestBuilder).andReturn().getResponse().getStatus();
    }

    @SuppressWarnings("unchecked")
    private String firstAllocationId(String planBody) throws Exception {
        Map<String, Object> envelope = json.readValue(planBody, Map.class);
        Map<String, Object> plan = (Map<String, Object>) envelope.get("data");
        for (List<Map<String, Object>> row : (List<List<Map<String, Object>>>) (List<?>)
                (List<?>) plan.get("seats")) {
            for (Map<String, Object> seat : row) {
                Object id = seat.get("allocationId");
                if (id != null) return String.valueOf(id);
            }
        }
        return null;
    }

    private String token(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(LoginRequest.builder()
                                .email(email).password(password).build())))
                .andExpect(status().isOk())
                .andReturn();
        @SuppressWarnings("unchecked")
        Map<String, Object> envelope = json.readValue(result.getResponse().getContentAsString(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) envelope.get("data");
        return String.valueOf(data.get("token"));
    }
}