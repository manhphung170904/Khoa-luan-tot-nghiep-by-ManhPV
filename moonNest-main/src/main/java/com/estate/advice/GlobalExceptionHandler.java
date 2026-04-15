package com.estate.advice;

import com.estate.api.common.ApiErrorResponses;
import com.estate.dto.ApiErrorResponse;
import com.estate.exception.BusinessException;
import com.estate.exception.InputValidationException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.exception.SaleContractValidationException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(basePackages = "com.estate.api")
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusinessException(BusinessException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                error("BUSINESS_CONFLICT", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(InputValidationException.class)
    public ResponseEntity<?> handleValidationException(InputValidationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("VALIDATION_ERROR", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().isEmpty()
                ? ex.getBindingResult().getAllErrors().getFirst().getDefaultMessage()
                : ex.getBindingResult().getFieldErrors().getFirst().getDefaultMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("VALIDATION_ERROR", message, request)
        );
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<?> handleBindException(BindException ex, HttpServletRequest request) {
        String message = ex.getFieldErrors().isEmpty()
                ? ex.getAllErrors().getFirst().getDefaultMessage()
                : ex.getFieldErrors().getFirst().getDefaultMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("VALIDATION_ERROR", message, request)
        );
    }

    @ExceptionHandler({
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<?> handleBadRequest(Exception ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(SaleContractValidationException.class)
    public ResponseEntity<?> handleSaleContractValidation(SaleContractValidationException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest().body(
                error("VALIDATION_ERROR", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                error("RESOURCE_NOT_FOUND", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<?> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(
                error("METHOD_NOT_ALLOWED", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                error("FORBIDDEN", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneralException(Exception ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                error("INTERNAL_ERROR", ex.getMessage() != null ? ex.getMessage() : "Internal error", request)
        );
    }

    private ApiErrorResponse error(String code, String message, HttpServletRequest request) {
        return ApiErrorResponses.of(code, message, request.getRequestURI());
    }
}
