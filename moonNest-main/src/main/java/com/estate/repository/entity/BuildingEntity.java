package com.estate.repository.entity;

import com.estate.enums.Direction;
import com.estate.enums.Level;
import com.estate.enums.PropertyType;
import com.estate.enums.TransactionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "building")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BuildingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private String name;

    @Column
    private String ward;

    @Column
    private String street;

    @Column(name = "number_of_floor")
    private Integer numberOfFloor;

    @Column(name = "number_of_basement")
    private Integer numberOfBasement;

    @Column(name = "floor_area")
    private Integer floorArea;

    @Enumerated(EnumType.STRING)
    private Direction direction;

    @Enumerated(EnumType.STRING)
    private Level level;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false)
    private PropertyType propertyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Column(name = "tax_code", length = 20)
    private String taxCode;

    @Column(name = "rent_price")
    private BigDecimal rentPrice;

    // Giá bán — NULL nếu FOR_RENT, có giá trị nếu FOR_SALE
    @Column(name = "sale_price")
    private BigDecimal salePrice;

    @Column(name = "service_fee")
    private BigDecimal serviceFee;

    @Column(name = "car_fee")
    private BigDecimal carFee;

    @Column(name = "motorbike_fee")
    private BigDecimal motorbikeFee;

    @Column(name = "water_fee")
    private BigDecimal waterFee;

    @Column(name = "electricity_fee")
    private BigDecimal electricityFee;

    @Column
    private BigDecimal deposit;

    @Column(name = "link_of_building")
    private String linkOfBuilding;

    @Column
    private String image;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        this.createdDate = LocalDateTime.now();
        this.modifiedDate = LocalDateTime.now();
    }

    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;

    @PreUpdate
    protected void onUpdate() {
        this.modifiedDate = LocalDateTime.now();
    }

    // =================== RELATIONSHIPS ===================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id")
    private DistrictEntity district;

    @OneToMany(mappedBy = "building", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RentAreaEntity> rentAreas = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "assignment_building",
            joinColumns = @JoinColumn(name = "building_id"),
            inverseJoinColumns = @JoinColumn(name = "staff_id")
    )
    private List<StaffEntity> staffs_buildings = new ArrayList<>();
}