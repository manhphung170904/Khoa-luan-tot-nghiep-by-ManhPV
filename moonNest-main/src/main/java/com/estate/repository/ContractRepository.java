package com.estate.repository;

import com.estate.dto.ContractRentAreaView;
import com.estate.enums.TransactionType;
import com.estate.repository.custom.ContractRepositoryCustom;
import com.estate.repository.entity.ContractEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ContractRepository extends JpaRepository<ContractEntity, Long>, ContractRepositoryCustom {
    @Query("SELECT c.staff.id, c.staff.fullName, COUNT(c.id) " +
            "FROM ContractEntity c " +
            "GROUP BY c.staff.id, c.staff.fullName " +
            "ORDER BY COUNT(c.id) DESC")
    List<Object[]> countContractsByStaff(Pageable pageable);

    List<ContractEntity> findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
            LocalDateTime endOfYear, LocalDateTime startOfYear
    );

    @Query("SELECT b.name, COUNT(c) " +
            "FROM ContractEntity c JOIN c.building b " +
            "GROUP BY b.name " +
            "ORDER BY COUNT(c) DESC")
    List<Object[]> countContractsByBuilding(Pageable pageable);

    @Query("SELECT YEAR(c.startDate), COUNT(c) " +
            "FROM ContractEntity c " +
            "GROUP BY YEAR(c.startDate) " +
            "ORDER BY YEAR(c.startDate)")
    List<Long[]> countRentContractsByYear();

    @Query("SELECT YEAR(sc.createdDate), COUNT(sc) " +
            "FROM SaleContractEntity sc " +
            "GROUP BY YEAR(sc.createdDate) " +
            "ORDER BY YEAR(sc.createdDate)")
    List<Long[]> countSaleContractsByYear();

    long countByBuildingIdAndStatus(Long buildingId, String status);

    long countByBuildingId(Long buildingId);

    long countByCustomerId(Long customerId);

    List<ContractEntity> findByCustomerId(Long customerId);

    List<ContractEntity> findByStaffId(Long staffId);

    Long countByCustomerIdAndStatus(Long customerId, String status);

    @Query("""
                SELECT c FROM ContractEntity c
                WHERE c.customer.id = :customerId
                  AND (:buildingId IS NULL OR c.building.id = :buildingId)
                  AND (:status = '' OR c.status = :status)
            """)
    List<ContractEntity> searchContracts(Long customerId, Long buildingId, String status);

    @Query("""
            SELECT cu.id, c.id
            FROM ContractEntity c
            JOIN c.customer cu
            WHERE c.status = 'ACTIVE'
            """)
    List<Long[]> getActiveContracts();

    @Query("""
                SELECT c.id,
                       new com.estate.dto.ContractFeeDTO(
                           b.rentPrice,
                           b.serviceFee,
                           b.carFee,
                           b.motorbikeFee,
                           b.waterFee,
                           b.electricityFee
                       )
                FROM ContractEntity c
                JOIN c.building b
                WHERE c.status = 'ACTIVE'
            """)
    List<Object[]> getContractsFees();

    @Query("""
       SELECT new com.estate.dto.ContractRentAreaView(
           c.id,
           c.rentArea
       )
       FROM ContractEntity c
       """)
    List<ContractRentAreaView> findAllIdAndRentArea();

    @Modifying
    @Query("""
            UPDATE ContractEntity c
            SET c.status = "EXPIRED"
            WHERE c.status = "ACTIVE"
            AND c.endDate < CURRENT_DATE
            """)
    void statusUpdate();

    Long countStaffIdByStaffId(Long staffId);

    @Query("""
            SELECT c
            FROM ContractEntity c
            WHERE c.endDate >= :start
            AND c.endDate < :end
            AND c.status = "ACTIVE"
            AND c.id IN :contractIds
            """)
    List<ContractEntity> getExpiringContracts(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("contractIds") List<Long> contractIds
    );

    @Query("SELECT COUNT(c) > 0 FROM ContractEntity c " +
            "WHERE c.staff.id = :staffId " +
            "AND c.building.id = :buildingId " +
            "AND c.status = 'ACTIVE'")
    boolean existsActiveByStaffAndBuilding(@Param("staffId") Long staffId,
                                           @Param("buildingId") Long buildingId);

    // Kiểm tra active contract theo staff + customer
    @Query("SELECT COUNT(c) > 0 FROM ContractEntity c " +
            "WHERE c.staff.id = :staffId " +
            "AND c.customer.id = :customerId " +
            "AND c.status = 'ACTIVE'")
    boolean existsActiveByStaffAndCustomer(@Param("staffId") Long staffId,
                                           @Param("customerId") Long customerId);

    /** Đếm số building FOR_RENT đang có ít nhất 1 hợp đồng ACTIVE */
    @Query("SELECT COUNT(DISTINCT c.building.id) FROM ContractEntity c WHERE c.status = 'ACTIVE'")
    long countDistinctBuildingWithActiveContract();

    /** Lấy HĐ ACTIVE có endDate trong khoảng [from, to] */
    List<ContractEntity> findByStatusAndEndDateBetween(String status, LocalDateTime from, LocalDateTime to);
}
