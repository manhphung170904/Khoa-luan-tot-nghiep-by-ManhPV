package com.estate.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
public enum PropertyType {
    OFFICE("Văn phòng"),
    SHOPHOUSE("Nhà phố thương mại"),
    APARTMENT("Căn hộ"),
    WAREHOUSE("Kho xưởng");

    private final String label;

    PropertyType(String label) {
        this.label = label;
    }
}
