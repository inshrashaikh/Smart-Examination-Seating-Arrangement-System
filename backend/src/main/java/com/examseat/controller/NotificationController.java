package com.examseat.controller;

import com.examseat.dto.common.ApiResponse;
import com.examseat.dto.notification.NotificationResponse;
import com.examseat.security.CurrentUser;
import com.examseat.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "In-app notifications for the signed-in account")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Every notification for the caller, newest first")
    public ApiResponse<List<NotificationResponse>> list(
            @RequestParam(required = false) String email) {
        return ApiResponse.ok(notificationService.listFor(resolve(email)));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "How many notifications are still unread")
    public ApiResponse<Map<String, Object>> unreadCount(@RequestParam(required = false) String email) {
        return ApiResponse.ok(Map.of("count", notificationService.unreadCount(resolve(email))));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark one notification as read")
    public ApiResponse<NotificationResponse> markRead(
            @PathVariable String id,
            @RequestParam(required = false) String email) {
        return ApiResponse.ok(notificationService.markRead(id, resolve(email)));
    }

    @PutMapping("/read-all")
    @Operation(summary = "Mark every notification as read")
    public ApiResponse<Map<String, Object>> markAllRead(@RequestParam(required = false) String email) {
        return ApiResponse.ok(Map.of("updated", notificationService.markAllRead(resolve(email))));
    }

    private String resolve(String requested) {
        return requested == null || requested.isBlank() ? CurrentUser.requireEmail() : requested.trim();
    }
}
