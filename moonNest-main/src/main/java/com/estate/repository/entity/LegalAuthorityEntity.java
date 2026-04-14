package com.estate.repository.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "legal_authority")
@Getter @Setter @NoArgsConstructor
public class LegalAuthorityEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id", nullable = false)
    private BuildingEntity building;

    @Column(name = "authority_name", nullable = false)
    private String authorityName;

    // NOTARY | LAND_REGISTRY | LAW_FIRM | TAX_OFFICE
    @Column(name = "authority_type")
    private String authorityType;

    @Column(columnDefinition = "TEXT")
    private String address;

    private String phone;
    private String email;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_date")
    private LocalDateTime createdDate;
}