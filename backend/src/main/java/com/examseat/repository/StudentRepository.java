package com.examseat.repository;

import com.examseat.entity.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, String> {

    Optional<Student> findByRollNoIgnoreCase(String rollNo);

    boolean existsByRollNoIgnoreCase(String rollNo);

    long countByDepartment(String department);

    /**
     * Every student eligible to sit a given exam: department must be listed on the
     * exam and the year must satisfy {@code minYear}.
     */
    @Query("""
            select s from Student s
            where s.department in :departments
              and s.year >= :minYear
            """)
    List<Student> findEligible(@Param("departments") Collection<String> departments,
                               @Param("minYear") Integer minYear);

    /** Same as {@link #findEligible} but further restricted to an explicit year list. */
    @Query("""
            select s from Student s
            where s.department in :departments
              and s.year in :years
              and s.year >= :minYear
            """)
    List<Student> findEligibleForYears(@Param("departments") Collection<String> departments,
                                       @Param("years") Collection<Integer> years,
                                       @Param("minYear") Integer minYear);

    @Query("""
            select s from Student s
            where (:search is null or lower(s.name) like lower(concat('%', :search, '%'))
                   or lower(s.rollNo) like lower(concat('%', :search, '%'))
                   or lower(coalesce(s.email, '')) like lower(concat('%', :search, '%')))
              and (:department is null or s.department = :department)
              and (:year is null or s.year = :year)
            """)
    Page<Student> search(@Param("search") String search,
                         @Param("department") String department,
                         @Param("year") Integer year,
                         Pageable pageable);

    List<Student> findByRollNoInIgnoreCase(Collection<String> rollNos);
}