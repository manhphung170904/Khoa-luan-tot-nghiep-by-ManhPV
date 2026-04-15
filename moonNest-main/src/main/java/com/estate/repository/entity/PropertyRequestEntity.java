package com.estate.repository.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "property_request")
@Getter
@Setter
@NoArgsConstructor
public class PropertyRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerEntity customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id", nullable = false)
    private BuildingEntity building;

    @Column(name = "request_type", nullable = false, length = 20)
    private String requestType; // RENT / BUY

    // Snapshot thông tin KH tại thời điểm gửi
    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(length = 15)
    private String phone;

    @Column(length = 100)
    private String email;

    // Chi tiết yêu cầu
    @Column(name = "desired_area")
    private Integer desiredArea;

    @Column(name = "desired_start_date")
    private LocalDate desiredStartDate;

    @Column(name = "desired_end_date")
    private LocalDate desiredEndDate;

    @Column(name = "offered_price", precision = 15, scale = 2)
    private BigDecimal offeredPrice;

    @Column(columnDefinition = "TEXT")
    private String message;

    // Trạng thái xử lý
    @Column(nullable = false, length = 20)
    private String status; // PENDING / APPROVED / REJECTED / CANCELLED

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    private StaffEntity processedBy;

    // Liên kết hợp đồng (sau khi duyệt)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id")
    private ContractEntity contract;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_contract_id")
    private SaleContractEntity saleContract;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;

    @PrePersist
    protected void onCreate() {
        this.createdDate = LocalDateTime.now();
        this.modifiedDate = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedDate = LocalDateTime.now();
    }
}
