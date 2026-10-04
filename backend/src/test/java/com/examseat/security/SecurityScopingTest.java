package com.examseat.security;

import com.examseat.dto.auth.LoginRequest;
import com.examseat.dto.auth.RegisterRequest;
import com.examseat.dto.common.ApiResponse;
import com.examseat.entity.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Access-control tests driven through the real security filter chain.
 *
 * <p>These exist because URL-pattern rules and controller-level scoping are two
 * independent layers, and getting one right does nothing if the other is wrong.
 * The bug that motivated them: {@code ?email=} was passed through to the service
 * unchecked, so any signed-in faculty member could read a colleague's dashboard.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(DataSeederFixture.class)
@ActiveProfiles("h2")
@TestPropertySource(properties = {
        "app.seed.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@DisplayName("Security and access scoping")
class SecurityScopingTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DataSeederFixture seeder;

    private final ObjectMapper json = new ObjectMapper();

    private String adminToken;
    private String facultyOneToken;
    private String facultyTwoToken;

    private String hallOne;
    private String hallTwo;
    private String examId;

    @BeforeEach
    void seed() throws Exception {
        seeder.seedAccounts();

        adminToken = token("admin@exam.com", "admin123");
        facultyOneToken = token("faculty1@exam.com", "faculty123");
        facultyTwoToken = token("faculty2@exam.com", "faculty123");

        // Resolve HALL_ONE, HALL_TWO, EXAM_ID from seeded data
        String[] dutiedHalls = seeder.hallsDutiedBy("faculty1@exam.com");
        this.hallOne = dutiedHalls.length > 0 ? dutiedHalls[0] : "H-S1";

        String notDutiedPlan = seeder.hallNotDutiedBy("faculty1@exam.com");
        // hallNotDutiedBy returns "EX-S01-H-S2", split into 4 parts: ["EX", "S01", "H", "S2"]
        String[] parts = notDutiedPlan.split("-");
        this.examId = parts[0] + "-" + parts[1];   // EX-S01
        this.hallTwo = parts[2] + "-" + parts[3]; // H-S2
    }

    /* ------------------------------------------------------------------- auth */

    @Test
    @DisplayName("a valid login returns a token and the caller's identity")
    void loginSucceeds() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(LoginRequest.builder()
                                .email("admin@exam.com").password("admin123").build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("admin@exam.com"))
                .andReturn();

        @SuppressWarnings("unchecked")
        Map<String, Object> body = json.readValue(result.getResponse().getContentAsString(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) body.get("data");
        assertThat(String.valueOf(data.get("token"))).isNotBlank();
    }

    @Test
    @DisplayName("a wrong password is 401, not a validation complaint about length")
    void wrongPasswordIsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(LoginRequest.builder()
                                .email("admin@exam.com").password("definitely-not-it").build())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("a short password is judged by authentication, not by bean validation")
    void shortPasswordIsJudgedByAuthentication() throws Exception {
        // "abc" fails the registration policy, but signing in with it must be
        // reported as a bad credential rather than as an invalid request.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(LoginRequest.builder()
                                .email("admin@exam.com").password("abc").build())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("an unknown email gives the same answer as a wrong password")
    void unknownEmailDoesNotLeakAccountExistence() throws Exception {
        String unknown = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(LoginRequest.builder()
                                .email("nobody@exam.com").password("whatever123").build())))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        String wrongPassword = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(LoginRequest.builder()
                                .email("admin@exam.com").password("whatever123").build())))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        // Identical apart from the timestamp, which must be excluded or the
        // comparison can never pass.
        assertThat(stripTimestamp(unknown))
                .as("identical responses prevent account enumeration")
                .isEqualTo(stripTimestamp(wrongPassword));
    }

    @Test
    @DisplayName("registration still enforces the password policy")
    void registrationKeepsPasswordPolicy() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(RegisterRequest.builder()
                                .name("Short Password").email("short@exam.com")
                                .password("abc").role(Role.FACULTY).build())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").isNotEmpty());
    }

    /* ------------------------------------------------------------- token gating */

    @Test
    @DisplayName("protected routes reject missing, malformed and forged tokens")
    void tokensAreRequired() throws Exception {
        mockMvc.perform(get("/api/students")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/students").header("Authorization", "Bearer not.a.jwt"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    /* ----------------------------------------------------- faculty self-service */

    @Test
    @DisplayName("a faculty member can read their own dashboard")
    void facultyReadsOwnDashboard() throws Exception {
        mockMvc.perform(get("/api/dashboard/faculty")
                        .header("Authorization", "Bearer " + facultyOneToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/dashboard/faculty")
                        .param("email", "faculty1@exam.com")
                        .header("Authorization", "Bearer " + facultyOneToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a faculty member cannot read a colleague's dashboard")
    void facultyCannotReadColleaguesDashboard() throws Exception {
        mockMvc.perform(get("/api/dashboard/faculty")
                        .param("email", "faculty2@exam.com")
                        .header("Authorization", "Bearer " + facultyOneToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("the same clamp applies to the duty self-service routes")
    void dutiesAreClampedToSelf() throws Exception {
        mockMvc.perform(get("/api/duties/faculty")
                        .param("email", "faculty1@exam.com")
                        .header("Authorization", "Bearer " + facultyOneToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/duties/faculty")
                        .param("email", "faculty2@exam.com")
                        .header("Authorization", "Bearer " + facultyOneToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("an admin may inspect any faculty account")
    void adminMayInspectAnyone() throws Exception {
        mockMvc.perform(get("/api/dashboard/faculty")
                        .param("email", "faculty2@exam.com")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/duties/faculty")
                        .param("email", "faculty2@exam.com")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("seating plans are readable by faculty, scoped to their own halls")
    void facultySeesOnlyTheirHallPlans() throws Exception {
        String body = mockMvc.perform(get("/api/seating/plans")
                        .header("Authorization", "Bearer " + facultyOneToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> envelope = json.readValue(body, Map.class);
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> plans =
                (java.util.List<Map<String, Object>>) envelope.get("data");

        String[] allowed = seeder.hallsDutiedBy("faculty1@exam.com");
        assertThat(plans).isNotNull();
        assertThat(plans).allSatisfy(plan ->
                assertThat(plan.get("hallId").toString()).isIn((Object[]) allowed));
    }

    @Test
    @DisplayName("an admin still sees every plan")
    void adminSeesEveryPlan() throws Exception {
        String body = mockMvc.perform(get("/api/seating/plans")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        @SuppressWarnings("unchecked")
        Map<String, Object> envelope = json.readValue(body, Map.class);
        assertThat((java.util.List<?>) envelope.get("data")).isNotEmpty();
    }

    @Test
    @DisplayName("a faculty member cannot fetch a plan for a hall they do not invigilate")
    void facultyCannotReadForeignHallPlan() throws Exception {
        mockMvc.perform(get("/api/seating/plans/" + seeder.hallNotDutiedBy("faculty1@exam.com"))
                        .header("Authorization", "Bearer " + facultyOneToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("an unresolvable plan id reads the same for get, swap and publish")
    void planIdFailuresAreConsistent() throws Exception {
        String get404 = message(mockMvc.perform(get("/api/seating/plans/NOPE-NOPE")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound()).andReturn());

        String swap404 = message(mockMvc.perform(post("/api/seating/plans/NOPE-NOPE/swap")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"a\":{\"row\":0,\"col\":0},\"b\":{\"row\":0,\"col\":1}}"))
                .andExpect(status().isNotFound()).andReturn());

        String publish404 = message(mockMvc.perform(post("/api/seating/plans/NOPE-NOPE/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound()).andReturn());

        assertThat(swap404).isEqualTo(get404);
        assertThat(publish404).isEqualTo(get404);
        assertThat(get404).contains("Seating plan");
    }

    /* ----------------------------------------------------------- admin domains */

    @Test
    @DisplayName("faculty cannot mutate any admin-owned domain")
    void facultyCannotMutateAdminDomains() throws Exception {
        String auth = "Bearer " + facultyOneToken;

        mockMvc.perform(post("/api/students").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rollNo\":\"X9\",\"name\":\"X\",\"department\":\"CSE\",\"year\":2}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/halls").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"rows\":2,\"cols\":2,\"capacity\":4}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/exams").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"X9\",\"title\":\"X\",\"date\":\"2026-12-01\","
                                + "\"startTime\":\"09:00\",\"endTime\":\"12:00\",\"departments\":[\"CSE\"]}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/seating/generate").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"examId\":\"EX-001\",\"hallIds\":[\"H-1\"]}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/faculty").header("Authorization", auth))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/dashboard/admin").header("Authorization", auth))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("faculty keep read access to the catalogue and their own notifications")
    void facultyKeepReadAccess() throws Exception {
        String auth = "Bearer " + facultyOneToken;
        mockMvc.perform(get("/api/halls").header("Authorization", auth)).andExpect(status().isOk());
        mockMvc.perform(get("/api/exams").header("Authorization", auth)).andExpect(status().isOk());
        mockMvc.perform(get("/api/duties/my").header("Authorization", auth)).andExpect(status().isOk());
        mockMvc.perform(get("/api/notifications").header("Authorization", auth)).andExpect(status().isOk());
    }

    /* ------------------------------------------------------------------ helpers */

    @Test
    @DisplayName("faculty can GET plan and attendance for their own assigned hall, 403 for unassigned")
    void facultyCanReadOwnHallPlanAndAttendance() throws Exception {
        String auth = "Bearer " + facultyOneToken;

        // --- plan for their own assigned hall ---
        mockMvc.perform(get("/api/duties/my/hall/" + hallOne + "/plan")
                        .header("Authorization", auth))
                .andExpect(status().isOk());

        // --- plan for a hall they do NOT supervise → 403
        mockMvc.perform(get("/api/duties/my/hall/" + hallTwo + "/plan")
                        .header("Authorization", auth))
                .andExpect(status().isForbidden());

        // --- attendance for their own assigned hall
        mockMvc.perform(get("/api/duties/my/hall/" + hallOne + "/attendance?examId=" + examId)
                        .header("Authorization", auth))
                .andExpect(status().isOk());

        // --- attendance for a hall they do NOT supervise → 403
        mockMvc.perform(get("/api/duties/my/hall/" + hallTwo + "/attendance?examId=" + examId)
                        .header("Authorization", auth))
                .andExpect(status().isForbidden());
    }

    private String message(MvcResult result) throws Exception {
        ApiResponse<?> body = json.readValue(result.getResponse().getContentAsString(), ApiResponse.class);
        return String.valueOf(body.getMessage());
    }

    /** Drops the timestamp so two otherwise-identical responses compare equal. */
    private String stripTimestamp(String json) {
        return json.replaceAll("\"timestamp\":\"[^\"]*\"", "\"timestamp\":\"?\"");
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
