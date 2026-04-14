package com.estate.repository;

import com.estate.repository.entity.NearbyAmenityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NearbyAmenityRepository extends JpaRepository<NearbyAmenityEntity, Long> {

    List<NearbyAmenityEntity> findByBuildingId(Long buildingId);
}