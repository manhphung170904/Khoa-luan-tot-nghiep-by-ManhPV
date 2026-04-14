package com.estate.dto;

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
public class ContractDetailDTO {
    private Long id;
    private BigDecimal rentPrice;
    private Integer rentArea;
    private LocalDate startDate;
    private LocalDate endDate;
    private String formattedStartDate;
    private String formattedEndDate;
    private String status;
    private CustomerListDTO customer;
    private BuildingListDTO building;
    private StaffListDTO staff;
}
