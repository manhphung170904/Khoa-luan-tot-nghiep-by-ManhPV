package com.estate.service.impl;

import com.estate.converter.StaffDetailConverter;
import com.estate.converter.StaffFormConverter;
import com.estate.converter.StaffListConverter;
import com.estate.dto.BuildingSelectDTO;
import com.estate.dto.CustomerSelectDTO;
import com.estate.dto.EmailChangeDTO;
import com.estate.dto.PasswordChangeDTO;
import com.estate.dto.PhoneNumberChangeDTO;
import com.estate.dto.StaffDetailDTO;
import com.estate.dto.StaffFormDTO;
import com.estate.dto.StaffListDTO;
import com.estate.dto.StaffSelectDTO;
import com.estate.dto.UsernameChangeDTO;
import com.estate.exception.BusinessException;
import com.estate.exception.InputValidationException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.BuildingRepository;
import com.estate.repository.ContractRepository;
import com.estate.repository.CustomerRepository;
import com.estate.repository.OAuthIdentityRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.OAuthIdentityEntity;
import com.estate.repository.entity.StaffEntity;
import com.estate.security.jwt.RefreshTokenService;
import com.estate.service.ProfileOtpService;
import com.estate.service.StaffService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
public class StaffServiceImpl implements StaffService {
    @Autowired private StaffRepository staffRepository;
    @Autowired private BuildingRepository buildingRepository;
    @Autowired private ContractRepository contractRepository;
    @Autowired private StaffListConverter staffListConverter;
    @Autowired private StaffFormConverter staffFormConverter;
    @Autowired private StaffDetailConverter staffDetailConverter;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired RefreshTokenService refreshTokenService;
    @Autowired CustomerRepository customerRepository;
    @Autowired OAuthIdentityRepository oauthIdentityRepository;
    @Autowired ProfileOtpService profileOtpService;

    @Override
    public Long countAllStaffs() {
        return staffRepository.countByRole("STAFF");
    }

    @Override
    public List<StaffEntity> getStaffsName() {
        return staffRepository.findByRole("STAFF");
    }

    @Override
    public Page<StaffListDTO> getStaffs(int page, int size, String role) {
        Page<StaffEntity> staffPage = staffRepository.findByRole(PageRequest.of(page, size), role);
        List<StaffListDTO> dtoList = new ArrayList<>();
        for (StaffEntity staff : staffPage) {
            dtoList.add(staffListConverter.toDto(staff));
        }
        return new PageImpl<>(dtoList, staffPage.getPageable(), staffPage.getTotalElements());
    }

    @Override
    public Page<StaffListDTO> search(Map<String, String> filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        String fullName = filter.get("fullName");
        String role = filter.get("role");
        Page<StaffEntity> staffPage = staffRepository.search(fullName, role, pageable);
        List<StaffListDTO> dtoList = new ArrayList<>();
        for (StaffEntity staff : staffPage) {
            dtoList.add(staffListConverter.toDto(staff));
        }
        return new PageImpl<>(dtoList, staffPage.getPageable(), staffPage.getTotalElements());
    }

