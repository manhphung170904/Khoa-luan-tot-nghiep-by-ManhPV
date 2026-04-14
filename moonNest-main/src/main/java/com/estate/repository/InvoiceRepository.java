package com.estate.repository;

import com.estate.repository.custom.InvoiceRepositoryCustom;
import com.estate.repository.entity.InvoiceEntity;
import org.springframework.cglib.core.Local;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, Long>, InvoiceRepositoryCustom {
    @Query("SELECT SUM(i.totalAmount) FROM InvoiceEntity i WHERE i.customer.id = :customerId")
    BigDecimal findTotalAmountByCustomerId(@Param("customerId") Long customerId);

    InvoiceEntity getFirstByCustomerIdAndStatus(Long customerId, String status);

    Long countByCustomerIdAndStatus(Long customerId, String status);

    List<InvoiceEntity> findAllByCustomerIdAndStatus(Long customerId, String status);

    @Query("""
            SELECT i FROM InvoiceEntity i
            JOIN i.customer c
            WHERE c.id = :customerId
              AND i.status = :status
              AND (:month IS NULL OR i.month = :month)
              AND (:year IS NULL OR i.year = :year)
            """)
    Page<InvoiceEntity> search(
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("customerId") Long customerId,
            @Param("status") String status,
            Pageable pageable
    );

    @Modifying
    @Query("""
                UPDATE InvoiceEntity i
                SET i.status = 'PAID',
                    i.paidDate = CURRENT_TIMESTAMP
                WHERE i.id = :id
                  AND i.status = 'PENDING'
            """)
    int confirmInvoice(@Param("id") Long id);

    boolean existsByContractIdAndCustomerIdAndMonthAndYear(
            Long contractId, Long customerId, Integer month, Integer year
    );

    Long countByStatus(String status);

    List<InvoiceEntity> findByStatus(String status);

    @Query("""
                SELECT i
                FROM InvoiceEntity i
                JOIN i.contract c
                WHERE CURRENT_TIMESTAMP >= :start
                  AND CURRENT_TIMESTAMP < i.dueDate
                  AND i.status = 'PENDING'
                  AND c.id IN :contractIds
            """)
    List<InvoiceEntity> getExpiringInvoices(
            @Param("start") LocalDateTime start,
            @Param("contractIds") List<Long> contractIds
    );

    @Modifying
    @Query("""
            UPDATE InvoiceEntity i
            SET i.status = "OVERDUE"
            WHERE i.status = "PENDING"
            AND CURRENT_TIMESTAMP >= i.dueDate
            """)
    void invoiceStatusUpdate();

    Long countByStatusAndContractIdIn(String status, List<Long> contractIds);

    List<InvoiceEntity> findByStatusAndContractIdIn(String status, List<Long> contractIds);
}
