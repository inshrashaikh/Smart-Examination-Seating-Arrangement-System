package com.examseat.repository;

import com.examseat.entity.SeatAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface SeatAllocationRepository extends JpaRepository<SeatAllocation, String> {

    List<SeatAllocation> findByExamIdOrderByHallIdAscRowNoAscColNoAsc(String examId);

    List<SeatAllocation> findByExamId(String examId);

    List<SeatAllocation> findByExamIdAndHallIdOrderByRowNoAscColNoAsc(String examId, String hallId);

    List<SeatAllocation> findByExamIdIn(Collection<String> examIds);

    List<SeatAllocation> findByStudentId(String studentId);

    void deleteByExamId(String examId);

    void deleteByExamIdAndHallId(String examId, String hallId);

    long countByExamId(String examId);

    long countByExamIdAndHallId(String examId, String hallId);

    long countByHallId(String hallId);

    /** Distinct hall ids that hold at least one allocation. */
    @Query("select distinct a.hall.id from SeatAllocation a where a.hall is not null")
    List<String> findAllocatedHallIds();

    /** Sanity check used by tests and the reset endpoint — a student must appear once per exam. */
    @Query("""
            select a.student.id from SeatAllocation a
            where a.exam.id = :examId
            group by a.student.id
            having count(a) > 1
            """)
    List<String> findDuplicatedStudentIds(@Param("examId") String examId);
}
