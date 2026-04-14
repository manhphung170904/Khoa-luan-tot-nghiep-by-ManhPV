package com.estate.api.staff;

import com.estate.dto.ContractDetailDTO;
import com.estate.dto.ContractFilterDTO;
import com.estate.service.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/staff/contracts")
@RequiredArgsConstructor
public class StaffContractAPI {
    private final ContractService contractService;

    @GetMapping("/search")
    public Page<ContractDetailDTO> getContractsSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "3") int size,
            ContractFilterDTO filter
    ) {
        return contractService.searchByStaff(filter, page - 1, size);
    }
}
