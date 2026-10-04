package com.examseat.service;

import com.examseat.dto.auth.ForgotPasswordRequest;
import com.examseat.dto.auth.LoginRequest;
import com.examseat.dto.auth.LoginResponse;
import com.examseat.dto.auth.RegisterRequest;
import com.examseat.dto.auth.UserResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    UserResponse register(RegisterRequest request);

    UserResponse me(String email);

    /** Always reports success so the endpoint cannot be used to enumerate accounts. */
    String forgotPassword(ForgotPasswordRequest request);

    UserResponse updateProfile(String email, RegisterRequest request);
}
