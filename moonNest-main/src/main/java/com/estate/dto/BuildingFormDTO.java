package com.estate.dto;

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
    private Integer numberOfFloor;

    @NotNull(message = "Số tầng hầm không được để trống")
    private Integer numberOfBasement;

    @NotNull(message = "Diện tích sàn không được để trống")
    private Integer floorArea;

    // FOR_RENT
    private BigDecimal rentPrice;
    private BigDecimal deposit;
    private BigDecimal serviceFee;
    private BigDecimal carFee;
    private BigDecimal motorbikeFee;
    private BigDecimal waterFee;
    private BigDecimal electricityFee;

    // FOR_SALE
    private BigDecimal salePrice;

    @NotBlank(message = "Tên bất động sản không được để trống")
    private String name;

    @NotBlank(message = "Phường/xã không được để trống")
    private String ward;

    @NotBlank(message = "Đường/phố không được để trống")
    private String street;

    @NotBlank(message = "Vui lòng chọn loại hình bất động sản")
    private String propertyType; // OFFICE | SHOPHOUSE | APARTMENT | WAREHOUSE

    @NotBlank(message = "Vui lòng chọn loại giao dịch")
    private String transactionType; // FOR_RENT | FOR_SALE

    private String districtName;
    private String direction;
    private String level;
    private String taxCode;
    private String linkOfBuilding;
    private String image; // tên file ảnh, VD: "abc123.jpg"
    private String rentAreaValues; // "100,200,350"

    @NotNull(message = "Tọa độ không được để trống")
    private Double latitude;

    @NotNull(message = "Tọa độ không được để trống")
    private Double longitude;

    private List<Long> staffIds = new ArrayList<>();
}
