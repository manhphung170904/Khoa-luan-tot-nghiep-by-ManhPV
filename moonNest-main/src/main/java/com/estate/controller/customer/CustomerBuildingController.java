package com.estate.controller.customer;

import com.estate.enums.Direction;
import com.estate.enums.Level;
import com.estate.service.BuildingService;
import com.estate.service.DistrictService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/customer/building")
@RequiredArgsConstructor
public class CustomerBuildingController {
    private final StaffService staffService;
    private final BuildingService buildingService;
    private final DistrictService districtService;

    @GetMapping("/list")
    public String listBuildings (
            Model model,
            @RequestParam(required = false) String buildingName
    ) {
        model.addAttribute("managers", staffService.getStaffsName());

        model.addAttribute("wards", buildingService.getWardName());
        model.addAttribute("streets", buildingService.getStreetName());

        model.addAttribute("directions", Direction.values());
        model.addAttribute("levels", Level.values());

        model.addAttribute("districts", districtService.findAll());

        model.addAttribute("buildingName", buildingName == null ? "" : buildingName);

        return "customer/building-list";
    }
}
