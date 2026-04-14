package com.estate.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor
public class LegalAuthorityDTO {
    private Long id;
    private Long buildingId;
    private String buildingName;
    private String authorityName;
    private String authorityType;       // NOTARY, LAND_REGISTRY, LAW_FIRM, TAX_OFFICE
    private String authorityTypeLabel;  // Việt hóa để hiển thị
    private String address;
    private String phone;
    private String email;
    private String note;
    private LocalDateTime createdDate;
}