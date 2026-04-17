package com.estate.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class BuildingFormDTO {
    private Long id;

    @NotNull(message = "Quận/huyện không được để trống")
    private Long districtId;

    @NotNull(message = "Số tầng không được để trống")
    @Min(value = 0, message = "Số tầng phải >= 0")
    private Integer numberOfFloor;

    @NotNull(message = "Số tầng hầm không được để trống")
    @Min(value = 0, message = "Số tầng hầm phải >= 0")
    private Integer numberOfBasement;

    @NotNull(message = "Diện tích sàn không được để trống")
    @Min(value = 1, message = "Diện tích sàn phải > 0")
    private Integer floorArea;

    private BigDecimal rentPrice;
    private BigDecimal deposit;
    private BigDecimal serviceFee;
    private BigDecimal carFee;
    private BigDecimal motorbikeFee;
    private BigDecimal waterFee;
    private BigDecimal electricityFee;

    private BigDecimal salePrice;

    @NotBlank(message = "Tên bất động sản không được để trống")
    private String name;

    @NotBlank(message = "Phường/xã không được để trống")
    private String ward;

    @NotBlank(message = "Đường/phố không được để trống")
    private String street;

    @NotBlank(message = "Vui lòng chọn loại hình bất động sản")
    private String propertyType;

    @NotBlank(message = "Vui lòng chọn loại giao dịch")
    private String transactionType;

    private String districtName;
    private String direction;
    private String level;
    private String taxCode;
    private String linkOfBuilding;
    private String image;
    private String rentAreaValues;

    @NotNull(message = "Tọa độ không được để trống")
    private Double latitude;

    @NotNull(message = "Tọa độ không được để trống")
    private Double longitude;

    private List<Long> staffIds = new ArrayList<>();
}
