package com.examseat.dto.auth;

import com.examseat.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Never exposes the password hash. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private String id;
    private String name;
    private String email;
    private Role role;
    private String department;
    private String phone;
    private String title;
    private String employeeId;
    private String photo;
}