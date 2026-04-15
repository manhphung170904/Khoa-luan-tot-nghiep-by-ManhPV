package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName = "of")
public class ApiOptionDTO {
    private final String value;
    private final String label;
}
