package com.estate.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class PropertyRequestDetailDTO {
    private Long id;

    // Thông tin KH
    private Long customerId;
    private String customerName;
    private String phone;
    private String email;

    // Thông tin BĐS
    private Long buildingId;
    private String buildingName;
    private String buildingAddress;
    private String transactionType;       // FOR_RENT / FOR_SALE
    private BigDecimal buildingRentPrice;
    private BigDecimal buildingSalePrice;

    // Chi tiết yêu cầu
    private String requestType;           // RENT / BUY
    private String requestTypeLabel;      // "Thuê" / "Mua"
    private Integer desiredArea;
    private LocalDate desiredStartDate;
    private LocalDate desiredEndDate;
    private BigDecimal offeredPrice;
    private String message;

    // Xử lý
    private String status;
    private String statusLabel;
    private String adminNote;
    private String processedByName;
    private Long contractId;
    private Long saleContractId;

    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;
}
