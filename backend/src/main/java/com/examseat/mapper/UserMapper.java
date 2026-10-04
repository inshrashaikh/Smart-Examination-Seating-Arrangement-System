package com.examseat.mapper;

import com.examseat.dto.auth.UserResponse;
import com.examseat.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User user) {
        if (user == null) return null;
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .department(user.getDepartment())
                .phone(user.getPhone())
                .title(user.getTitle())
                .employeeId(user.getEmployeeId())
                .photo(user.getPhoto())
                .build();
    }
}