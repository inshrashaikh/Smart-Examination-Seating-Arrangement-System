package com.examseat.repository;

import com.examseat.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Notification> findTop20ByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserIdAndReadFalse(String userId);
}