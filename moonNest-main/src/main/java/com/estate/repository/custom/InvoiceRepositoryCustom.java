package com.estate.repository.custom;

import com.estate.dto.InvoiceFilterDTO;
import com.estate.repository.entity.InvoiceEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface InvoiceRepositoryCustom {
    Page<InvoiceEntity> searchInvoices(InvoiceFilterDTO filter, Pageable pageable);
    Page<InvoiceEntity> searchInvoicesByStaff(InvoiceFilterDTO filter, Pageable pageable, List<Long> staffIds);
}
