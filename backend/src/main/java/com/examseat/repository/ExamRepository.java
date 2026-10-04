package com.examseat.repository;

import com.examseat.entity.Exam;
import com.examseat.entity.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExamRepository extends JpaRepository<Exam, String> {

    Optional<Exam> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<Exam> findAllByOrderByDateAsc();

    List<Exam> findByDateGreaterThanEqualOrderByDateAsc(LocalDate date);

    List<Exam> findByStatusOrderByDateAsc(ExamStatus status);

    long countByStatus(ExamStatus status);
}