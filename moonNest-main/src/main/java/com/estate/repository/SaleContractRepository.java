package com.estate.repository;

import com.estate.repository.custom.SaleContractRepositoryCustom;
import com.estate.repository.entity.SaleContractEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleContractRepository extends JpaRepository<SaleContractEntity, Long>, SaleContractRepositoryCustom {
    @Query("""
                SELECT COUNT(sc)
                FROM SaleContractEntity sc
                JOIN sc.building b
                WHERE b.id = :buildingId
            """)
    Long countByBuildingId(@Param("buildingId") Long buildingId);

    @Query("""
                SELECT COUNT(sc)
                FROM SaleContractEntity sc
                JOIN sc.staff s
                WHERE s.id = :staffId
            """)
    Long countByStaffId(@Param("staffId") Long staffId);

    /** Kiểm tra building đã có hợp đồng mua bán chưa (dùng khi ADD) */
    boolean existsByBuilding_Id(Long buildingId);

    List<SaleContractEntity> findByCreatedDateBetween(LocalDateTime start, LocalDateTime end);
}
