package com.estate.repository;

import com.estate.repository.entity.UtilityMeterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UtilityMeterRepository extends JpaRepository<UtilityMeterEntity, Long> {
    Optional<UtilityMeterEntity> findByContractIdAndMonthAndYear(Long contractId, Integer month, Integer year);

    @Query("""
       SELECT (u.electricityNew - u.electricityOld)
       FROM UtilityMeterEntity u
       WHERE u.contract.id = :contractId
         AND u.month = :month
         AND u.year = :year
       """)
    Integer getElectricityUsage(Long contractId, Integer month, Integer year);

    @Query("""
       SELECT (u.waterNew - u.waterOld)
       FROM UtilityMeterEntity u
       WHERE u.contract.id = :contractId
         AND u.month = :month
         AND u.year = :year
       """)
    Integer getWaterUsage(Long contractId, Integer month, Integer year);

    void deleteByContractIdAndMonthAndYear(Long contractId, Integer month, Integer year);
}
