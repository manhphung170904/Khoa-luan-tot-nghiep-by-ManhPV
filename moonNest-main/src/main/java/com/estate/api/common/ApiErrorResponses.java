package com.estate.api.common;

import com.estate.dto.ApiErrorResponse;

import java.time.OffsetDateTime;

public final class ApiErrorResponses {
    private ApiErrorResponses() {
    }

    public static ApiErrorResponse of(String code, String message, String path) {
        return ApiErrorResponse.of(code, message, path, OffsetDateTime.now());
    }
}
