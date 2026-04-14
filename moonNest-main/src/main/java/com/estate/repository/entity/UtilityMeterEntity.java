package com.estate.repository.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(
    name = "utility_meter",
    uniqueConstraints = {
            @UniqueConstraint(columnNames = {"contract_id", "month", "year"})
    }
)
public class UtilityMeterEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer month;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "electricity_old", nullable = false)
    private Integer electricityOld;

    @Column(name = "electricity_new", nullable = false)
    private Integer electricityNew;

    @Column(name = "water_old", nullable = false)
    private Integer waterOld;

    @Column(name = "water_new", nullable = false)
    private Integer waterNew;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Hợp đồng liên quan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private ContractEntity contract;
}
