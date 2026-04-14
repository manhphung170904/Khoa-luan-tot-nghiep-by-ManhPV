package com.estate.api.staff;

import com.estate.dto.SaleContractDetailDTO;
import com.estate.dto.SaleContractFilterDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.SaleContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/staff/sale-contracts")
@RequiredArgsConstructor
public class StaffSaleContractAPI {
    private final SaleContractService saleContractService;

    @GetMapping("/search")
    public Page<SaleContractDetailDTO> getSaleContractsPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            SaleContractFilterDTO filter,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        // Luôn ép filter theo staffId của nhân viên đang đăng nhập
        filter.setStaffId(user.getUserId());
        return saleContractService.searchDetails(filter, page - 1, size);
    }
}
