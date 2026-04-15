package com.estate.api.v1.staff;

import com.estate.dto.ApiOptionDTO;
import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.ContractDetailDTO;
import com.estate.dto.ContractFilterDTO;
import com.estate.dto.CustomerDetailDTO;
import com.estate.dto.PageResponse;
import com.estate.dto.SaleContractDetailDTO;
import com.estate.dto.SaleContractFilterDTO;
import com.estate.dto.PublicBuildingFilterMetadataDTO;
import com.estate.dto.StaffContractMetadataDTO;
import com.estate.enums.Direction;
import com.estate.enums.Level;
import com.estate.security.CustomUserDetails;
import com.estate.service.BuildingService;
import com.estate.service.ContractService;
import com.estate.service.CustomerService;
import com.estate.service.DistrictService;
import com.estate.service.SaleContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
public class StaffReadonlyV1API {
    private final BuildingService buildingService;
    private final ContractService contractService;
    private final CustomerService customerService;
    private final SaleContractService saleContractService;
    private final DistrictService districtService;

    @GetMapping("/buildings")
    public PageResponse<BuildingDetailDTO> getBuildings(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "3") int size,
            BuildingFilterDTO filter,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        filter.setStaffId(user.getUserId());
        return PageResponse.from(buildingService.searchByStaff(filter, page - 1, size));
    }

    @GetMapping("/contracts")
    public PageResponse<ContractDetailDTO> getContracts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "3") int size,
            ContractFilterDTO filter,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        filter.setStaffId(user.getUserId());
        return PageResponse.from(contractService.searchByStaff(filter, page - 1, size));
    }

    @GetMapping("/customers")
    public PageResponse<CustomerDetailDTO> getCustomers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "3") int size,
            @RequestParam Map<String, String> requestParams,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        Map<String, String> scopedParams = new LinkedHashMap<>(requestParams);
        scopedParams.put("staffId", String.valueOf(user.getUserId()));
        return PageResponse.from(customerService.searchByStaff(scopedParams, page - 1, size));
    }

    @GetMapping("/sale-contracts")
    public PageResponse<SaleContractDetailDTO> getSaleContracts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            SaleContractFilterDTO filter,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        filter.setStaffId(user.getUserId());
        return PageResponse.from(saleContractService.searchDetails(filter, page - 1, size));
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

    @GetMapping("/contracts/metadata")
    public StaffContractMetadataDTO getContractMetadata(@AuthenticationPrincipal CustomUserDetails user) {
        return StaffContractMetadataDTO.of(
                toOptions(customerService.getCustomersNameByStaff(user.getUserId())),
                toOptions(buildingService.getBuildingsNameByStaff(user.getUserId()))
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
