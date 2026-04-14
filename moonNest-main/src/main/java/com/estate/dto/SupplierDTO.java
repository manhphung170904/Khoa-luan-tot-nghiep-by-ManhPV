package com.estate.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class SupplierDTO {
    private Long id;
    private Long buildingId;
    private String buildingName;
    private String name;
    private String serviceType;
    private String phone;
    private String email;
    private String address;
    private String note;
    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;
}