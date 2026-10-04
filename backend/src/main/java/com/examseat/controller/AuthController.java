package com.examseat.controller;

import com.examseat.dto.auth.ForgotPasswordRequest;
import com.examseat.dto.auth.LoginRequest;
import com.examseat.dto.auth.LoginResponse;
import com.examseat.dto.auth.RegisterRequest;
import com.examseat.dto.auth.UserResponse;
import com.examseat.dto.common.ApiResponse;
import com.examseat.security.CurrentUser;
import com.examseat.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Login, registration and the current session")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Exchange credentials for a bearer token")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "Create a FACULTY account (ADMIN must be provisioned by an admin)")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(authService.register(request), "Account created"));
    }

    @GetMapping("/me")
    @Operation(summary = "The signed-in user")
    public ApiResponse<UserResponse> me() {
        return ApiResponse.ok(authService.me(CurrentUser.requireEmail()));
    }

    @PutMapping("/me")
    @Operation(summary = "Update the signed-in user's profile")
    public ApiResponse<UserResponse> updateMe(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(authService.updateProfile(CurrentUser.requireEmail(), request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Client-side logout — the JWT is stateless, so this only confirms intent")
    public ApiResponse<Map<String, String>> logout() {
        return ApiResponse.ok(Map.of("message", "Signed out. Discard the token on the client."));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a reset link (response is identical whether or not the account exists)")
    public ApiResponse<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ApiResponse.ok(Map.of("message", authService.forgotPassword(request)));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Complete a reset using the emailed token")
    public ApiResponse<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.isBlank()) {
            throw com.examseat.exception.ApiException.badRequest("A reset token is required");
        }
        // Mail delivery is out of scope for this build; the endpoint exists so the
        // frontend flow can be exercised end to end.
        return ApiResponse.ok(Map.of(
                "message", "Reset links are not wired to a mail server in this build",
                "token", token));
    }
}
