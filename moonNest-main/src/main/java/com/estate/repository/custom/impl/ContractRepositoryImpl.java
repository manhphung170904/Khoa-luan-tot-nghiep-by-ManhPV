package com.estate.repository.custom.impl;

import com.estate.dto.ContractFilterDTO;
import com.estate.repository.custom.ContractRepositoryCustom;
import com.estate.repository.entity.ContractEntity;
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
public class ContractRepositoryImpl implements ContractRepositoryCustom {
    @PersistenceContext
    private EntityManager em;

    @Override
    public Page<ContractEntity> searchContracts(ContractFilterDTO f, Pageable pageable) {
        StringBuilder jpql = new StringBuilder("SELECT c FROM ContractEntity c ");
        StringBuilder countJpql = new StringBuilder("SELECT COUNT(c) FROM ContractEntity c ");
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");

        // ========== LIKE ==========
        if (notEmpty(f.getStatus())) {
            where.append(" AND LOWER(c.status) LIKE LOWER(:status) ");
        }

        // ========== EQUAL ==========
        if (f.getCustomerId() != null) {
            where.append(" AND c.customer.id = :customerId ");
        }

        if (f.getBuildingId() != null) {
            where.append(" AND c.building.id = :buildingId ");
        }

        if (f.getStaffId() != null) {
            where.append(" AND c.staff.id = :staffId ");
        }

        // ========== GREATER/LESS THAN ==========

        if (f.getStartDate() != null) {
            where.append(" AND c.startDate >= :startDate ");
        }

        if (f.getEndDate() != null) {
            where.append(" AND c.endDate <= :endDate ");
        }

        // ========== RANGE BigDecimal ==========
        addRangeDecimal(where, "c.rentPrice", "rentPriceFrom", "rentPriceTo", f.getRentPriceFrom(), f.getRentPriceTo());

        // ========== Add WHERE ==========
        jpql.append(where);
        countJpql.append(where);

        // ========== CREATE QUERY ==========
        TypedQuery<ContractEntity> query = em.createQuery(jpql.toString(), ContractEntity.class);
        TypedQuery<Long> countQuery = em.createQuery(countJpql.toString(), Long.class);

        // ========== SET PARAMS ==========
        setParams(query, f);
        setParams(countQuery, f);

        // ========== PAGING ==========
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<ContractEntity> list = query.getResultList();
        Long total = countQuery.getSingleResult();

        return new PageImpl<>(list, pageable, total);
    }

    private boolean notEmpty(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private void addRangeDecimal(StringBuilder where, String column, String fromKey, String toKey, BigDecimal fromValue, BigDecimal toValue) {
        if (fromValue != null) where.append(" AND ").append(column).append(" >= :").append(fromKey).append(" ");
        if (toValue != null) where.append(" AND ").append(column).append(" <= :").append(toKey).append(" ");
    }

    private void addRangeInt(StringBuilder where, String column, String fromKey, String toKey, Integer fromValue, Integer toValue) {
        if (fromValue != null) where.append(" AND ").append(column).append(" >= :").append(fromKey).append(" ");
        if (toValue != null) where.append(" AND ").append(column).append(" <= :").append(toKey).append(" ");
    }

    private void setParams(Query q, ContractFilterDTO f) {

        if (notEmpty(f.getStatus()))
            q.setParameter("status", "%" + f.getStatus() + "%");

        if (f.getCustomerId() != null)
            q.setParameter("customerId", f.getCustomerId());

        if (f.getBuildingId() != null)
            q.setParameter("buildingId", f.getBuildingId());

        if (f.getStaffId() != null)
            q.setParameter("staffId", f.getStaffId());

        if (f.getStartDate() != null)
            q.setParameter("startDate", f.getStartDate().atStartOfDay());

        if (f.getEndDate() != null)
            q.setParameter("endDate", f.getEndDate().atTime(23,59,59));

        if (f.getRentPriceFrom() != null)
            q.setParameter("rentPriceFrom", f.getRentPriceFrom());

        if (f.getRentPriceTo() != null)
            q.setParameter("rentPriceTo", f.getRentPriceTo());
    }

}
