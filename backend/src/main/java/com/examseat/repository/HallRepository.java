package com.examseat.repository;

import com.examseat.entity.Hall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HallRepository extends JpaRepository<Hall, String> {

    Optional<Hall> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<Hall> findByIdIn(List<String> ids);

    List<Hall> findAllByOrderByCodeAsc();
}