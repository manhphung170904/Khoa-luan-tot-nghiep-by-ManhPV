package com.estate.api.customer;

import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.service.BuildingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/customer/building")
@RequiredArgsConstructor
public class CustomerBuildingAPI {
    private final BuildingService buildingService;

    @GetMapping("/search")
    public List<BuildingDetailDTO> getBuildingsSearch(
            BuildingFilterDTO filter
    ) {
        return buildingService.searchByCustomer(filter);
    }
}
