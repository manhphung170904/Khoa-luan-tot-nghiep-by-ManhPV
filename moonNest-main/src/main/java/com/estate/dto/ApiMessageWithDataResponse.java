package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName = "of")
public class ApiMessageWithDataResponse<T> {
    private final String message;
    private final T data;
}
