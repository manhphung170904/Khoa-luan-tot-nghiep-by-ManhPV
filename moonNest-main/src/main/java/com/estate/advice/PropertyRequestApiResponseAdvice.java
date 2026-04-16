package com.estate.advice;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice(basePackages = "com.estate.api")
public class PropertyRequestApiResponseAdvice implements ResponseBodyAdvice<Object> {
    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        if (!(body instanceof String message) || !isPropertyRequestMessageEndpoint(request.getURI().getPath())) {
            return body;
        }

        if (response instanceof ServletServerHttpResponse servletResponse) {
            servletResponse.getServletResponse().setContentType(MediaType.APPLICATION_JSON_VALUE);
        }

        String escapedMessage = message
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");

        return "{\"message\":\"" + escapedMessage + "\"}";
    }

    private boolean isPropertyRequestMessageEndpoint(String path) {
        return "/api/v1/customer/property-requests".equals(path)
                || path.startsWith("/api/v1/customer/property-requests/")
                || path.startsWith("/api/v1/admin/property-requests/");
    }
}
