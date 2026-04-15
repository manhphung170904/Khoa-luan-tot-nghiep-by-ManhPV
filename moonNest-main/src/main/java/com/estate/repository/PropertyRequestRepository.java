package com.estate.repository;

import com.estate.repository.entity.PropertyRequestEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropertyRequestRepository extends JpaRepository<PropertyRequestEntity, Long> {

    // Admin: danh sách tất cả (phân trang, mới nhất trước)
    Page<PropertyRequestEntity> findAllByOrderByCreatedDateDesc(Pageable pageable);

    // Admin: lọc theo status
    Page<PropertyRequestEntity> findByStatusOrderByCreatedDateDesc(String status, Pageable pageable);

    // Customer: xem yêu cầu của mình
    List<PropertyRequestEntity> findByCustomerIdOrderByCreatedDateDesc(Long customerId);

    // Check trùng: cùng KH + cùng building + đang PENDING
    boolean existsByCustomerIdAndBuildingIdAndStatus(Long customerId, Long buildingId, String status);

    // Đếm pending (hiển thị badge)
    Long countByStatus(String status);
}
