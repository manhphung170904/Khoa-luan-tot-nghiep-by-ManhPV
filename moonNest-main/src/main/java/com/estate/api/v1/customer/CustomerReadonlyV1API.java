package com.estate.api.v1.customer;

import com.estate.dto.ApiOptionDTO;
import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.ContractDetailDTO;
import com.estate.dto.CustomerContractMetadataDTO;
import com.estate.dto.CustomerContractSummaryDTO;
import com.estate.dto.InvoiceDetailDTO;
import com.estate.dto.PageResponse;
import com.estate.dto.PublicBuildingFilterMetadataDTO;
import com.estate.enums.Direction;
import com.estate.enums.Level;
import com.estate.security.CustomUserDetails;
import com.estate.service.BuildingService;
import com.estate.service.ContractService;
import com.estate.service.DistrictService;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/customer")
@RequiredArgsConstructor
public class CustomerReadonlyV1API {
    private final BuildingService buildingService;
    private final ContractService contractService;
    private final InvoiceService invoiceService;
    private final DistrictService districtService;

    @GetMapping("/buildings")
    public List<BuildingDetailDTO> getBuildings(BuildingFilterDTO filter) {
        return buildingService.searchByCustomer(filter);
    }

    @GetMapping("/contracts")
    public List<ContractDetailDTO> getContracts(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String status
    ) {
        return contractService.getContractsByFilter(user.getUserId(), buildingId, status);
    }

    @GetMapping("/contracts/metadata")
    public CustomerContractMetadataDTO getContractMetadata(@AuthenticationPrincipal CustomUserDetails user) {
        return CustomerContractMetadataDTO.of(
                toOptions(buildingService.getBuildingsName()),
                CustomerContractSummaryDTO.of(
                        contractService.getContractCountByCustomer(user.getUserId()),
                        contractService.getActiveContractsCount(user.getUserId()),
                        contractService.getExpiredContractsCount(user.getUserId())
                )
        );
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

    @GetMapping("/transactions")
    public PageResponse<InvoiceDetailDTO> getTransactions(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year
    ) {
        return PageResponse.from(invoiceService.getInvoices(page - 1, size, month, year, user.getUserId()));
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
