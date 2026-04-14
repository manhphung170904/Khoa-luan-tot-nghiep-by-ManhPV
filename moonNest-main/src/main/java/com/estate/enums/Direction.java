package com.estate.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
public enum Direction {
    BAC("Bắc"),
    DONG_BAC("Đông bắc"),
    DONG("Đông"),
    DONG_NAM("Đông nam"),
    NAM("Nam"),
    TAY_NAM("Tây nam"),
    TAY("Tây"),
    TAY_BAC("Tây bắc");

    private final String label;

    Direction(String label) {
        this.label = label;
    }
}
