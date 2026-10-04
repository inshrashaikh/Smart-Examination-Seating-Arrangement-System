package com.examseat.dto.student;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentRequest {

    @NotBlank(message = "is required")
    @Size(max = 40, message = "must be at most 40 characters")
    private String rollNo;

    @NotBlank(message = "is required")
    @Size(max = 120, message = "must be at most 120 characters")
    private String name;

    @Email(message = "must be a well-formed email address")
    @Size(max = 160, message = "must be at most 160 characters")
    private String email;

    @Size(max = 40, message = "must be at most 40 characters")
    private String phone;

    @NotBlank(message = "is required")
    @Pattern(regexp = "CSE|IT|ECE|MECH|CIVIL", message = "must be one of CSE, IT, ECE, MECH, CIVIL")
    private String department;

    @NotNull(message = "is required")
    @Min(value = 1, message = "must be between 1 and 5")
    @Max(value = 5, message = "must be between 1 and 5")
    private Integer year;

    @Size(max = 8, message = "must be at most 8 characters")
    private String section;

    @Size(max = 16, message = "must be at most 16 characters")
    private String gender;

    @Size(max = 40, message = "must be at most 40 characters")
    private String prn;

    @Size(max = 400, message = "must be at most 400 characters")
    private String photo;
}