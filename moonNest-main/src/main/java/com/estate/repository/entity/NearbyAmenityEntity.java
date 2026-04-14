package com.estate.repository.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "nearby_amenity")
@Getter @Setter @NoArgsConstructor
public class NearbyAmenityEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id", nullable = false)
    private BuildingEntity building;

    @Column(nullable = false)
    private String name;

    // SHOPPING | PARK | HOSPITAL | SCHOOL | RESTAURANT | BANK | GYM | TRANSPORT | OTHER
    @Column(name = "amenity_type", nullable = false)
    private String amenityType;

    @Column(name = "distance_meter")
    private Integer distanceMeter;

    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "created_date")
    private LocalDateTime createdDate;
}