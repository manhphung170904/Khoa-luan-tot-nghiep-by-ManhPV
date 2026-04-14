package com.estate.repository.custom.impl;

import com.estate.dto.InvoiceFilterDTO;
import com.estate.repository.custom.InvoiceRepositoryCustom;
import com.estate.repository.entity.InvoiceEntity;
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
public class InvoiceRepositoryImpl implements InvoiceRepositoryCustom {
    @PersistenceContext
    private EntityManager em;

    @Override
    public Page<InvoiceEntity> searchInvoices(InvoiceFilterDTO f, Pageable pageable) {
        StringBuilder jpql = new StringBuilder("SELECT i FROM InvoiceEntity i ");
        StringBuilder countJpql = new StringBuilder("SELECT COUNT(i) FROM InvoiceEntity i ");
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");

        if (f.getCustomerId() != null) {
            jpql.append(" LEFT JOIN i.customer c ");
            countJpql.append(" LEFT JOIN i.customer c ");
        }

        // ========== LIKE ==========
        if (notEmpty(f.getStatus())) {
            where.append(" AND LOWER(i.status) LIKE LOWER(:status) ");
        }

        // ========== EQUAL ==========
        if (f.getCustomerId() != null) {
            where.append(" AND c.id = :customerId ");
        }

        if (f.getMonth() != null) {
            where.append(" AND i.month = :month ");
        }

        if (f.getYear() != null) {
            where.append(" AND i.year = :year ");
        }

        // ========== RANGE BIG DECIMAL ==========
        addRangeDecimal(where, "i.totalAmount", "totalAmountFrom", "totalAmountTo", f.getTotalAmountFrom(), f.getTotalAmountTo());

        // ========== Add WHERE ==========
        jpql.append(where);
        countJpql.append(where);

        // ========== CREATE QUERY ==========
        TypedQuery<InvoiceEntity> query = em.createQuery(jpql.toString(), InvoiceEntity.class);
        TypedQuery<Long> countQuery = em.createQuery(countJpql.toString(), Long.class);

        // ========== SET PARAMS ==========
        setParams(query, f);
        setParams(countQuery, f);

        // ========== PAGING ==========
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<InvoiceEntity> list = query.getResultList();
        Long total = countQuery.getSingleResult();

        return new PageImpl<>(list, pageable, total);
    }

    @Override
    public Page<InvoiceEntity> searchInvoicesByStaff(InvoiceFilterDTO f, Pageable pageable, List<Long> staffIds) {
        StringBuilder jpql = new StringBuilder("SELECT i FROM InvoiceEntity i ");
        StringBuilder countJpql = new StringBuilder("SELECT COUNT(i) FROM InvoiceEntity i ");
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");

        if (f.getCustomerId() != null) {
            jpql.append(" LEFT JOIN i.customer c ");
            countJpql.append(" LEFT JOIN i.customer c ");
        }

        if (!staffIds.isEmpty()) {
            jpql.append(" LEFT JOIN i.contract con ");
            countJpql.append(" LEFT JOIN i.contract con ");
        }

        // ========== LIKE ==========
        if (notEmpty(f.getStatus())) {
            where.append(" AND LOWER(i.status) LIKE LOWER(:status) ");
        }

        // ========== EQUAL ==========
        if (f.getCustomerId() != null) {
            where.append(" AND c.id = :customerId ");
        }

        if (f.getMonth() != null) {
            where.append(" AND i.month = :month ");
        }

        if (f.getYear() != null) {
            where.append(" AND i.year = :year ");
        }

        if (!staffIds.isEmpty()) {
            where.append(" AND con.id IN :staffIds ");
        }

        // ========== RANGE BIG DECIMAL ==========
        addRangeDecimal(where, "i.totalAmount", "totalAmountFrom", "totalAmountTo", f.getTotalAmountFrom(), f.getTotalAmountTo());

        // ========== Add WHERE ==========
        jpql.append(where);
        countJpql.append(where);

        // ========== CREATE QUERY ==========
        TypedQuery<InvoiceEntity> query = em.createQuery(jpql.toString(), InvoiceEntity.class);
        TypedQuery<Long> countQuery = em.createQuery(countJpql.toString(), Long.class);

        // ========== SET PARAMS ==========
        setParams(query, f);
        setParams(countQuery, f);
        query.setParameter("staffIds", staffIds);
        countQuery.setParameter("staffIds", staffIds);

        // ========== PAGING ==========
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<InvoiceEntity> list = query.getResultList();
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

    private void setParams(Query q, InvoiceFilterDTO f) {

        if (notEmpty(f.getStatus())) q.setParameter("status", "%" + f.getStatus() + "%");

        if (f.getCustomerId() != null) q.setParameter("customerId", f.getCustomerId());
        if (f.getMonth() != null) q.setParameter("month", f.getMonth());
        if (f.getYear() != null) q.setParameter("year", f.getYear());

        if (f.getTotalAmountFrom() != null) q.setParameter("totalAmountFrom", f.getTotalAmountFrom());
        if (f.getTotalAmountTo() != null) q.setParameter("totalAmountTo", f.getTotalAmountTo());
    }
}
