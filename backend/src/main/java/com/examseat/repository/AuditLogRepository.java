package com.examseat.repository;

import com.examseat.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<AuditLog> findTop200ByOrderByCreatedAtDesc();
}
