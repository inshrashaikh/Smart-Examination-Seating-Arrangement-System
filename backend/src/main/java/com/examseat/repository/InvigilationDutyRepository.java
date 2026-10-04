package com.examseat.repository;

import com.examseat.entity.InvigilationDuty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface InvigilationDutyRepository extends JpaRepository<InvigilationDuty, String> {

    List<InvigilationDuty> findByFacultyIdOrderByDateDesc(String facultyId);

    List<InvigilationDuty> findByFacultyIdAndDateBetweenOrderByDateAsc(
            String facultyId, LocalDate from, LocalDate to);

    List<InvigilationDuty> findByExamId(String examId);

    List<InvigilationDuty> findByExamIdAndHallId(String examId, String hallId);

    long countByExamIdAndFacultyId(String examId, String facultyId);

    boolean existsByExamIdAndHallIdAndFacultyId(String examId, String hallId, String facultyId);

    /** Per-faculty duty totals used by the admin dashboard workload chart. */
    @Query("""
            select d.faculty.id, d.faculty.name, d.faculty.department, count(d)
            from InvigilationDuty d
            group by d.faculty.id, d.faculty.name, d.faculty.department
            order by count(d) desc
            """)
    List<Object[]> workloadByFaculty();
}