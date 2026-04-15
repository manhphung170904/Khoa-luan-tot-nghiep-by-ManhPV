package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PropertyRequestListDTO {
    private Long id;
    private String customerName;
    private String buildingName;
    private String requestType;      // RENT / BUY
    private String requestTypeLabel; // "Thuê" / "Mua"
    private String status;           // PENDING / APPROVED / REJECTED / CANCELLED
    private String statusLabel;      // "Chờ xử lý" / "Đã duyệt" / "Đã từ chối" / "Đã hủy"
    private LocalDateTime createdDate;
}
