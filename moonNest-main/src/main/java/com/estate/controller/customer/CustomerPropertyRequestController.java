package com.estate.controller.customer;

import com.estate.security.CustomUserDetails;
import com.estate.service.PropertyRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/customer/property-request")
@RequiredArgsConstructor
public class CustomerPropertyRequestController {
    private final PropertyRequestService propertyRequestService;

    @GetMapping("/list")
    public String listRequests(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Long customerId = user.getUserId();
        model.addAttribute("pendingCount",
                propertyRequestService.getRequestsByCustomer(customerId).stream()
                        .filter(r -> "PENDING".equals(r.getStatus())).count());
        return "customer/property-request-list";
    }
}
