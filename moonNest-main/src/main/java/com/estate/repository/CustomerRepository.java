package com.estate.repository;

import com.estate.dto.CustomerSelectDTO;
import com.estate.dto.UsernameChangeDTO;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.StaffEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {
    @Query("SELECT c.id, c.fullName, COUNT(co) " +
            "FROM CustomerEntity c JOIN c.contracts co " +
            "GROUP BY c.id, c.fullName " +
            "ORDER BY COUNT(co) DESC")
    List<Object[]> countContractsByCustomer(Pageable pageable);

    Page<CustomerEntity> findByFullNameContainingIgnoreCase(String fullName, Pageable pageable);

    @Query("""
            SELECT c
            FROM CustomerEntity c
            JOIN c.staffs_customers sc
            WHERE sc.id = :staffId
            AND ( :fullName IS NULL OR :fullName = '' 
                OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :fullName, '%')) )
            """)
    Page<CustomerEntity> findByNameAndStaffID(
            @Param("fullName") String fullName,
            @Param("staffId") Long staffId,
            Pageable pageable
    );

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByUsernameAndIdNot(String username, Long id);

    CustomerEntity findByUsername(String username);

    @Modifying
    @Query("""
            UPDATE CustomerEntity c
            SET c.username = :username
            WHERE c.id = :customerId
            """)
    void usernameUpdate(@Param("username") String username,
                        @Param("customerId") Long customerId);

    @Modifying
    @Query("""
            UPDATE CustomerEntity c
            SET c.email = :email
            WHERE c.id = :customerId
            """)
    void emailUpdate(@Param("email") String email,
                     @Param("customerId") Long customerId);

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    @Modifying
    @Query("""
            UPDATE CustomerEntity c
            SET c.phone = :phone
            WHERE c.id = :customerId
            """)
    void phoneNumberUpdate(@Param("phone") String phone,
                           @Param("customerId") Long customerId);

    @Modifying
    @Query("""
            UPDATE CustomerEntity c
            SET c.password = :password
            WHERE c.id = :customerId
            """)
    void passwordUpdate(@Param("password") String password,
                        @Param("customerId") Long customerId);

    Optional<CustomerEntity> findByEmail(String email);

    @Query("""
            SELECT c 
            FROM CustomerEntity c 
            JOIN c.staffs_customers sc 
            WHERE sc.id = :staffId
            """)
    List<CustomerEntity> findByStaffId(@Param("staffId") Long staffId);

    @Query("SELECT new com.estate.dto.CustomerSelectDTO(c.id, c.fullName, c.phone) " +
            "FROM CustomerEntity c ORDER BY c.fullName ASC")
    List<CustomerSelectDTO> findAllForSelect();
}
