package com.estate.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class SaleContractFormDTO {

    private Long id;

    @NotNull(message = "Vui lòng chọn bất động sản")
    private Long buildingId;

    @NotNull(message = "Vui lòng chọn khách hàng")
    private Long customerId;

    @NotNull(message = "Vui lòng chọn nhân viên phụ trách")
    private Long staffId;

    @NotNull(message = "Vui lòng nhập giá bán")
    @Positive(message = "Giá bán phải lớn hơn 0")
    private BigDecimal salePrice;

    // Tuỳ chọn — null = chưa bàn giao
    private LocalDate transferDate;

    private String note;
}