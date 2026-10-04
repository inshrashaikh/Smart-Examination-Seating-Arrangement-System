package com.examseat.config;

import com.examseat.security.JwtAuthenticationEntryPoint;
import com.examseat.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.examseat.dto.common.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.List;

/**
 * Stateless JWT security.
 *
 * <p>Public routes: auth, Swagger, H2 console and the health check. Everything
 * else requires a valid bearer token, and the mutating domains additionally
 * require {@code ROLE_ADMIN} (also enforced per-method with {@code @PreAuthorize}).</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final ObjectMapper objectMapper;

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String[] allowedOrigins;

    private static final String[] PUBLIC_GET = {
            "/api/halls", "/api/halls/*",
            "/api/exams", "/api/exams/*",
            // `*` matches exactly ONE path segment, so the deep duty routes
            // (`/duties/my/hall/{hallId}/plan`, `.../attendance` — three extra
            // segments) must be listed explicitly. Without them they fall
            // through to the `/api/duties/**` ADMIN rule below and every
            // faculty hall-plan / attendance read answers 403.
            "/api/duties/my", "/api/duties/my/*",
            "/api/duties/my/hall/*", "/api/duties/my/hall/*/plan",
            "/api/duties/my/hall/*/attendance",
            "/api/reports/*", "/api/students/template", "/api/health"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler()))
                .authorizeHttpRequests(auth -> auth
                        // ---- public auth surface ----
                        .requestMatchers("/api/auth/login", "/api/auth/register",
                                "/api/auth/forgot-password", "/api/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                        // ---- docs + tooling ----
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**",
                                "/api-docs/**", "/h2-console/**", "/error").permitAll()
                        // ---- health ----
                        .requestMatchers("/api/health", "/actuator/health").permitAll()
                        // ---- read-only catalogue + reports (both roles) ----
                        .requestMatchers(HttpMethod.GET, PUBLIC_GET).authenticated()
                        // ---- reads a faculty member legitimately needs for their own
                        //      duty. The controllers re-scope these to the halls they
                        //      invigilate, so allowing the role here leaks nothing.
                        .requestMatchers(HttpMethod.GET,
                                "/api/dashboard/faculty",
                                "/api/duties/faculty",
                                "/api/seating/plans", "/api/seating/plans/*")
                        .authenticated()
                        // ---- faculty writes their own attendance ----
                        // POST would otherwise fall through to the `/api/duties/**`
                        // ADMIN rule below. The controller re-scopes it to halls the
                        // caller actually supervises, so `.authenticated()` here is
                        // sufficient: the role check lives in DutyServiceImpl.
                        .requestMatchers(HttpMethod.POST, "/api/duties/my/hall/*/attendance")
                        .authenticated()
                        // ---- admin-only domains ----
                        .requestMatchers("/api/students/**", "/api/halls/**", "/api/exams/**",
                                "/api/seating/**", "/api/duties/**", "/api/faculty/**",
                                "/api/dashboard/**", "/api/settings/**", "/api/activity")
                        .hasRole("ADMIN")
                        // ---- notifications: available to both roles ----
                        .requestMatchers("/api/notifications/**").authenticated()
                        .anyRequest().authenticated())
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) -> {
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            ApiResponse<Void> body = ApiResponse.error(403,
                    "You do not have permission to perform this action", null);
            body.setPath(request.getRequestURI());
            objectMapper.writeValue(response.getOutputStream(), body);
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.asList(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Content-Disposition", "Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            com.examseat.security.CustomUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }
}
