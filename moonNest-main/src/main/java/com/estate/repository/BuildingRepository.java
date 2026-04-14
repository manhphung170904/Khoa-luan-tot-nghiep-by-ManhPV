package com.estate.repository;

import com.estate.dto.BuildingSelectDTO;
import com.estate.enums.TransactionType;
import com.estate.repository.custom.BuildingRepositoryCustom;
import com.estate.repository.entity.BuildingEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;

public interface BuildingRepository extends JpaRepository<BuildingEntity, Long>, BuildingRepositoryCustom {
    @Query("SELECT d.name, COUNT(b.id) " +
            "FROM BuildingEntity b JOIN b.district d " +
            "GROUP BY d.name " +
            "ORDER BY COUNT(b.id) DESC")
    List<Object[]> countBuildingsByDistrict();

    @Query("SELECT b FROM BuildingEntity b ORDER BY b.createdDate DESC")
    List<BuildingEntity> findRecentBuildings(Pageable pageable);

    @Query("SELECT b.ward " +
            "FROM BuildingEntity b " +
            "GROUP BY b.ward")
    List<String> getWardName();

    @Query("SELECT b.street " +
            "FROM BuildingEntity b " +
            "GROUP BY b.street")
    List<String> getStreetName();

    @Query("""
                SELECT COUNT(b) > 0
                FROM BuildingEntity b
                JOIN b.staffs_buildings sb
                WHERE sb.id = :staffId
                  AND b.id = :buildingId
            """)
    Boolean isStaffManagesBuilding(Long staffId, Long buildingId);

    @Query("""
                SELECT COUNT(b)
                FROM BuildingEntity b
                WHERE b.transactionType = :transactionType
            """)
    Long countByTransactionType(TransactionType transactionType);

    @Query("SELECT new com.estate.dto.BuildingSelectDTO(b.id, b.name, CONCAT(b.ward, ', ', b.street)) " +
            "FROM BuildingEntity b " +
            "ORDER BY b.name ASC")
    List<BuildingSelectDTO> findAllForSelect();

    @Query("""
                SELECT b
                FROM BuildingEntity b
                JOIN b.staffs_buildings sb
                WHERE sb.id = :staffId
                ORDER BY b.name ASC
            """)
    List<BuildingEntity> findAllByStaffId(@Param("staffId") Long staffId);

    /** Đếm building nhóm theo propertyType — trả về List<Object[]> {PropertyType enum, Long count} */
    @Query("SELECT b.propertyType, COUNT(b) FROM BuildingEntity b GROUP BY b.propertyType ORDER BY COUNT(b) DESC")
    List<Object[]> countGroupByPropertyType();
    // Ghi chú: arr[0] là PropertyType enum → dùng arr[0].toString() khi convert sang Map<String, Long>
}
