package com.estate.repository;

import com.estate.repository.entity.LegalAuthorityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LegalAuthorityRepository extends JpaRepository<LegalAuthorityEntity, Long> {

    List<LegalAuthorityEntity> findByBuildingId(Long buildingId);
}