package com.estate.repository;

import com.estate.repository.entity.PlanningMapEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlanningMapRepository extends JpaRepository<PlanningMapEntity, Long> {

    List<PlanningMapEntity> findByBuildingId(Long buildingId);
}