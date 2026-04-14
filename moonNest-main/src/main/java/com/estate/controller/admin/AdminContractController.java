package com.estate.controller.admin;

import com.estate.dto.ContractFilterDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/contract")
@RequiredArgsConstructor
public class AdminContractController {
    private final CustomerService customerService;
    private final BuildingService buildingService;
    private final StaffService staffService;
    private final ContractService contractService;
    private final RentAreaService rentAreaService;

    @GetMapping("/list")
    public String listContracts(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("customers", customerService.getCustomersName());

        model.addAttribute("buildings", buildingService.getBuildingsName());

        model.addAttribute("staffs", staffService.getStaffsName());

        addCommonAttributes(model, user);

        return "admin/contract-list";
    }

    @GetMapping("/search")
    public String searchContracts(
            ContractFilterDTO filter,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("filter", filter);

        model.addAttribute("customers", customerService.getCustomersName());

        model.addAttribute("buildings", buildingService.getBuildingsName());

        model.addAttribute("staffs", staffService.getStaffsName());

        addCommonAttributes(model, user);

        return "admin/contract-search";
    }

    @GetMapping("/add")
    public String addCustomerForm(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("staffs", staffService.getStaffsName());

        model.addAttribute("buildings", buildingService.getBuildingsName());

        model.addAttribute("customers", customerService.getCustomersName());

        model.addAttribute("rentAreas", rentAreaService.getAllRentAreas());

        addCommonAttributes(model, user);

        return "admin/contract-add";
    }

    @GetMapping("/edit/{id}")
    public String editContract(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("contract", contractService.findById(id));

        model.addAttribute("buildings", buildingService.getBuildingsName());

        model.addAttribute("customers", customerService.getCustomersName());

        model.addAttribute("staffs", staffService.getStaffsName());

        addCommonAttributes(model, user);

        return "admin/contract-edit";
    }

    @GetMapping("/{id}")
    public String detailContract(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("contract", contractService.viewById(id));

        addCommonAttributes(model, user);

        return "admin/contract-detail";
    }

    // HELPER
    private void addCommonAttributes(Model model, CustomUserDetails user) {
        model.addAttribute("page", "contract");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));
    }
}
