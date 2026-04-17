package com.estate.service.impl;

import com.estate.converter.ContractDetailConverter;
import com.estate.converter.CustomerDetailConverter;
import com.estate.converter.CustomerFormConverter;
import com.estate.converter.CustomerListConverter;
import com.estate.dto.ContractDetailDTO;
import com.estate.dto.CustomerDetailDTO;
import com.estate.dto.CustomerFormDTO;
import com.estate.dto.CustomerListDTO;
import com.estate.dto.EmailChangeDTO;
import com.estate.dto.PasswordChangeDTO;
import com.estate.dto.PhoneNumberChangeDTO;
import com.estate.dto.PotentialCustomersDTO;
import com.estate.dto.UsernameChangeDTO;
import com.estate.exception.BusinessException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.ContractRepository;
import com.estate.repository.CustomerRepository;
import com.estate.repository.OAuthIdentityRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.ContractEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.OAuthIdentityEntity;
import com.estate.repository.entity.StaffEntity;
import com.estate.security.jwt.RefreshTokenService;
import com.estate.service.CustomerService;
import com.estate.service.ProfileOtpService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CustomerServiceImpl implements CustomerService {
    @Autowired CustomerRepository customerRepository;
    @Autowired CustomerListConverter customerListConverter;
    @Autowired CustomerFormConverter customerFormConverter;
    @Autowired StaffRepository staffRepository;
    @Autowired ContractRepository contractRepository;
    @Autowired CustomerDetailConverter customerDetailConverter;
    @Autowired ContractDetailConverter contractDetailConverter;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired RefreshTokenService refreshTokenService;
    @Autowired OAuthIdentityRepository oauthIdentityRepository;
    @Autowired ProfileOtpService profileOtpService;

    @Override
    public long countAll() {
        return customerRepository.count();
    }

    @Override
    public List<PotentialCustomersDTO> getTopCustomers() {
        List<Object[]> rawData = customerRepository.countContractsByCustomer((Pageable) PageRequest.of(0, 5));
        return rawData.stream().map(r -> new PotentialCustomersDTO((Long) r[0], (String) r[1], (Long) r[2]))
                .collect(Collectors.toList());
    }

    @Override
    public Page<CustomerListDTO> getCustomers(int page, int size) {
        Page<CustomerEntity> customerPage = customerRepository.findAll(PageRequest.of(page, size));
        List<CustomerListDTO> dtoList = new ArrayList<>();
        for (CustomerEntity customer : customerPage) {
            dtoList.add(customerListConverter.toDto(customer));
        }
        return new PageImpl<>(dtoList, customerPage.getPageable(), customerPage.getTotalElements());
    }

    @Override
    public Page<CustomerListDTO> search(String fullName, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CustomerEntity> customerPage = (fullName == null || fullName.isBlank())
                ? customerRepository.findAll(pageable)
                : customerRepository.findByFullNameContainingIgnoreCase(fullName, pageable);
        List<CustomerListDTO> dtoList = new ArrayList<>();
        for (CustomerEntity customer : customerPage) {
            dtoList.add(customerListConverter.toDto(customer));
        }
        return new PageImpl<>(dtoList, customerPage.getPageable(), customerPage.getTotalElements());
    }

    @Override
    public Page<CustomerDetailDTO> searchByStaff(Map<String, String> requestParam, int page, int size) {
        String staffIdValue = requestParam.get("staffId");
        if (staffIdValue == null || staffIdValue.isBlank()) {
            throw new BusinessException("Thiếu thông tin nhân viên phụ trách.");
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<CustomerEntity> customerPage = customerRepository.findByNameAndStaffID(
                requestParam.get("fullName"), Long.valueOf(staffIdValue), pageable);
        List<CustomerDetailDTO> dtoList = new ArrayList<>();
        for (CustomerEntity customer : customerPage) {
            dtoList.add(customerDetailConverter.toDTO(customer));
        }
        return new PageImpl<>(dtoList, customerPage.getPageable(), customerPage.getTotalElements());
    }

    @Override
    public void save(CustomerFormDTO dto) {
        if (customerRepository.existsByUsername(dto.getUsername()) || staffRepository.existsByUsername(dto.getUsername())) {
            throw new BusinessException("Tên đăng nhập đã tồn tại.");
        }
        if (customerRepository.existsByEmail(dto.getEmail()) || staffRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Email đã tồn tại.");
        }
        if (customerRepository.existsByPhone(dto.getPhone()) || staffRepository.existsByPhone(dto.getPhone())) {
            throw new BusinessException("Số điện thoại đã tồn tại.");
        }

        CustomerEntity entity = dto.getId() != null
                ? customerRepository.findById(dto.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng."))
                : customerFormConverter.toEntity(dto);
        if (dto.getId() == null) {
            entity.setRole("CUSTOMER");
            entity.setAuthOrigin("LOCAL");
        }

        entity.setPassword(passwordEncoder.encode(dto.getPassword()));
        List<StaffEntity> staffs = staffRepository.findAllById(dto.getStaffIds());
        entity.setStaffs_customers(staffs);
        customerRepository.save(entity);
    }

    @Override
    public void delete(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy khách hàng.");
        }
        long count = contractRepository.countByCustomerId(id);
        if (count > 0) {
            throw new BusinessException("Không thể xóa khách hàng đang có hợp đồng liên quan.");
        }
        customerRepository.deleteById(id);
    }

    @Override
    public CustomerDetailDTO viewById(Long id) {
        CustomerEntity customerEntity = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng."));
        return customerDetailConverter.toDTO(customerEntity);
    }

    @Override
    public Map<String, Long> getCustomersName() {
        List<CustomerEntity> customerEntities = customerRepository.findAll();
        Map<String, Long> result = new HashMap<>();
        for (CustomerEntity customer : customerEntities) {
            result.put(customer.getFullName(), customer.getId());
        }
        return result;
    }

    @Override
    public Map<String, Long> getCustomersNameByStaff(Long staffId) {
        List<CustomerEntity> customerEntities = customerRepository.findByStaffId(staffId);
        Map<String, Long> result = new HashMap<>();
        for (CustomerEntity customer : customerEntities) {
            result.put(customer.getFullName(), customer.getId());
        }
        return result;
    }

    @Override
    public List<ContractDetailDTO> getCustomerContracts(Long customerId) {
        List<ContractEntity> contractEntities = contractRepository.findByCustomerId(customerId);
        return contractEntities.stream().map(contractDetailConverter::toDto).toList();
    }

    @Override
    public CustomerEntity findById(Long customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng."));
    }

    @Override
    public void usernameUpdate(UsernameChangeDTO dto, Long customerId) {
        CustomerEntity customer = this.findById(customerId);
        if (customerRepository.existsByUsernameAndIdNot(dto.getNewUsername(), customerId)
                || staffRepository.existsByUsername(dto.getNewUsername())) {
            throw new BusinessException("Tên đăng nhập đã được sử dụng.");
        }
        profileOtpService.verifyOtp(resolveOtpEmail(customer), "PROFILE_USERNAME", dto.getOtp());
        if (customer.getPassword() != null && !customer.getPassword().isBlank()) {
            throw new BusinessException("Tài khoản này đã có mật khẩu. Vui lòng dùng chức năng đổi mật khẩu.");
        }
        customerRepository.usernameUpdate(dto.getNewUsername(), customerId);
    }

    @Override
    public void emailUpdate(EmailChangeDTO dto, Long customerId) {
        CustomerEntity customer = this.findById(customerId);
        boolean isCorrect = passwordEncoder.matches(dto.getPassword(), customer.getPassword());
        if (!isCorrect) {
            throw new BusinessException("Mật khẩu hiện tại không đúng.");
        }
        if (customerRepository.existsByEmailAndIdNot(dto.getNewEmail(), customerId)
                || staffRepository.existsByEmail(dto.getNewEmail())) {
            throw new BusinessException("Email đã được sử dụng.");
        }
        customerRepository.emailUpdate(dto.getNewEmail(), customerId);
    }

    @Override
    public void phoneNumberUpdate(PhoneNumberChangeDTO dto, Long customerId) {
        CustomerEntity customer = this.findById(customerId);
        if (customerRepository.existsByPhoneAndIdNot(dto.getNewPhoneNumber(), customerId)
                || staffRepository.existsByPhone(dto.getNewPhoneNumber())) {
            throw new BusinessException("Số điện thoại đã được sử dụng.");
        }
        profileOtpService.verifyOtp(resolveOtpEmail(customer), "PROFILE_PHONE", dto.getOtp());
        customerRepository.phoneNumberUpdate(dto.getNewPhoneNumber(), customerId);
    }

    @Override
    public void passwordUpdate(PasswordChangeDTO dto, Long customerId) {
        CustomerEntity customer = this.findById(customerId);
        if (dto.getNewPassword() == null || dto.getNewPassword().length() < 8) {
            throw new BusinessException("Mật khẩu phải có ít nhất 8 ký tự.");
        }
        profileOtpService.verifyOtp(resolveOtpEmail(customer), "PROFILE_PASSWORD", dto.getOtp());
        if (!dto.getConfirmPassword().equals(dto.getNewPassword())) {
            throw new BusinessException("Mật khẩu xác nhận không khớp.");
        }
        String encodedPassword = passwordEncoder.encode(dto.getNewPassword());
        customerRepository.passwordUpdate(encodedPassword, customerId);
        refreshTokenService.revokeAllForUser("CUSTOMER", customerId);
    }

    private String resolveOtpEmail(CustomerEntity customer) {
        OAuthIdentityEntity googleIdentity = oauthIdentityRepository
                .findByProviderAndUserTypeAndUserId("google", "CUSTOMER", customer.getId())
                .orElse(null);
        if (googleIdentity != null && googleIdentity.getEmail() != null && !googleIdentity.getEmail().isBlank()) {
            return googleIdentity.getEmail();
        }
        return customer.getEmail();
    }
}
