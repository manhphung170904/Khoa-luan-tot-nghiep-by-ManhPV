package com.estate.controller.admin;

import com.estate.security.CustomUserDetails;
import com.estate.service.PropertyRequestService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/property-request")
@RequiredArgsConstructor
public class AdminPropertyRequestController {
    private final PropertyRequestService propertyRequestService;
    private final StaffService staffService;

    @GetMapping("/list")
    public String listRequests(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("pendingCount", propertyRequestService.getPendingCount());
        addCommonAttributes(model, user);
        return "admin/property-request-list";
    }

    @GetMapping("/{id}")
    public String detailRequest(
            @PathVariable Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("request", propertyRequestService.getRequestDetail(id));
        addCommonAttributes(model, user);
        return "admin/property-request-detail";
    }

    // HELPER
    private void addCommonAttributes(Model model, CustomUserDetails user) {
        model.addAttribute("page", "property-request");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));
    }
}
