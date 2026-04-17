package com.estate.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class LegalAuthorityDTO {
    private Long id;
    private Long buildingId;
    private String buildingName;

    @Size(max = 255, message = "Authority name must be at most 255 characters")
    private String authorityName;

    private String authorityType;
    private String authorityTypeLabel;
    private String address;
    private String phone;
    private String email;
    private String note;
    private LocalDateTime createdDate;
}
