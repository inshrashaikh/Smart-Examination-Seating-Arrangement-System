package com.examseat.service;

import com.examseat.dto.notification.NotificationResponse;

import java.util.List;

public interface NotificationService {

    List<NotificationResponse> listFor(String email);

    long unreadCount(String email);

    NotificationResponse markRead(String id, String email);

    int markAllRead(String email);
}
