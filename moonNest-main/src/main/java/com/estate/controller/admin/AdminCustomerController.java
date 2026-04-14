package com.estate.controller.admin;

import com.estate.security.CustomUserDetails;
import com.estate.service.CustomerService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/admin/customer")
@RequiredArgsConstructor
public class AdminCustomerController {
    private final StaffService staffService;
    private final CustomerService customerService;

    @GetMapping("/list")
    public String listBuildings(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        addCommonAttributes(model, user);

        return "admin/customer-list";
    }

    @GetMapping("/search")
    public String searchCustomers(
            @RequestParam(required = false) String fullName,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("fullName", fullName);

        addCommonAttributes(model, user);

        return "admin/customer-search";
    }

    @GetMapping("/add")
    public String addCustomerForm(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("staffs", staffService.getStaffsName());

        addCommonAttributes(model, user);

        return "admin/customer-add";
    }

    @GetMapping("/{id}")
    public String detailCustomer(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("customer", customerService.viewById(id));

        addCommonAttributes(model, user);

        return "admin/customer-detail";
    }

    // HELPER
    private void addCommonAttributes(Model model, CustomUserDetails user) {
        model.addAttribute("page", "customer");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));
    }
}
