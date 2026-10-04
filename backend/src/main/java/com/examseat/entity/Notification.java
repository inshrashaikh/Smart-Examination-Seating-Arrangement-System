package com.examseat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** An in-app notification addressed to a single user. */
@Entity
@Table(
        name = "notifications",
        indexes = @Index(name = "idx_notif_user", columnList = "user_id")
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @Column(length = 32)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 40)
    private String type;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 600)
    private String message;

    /** Field name kept as {@code readFlag} so the JSON exposes {@code read}. */
    @Column(name = "read_flag", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(length = 200)
    private String href;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}