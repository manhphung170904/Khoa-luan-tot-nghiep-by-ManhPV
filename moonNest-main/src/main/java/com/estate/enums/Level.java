package com.estate.enums;

import lombok.Getter;

@Getter
public enum Level {
    A_PLUS("A+"),
    A("A"),
    B_PLUS("B+"),
    B("B"),
    C_PLUS("C+"),
    C("C");

    private final String label;

    Level(String label) {
        this.label = label;
    }

}
