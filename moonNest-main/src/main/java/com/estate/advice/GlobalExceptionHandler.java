package com.estate.advice;

import com.estate.api.common.ApiErrorResponses;
import com.estate.dto.ApiErrorResponse;
import com.estate.dto.ApiFieldError;
import com.estate.exception.BusinessException;
import com.estate.exception.ForbiddenOperationException;
import com.estate.exception.InputValidationException;
import com.estate.exception.PayloadTooLargeException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.exception.SaleContractValidationException;
import com.estate.exception.UnsupportedMediaTypeApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestControllerAdvice(basePackages = "com.estate.api")
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusinessException(BusinessException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request)
        );
    }

    @ExceptionHandler(InputValidationException.class)
    public ResponseEntity<?> handleValidationException(InputValidationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request)
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = firstValidationMessage(ex.getBindingResult());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", message, HttpStatus.BAD_REQUEST, request, fieldErrors(ex.getBindingResult()))
        );
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<?> handleBindException(BindException ex, HttpServletRequest request) {
        String message = firstValidationMessage(ex.getBindingResult());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", message, HttpStatus.BAD_REQUEST, request, fieldErrors(ex.getBindingResult()))
        );
    }

    @ExceptionHandler({
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<?> handleBadRequest(Exception ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request)
        );
    }

    @ExceptionHandler(SaleContractValidationException.class)
    public ResponseEntity<?> handleSaleContractValidation(SaleContractValidationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request)
        );
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request)
        );
    }

    @ExceptionHandler(ForbiddenOperationException.class)
    public ResponseEntity<?> handleForbiddenOperation(ForbiddenOperationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                error("FORBIDDEN", ex.getMessage(), HttpStatus.FORBIDDEN, request)
        );
    }

    @ExceptionHandler(UnsupportedMediaTypeApiException.class)
    public ResponseEntity<?> handleUnsupportedMediaType(UnsupportedMediaTypeApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request)
        );
    }

    @ExceptionHandler(PayloadTooLargeException.class)
    public ResponseEntity<?> handlePayloadTooLarge(PayloadTooLargeException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request)
        );
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<?> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                error("BAD_REQUEST", ex.getMessage(), HttpStatus.BAD_REQUEST, request)
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                error("FORBIDDEN", ex.getMessage(), HttpStatus.FORBIDDEN, request)
        );
    }

    @ExceptionHandler({ResponseStatusException.class, ErrorResponseException.class})
    public ResponseEntity<?> handleStatusExceptions(ErrorResponseException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String message = ex instanceof ResponseStatusException responseStatusException && responseStatusException.getReason() != null
                ? responseStatusException.getReason()
                : status.getReasonPhrase();
        HttpStatus resolvedStatus = (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN)
                ? status
                : HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(resolvedStatus).body(
                error(codeFor(resolvedStatus), message, resolvedStatus, request)
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneralException(Exception ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                error("INTERNAL_ERROR", "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR, request)
        );
    }

    private ApiErrorResponse error(String code, String message, HttpStatus status, HttpServletRequest request) {
        return ApiErrorResponses.of(code, message, status, request.getRequestURI());
    }

    private ApiErrorResponse error(String code,
                                   String message,
                                   HttpStatus status,
                                   HttpServletRequest request,
                                   List<ApiFieldError> errors) {
        return ApiErrorResponses.of(code, message, status, request.getRequestURI(), errors);
    }

    private String firstValidationMessage(BindingResult bindingResult) {
        return bindingResult.getFieldErrors().isEmpty()
                ? bindingResult.getAllErrors().getFirst().getDefaultMessage()
                : bindingResult.getFieldErrors().getFirst().getDefaultMessage();
    }

    private List<ApiFieldError> fieldErrors(BindingResult bindingResult) {
        return bindingResult.getFieldErrors().stream()
                .map(fieldError -> ApiFieldError.of(fieldError.getField(), fieldError.getDefaultMessage()))
                .distinct()
                .toList();
    }

    private String codeFor(HttpStatus status) {
        return switch (status) {
            case BAD_REQUEST -> "BAD_REQUEST";
            case UNAUTHORIZED -> "UNAUTHORIZED";
            case FORBIDDEN -> "FORBIDDEN";
            default -> "INTERNAL_ERROR";
        };
    }
}
