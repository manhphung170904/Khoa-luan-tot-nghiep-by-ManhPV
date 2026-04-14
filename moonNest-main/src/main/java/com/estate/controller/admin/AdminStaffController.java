package com.estate.controller.admin;

import com.estate.security.CustomUserDetails;
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
@RequestMapping("/admin/staff")
@RequiredArgsConstructor
public class AdminStaffController {
    private final StaffService staffService;

    @GetMapping("/list")
    public String listStaffs(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        addCommonAttributes(model, user);

        return "admin/staff-list";
    }

    @GetMapping("/search")
    public String searchStaffs(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String fullName,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("role", role);

        model.addAttribute("fullName", fullName);

        addCommonAttributes(model, user);

        return "admin/staff-search";
    }

    @GetMapping("/add")
    public String addStaffForm(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        addCommonAttributes(model, user);

        return "admin/staff-add";
    }

    @GetMapping("/{id}")
    public String detailStaff(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("staff", staffService.viewById(id));

        addCommonAttributes(model, user);

        return "admin/staff-detail";
    }

    // HELPER
    private void addCommonAttributes(Model model, CustomUserDetails user) {
        model.addAttribute("page", "staff");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));
    }
}
