package com.estate.repository.custom.impl;

import com.estate.dto.BuildingFilterDTO;
import com.estate.repository.custom.BuildingRepositoryCustom;
import com.estate.repository.entity.BuildingEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class BuildingRepositoryImpl implements BuildingRepositoryCustom {
    @PersistenceContext
    private EntityManager em;

    @Override
    public Page<BuildingEntity> searchBuildings(BuildingFilterDTO f, Pageable pageable) {

        StringBuilder jpql = new StringBuilder("SELECT b FROM BuildingEntity b ");
        StringBuilder countJpql = new StringBuilder("SELECT COUNT(b) FROM BuildingEntity b ");
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");

        // ========== JOIN bảng ==========

        if (f.getDistrictId() != null) {
            jpql.append(" LEFT JOIN b.district d ");
            countJpql.append(" LEFT JOIN b.district d ");
        }

        if (f.getRentAreaFrom() != null || f.getRentAreaTo() != null) {
            jpql.append(" LEFT JOIN b.rentAreas ra ");
            countJpql.append(" LEFT JOIN b.rentAreas ra ");
        }

        if (f.getStaffId() != null) {
            jpql.append(" LEFT JOIN b.staffs_buildings sb");
            countJpql.append(" LEFT JOIN b.staffs_buildings sb ");
        }

        // ========== LIKE ==========
        if (notEmpty(f.getName())) {
            where.append(" AND LOWER(b.name) LIKE LOWER(:name) ");
        }
        if (notEmpty(f.getWard())) {
            where.append(" AND LOWER(b.ward) LIKE LOWER(:ward) ");
        }
        if (notEmpty(f.getStreet())) {
            where.append(" AND LOWER(b.street) LIKE LOWER(:street) ");
        }
        if (notEmpty(f.getTransactionType())) {
            where.append(" AND LOWER(b.transactionType) LIKE LOWER(:transactionType) ");
        }
        if (notEmpty(f.getPropertyType())) {
            where.append(" AND LOWER(b.propertyType) LIKE LOWER(:propertyType) ");
        }

        // ========== EQUAL ==========
        if (f.getDistrictId() != null) {
            where.append(" AND d.id = :districtId ");
        }

        if (f.getStaffId() != null) {
            where.append(" AND sb.id = :staffId ");
        }

        if (f.getDirection() != null) {
            if (notEmpty(f.getDirection().toString())) {
                where.append(" AND b.direction = :direction ");
            }
        }

        if (f.getLevel() != null) {
            if (notEmpty(f.getLevel().toString())) {
                where.append(" AND b.level = :level ");
            }
        }

        // ========== RANGE INT ==========
        addRangeInt(where, "b.numberOfFloor", "floorFrom", "floorTo", f.getNumberOfFloorFrom(), f.getNumberOfFloorTo());
        addRangeInt(where, "b.numberOfBasement", "basementFrom", "basementTo", f.getNumberOfBasementFrom(), f.getNumberOfBasementTo());
        addRangeInt(where, "b.floorArea", "areaFrom", "areaTo", f.getFloorAreaFrom(), f.getFloorAreaTo());

        // ========== RANGE BigDecimal ==========
        addRangeDecimal(where, "b.rentPrice", "rentPriceFrom", "rentPriceTo", f.getRentPriceFrom(), f.getRentPriceTo());
        addRangeDecimal(where, "b.serviceFee", "serviceFeeFrom", "serviceFeeTo", f.getServiceFeeFrom(), f.getServiceFeeTo());
        addRangeDecimal(where, "b.carFee", "carFeeFrom", "carFeeTo", f.getCarFeeFrom(), f.getCarFeeTo());
        addRangeDecimal(where, "b.motorbikeFee", "motorbikeFeeFrom", "motorbikeFeeTo", f.getMotorbikeFeeFrom(), f.getMotorbikeFeeTo());
        addRangeDecimal(where, "b.waterFee", "waterFeeFrom", "waterFeeTo", f.getWaterFeeFrom(), f.getWaterFeeTo());
        addRangeDecimal(where, "b.electricityFee", "electricityFeeFrom", "electricityFeeTo", f.getElectricityFeeFrom(), f.getElectricityFeeTo());

        // ========== Dữ liệu khác bảng ==========
        if (f.getRentAreaFrom() != null) {
            where.append(" AND ra.value >= :rentAreaFrom ");
        }
        if (f.getRentAreaTo() != null) {
            where.append(" AND ra.value <= :rentAreaTo ");
        }

        // ========== Add WHERE ==========
        jpql.append(where);
        countJpql.append(where);

        // ========== CREATE QUERY ==========
        TypedQuery<BuildingEntity> query = em.createQuery(jpql.toString(), BuildingEntity.class);
        TypedQuery<Long> countQuery = em.createQuery(countJpql.toString(), Long.class);

        // ========== SET PARAMS ==========
        setParams(query, f);
        setParams(countQuery, f);

        // ========== PAGING ==========
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<BuildingEntity> list = query.getResultList();
        Long total = countQuery.getSingleResult();

        return new PageImpl<>(list, pageable, total);
    }

    private void addRangeInt(StringBuilder where, String column, String fromKey, String toKey, Integer fromValue, Integer toValue) {
        if (fromValue != null) where.append(" AND ").append(column).append(" >= :").append(fromKey).append(" ");
        if (toValue != null) where.append(" AND ").append(column).append(" <= :").append(toKey).append(" ");
    }

    private void addRangeDecimal(StringBuilder where, String column, String fromKey, String toKey, BigDecimal fromValue, BigDecimal toValue) {
        if (fromValue != null) where.append(" AND ").append(column).append(" >= :").append(fromKey).append(" ");
        if (toValue != null) where.append(" AND ").append(column).append(" <= :").append(toKey).append(" ");
    }

    private void setParams(Query q, BuildingFilterDTO f) {

        if (notEmpty(f.getName())) q.setParameter("name", "%" + f.getName() + "%");
        if (notEmpty(f.getWard())) q.setParameter("ward", "%" + f.getWard() + "%");
        if (notEmpty(f.getStreet())) q.setParameter("street", "%" + f.getStreet() + "%");
        if (notEmpty(f.getTransactionType())) q.setParameter("transactionType", "%" + f.getTransactionType() + "%");
        if (notEmpty(f.getPropertyType())) q.setParameter("propertyType", "%" + f.getPropertyType() + "%");

        if (f.getDistrictId() != null) q.setParameter("districtId", f.getDistrictId());
        if (f.getStaffId() != null) q.setParameter("staffId", f.getStaffId());
        if (f.getDirection() != null) {
            if (notEmpty(f.getDirection().toString())) q.setParameter("direction", f.getDirection());
        }
        if (f.getLevel() != null) {
            if (notEmpty(f.getLevel().toString())) q.setParameter("level", f.getLevel());
        }

        if (f.getNumberOfFloorFrom() != null) q.setParameter("floorFrom", f.getNumberOfFloorFrom());
        if (f.getNumberOfFloorTo() != null) q.setParameter("floorTo", f.getNumberOfFloorTo());

        if (f.getNumberOfBasementFrom() != null) q.setParameter("basementFrom", f.getNumberOfBasementFrom());
        if (f.getNumberOfBasementTo() != null) q.setParameter("basementTo", f.getNumberOfBasementTo());

        if (f.getFloorAreaFrom() != null) q.setParameter("areaFrom", f.getFloorAreaFrom());
        if (f.getFloorAreaTo() != null) q.setParameter("areaTo", f.getFloorAreaTo());

        if (f.getRentAreaFrom() != null) q.setParameter("rentAreaFrom", f.getRentAreaFrom());
        if (f.getRentAreaTo() != null) q.setParameter("rentAreaTo", f.getRentAreaTo());

        if (f.getRentPriceFrom() != null) q.setParameter("rentPriceFrom", f.getRentPriceFrom());
        if (f.getRentPriceTo() != null) q.setParameter("rentPriceTo", f.getRentPriceTo());

        if (f.getServiceFeeFrom() != null) q.setParameter("serviceFeeFrom", f.getServiceFeeFrom());
        if (f.getServiceFeeTo() != null) q.setParameter("serviceFeeTo", f.getServiceFeeTo());

        if (f.getCarFeeFrom() != null) q.setParameter("carFeeFrom", f.getCarFeeFrom());
        if (f.getCarFeeTo() != null) q.setParameter("carFeeTo", f.getCarFeeTo());

        if (f.getMotorbikeFeeFrom() != null) q.setParameter("motorbikeFeeFrom", f.getMotorbikeFeeFrom());
        if (f.getMotorbikeFeeTo() != null) q.setParameter("motorbikeFeeTo", f.getMotorbikeFeeTo());

        if (f.getWaterFeeFrom() != null) q.setParameter("waterFeeFrom", f.getWaterFeeFrom());
        if (f.getWaterFeeTo() != null) q.setParameter("waterFeeTo", f.getWaterFeeTo());

        if (f.getElectricityFeeFrom() != null) q.setParameter("electricityFeeFrom", f.getElectricityFeeFrom());
        if (f.getElectricityFeeTo() != null) q.setParameter("electricityFeeTo", f.getElectricityFeeTo());
    }

    private boolean notEmpty(String s) {
        return s != null && !s.trim().isEmpty();
    }

    @Override
    public List<BuildingEntity> searchBuildingsByCustomer(BuildingFilterDTO f) {
        StringBuilder jpql = new StringBuilder("SELECT b FROM BuildingEntity b ");
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");

        // ========== JOIN bảng ==========

        if (f.getDistrictId() != null) {
            jpql.append(" LEFT JOIN b.district d ");
        }

        if (f.getRentAreaFrom() != null || f.getRentAreaTo() != null) {
            jpql.append(" LEFT JOIN b.rentAreas ra ");
        }

        if (f.getStaffId() != null) {
            jpql.append(" LEFT JOIN b.staffs_buildings sb");
        }

        // ========== LIKE ==========
        if (notEmpty(f.getName())) {
            where.append(" AND LOWER(b.name) LIKE LOWER(:name) ");
        }
        if (notEmpty(f.getWard())) {
            where.append(" AND LOWER(b.ward) LIKE LOWER(:ward) ");
        }
        if (notEmpty(f.getStreet())) {
            where.append(" AND LOWER(b.street) LIKE LOWER(:street) ");
        }
        if (f.getStaffId() != null) {
            where.append(" AND LOWER(sb.fullName) LIKE LOWER(:managerName) ");
        }

        // ========== EQUAL ==========
        if (f.getDistrictId() != null) {
            where.append(" AND d.id = :districtId ");
        }

        if (f.getDirection() != null) {
            if (notEmpty(f.getDirection().toString())) {
                where.append(" AND b.direction = :direction ");
            }
        }

        if (f.getLevel() != null) {
            if (notEmpty(f.getLevel().toString())) {
                where.append(" AND b.level = :level ");
            }
        }

        // ========== RANGE INT ==========
        addRangeInt(where, "b.numberOfFloor", "floorFrom", "floorTo", f.getNumberOfFloorFrom(), f.getNumberOfFloorTo());
        addRangeInt(where, "b.numberOfBasement", "basementFrom", "basementTo", f.getNumberOfBasementFrom(), f.getNumberOfBasementTo());
        addRangeInt(where, "b.floorArea", "areaFrom", "areaTo", f.getFloorAreaFrom(), f.getFloorAreaTo());

        // ========== RANGE BigDecimal ==========
        addRangeDecimal(where, "b.rentPrice", "rentPriceFrom", "rentPriceTo", f.getRentPriceFrom(), f.getRentPriceTo());
        addRangeDecimal(where, "b.serviceFee", "serviceFeeFrom", "serviceFeeTo", f.getServiceFeeFrom(), f.getServiceFeeTo());
        addRangeDecimal(where, "b.carFee", "carFeeFrom", "carFeeTo", f.getCarFeeFrom(), f.getCarFeeTo());
        addRangeDecimal(where, "b.motorbikeFee", "motorbikeFeeFrom", "motorbikeFeeTo", f.getMotorbikeFeeFrom(), f.getMotorbikeFeeTo());
        addRangeDecimal(where, "b.waterFee", "waterFeeFrom", "waterFeeTo", f.getWaterFeeFrom(), f.getWaterFeeTo());
        addRangeDecimal(where, "b.electricityFee", "electricityFeeFrom", "electricityFeeTo", f.getElectricityFeeFrom(), f.getElectricityFeeTo());

        // ========== Dữ liệu khác bảng ==========
        if (f.getRentAreaFrom() != null) {
            where.append(" AND ra.value >= :rentAreaFrom ");
        }
        if (f.getRentAreaTo() != null) {
            where.append(" AND ra.value <= :rentAreaTo ");
        }

        // ========== Add WHERE ==========
        jpql.append(where);

        // ========== CREATE QUERY ==========
        TypedQuery<BuildingEntity> query = em.createQuery(jpql.toString(), BuildingEntity.class);

        // ========== SET PARAMS ==========
        setParams(query, f);

        return query.getResultList();
    }
}
