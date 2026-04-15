package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName = "of")
public class ApiMessageResponse<T> {
    private final String message;
    private final T data;

    public static ApiMessageResponse<Void> of(String message) {
        return new ApiMessageResponse<>(message, null);
    }
}
