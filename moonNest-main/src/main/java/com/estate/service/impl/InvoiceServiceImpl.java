package com.estate.service.impl;

import com.estate.converter.*;
import com.estate.dto.*;
import com.estate.exception.BusinessException;
import com.estate.repository.ContractRepository;
import com.estate.repository.InvoiceRepository;
import com.estate.repository.UtilityMeterRepository;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.InvoiceDetailEntity;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.repository.entity.UtilityMeterEntity;
import com.estate.service.InvoiceService;
import com.estate.service.UtilityMeterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class InvoiceServiceImpl implements InvoiceService {
    @Autowired
    InvoiceRepository invoiceRepository;

    @Autowired
    UtilityMeterService utilityMeterService;

    @Autowired
    InvoiceDetailConverter invoiceDetailConverter;

    @Autowired
    InvoiceListDTOConverter invoiceListDTOConverter;

    @Autowired
    InvoiceFormConverter invoiceFormConverter;

    @Autowired
    UtilityMeterRepository utilityMeterRepository;

    @Autowired
    ContractRepository contractRepository;

    @Autowired
    OverdueInvoiceListConverter overdueInvoiceListConverter;

    @Autowired
    ExpiringInvoiceConverter expiringInvoiceConverter;

    @Override
    public String findTotalAmountByCustomerId(Long id) {
        BigDecimal amount = invoiceRepository.findTotalAmountByCustomerId(id);

        if (amount == null) return "0";

        long value = amount.longValue();

        if (value < 1_000_000_000) {
            // Nhỏ hơn 1 tỷ → giữ nguyên dạng 1.234.567
            return String.format("%,d", value).replace(",", ".");
        } else {
            // Lớn hơn hoặc bằng 1 tỷ → chia cho 1 tỷ
            double ty = value / 1_000_000_000.0;

            // Giữ 1 hoặc 2 số thập phân khi cần
            if (ty % 1 == 0) {
                return String.format("%.0f tỷ", ty);   // Ví dụ: 3 tỷ
            } else {
                return String.format("%.1f tỷ", ty);   // Ví dụ: 1.2 tỷ
            }
        }
    }

    @Override
    public Long getTotalUnpaidInvoicesByCustomer(Long customerId) {
        return invoiceRepository.countByCustomerIdAndStatus(customerId, "PENDING");
    }

    @Override
    public Long getTotalUnpaidInvoices(Long staffID) {
        List<ContractEntity> contracts = contractRepository.findByStaffId(staffID);

        List<Long> contractIds = contracts
                                        .stream()
                                        .map(
                                                ContractEntity::getId
                                        )
                                        .toList();

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
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn"));
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

        List<InvoiceDetailDTO> res = new ArrayList<>();
        for (InvoiceEntity i : invoices) {
            UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                    i.getContract().getId(), i.getMonth(), i.getYear());
            res.add(invoiceDetailConverter.toDTO(i, utilityMeter));
        }

        return res;
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
        Page<InvoiceEntity> invoicePage = invoiceRepository.search(
                month,
                year,
                customerId,
                "PAID",
                PageRequest.of(page, size)
        );

        // Tạo list chứa DTO
        List<InvoiceDetailDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng InvoiceEntity
        for (InvoiceEntity i : invoicePage) {
            UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                    i.getContract().getId(), i.getMonth(), i.getYear());
            InvoiceDetailDTO dto = invoiceDetailConverter.toDTO(i, utilityMeter);

            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<InvoiceDetailDTO> result = new PageImpl<>(
                dtoList,
                invoicePage.getPageable(),
                invoicePage.getTotalElements()
        );

        return result;
    }

    @Override
    public Page<InvoiceListDTO> getInvoices(int page, int size) {
        Page<InvoiceEntity> invoicePage = invoiceRepository.findAll(PageRequest.of(page, size));

        // Tạo list chứa DTO
        List<InvoiceListDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng InvoiceEntity
        for (InvoiceEntity i : invoicePage) {
            // Convert entity sang DTO
            InvoiceListDTO dto = invoiceListDTOConverter.toDTO(i);

            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<InvoiceListDTO> result = new PageImpl<>(
                dtoList,
                invoicePage.getPageable(),
                invoicePage.getTotalElements()
        );

        return result;
    }

    @Override
    public Page<InvoiceListDTO> search(InvoiceFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<InvoiceEntity> invoicePage = invoiceRepository.searchInvoices(filter, pageable);

        // Tạo list chứa DTO
        List<InvoiceListDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng InvoiceEntity
        for (InvoiceEntity i : invoicePage) {
            InvoiceListDTO dto = invoiceListDTOConverter.toDTO(i);

            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<InvoiceListDTO> result = new PageImpl<>(
                dtoList,
                invoicePage.getPageable(),
                invoicePage.getTotalElements()
        );

        return result;
    }

    @Override
    public Page<InvoiceDetailDTO> searchByStaff(InvoiceFilterDTO filter, int page, int size, Long staffId) {
        List<ContractEntity> contracts = contractRepository.findByStaffId(staffId);

        List<Long> contractIds = contracts
                .stream()
                .map(
                        ContractEntity::getId
                )
                .toList();

        Pageable pageable = PageRequest.of(page, size);
        Page<InvoiceEntity> invoicePage = invoiceRepository.searchInvoicesByStaff(filter, pageable, contractIds);

        // Tạo list chứa DTO
        List<InvoiceDetailDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng InvoiceEntity
        for (InvoiceEntity i : invoicePage) {
            UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                    i.getContract().getId(), i.getMonth(), i.getYear());

            InvoiceDetailDTO dto = invoiceDetailConverter.toDTO(i, utilityMeter);

            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<InvoiceDetailDTO> result = new PageImpl<>(
                dtoList,
                invoicePage.getPageable(),
                invoicePage.getTotalElements()
        );

        return result;
    }

    @Override
    public void delete(Long id) {
        InvoiceEntity invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn để xóa"));
        invoiceRepository.deleteById(id);

        // Xóa utility meter tương ứng
        utilityMeterRepository.deleteByContractIdAndMonthAndYear(
                invoice.getContract().getId(),
                invoice.getMonth(),
                invoice.getYear()
        );

        invoiceRepository.deleteById(id);
    }

    @Override
    public InvoiceDetailDTO viewById(Long invoiceId) {
        InvoiceEntity invoiceEntity = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn"));

        UtilityMeterEntity utilityMeter = utilityMeterService.findByContractIdAndMonthAndYear(
                invoiceEntity.getContract().getId(), invoiceEntity.getMonth(), invoiceEntity.getYear());
        return invoiceDetailConverter.toDTO(invoiceEntity, utilityMeter);
    }

    @Override
    public void invoiceConfirm(Long id) {

        int updated = invoiceRepository.confirmInvoice(id);

        if (updated == 0) {
            throw new BusinessException(
                    "Không tìm thấy hóa đơn hoặc hóa đơn"
            );
        }
    }

    @Override
    @Transactional
    public void save(InvoiceFormDTO dto) {

        int invoiceMonth = dto.getMonth();
        int invoiceYear = dto.getYear();

        LocalDate now = LocalDate.now();
        int currentMonth = now.getMonthValue();
        int currentYear = now.getYear();

        // === TÍNH THÁNG TRƯỚC (kể cả khi đang là THÁNG 1) ===
        boolean isLastMonth =
                (invoiceYear == currentYear && invoiceMonth == currentMonth - 1)
                        || (currentMonth == 1 && invoiceYear == currentYear - 1 && invoiceMonth == 12);

        // ========= VALIDATE THÊM =========
        if (dto.getId() == null) {

            if (invoiceRepository.existsByContractIdAndCustomerIdAndMonthAndYear(
                    dto.getContractId(), dto.getCustomerId(), invoiceMonth, invoiceYear)) {
                throw new BusinessException("Hóa đơn này đã tồn tại, vui lòng chọn Tháng - Năm khác");
            }

            if (!isLastMonth) {
                throw new BusinessException("Chỉ được phép thêm hóa đơn của THÁNG TRƯỚC");
            }
        }

        // ========= VALIDATE SỬA =========
        InvoiceEntity invoice = (dto.getId() == null)
                ? new InvoiceEntity()
                : invoiceRepository.findById(dto.getId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn"));

        if (dto.getId() != null) {

            if (!"PENDING".equals(invoice.getStatus())) {
                throw new BusinessException("Chỉ được phép sửa hóa đơn CHƯA thanh toán");
            }

            if (!isLastMonth) {
                throw new BusinessException("Chỉ được phép sửa hóa đơn của THÁNG TRƯỚC");
            }
        }

        // ========= VALIDATE HẠN TRẢ =========
        LocalDate dueDate = dto.getDueDate();
        LocalDate endOfInvoiceMonth = LocalDate.of(invoiceYear, invoiceMonth, 1)
                .withDayOfMonth(LocalDate.of(invoiceYear, invoiceMonth, 1).lengthOfMonth());

        if (!dueDate.isAfter(endOfInvoiceMonth)) {
            throw new BusinessException("Hạn trả phải nằm SAU tháng của hóa đơn");
        }

        // ========= MAP =========
        invoiceFormConverter.toEntity(invoice, dto);

        invoice.getDetails().clear();
        for (InvoiceDetailDetailDTO d : dto.getDetails()) {
            InvoiceDetailEntity detail = new InvoiceDetailEntity();
            detail.setDescription(d.getDescription());
            detail.setAmount(d.getAmount());
            detail.setInvoice(invoice);
            invoice.getDetails().add(detail);
        }

        invoiceRepository.save(invoice);

        utilityMeterService.save(invoice, dto);
    }

    @Override
    public Integer getRentArea(Long id) {
        InvoiceEntity invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn"));

        ContractEntity contract = contractRepository.findById(invoice.getContract().getId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy hợp đồng"));

        return contract.getRentArea();
    }

    @Override
    public Map<Long, Integer> getRentAreaByContract() {
        return contractRepository.findAllIdAndRentArea()
                .stream()
                .collect(Collectors.toMap(
                        ContractRentAreaView::getId,
                        ContractRentAreaView::getRentArea
                ));
    }

    @Override
    public void markPaid(Long invoiceId, String method, String txnRef) {
        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if ("PAID".equalsIgnoreCase(invoice.getStatus())) return;

        invoice.setStatus("PAID");
        invoice.setPaidDate(LocalDateTime.now());
        invoice.setPaymentMethod(method);
        invoice.setTransactionCode(txnRef);

        invoiceRepository.save(invoice);
    }

    @Override
    public List<OverdueInvoiceDTO> getOverdueInvoices(Long staffID) {
        List<ContractEntity> contracts = contractRepository.findByStaffId(staffID);
        List<Long> contractIds = contracts
                .stream()
                .map(
                        ContractEntity::getId
                )
                .toList();
        List<InvoiceEntity> overdueInvoices = invoiceRepository.findByStatusAndContractIdIn("OVERDUE", contractIds);
        return overdueInvoices
                .stream()
                .map(
                        i -> overdueInvoiceListConverter.toDTO(i)
                )
                .toList();
    }

    @Override
    public List<ExpiringInvoiceDTO> getExpiringInvoices(Long staffId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now
                .withDayOfMonth(9)
                .withHour(0)
                .withMinute(0)
                .withSecond(0);

        List<ContractEntity> contracts = contractRepository.findByStaffId(staffId);

        List<Long> contractIds = contracts
                .stream()
                .map(
                        ContractEntity::getId
                )
                .toList();

        List<InvoiceEntity> invoices = invoiceRepository.getExpiringInvoices(start, contractIds);

        return invoices
                .stream()
                .map(
                        i -> expiringInvoiceConverter.toDto(i)
                )
                .toList();
    }

    @Override
    public void statusUpdate() {
        invoiceRepository.invoiceStatusUpdate();
    }

}
