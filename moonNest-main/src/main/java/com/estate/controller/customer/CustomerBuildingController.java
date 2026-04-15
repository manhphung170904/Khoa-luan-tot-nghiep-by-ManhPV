package com.estate.controller.customer;

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
    @GetMapping("/list")
    public String listBuildings (
            Model model,
            @RequestParam(required = false) String buildingName
    ) {
        model.addAttribute("buildingName", buildingName == null ? "" : buildingName);

        return "customer/building-list";
    }
}
