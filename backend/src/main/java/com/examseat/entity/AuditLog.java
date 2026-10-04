package com.examseat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * One immutable row in the audit trail.
 *
 * <p>Written by the services at the moment something happens (a plan is
 * generated, swapped, published; a duty is assigned, removed, moved through
 * its lifecycle). Read by the admin audit page. There is deliberately no
 * update or delete path — an audit trail that can be edited is not one.</p>
 */
@Entity
@Table(name = "audit_log", indexes = @Index(name = "idx_audit_created", columnList = "createdAt"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @Column(length = 32)
    private String id;

    /** Short machine-readable action, e.g. {@code seating.generate}. */
    @Column(name = "action", nullable = false, length = 48)
    private String action;

    /** Human-readable detail: who did what, to which exam/hall/seat. */
    @Column(name = "detail", nullable = false, length = 500)
    private String detail;

    /** Email of the signed-in user, or {@code system} for scheduled work. */
    @Column(name = "actor", nullable = false, length = 120)
    private String actor;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
