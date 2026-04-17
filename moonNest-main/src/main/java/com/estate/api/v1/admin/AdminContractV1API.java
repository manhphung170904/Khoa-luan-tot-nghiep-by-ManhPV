package com.estate.api.v1.admin;

import com.estate.dto.AdminContractMetadataDTO;
import com.estate.dto.ApiMessageResponse;
import com.estate.dto.ApiOptionDTO;
import com.estate.dto.ContractFilterDTO;
import com.estate.dto.ContractFormDTO;
import com.estate.dto.ContractListDTO;
import com.estate.dto.PageResponse;
import com.estate.exception.InputValidationException;
import com.estate.service.BuildingService;
import com.estate.service.ContractService;
import com.estate.service.CustomerService;
import com.estate.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/contracts")
@RequiredArgsConstructor
public class AdminContractV1API {
    private final ContractService contractService;
    private final CustomerService customerService;
    private final BuildingService buildingService;
    private final StaffService staffService;

    @GetMapping
    public PageResponse<ContractListDTO> getContracts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @ModelAttribute ContractFilterDTO filter
    ) {
        return PageResponse.from(contractService.search(filter, page - 1, size));
    }

    @GetMapping("/metadata")
    public AdminContractMetadataDTO getMetadata() {
        return AdminContractMetadataDTO.of(
                toOptions(customerService.getCustomersName()),
                toOptions(buildingService.getBuildingsName()),
                staffService.getStaffsName().stream()
                        .map(staff -> ApiOptionDTO.of(String.valueOf(staff.getId()), staff.getFullName()))
                        .toList()
        );
    }

    @PostMapping
    public ResponseEntity<ApiMessageResponse<Void>> addContract(
            @Valid @RequestBody ContractFormDTO dto,
            BindingResult result
    ) {
        validate(result);
        contractService.save(dto);
        return ResponseEntity.ok(ApiMessageResponse.of("T?o h?p ??ng th?nh c?ng."));
    }

    @PutMapping("/{id}")
    public ApiMessageResponse<Void> editContract(
            @PathVariable Long id,
            @Valid @RequestBody ContractFormDTO dto,
            BindingResult result
    ) {
        validate(result);
        dto.setId(id);
        contractService.save(dto);
        return ApiMessageResponse.of("C?p nh?t h?p ??ng th?nh c?ng.");
    }

    @DeleteMapping("/{id}")
    public ApiMessageResponse<Void> deleteContract(@PathVariable Long id) {
        contractService.delete(id);
        return ApiMessageResponse.of("X?a h?p ??ng th?nh c?ng.");
    }

    @PutMapping("/status")
    public ApiMessageResponse<Void> updateStatuses() {
        contractService.statusUpdate();
        return ApiMessageResponse.of("C?p nh?t tr?ng th?i h?p ??ng th?nh c?ng.");
    }

    private void validate(BindingResult result) {
        if (result.hasErrors()) {
            if (!result.getFieldErrors().isEmpty()) {
                throw new InputValidationException(result.getFieldErrors().getFirst().getDefaultMessage());
            }
            throw new InputValidationException(result.getAllErrors().getFirst().getDefaultMessage());
        }
    }

    private java.util.List<ApiOptionDTO> toOptions(java.util.Map<String, Long> source) {
        return source.entrySet().stream()
                .map(entry -> ApiOptionDTO.of(String.valueOf(entry.getValue()), entry.getKey()))
                .toList();
    }
}
