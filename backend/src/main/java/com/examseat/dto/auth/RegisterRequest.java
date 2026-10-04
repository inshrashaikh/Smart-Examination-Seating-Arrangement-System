package com.examseat.dto.auth;

import com.examseat.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "is required")
    @Size(min = 3, max = 120, message = "must be between 3 and 120 characters")
    private String name;

    @NotBlank(message = "is required")
    @Email(message = "must be a well-formed email address")
    private String email;

    @NotBlank(message = "is required")
    @Size(min = 6, message = "must be at least 6 characters")
    private String password;

    @NotNull(message = "is required")
    private Role role;

    private String department;
    private String phone;
    private String title;
    private String employeeId;
    private String photo;
}