package com.estate.service;

import com.estate.dto.*;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface InvoiceService {
    String findTotalAmountByCustomerId(Long id);
    Long getTotalUnpaidInvoicesByCustomer(Long customerId);
    Long getTotalUnpaidInvoices(Long staffID);
    InvoiceDetailDTO getDetailInvoice(Long customerId);
    InvoiceFormDTO findById(Long invoiceId);
    List<InvoiceDetailDTO> getDetailInvoices(Long customerId);
    BigDecimal getTotalAmountPayable(Long customerId);
    Long getTotalPaidInvoice(Long customerId);
    Page<InvoiceDetailDTO> getInvoices(int page, int size, Integer  month, Integer  year, Long customerId);
    Page<InvoiceListDTO> getInvoices(int page, int size);
    Page<InvoiceListDTO> search(InvoiceFilterDTO filter, int page, int size);
    Page<InvoiceDetailDTO> searchByStaff(InvoiceFilterDTO filter, int page, int size, Long staffId);
    void delete(Long id);
    InvoiceDetailDTO viewById(Long invoiceId);
    void invoiceConfirm(Long id);
    void save(InvoiceFormDTO dto);
    Integer getRentArea(Long id);
    Map<Long, Integer> getRentAreaByContract();
    void markPaid(Long invoiceId, String method, String txnRef);
    List<OverdueInvoiceDTO> getOverdueInvoices(Long staffID);
    List<ExpiringInvoiceDTO> getExpiringInvoices(Long staffID);
    void statusUpdate();
}
