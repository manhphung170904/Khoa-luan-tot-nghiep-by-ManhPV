package com.estate.api.common;

import com.estate.dto.ApiErrorResponse;
import com.estate.dto.ApiFieldError;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.List;

public final class ApiErrorResponses {
    private ApiErrorResponses() {
    }

    public static ApiErrorResponse of(String code, String message, HttpStatus status, String path) {
        return of(code, message, status, path, List.of());
    }

    public static ApiErrorResponse of(String code,
                                      String message,
                                      HttpStatus status,
                                      String path,
                                      List<ApiFieldError> errors) {
        return ApiErrorResponse.of(code, status.value(), message, path, OffsetDateTime.now(), errors);
    }
}
