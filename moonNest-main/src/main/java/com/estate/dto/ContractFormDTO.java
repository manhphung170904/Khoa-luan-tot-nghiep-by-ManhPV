package com.estate.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ContractFormDTO {
    private Long id;
    private Long customerId;
    private Long buildingId;
    private Long staffId;
    @DecimalMin(value = "0.0", inclusive = true, message = "Giá thuê phải >= 0")
    private BigDecimal rentPrice;
    private Integer rentArea;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
}
