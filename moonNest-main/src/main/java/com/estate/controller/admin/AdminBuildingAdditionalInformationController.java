package com.estate.controller.admin;

import com.estate.dto.BuildingFormDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.BuildingDetailService;
import com.estate.service.BuildingService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/building-additional-information")
@RequiredArgsConstructor
public class AdminBuildingAdditionalInformationController {
    private final BuildingDetailService buildingDetailService;
    private final BuildingService buildingService;
    private final StaffService staffService;

    @GetMapping("/{buildingId}")
    public String detailPage(
            @PathVariable Long buildingId,
            @AuthenticationPrincipal CustomUserDetails user,
            Model model
    ) {
        model.addAttribute("buildingId", buildingId);

        BuildingFormDTO building = buildingService.findById(buildingId);
        model.addAttribute("building", building);
        model.addAttribute("buildingLat", building.getLatitude());
        model.addAttribute("buildingLng", building.getLongitude());

        model.addAttribute("legalAuthorities", buildingDetailService.getLegalAuthoritiesByBuilding(buildingId));
        model.addAttribute("nearbyAmenities", buildingDetailService.getNearbyAmenitiesByBuilding(buildingId));
        model.addAttribute("planningMaps", buildingDetailService.getPlanningMapsByBuilding(buildingId));
        model.addAttribute("suppliers", buildingDetailService.getSuppliersByBuilding(buildingId));

        model.addAttribute("page", "building");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));

        return "admin/building-additional-information";
    }
}