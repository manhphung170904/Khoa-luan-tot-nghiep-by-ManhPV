package com.estate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class PropertyRequestFormDTO {

    @NotNull(message = "Vui lòng chọn bất động sản")
    private Long buildingId;

    @NotBlank(message = "Vui lòng chọn loại yêu cầu")
    private String requestType; // RENT / BUY

    private Integer desiredArea;        // Chỉ cho RENT
    private LocalDate desiredStartDate; // Chỉ cho RENT
    private LocalDate desiredEndDate;   // Chỉ cho RENT

    private BigDecimal offeredPrice;    // Giá đề xuất (optional)
    private String message;             // Ghi chú
}
