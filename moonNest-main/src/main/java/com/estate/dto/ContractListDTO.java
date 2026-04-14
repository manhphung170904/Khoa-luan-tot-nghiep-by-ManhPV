package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ContractListDTO {
    private Long id;
    private String customer;
    private String building;
    private BigDecimal rentPrice;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status;
}
