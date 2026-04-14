package com.estate.repository;

import com.estate.repository.entity.DistrictEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DistrictRepository extends JpaRepository<DistrictEntity, Long> {

    @Query("""
                SELECT d.name, d.id
                FROM DistrictEntity d
                ORDER BY d.id
            """)
    List<Object[]> getDistricts();
}