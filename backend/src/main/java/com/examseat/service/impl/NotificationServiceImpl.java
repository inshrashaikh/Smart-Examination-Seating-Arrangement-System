package com.examseat.service.impl;

import com.examseat.dto.notification.NotificationResponse;
import com.examseat.entity.Notification;
import com.examseat.entity.User;
import com.examseat.exception.ApiException;
import com.examseat.repository.NotificationRepository;
import com.examseat.repository.UserRepository;
import com.examseat.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> listFor(String email) {
        User user = requireUser(email);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(String email) {
        return notificationRepository.countByUserIdAndReadFalse(requireUser(email).getId());
    }

    @Override
    @Transactional
    public NotificationResponse markRead(String id, String email) {
        User user = requireUser(email);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Notification", id));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw ApiException.forbidden("That notification belongs to another account");
        }
        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public int markAllRead(String email) {
        User user = requireUser(email);
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(notification -> !notification.isRead())
                .toList();
        unread.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unread);
        return unread.size();
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .read(notification.isRead())
                .href(notification.getHref())
                .createdAt(notification.getCreatedAt())
                .at(notification.getCreatedAt())
                .build();
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw ApiException.badRequest("An email is required to resolve the account");
        }
        return userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> ApiException.notFound("Account", email));
    }
}
