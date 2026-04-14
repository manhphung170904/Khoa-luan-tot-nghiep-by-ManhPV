package com.estate.api.publicpage;

import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.service.BuildingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/moonnest")
@RequiredArgsConstructor
public class PublicPageAPI {
    private final BuildingService buildingService;

    @GetMapping("/building/search")
    public List<BuildingDetailDTO> getBuildingsSearch(BuildingFilterDTO filter) {
        return buildingService.searchByCustomer(filter);
    }
}
