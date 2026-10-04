package com.examseat.service.impl;

import com.examseat.dto.auth.ForgotPasswordRequest;
import com.examseat.dto.auth.LoginRequest;
import com.examseat.dto.auth.LoginResponse;
import com.examseat.dto.auth.RegisterRequest;
import com.examseat.dto.auth.UserResponse;
import com.examseat.entity.Role;
import com.examseat.entity.User;
import com.examseat.exception.ApiException;
import com.examseat.mapper.UserMapper;
import com.examseat.repository.UserRepository;
import com.examseat.security.JwtService;
import com.examseat.service.AuthService;
import com.examseat.util.IdFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    @Override
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        if (!user.isEnabled()) {
            throw ApiException.forbidden("This account has been disabled. Contact the examination cell.");
        }
        // The UI sends the role tab the user picked; a mismatch means they used the
        // wrong login form, so reject it rather than silently logging them in.
        if (request.getRole() != null && !request.getRole().isBlank()) {
            String requested = request.getRole().trim().toUpperCase();
            if (!requested.equals(user.getRole().name())) {
                throw ApiException.forbidden("This account is registered as " + user.getRole()
                        + ". Switch to the " + user.getRole() + " tab to continue.");
            }
        }

        String token = jwtService.generateToken(user);
        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenValiditySeconds())
                .user(userMapper.toResponse(user))
                .role(user.getRole().name())
                .build();
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account already exists for " + email);
        }

        Role role = request.getRole() == null ? Role.FACULTY : request.getRole();
        // Self-service registration may only create FACULTY accounts — ADMIN has to be
        // provisioned by an existing administrator.
        if (role == Role.ADMIN) {
            throw ApiException.forbidden("Administrator accounts must be created by an existing administrator");
        }

        User user = User.builder()
                .id(IdFactory.next("U-", userRepository.findAll().stream().map(User::getId).toList(), 4))
                .name(request.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .department(request.getDepartment())
                .phone(request.getPhone())
                .title(request.getTitle())
                .employeeId(request.getEmployeeId())
                .photo(request.getPhoto())
                .enabled(true)
                .createdAt(Instant.now())
                .build();

        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse me(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(userMapper::toResponse)
                .orElseThrow(() -> ApiException.unauthorized("Your session is no longer valid. Please sign in again."));
    }

    @Override
    public String forgotPassword(ForgotPasswordRequest request) {
        boolean exists = userRepository.existsByEmailIgnoreCase(request.getEmail().trim());
        log.info("Password reset requested for {} (known={})", request.getEmail(), exists);
        // Deliberately identical response either way — see interface javadoc.
        return "If an account exists for that address, a reset link has been sent.";
    }

    @Override
    @Transactional
    public UserResponse updateProfile(String email, RegisterRequest request) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Account not found"));

        if (request.getName() != null && !request.getName().isBlank()) user.setName(request.getName().trim());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment());
        if (request.getTitle() != null) user.setTitle(request.getTitle());
        if (request.getPhoto() != null) user.setPhoto(request.getPhoto());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        return userMapper.toResponse(userRepository.save(user));
    }
}
