package com.estate.advice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GoongApiKeyAdvice {

    @Value("${goong.api.key}")
    private String goongApiKey;

    @ModelAttribute("goongApiKey")
    public String goongApiKey() {
        return goongApiKey;
    }
}
