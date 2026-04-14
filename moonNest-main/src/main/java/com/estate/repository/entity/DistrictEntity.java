package com.estate.repository.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Table(name = "district")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DistrictEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private String name;

    // =================== RELATIONSHIPS ===================

    @OneToMany(mappedBy = "district")
    private List<BuildingEntity> buildings = new ArrayList<>();;
}
