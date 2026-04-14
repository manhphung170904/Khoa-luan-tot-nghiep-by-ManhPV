package com.estate.api.customer;

import com.estate.dto.ContractDetailDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/customer/contract")
@RequiredArgsConstructor
public class CustomerContractAPI {
    private final ContractService contractService;

    @GetMapping("/search")
    public List<ContractDetailDTO> getContractsSearch(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam (required = false) Long buildingId,
            @RequestParam (required = false) String status
    ) {
        Long customerId = user.getUserId();

        return contractService.getContractsByFilter(customerId, buildingId, status);
    }
}
