package com.examseat.service;

import com.examseat.dto.common.PageResponse;
import com.examseat.entity.AuditLog;
import com.examseat.repository.AuditLogRepository;
import com.examseat.security.CurrentUser;
import com.examseat.util.IdFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Write-side of the audit trail.
 *
 * <p>Services call {@link #record} the moment something noteworthy happens.
 * The actor is taken from the JWT when there is one and {@code system}
 * otherwise, so a scheduled job and a person are told apart in the log.</p>
 *
 * <p>The write joins the caller's transaction ({@code REQUIRED}): if a
 * generate is rolled back, its audit row goes with it — the trail must only
 * record things that actually happened.</p>
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRED)
    public AuditLog record(String action, String detail) {
        String actor = CurrentUser.email();
        return auditLogRepository.save(AuditLog.builder()
                .id(IdFactory.next("AU-", auditLogRepository.findAll().stream()
                        .map(AuditLog::getId).toList(), 5))
                .action(action)
                .detail(detail)
                .actor(actor == null ? "system" : actor)
                .build());
    }

    @Transactional(readOnly = true)
    public List<AuditLog> recent() {
        return auditLogRepository.findTop200ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLog> page(int page, int size) {
        var result = auditLogRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, Math.min(size, 100)));
        return PageResponse.of(result.getContent(), result.getTotalElements(),
                result.getNumber() + 1, result.getSize());
    }
}
