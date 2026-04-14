package com.estate.enums;

import lombok.Getter;

@Getter
public enum TransactionType {
    FOR_RENT("Cho thuê"),
    FOR_SALE("Mua bán");

    private final String label;

    TransactionType(String label) {
        this.label = label;
    }
}
