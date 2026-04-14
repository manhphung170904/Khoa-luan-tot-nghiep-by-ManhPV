package com.estate.controller.admin;

import com.estate.dto.SaleContractDetailDTO;
import com.estate.dto.SaleContractFilterDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.BuildingService;
import com.estate.service.CustomerService;
import com.estate.service.SaleContractService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/sale-contract")
@RequiredArgsConstructor
public class AdminSaleContractController {
    private final CustomerService customerService;
    private final BuildingService buildingService;
    private final StaffService staffService;
    private final SaleContractService saleContractService;

    @GetMapping("/list")
    public String listSaleContracts(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("customers", customerService.getCustomersName());

        model.addAttribute("buildings", buildingService.getBuildingsName());

        model.addAttribute("staffs", staffService.getStaffsName());

        addCommonAttributes(model, user);

        return "admin/sale-contract-list";
    }

    @GetMapping("/search")
    public String searchSaleContracts(
            SaleContractFilterDTO filter,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("filter", filter);

        model.addAttribute("customers", customerService.getCustomersName());

        model.addAttribute("buildings", buildingService.getBuildingsName());

        model.addAttribute("staffs", staffService.getStaffsName());

        addCommonAttributes(model, user);

        return "admin/sale-contract-search";
    }

    @GetMapping("/add")
    public String addSaleContractForm(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("customers", customerService.getCustomersName());

        model.addAttribute("buildings", buildingService.getBuildingsName());

        model.addAttribute("staffs", staffService.getStaffsName());

        addCommonAttributes(model, user);

        return "admin/sale-contract-add";
    }

    @GetMapping("/edit/{id}")
    public String editSaleContract(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("contract", saleContractService.viewById(id));

        addCommonAttributes(model, user);

        return "admin/sale-contract-edit";
    }

    @GetMapping("/{id}")
    public String detailSaleContract(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("contract", saleContractService.viewById(id));

        addCommonAttributes(model, user);

        return "admin/sale-contract-detail";
    }

    // HELPER
    private void addCommonAttributes(Model model, CustomUserDetails user) {
        model.addAttribute("page", "sale-contract");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));
    }
}