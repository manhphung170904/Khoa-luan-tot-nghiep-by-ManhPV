package com.estate.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class SaleContractDetailDTO {
    private Long id;
    private BigDecimal salePrice;
    private LocalDate transferDate;
    private String note;
    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;

    // Nested
    private CustomerInfo customer;
    private BuildingInfo building;
    private StaffInfo staff;

    @Getter
    @Setter
    public static class CustomerInfo {
        private Long id;
        private String fullName;
        private String phone;
        private String email;
    }

    @Getter
    @Setter
    public static class BuildingInfo {
        private Long id;
        private String name;
        private String address;
        private String level;
    }

    @Getter
    @Setter
    public static class StaffInfo {
        private Long id;
        private String fullName;
        private String phone;
        private String email;
    }
}