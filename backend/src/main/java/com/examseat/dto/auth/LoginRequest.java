package com.examseat.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "is required")
    @Email(message = "must be a well-formed email address")
    private String email;

    /**
     * Deliberately has no length constraint.
     *
     * <p>The password policy lives on {@code RegisterRequest}. Re-checking it here
     * would mean anyone whose password was reset to something short could never
     * sign in, and the validation message would blame their password policy rather
     * than say the password was wrong. Authentication is the only thing that
     * should decide whether a login succeeds.</p>
     */
    @NotBlank(message = "is required")
    private String password;

    /** Optional — the UI passes the tab the user picked. Checked against the stored role. */
    private String role;
}