package com.estate.advice;

import com.estate.service.PropertyRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice(basePackages = "com.estate.controller.admin")
@RequiredArgsConstructor
public class SidebarNotificationAdvice {

    private final PropertyRequestService propertyRequestService;

    @ModelAttribute("pendingPropertyRequestsCount")
    public Long getPendingPropertyRequestsCount() {
        try {
            return propertyRequestService.getPendingCount();
        } catch (Exception e) {
            return 0L;
        }
    }
}
