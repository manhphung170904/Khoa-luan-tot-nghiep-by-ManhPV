package com.estate.api.staff;

import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.service.BuildingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/staff/building")
@RequiredArgsConstructor
public class StaffBuildingAPI {
    private final BuildingService buildingService;

    @GetMapping("/search")
    public Page<BuildingDetailDTO> getBuildingsSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "3") int size,
            BuildingFilterDTO filter
    ) {
        return buildingService.searchByStaff(filter, page - 1, size);
    }
}
