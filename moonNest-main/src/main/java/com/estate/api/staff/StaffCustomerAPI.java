package com.estate.api.staff;

import com.estate.dto.CustomerDetailDTO;
import com.estate.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/staff/customers")
@RequiredArgsConstructor
public class StaffCustomerAPI {
    private final CustomerService customerService;

    @GetMapping("/search")
    public Page<CustomerDetailDTO> getContractsSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "3") int size,
            @RequestParam Map<String, String> requestParams
    ) {
        return customerService.searchByStaff(requestParams, page - 1, size);
    }
}
