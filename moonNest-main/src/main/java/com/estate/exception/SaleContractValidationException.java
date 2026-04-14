package com.estate.exception;

public class SaleContractValidationException extends RuntimeException {
    public SaleContractValidationException(String message) {
        super(message);
    }
}