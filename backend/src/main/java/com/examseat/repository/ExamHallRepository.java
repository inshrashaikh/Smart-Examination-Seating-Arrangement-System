package com.examseat.repository;

import com.examseat.entity.ExamHall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamHallRepository extends JpaRepository<ExamHall, String> {

    List<ExamHall> findByExamId(String examId);

    List<ExamHall> findByExamIdIn(List<String> examIds);

    List<ExamHall> findByHallId(String hallId);

    void deleteByExamId(String examId);

    boolean existsByExamIdAndHallId(String examId, String hallId);
}
