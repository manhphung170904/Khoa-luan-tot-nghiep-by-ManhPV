package com.estate.controller.admin;

import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.BuildingFormDTO;
import com.estate.enums.Direction;
import com.estate.enums.Level;
import com.estate.enums.PropertyType;
import com.estate.enums.TransactionType;
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
@RequestMapping("/admin/building")
@RequiredArgsConstructor
public class AdminBuildingController {
    private final BuildingService buildingService;
    private final StaffService staffService;
    private final DistrictService districtService;
    private final BuildingDetailService buildingDetailService;
    private final SaleContractService saleContractService;
    private final ContractService contractService;

    @GetMapping("/list")
    public String listBuildings(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        addCommonAttributes(model, user);

        return "admin/building-list";
    }

    @GetMapping("/search")
    public String searchBuildings(
            BuildingFilterDTO filter,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("filter", filter);
        model.addAttribute("managers", staffService.getStaffsName());

        model.addAttribute("wards", buildingService.getWardName());
        model.addAttribute("streets", buildingService.getStreetName());

        model.addAttribute("directions", Direction.values());
        model.addAttribute("levels", Level.values());

        model.addAttribute("districts", districtService.findAll());

        model.addAttribute("propertyTypes", PropertyType.values());
        model.addAttribute("transactionTypes", TransactionType.values());

        addCommonAttributes(model, user);

        return "admin/building-search";
    }

    @GetMapping("/add")
    public String addBuildingForm(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("staffs", staffService.getStaffsName());

        model.addAttribute("districts", districtService.findAll());

        model.addAttribute("directions", Direction.values());
        model.addAttribute("levels", Level.values());

        addCommonAttributes(model, user);

        return "admin/building-add";
    }

    @GetMapping("/edit/{id}")
    public String editBuilding(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        BuildingFormDTO building = buildingService.findById(id);
        model.addAttribute("building", building);
        model.addAttribute("districtId", building.getDistrictId());

        model.addAttribute("managers", staffService.getStaffsName());

        model.addAttribute("directions", Direction.values());
        model.addAttribute("levels", Level.values());

        model.addAttribute("hasActiveContract", contractService.countActiveByBuildingId(id) > 0);

        model.addAttribute("isSold", saleContractService.countByBuildingId(id) == 1);

        addCommonAttributes(model, user);

        return "admin/building-edit";
    }

    @GetMapping("/{id}")
    public String detailBuilding(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("building", buildingService.viewById(id));
        // legal_authority: chỉ ADMIN hoặc STAFF phụ trách building mới xem
        if (user.getRole().equals("ADMIN") || buildingService.isStaffManagesBuilding(user.getUserId(), id)) {
            model.addAttribute("legalAuthorities", buildingDetailService.getLegalAuthorities(id));
        }
        model.addAttribute("suppliers", buildingDetailService.getSuppliers(id));
        model.addAttribute("planningMaps", buildingDetailService.getPlanningMaps(id));
        model.addAttribute("nearbyAmenities", buildingDetailService.getNearbyAmenities(id));

        addCommonAttributes(model, user);

        return "admin/building-detail";
    }

    // HELPER
    private void addCommonAttributes(Model model, CustomUserDetails user) {
        model.addAttribute("page", "building");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));
    }
}
