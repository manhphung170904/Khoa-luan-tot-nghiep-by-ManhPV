package com.estate.repository;

import com.estate.repository.entity.RentAreaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RentAreaRepository extends JpaRepository<RentAreaEntity, Long> {
    @Modifying
    @Query("DELETE FROM RentAreaEntity ra WHERE ra.building.id = :buildingId")
    void deleteByBuildingId(@Param("buildingId") Long buildingId);

    @Query("""
        SELECT r.building.id AS buildingId, r.value AS value
        FROM RentAreaEntity r
    """)
    List<Object[]> getAllRentAreasRaw();
}
