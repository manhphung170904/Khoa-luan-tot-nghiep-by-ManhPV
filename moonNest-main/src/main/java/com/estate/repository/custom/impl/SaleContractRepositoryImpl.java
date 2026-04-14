package com.estate.repository.custom.impl;

import com.estate.dto.SaleContractFilterDTO;
import com.estate.repository.custom.SaleContractRepositoryCustom;
import com.estate.repository.entity.SaleContractEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class SaleContractRepositoryImpl implements SaleContractRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public Page<SaleContractEntity> searchSaleContracts(SaleContractFilterDTO f, Pageable pageable) {
        StringBuilder jpql = new StringBuilder("SELECT sc FROM SaleContractEntity sc ");
        StringBuilder countJpql = new StringBuilder("SELECT COUNT(sc) FROM SaleContractEntity sc ");
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");

        if (f.getCustomerId() != null) {
            where.append(" AND sc.customer.id = :customerId ");
        }

        if (f.getBuildingId() != null) {
            where.append(" AND sc.building.id = :buildingId ");
        }

        if (f.getStaffId() != null) {
            where.append(" AND sc.staff.id = :staffId ");
        }

        if (f.getSalePriceFrom() != null) {
            where.append(" AND sc.salePrice >= :salePriceFrom ");
        }

        if (f.getSalePriceTo() != null) {
            where.append(" AND sc.salePrice <= :salePriceTo ");
        }

        if (f.getCreatedDateFrom() != null) {
            where.append(" AND sc.createdDate >= :createdDateFrom ");
        }

        if (f.getCreatedDateTo() != null) {
            where.append(" AND sc.createdDate <= :createdDateTo ");
        }

        if (f.getStatus() != null) {
            if (f.getStatus().equals(0L)) {
                where.append(" AND sc.transferDate IS NULL ");
            }
            else if (f.getStatus().equals(1L)) {
                where.append(" AND sc.transferDate IS NOT NULL ");
            }
        }

        jpql.append(where);
        countJpql.append(where);

        TypedQuery<SaleContractEntity> query = em.createQuery(jpql.toString(), SaleContractEntity.class);
        TypedQuery<Long> countQuery = em.createQuery(countJpql.toString(), Long.class);

        setParams(query, f);
        setParams(countQuery, f);

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<SaleContractEntity> list = query.getResultList();
        Long total = countQuery.getSingleResult();

        return new PageImpl<>(list, pageable, total);
    }

    private void setParams(Query q, SaleContractFilterDTO f) {
        if (f.getCustomerId() != null)
            q.setParameter("customerId", f.getCustomerId());

        if (f.getBuildingId() != null)
            q.setParameter("buildingId", f.getBuildingId());

        if (f.getStaffId() != null)
            q.setParameter("staffId", f.getStaffId());

        if (f.getSalePriceFrom() != null)
            q.setParameter("salePriceFrom", f.getSalePriceFrom());

        if (f.getSalePriceTo() != null)
            q.setParameter("salePriceTo", f.getSalePriceTo());

        if (f.getCreatedDateFrom() != null)
            q.setParameter("createdDateFrom", f.getCreatedDateFrom().atStartOfDay());

        if (f.getCreatedDateTo() != null)
            q.setParameter("createdDateTo", f.getCreatedDateTo().atTime(23, 59, 59));
    }
}