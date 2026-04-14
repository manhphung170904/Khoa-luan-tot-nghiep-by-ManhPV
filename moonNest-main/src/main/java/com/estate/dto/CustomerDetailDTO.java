package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomerDetailDTO {
    private Long id;
    private String username;
    private String password;
    private String fullName;
    private String phone;
    private String email;
    private String taxCode;
    private Map<String, Long> staffs = new HashMap<>();
    private List<CustomerContractDTO> customerContracts = new ArrayList<>();
}
