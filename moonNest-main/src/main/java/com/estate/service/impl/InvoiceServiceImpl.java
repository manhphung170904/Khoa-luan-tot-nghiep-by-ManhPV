package com.estate.service.impl;

import com.estate.converter.ExpiringInvoiceConverter;
import com.estate.converter.InvoiceDetailConverter;
import com.estate.converter.InvoiceFormConverter;
import com.estate.converter.InvoiceListDTOConverter;
import com.estate.converter.OverdueInvoiceListConverter;
import com.estate.dto.ContractRentAreaView;
import com.estate.dto.ExpiringInvoiceDTO;
import com.estate.dto.InvoiceDetailDTO;
import com.estate.dto.InvoiceDetailDetailDTO;
import com.estate.dto.InvoiceFilterDTO;
import com.estate.dto.InvoiceFormDTO;
import com.estate.dto.InvoiceListDTO;
import com.estate.dto.OverdueInvoiceDTO;
import com.estate.exception.BusinessException;
import com.estate.exception.ForbiddenOperationException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.ContractRepository;
import com.estate.repository.InvoiceRepository;
import com.estate.repository.UtilityMeterRepository;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.InvoiceDetailEntity;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.repository.entity.UtilityMeterEntity;
import com.estate.service.InvoiceService;
import com.estate.service.UtilityMeterService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InvoiceServiceImpl implements InvoiceService {
    @Autowired InvoiceRepository invoiceRepository;
    @Autowired UtilityMeterService utilityMeterService;
    @Autowired InvoiceDetailConverter invoiceDetailConverter;
    @Autowired InvoiceListDTOConverter invoiceListDTOConverter;
    @Autowired InvoiceFormConverter invoiceFormConverter;
    @Autowired UtilityMeterRepository utilityMeterRepository;
    @Autowired ContractRepository contractRepository;
    @Autowired OverdueInvoiceListConverter overdueInvoiceListConverter;
    @Autowired ExpiringInvoiceConverter expiringInvoiceConverter;

    @Override
    public String findTotalAmountByCustomerId(Long id) {
        BigDecimal amount = invoiceRepository.findTotalAmountByCustomerId(id);
        if (amount == null) {
            return "0";
        }
        long value = amount.longValue();
        if (value < 1_000_000_000) {
            return String.format("%,d", value).replace(",", ".");
        }
        double billion = value / 1_000_000_000.0;
        return billion % 1 == 0
                ? String.format("%.0f t\u1ef7", billion)
                : String.format("%.1f t\u1ef7", billion);
    }

    @Override
    public Long getTotalUnpaidInvoicesByCustomer(Long customerId) {
        return invoiceRepository.countByCustomerIdAndStatus(customerId, "PENDING");
    }

    @Override
    public Long getTotalUnpaidInvoices(Long staffID) {
        List<ContractEntity> contracts = contractRepository.findByStaffId(staffID);
        List<Long> contractIds = contracts.stream().map(ContractEntity::getId).toList();
        return invoiceRepository.countByStatusAndContractIdIn("PENDING", contractIds);
    }

    @Override
    public InvoiceDetailDTO getDetailInvoice(Long customerId) {
        Long unpaidInvoices = this.getTotalUnpaidInvoicesByCustomer(customerId);
        if (unpaidInvoices == 0) {
            return null;
        }
        InvoiceEntity invoice = invoiceRepository.getFirstByCustomerIdAndStatus(customerId, "PENDING");
        UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                invoice.getContract().getId(), invoice.getMonth(), invoice.getYear());
        return invoiceDetailConverter.toDTO(invoice, utilityMeter);
    }

    @Override
    public InvoiceFormDTO findById(Long invoiceId) {
        InvoiceEntity invoiceEntity = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));
        InvoiceFormDTO dto = new InvoiceFormDTO();
        invoiceFormConverter.toDTO(invoiceEntity, dto);
        return dto;
    }

    @Override
    public List<InvoiceDetailDTO> getDetailInvoices(Long customerId) {
        Long unpaidInvoices = this.getTotalUnpaidInvoicesByCustomer(customerId);
        if (unpaidInvoices == 0) {
            return null;
        }
        List<InvoiceEntity> invoices = invoiceRepository.findAllByCustomerIdAndStatus(customerId, "PENDING");
        List<InvoiceDetailDTO> result = new ArrayList<>();
        for (InvoiceEntity invoice : invoices) {
            UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                    invoice.getContract().getId(), invoice.getMonth(), invoice.getYear());
            result.add(invoiceDetailConverter.toDTO(invoice, utilityMeter));
        }
        return result;
    }

    @Override
    public BigDecimal getTotalAmountPayable(Long customerId) {
        return invoiceRepository.findAllByCustomerIdAndStatus(customerId, "PENDING")
                .stream()
                .map(InvoiceEntity::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public Long getTotalPaidInvoice(Long customerId) {
        return invoiceRepository.countByCustomerIdAndStatus(customerId, "PAID");
    }

    @Override
    public Page<InvoiceDetailDTO> getInvoices(int page, int size, Integer month, Integer year, Long customerId) {
        Page<InvoiceEntity> invoicePage = invoiceRepository.search(month, year, customerId, "PAID", PageRequest.of(page, size));
        List<InvoiceDetailDTO> dtoList = new ArrayList<>();
        for (InvoiceEntity invoice : invoicePage) {
            UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                    invoice.getContract().getId(), invoice.getMonth(), invoice.getYear());
            dtoList.add(invoiceDetailConverter.toDTO(invoice, utilityMeter));
        }
        return new PageImpl<>(dtoList, invoicePage.getPageable(), invoicePage.getTotalElements());
    }

    @Override
    public Page<InvoiceListDTO> getInvoices(int page, int size) {
        Page<InvoiceEntity> invoicePage = invoiceRepository.findAll(PageRequest.of(page, size));
        List<InvoiceListDTO> dtoList = new ArrayList<>();
        for (InvoiceEntity invoice : invoicePage) {
            dtoList.add(invoiceListDTOConverter.toDTO(invoice));
        }
        return new PageImpl<>(dtoList, invoicePage.getPageable(), invoicePage.getTotalElements());
    }

    @Override
    public Page<InvoiceListDTO> search(InvoiceFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<InvoiceEntity> invoicePage = invoiceRepository.searchInvoices(filter, pageable);
        List<InvoiceListDTO> dtoList = new ArrayList<>();
        for (InvoiceEntity invoice : invoicePage) {
            dtoList.add(invoiceListDTOConverter.toDTO(invoice));
        }
        return new PageImpl<>(dtoList, invoicePage.getPageable(), invoicePage.getTotalElements());
    }

    @Override
    public Page<InvoiceDetailDTO> searchByStaff(InvoiceFilterDTO filter, int page, int size, Long staffId) {
        List<ContractEntity> contracts = contractRepository.findByStaffId(staffId);
        List<Long> contractIds = contracts.stream().map(ContractEntity::getId).toList();
        Pageable pageable = PageRequest.of(page, size);
        Page<InvoiceEntity> invoicePage = invoiceRepository.searchInvoicesByStaff(filter, pageable, contractIds);
        List<InvoiceDetailDTO> dtoList = new ArrayList<>();
        for (InvoiceEntity invoice : invoicePage) {
            UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                    invoice.getContract().getId(), invoice.getMonth(), invoice.getYear());
            dtoList.add(invoiceDetailConverter.toDTO(invoice, utilityMeter));
        }
        return new PageImpl<>(dtoList, invoicePage.getPageable(), invoicePage.getTotalElements());
    }

    @Override
    public void delete(Long id) {
        InvoiceEntity invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));
        utilityMeterRepository.deleteByContractIdAndMonthAndYear(invoice.getContract().getId(), invoice.getMonth(), invoice.getYear());
        invoiceRepository.deleteById(id);
    }

    @Override
    public void deleteForStaff(Long id, Long staffId) {
        InvoiceEntity invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));
        assertStaffOwnsInvoice(invoice, staffId);
        delete(id);
    }

    @Override
    public InvoiceDetailDTO viewById(Long invoiceId) {
        InvoiceEntity invoiceEntity = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));
        UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                invoiceEntity.getContract().getId(), invoiceEntity.getMonth(), invoiceEntity.getYear());
        return invoiceDetailConverter.toDTO(invoiceEntity, utilityMeter);
    }

    @Override
    public void invoiceConfirm(Long id) {
        int updated = invoiceRepository.confirmInvoice(id);
        if (updated == 0) {
            throw new BusinessException("Kh\u00f4ng th\u1ec3 x\u00e1c nh\u1eadn h\u00f3a \u0111\u01a1n.");
        }
    }

    @Override
    @Transactional
    public void save(InvoiceFormDTO dto) {
        validateContractCustomerMatch(dto);
        saveInternal(dto);
    }

    @Override
    public void saveForStaff(InvoiceFormDTO dto, Long staffId) {
        validateContractCustomerMatch(dto);
        assertStaffOwnsContract(dto.getContractId(), staffId);
        if (dto.getId() != null) {
            InvoiceEntity existingInvoice = invoiceRepository.findById(dto.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));
            assertStaffOwnsInvoice(existingInvoice, staffId);
        }
        saveInternal(dto);
    }

    private void saveInternal(InvoiceFormDTO dto) {
        int invoiceMonth = dto.getMonth();
        int invoiceYear = dto.getYear();
        LocalDate now = LocalDate.now();
        int currentMonth = now.getMonthValue();
        int currentYear = now.getYear();
        boolean isLastMonth =
                (invoiceYear == currentYear && invoiceMonth == currentMonth - 1)
                        || (currentMonth == 1 && invoiceYear == currentYear - 1 && invoiceMonth == 12);

        if (dto.getId() == null) {
            if (invoiceRepository.existsByContractIdAndCustomerIdAndMonthAndYear(
                    dto.getContractId(), dto.getCustomerId(), invoiceMonth, invoiceYear)) {
                throw new BusinessException("H\u00f3a \u0111\u01a1n c\u1ee7a th\u00e1ng v\u00e0 n\u0103m \u0111\u00e3 ch\u1ecdn \u0111\u00e3 t\u1ed3n t\u1ea1i.");
            }
            if (!isLastMonth) {
                throw new BusinessException("Ch\u1ec9 \u0111\u01b0\u1ee3c t\u1ea1o h\u00f3a \u0111\u01a1n cho th\u00e1ng li\u1ec1n tr\u01b0\u1edbc.");
            }
        }

        InvoiceEntity invoice = dto.getId() == null
                ? new InvoiceEntity()
                : invoiceRepository.findById(dto.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));

        if (dto.getId() != null) {
            if (!"PENDING".equals(invoice.getStatus())) {
                throw new BusinessException("Ch\u1ec9 c\u00f3 th\u1ec3 c\u1eadp nh\u1eadt h\u00f3a \u0111\u01a1n \u0111ang ch\u1edd x\u1eed l\u00fd.");
            }
            if (!isLastMonth) {
                throw new BusinessException("Ch\u1ec9 \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt h\u00f3a \u0111\u01a1n c\u1ee7a th\u00e1ng li\u1ec1n tr\u01b0\u1edbc.");
            }
        }

        LocalDate dueDate = dto.getDueDate();
        LocalDate endOfInvoiceMonth = LocalDate.of(invoiceYear, invoiceMonth, 1)
                .withDayOfMonth(LocalDate.of(invoiceYear, invoiceMonth, 1).lengthOfMonth());
        if (!dueDate.isAfter(endOfInvoiceMonth)) {
            throw new BusinessException("H\u1ea1n thanh to\u00e1n ph\u1ea3i sau th\u00e1ng l\u1eadp h\u00f3a \u0111\u01a1n.");
        }

        invoiceFormConverter.toEntity(invoice, dto);
        invoice.getDetails().clear();
        for (InvoiceDetailDetailDTO detailDto : dto.getDetails()) {
            InvoiceDetailEntity detail = new InvoiceDetailEntity();
            detail.setDescription(detailDto.getDescription());
            detail.setAmount(detailDto.getAmount());
            detail.setInvoice(invoice);
            invoice.getDetails().add(detail);
        }

        invoiceRepository.save(invoice);
        utilityMeterService.save(invoice, dto);
    }

    private void validateContractCustomerMatch(InvoiceFormDTO dto) {
        ContractEntity contract = contractRepository.findById(dto.getContractId())
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ee3p \u0111\u1ed3ng."));
        if (contract.getCustomer() == null || !Objects.equals(contract.getCustomer().getId(), dto.getCustomerId())) {
            throw new BusinessException("Kh\u00e1ch h\u00e0ng \u0111\u00e3 ch\u1ecdn kh\u00f4ng kh\u1edbp v\u1edbi h\u1ee3p \u0111\u1ed3ng \u0111\u00e3 ch\u1ecdn.");
        }
    }

    private void assertStaffOwnsContract(Long contractId, Long staffId) {
        ContractEntity contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ee3p \u0111\u1ed3ng."));
        if (contract.getStaff() == null || !Objects.equals(contract.getStaff().getId(), staffId)) {
            throw new ForbiddenOperationException(
                    "B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n qu\u1ea3n l\u00fd h\u00f3a \u0111\u01a1n ngo\u00e0i c\u00e1c h\u1ee3p \u0111\u1ed3ng \u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng."
            );
        }
    }

    private void assertStaffOwnsInvoice(InvoiceEntity invoice, Long staffId) {
        ContractEntity contract = invoice.getContract();
        if (contract == null || contract.getStaff() == null || !Objects.equals(contract.getStaff().getId(), staffId)) {
            throw new ForbiddenOperationException(
                    "B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n qu\u1ea3n l\u00fd h\u00f3a \u0111\u01a1n ngo\u00e0i c\u00e1c h\u1ee3p \u0111\u1ed3ng \u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng."
            );
        }
    }

    @Override
    public Integer getRentArea(Long id) {
        InvoiceEntity invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));
        ContractEntity contract = contractRepository.findById(invoice.getContract().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ee3p \u0111\u1ed3ng."));
        return contract.getRentArea();
    }

    @Override
    public Map<Long, Integer> getRentAreaByContract() {
        return contractRepository.findAllIdAndRentArea()
                .stream()
                .collect(Collectors.toMap(ContractRentAreaView::getId, ContractRentAreaView::getRentArea));
    }

    @Override
    public void markPaid(Long invoiceId, String method, String txnRef) {
        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));
        if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
            return;
        }
        if (!"PENDING".equalsIgnoreCase(invoice.getStatus()) && !"OVERDUE".equalsIgnoreCase(invoice.getStatus())) {
            throw new BusinessException("Ch\u1ec9 c\u00f3 th\u1ec3 \u0111\u00e1nh d\u1ea5u \u0111\u00e3 thanh to\u00e1n v\u1edbi h\u00f3a \u0111\u01a1n \u0111\u1ebfn h\u1ea1n thanh to\u00e1n.");
        }
        invoice.setStatus("PAID");
        invoice.setPaidDate(LocalDateTime.now());
        invoice.setPaymentMethod(method);
        invoice.setTransactionCode(txnRef);
        invoiceRepository.save(invoice);
    }

    @Override
    public List<OverdueInvoiceDTO> getOverdueInvoices(Long staffID) {
        List<ContractEntity> contracts = contractRepository.findByStaffId(staffID);
        List<Long> contractIds = contracts.stream().map(ContractEntity::getId).toList();
        List<InvoiceEntity> overdueInvoices = invoiceRepository.findByStatusAndContractIdIn("OVERDUE", contractIds);
        return overdueInvoices.stream().map(overdueInvoiceListConverter::toDTO).toList();
    }

    @Override
    public List<ExpiringInvoiceDTO> getExpiringInvoices(Long staffId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.withDayOfMonth(9).withHour(0).withMinute(0).withSecond(0);
        List<ContractEntity> contracts = contractRepository.findByStaffId(staffId);
        List<Long> contractIds = contracts.stream().map(ContractEntity::getId).toList();
        List<InvoiceEntity> invoices = invoiceRepository.getExpiringInvoices(start, contractIds);
        return invoices.stream().map(expiringInvoiceConverter::toDto).toList();
    }

    @Override
    public void statusUpdate() {
        invoiceRepository.invoiceStatusUpdate();
    }
}
