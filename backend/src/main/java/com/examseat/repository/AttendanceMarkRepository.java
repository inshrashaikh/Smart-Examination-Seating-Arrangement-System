package com.examseat.repository;

import com.examseat.entity.AttendanceMark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface AttendanceMarkRepository extends JpaRepository<AttendanceMark, String> {

    List<AttendanceMark> findByExamIdAndHallId(String examId, String hallId);

    List<AttendanceMark> findByExamId(String examId);

    /**
     * Marks for one exam, keyed by allocation id.
     *
     * <p>Returns a {@code Map} rather than a {@code List} because the caller — building
     * an attendance sheet — looks a mark up once per seated candidate. Keying here means
     * one query per sheet instead of one per row, which is the difference between 1 and
     * 29 round trips on a single hall.
     *
     * <p>Scoped by exam only, not by hall: the report builder walks allocations across
     * every hall for the exam, and the {@code hallId} column stays useful for auditing
     * and for the hall-scoped variants.
     */
    @Query("select m.allocationId, m from AttendanceMark m where m.examId = :examId")
    Map<String, AttendanceMark> indexByAllocationForExam(@Param("examId") String examId);

    @Query("select m.hallId, count(m) from AttendanceMark m where m.examId = :examId group by m.hallId")
    List<Object[]> countByExamGroupedByHall(@Param("examId") String examId);

    long countByExamIdAndHallIdAndPresentTrue(String examId, String hallId);
}