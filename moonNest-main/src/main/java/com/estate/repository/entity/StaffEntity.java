package com.estate.repository.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "staff")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StaffEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private String username;

    @Column
    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Column
    private String phone;

    @Column
    private String email;

    @Column
    private String role; // ADMIN, STAFF

    @Column(name = "auth_origin")
    private String authOrigin;

    @Column
    private String image;

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        if (this.authOrigin == null || this.authOrigin.isBlank()) {
            this.authOrigin = "LOCAL";
        }
        this.createdDate = LocalDateTime.now();
        this.modifiedDate = LocalDateTime.now();
    }

    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;

    @PreUpdate
    protected void onUpdate() {
        modifiedDate = LocalDateTime.now();
    }

    // =================== RELATIONSHIPS ===================

    @OneToMany(mappedBy = "staff", cascade = CascadeType.ALL)
    private List<ContractEntity> contracts;

    @ManyToMany(mappedBy = "staffs_buildings")
    private List<BuildingEntity> buildings = new ArrayList<>();

    @ManyToMany(mappedBy = "staffs_customers")
    private List<CustomerEntity> customers = new ArrayList<>();;
}
