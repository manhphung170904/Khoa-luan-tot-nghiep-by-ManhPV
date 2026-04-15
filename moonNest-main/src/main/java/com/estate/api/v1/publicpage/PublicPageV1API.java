package com.estate.api.v1.publicpage;

import com.estate.dto.ApiOptionDTO;
import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.PageResponse;
import com.estate.dto.PublicBuildingFilterMetadataDTO;
import com.estate.enums.Direction;
import com.estate.enums.Level;
import com.estate.service.BuildingService;
import com.estate.service.DistrictService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
public class PublicPageV1API {
    private final BuildingService buildingService;
    private final DistrictService districtService;

    @GetMapping("/buildings")
    public List<BuildingDetailDTO> getBuildings(@ModelAttribute BuildingFilterDTO filter) {
        return buildingService.searchByCustomer(filter);
    }

    @GetMapping("/buildings/page")
    public PageResponse<BuildingDetailDTO> getBuildingsPage(
            @ModelAttribute BuildingFilterDTO filter,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "9") int size
    ) {
        return PageResponse.from(buildingService.searchByCustomer(filter, page - 1, size));
    }

    @GetMapping("/buildings/filters")
    public PublicBuildingFilterMetadataDTO getBuildingFilters() {
        return PublicBuildingFilterMetadataDTO.of(
                toOptions(districtService.findAll()),
                buildingService.getWardName(),
                buildingService.getStreetName(),
                toOptions(Direction.values()),
                toOptions(Level.values())
        );
    }

    private List<ApiOptionDTO> toOptions(Map<String, Long> source) {
        return source.entrySet().stream()
                .map(entry -> ApiOptionDTO.of(String.valueOf(entry.getValue()), entry.getKey()))
                .toList();
    }

    private List<ApiOptionDTO> toOptions(Direction[] values) {
        return java.util.Arrays.stream(values)
                .map(direction -> ApiOptionDTO.of(direction.name(), direction.getLabel()))
                .toList();
    }

    private List<ApiOptionDTO> toOptions(Level[] values) {
        return java.util.Arrays.stream(values)
                .map(level -> ApiOptionDTO.of(level.name(), level.getLabel()))
                .toList();
    }
}