    @Override
    public void save(StaffFormDTO dto) {
        if (staffRepository.existsByUsername(dto.getUsername()) || customerRepository.existsByUsername(dto.getUsername())) {
            throw new BusinessException("Tên đăng nhập đã tồn tại.");
        }
        if (staffRepository.existsByEmail(dto.getEmail()) || customerRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Email đã tồn tại.");
        }
        if (staffRepository.existsByPhone(dto.getPhone()) || customerRepository.existsByPhone(dto.getPhone())) {
            throw new BusinessException("Số điện thoại đã tồn tại.");
        }

        StaffEntity entity = dto.getId() != null
                ? staffRepository.findById(dto.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."))
                : staffFormConverter.toEntity(dto);
        if (dto.getId() == null) {
            entity.setAuthOrigin("LOCAL");
        }
        entity.setPassword(passwordEncoder.encode(dto.getPassword()));
        staffRepository.save(entity);
    }

    @Override
    public void delete(Long id) {
        if (!staffRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy nhân viên.");
        }
        long buildingCnt = staffRepository.countBuildingsByStaffId(id);
        if (buildingCnt > 0) {
            throw new BusinessException("Không thể xóa nhân viên đang được phân công cho bất động sản.");
        }
        long customerCnt = staffRepository.countCustomersByStaffId(id);
        if (customerCnt > 0) {
            throw new BusinessException("Không thể xóa nhân viên đang được phân công cho khách hàng.");
        }
        staffRepository.deleteById(id);
    }

    @Override
    public StaffDetailDTO viewById(Long id) {
        StaffEntity staffEntity = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        return staffDetailConverter.toDTO(staffEntity);
    }

    @Override
    public Long getBuildingCnt(Long staffId) {
        return staffRepository.countBuildingsByStaffId(staffId);
    }

    @Override
    public Long getCustomertCnt(Long staffId) {
        return staffRepository.countCustomersByStaffId(staffId);
    }

    @Override
    public String getStaffName(Long staffId) {
        return staffRepository.findById(staffId).get().getFullName();
    }

    @Override
    public String getStaffAvatar(Long staffId) {
        return staffRepository.findById(staffId).get().getImage();
    }

    @Override
    public void usernameUpdate(UsernameChangeDTO dto, Long staffId) {
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        if (staffRepository.existsByUsernameAndIdNot(dto.getNewUsername(), staffId)
                || customerRepository.existsByUsername(dto.getNewUsername())) {
            throw new BusinessException("Tên đăng nhập đã được sử dụng.");
        }
        profileOtpService.verifyOtp(resolveOtpEmail(staff), "PROFILE_USERNAME", dto.getOtp());
        staffRepository.usernameUpdate(dto.getNewUsername(), staffId);
    }

    @Override
    public void emailUpdate(EmailChangeDTO dto, Long staffId) {
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        boolean isCorrect = passwordEncoder.matches(dto.getPassword(), staff.getPassword());
        if (!isCorrect) {
            throw new BusinessException("Mật khẩu hiện tại không đúng.");
        }
        if (customerRepository.existsByEmail(dto.getNewEmail())
                || staffRepository.existsByEmailAndIdNot(dto.getNewEmail(), staffId)) {
            throw new BusinessException("Email đã được sử dụng.");
        }
        staffRepository.emailUpdate(dto.getNewEmail(), staffId);
    }

    @Override
    public void phoneNumberUpdate(PhoneNumberChangeDTO dto, Long staffId) {
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        if (customerRepository.existsByPhone(dto.getNewPhoneNumber())
                || staffRepository.existsByPhoneAndIdNot(dto.getNewPhoneNumber(), staffId)) {
            throw new BusinessException("Số điện thoại đã được sử dụng.");
        }
        profileOtpService.verifyOtp(resolveOtpEmail(staff), "PROFILE_PHONE", dto.getOtp());
        staffRepository.phoneNumberUpdate(dto.getNewPhoneNumber(), staffId);
    }

    @Override
    public void passwordUpdate(PasswordChangeDTO dto, Long staffId) {
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        if (dto.getNewPassword() == null || dto.getNewPassword().length() < 8) {
            throw new BusinessException("Mật khẩu phải có ít nhất 8 ký tự.");
        }
        profileOtpService.verifyOtp(resolveOtpEmail(staff), "PROFILE_PASSWORD", dto.getOtp());
        if (!dto.getConfirmPassword().equals(dto.getNewPassword())) {
            throw new BusinessException("Mật khẩu xác nhận không khớp.");
        }
        String encodedPassword = passwordEncoder.encode(dto.getNewPassword());
        staffRepository.passwordUpdate(encodedPassword, staffId);
        refreshTokenService.revokeAllForUser("STAFF", staffId);
    }

    private String resolveOtpEmail(StaffEntity staff) {
        OAuthIdentityEntity googleIdentity = oauthIdentityRepository
                .findByProviderAndUserTypeAndUserId("google", "STAFF", staff.getId())
                .orElse(null);
        if (googleIdentity != null && googleIdentity.getEmail() != null && !googleIdentity.getEmail().isBlank()) {
            return googleIdentity.getEmail();
        }
        return staff.getEmail();
    }

    @Override
    public StaffEntity findById(Long staffId) {
        return staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
    }

    @Override
    public List<BuildingSelectDTO> getAllBuildingsForSelect() {
        return buildingRepository.findAllForSelect();
    }

    @Override
    public List<CustomerSelectDTO> getAllCustomersForSelect() {
        return customerRepository.findAllForSelect();
    }

    @Override
    public List<Long> getAssignedBuildingIds(Long staffId) {
        return staffRepository.findAssignedBuildingIds(staffId);
    }

    @Override
    public List<Long> getAssignedCustomerIds(Long staffId) {
        return staffRepository.findAssignedCustomerIds(staffId);
    }

    @Override
    @Transactional
    public void updateBuildingAssignments(Long staffId, List<Long> newBuildingIds) {
        List<Long> requestedBuildingIds = newBuildingIds == null ? new ArrayList<>() : newBuildingIds;
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        List<Long> currentIds = staffRepository.findAssignedBuildingIds(staffId);
        List<Long> removedIds = currentIds.stream().filter(id -> !requestedBuildingIds.contains(id)).toList();
        List<Long> addedIds = requestedBuildingIds.stream().filter(id -> !currentIds.contains(id)).toList();

        for (Long buildingId : removedIds) {
            if (contractRepository.existsActiveByStaffAndBuilding(staffId, buildingId)) {
                BuildingEntity building = buildingRepository.findById(buildingId).orElse(null);
                String name = building != null ? building.getName() : "ID " + buildingId;
                throw new InputValidationException(
                        "Cannot remove building assignment for \"" + name + "\" while active contracts still exist"
                );
            }
        }

        for (Long removedId : removedIds) {
            buildingRepository.findById(removedId).ifPresent(building -> {
                building.getStaffs_buildings().remove(staff);
                buildingRepository.save(building);
            });
        }

        for (Long buildingId : addedIds) {
            buildingRepository.findById(buildingId).ifPresent(building -> {
                if (!building.getStaffs_buildings().contains(staff)) {
                    building.getStaffs_buildings().add(staff);
                    buildingRepository.save(building);
                }
            });
        }
    }

    @Override
    @Transactional
    public void updateCustomerAssignments(Long staffId, List<Long> newCustomerIds) {
        List<Long> requestedCustomerIds = newCustomerIds == null ? new ArrayList<>() : newCustomerIds;
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        List<Long> currentIds = staffRepository.findAssignedCustomerIds(staffId);
        List<Long> removedIds = currentIds.stream().filter(id -> !requestedCustomerIds.contains(id)).toList();
        List<Long> addedIds = requestedCustomerIds.stream().filter(id -> !currentIds.contains(id)).toList();

        for (Long removedId : removedIds) {
            if (contractRepository.existsActiveByStaffAndCustomer(staffId, removedId)) {
                CustomerEntity customer = customerRepository.findById(removedId).orElse(null);
                String name = customer != null ? customer.getFullName() : "ID " + removedId;
                throw new InputValidationException(
                        "Cannot remove customer assignment for \"" + name + "\" while active contracts still exist"
                );
            }
        }

        for (Long customerId : removedIds) {
            customerRepository.findById(customerId).ifPresent(customer -> {
                customer.getStaffs_customers().remove(staff);
                customerRepository.save(customer);
            });
        }

        for (Long customerId : addedIds) {
            customerRepository.findById(customerId).ifPresent(customer -> {
                if (!customer.getStaffs_customers().contains(staff)) {
                    customer.getStaffs_customers().add(staff);
                    customerRepository.save(customer);
                }
            });
        }
    }

    @Override
    public List<StaffSelectDTO> getStaffsByAssignment(Long buildingId, Long customerId) {
        if (buildingId == null || customerId == null) {
            return new ArrayList<>();
        }
        return staffRepository.findByBuildingIdAndCustomerId(buildingId, customerId).stream()
                .map(staff -> new StaffSelectDTO(staff.getId(), staff.getFullName()))
                .toList();
    }

    @Override
    @Transactional
    public void quickAssign(Long staffId, Long buildingId, Long customerId) {
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên."));
        BuildingEntity building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bất động sản."));
        if (!building.getStaffs_buildings().contains(staff)) {
            building.getStaffs_buildings().add(staff);
            buildingRepository.save(building);
        }
        CustomerEntity customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng."));
        if (!customer.getStaffs_customers().contains(staff)) {
            customer.getStaffs_customers().add(staff);
            customerRepository.save(customer);
        }
    }
}


