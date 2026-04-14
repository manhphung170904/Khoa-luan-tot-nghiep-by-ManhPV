package com.estate.service;

import com.estate.dto.*;
import com.estate.repository.entity.CustomerEntity;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

public interface CustomerService {
    long countAll();
    List<PotentialCustomersDTO>getTopCustomers();
    Page<CustomerListDTO> getCustomers(int page, int size);
    Page<CustomerListDTO> search(String fullName, int page, int size);
    Page<CustomerDetailDTO> searchByStaff(Map<String, String> requestParam, int page, int size);
    void save(CustomerFormDTO dto);
    void delete(Long id);
    CustomerDetailDTO viewById(Long id);
    Map<String, Long> getCustomersName();
    Map<String, Long> getCustomersNameByStaff(Long staffId);
    List<ContractDetailDTO> getCustomerContracts(Long customerId);
    CustomerEntity findById(Long customerId);
    void usernameUpdate(UsernameChangeDTO dto, Long customerId);
    void emailUpdate(EmailChangeDTO dto, Long customerId);
    void phoneNumberUpdate(PhoneNumberChangeDTO dto, Long customerId);
    void passwordUpdate(PasswordChangeDTO dto, Long customerId);
}
