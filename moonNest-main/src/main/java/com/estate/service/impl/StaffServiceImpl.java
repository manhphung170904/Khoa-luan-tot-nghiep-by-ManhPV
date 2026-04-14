package com.estate.service.impl;

import com.estate.converter.StaffDetailConverter;
import com.estate.converter.StaffFormConverter;
import com.estate.converter.StaffListConverter;
import com.estate.dto.*;
import com.estate.exception.BusinessException;
import com.estate.exception.InputValidationException;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class StaffServiceImpl implements StaffService {
    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private StaffListConverter staffListConverter;

    @Autowired
    private StaffFormConverter staffFormConverter;

    @Autowired
    private StaffDetailConverter staffDetailConverter;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    RefreshTokenService refreshTokenService;

    @Autowired
    CustomerRepository customerRepository;

    @Autowired
    OAuthIdentityRepository oauthIdentityRepository;

    @Autowired
    ProfileOtpService profileOtpService;

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

        // Tạo list chứa DTO
        List<StaffListDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng StaffEntity
        for (StaffEntity s : staffPage) {
            // Convert entity sang DTO
            StaffListDTO dto = staffListConverter.toDto(s);
            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<StaffListDTO> result = new PageImpl<>(
                dtoList,
                staffPage.getPageable(),
                staffPage.getTotalElements()
        );

        return result;
    }

    @Override
    public Page<StaffListDTO> search(Map<String, String> filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        String fullName = filter.get("fullName");
        String role = filter.get("role");

        Page<StaffEntity> staffPage = staffRepository.search(fullName, role, pageable);

        // Tạo list chứa DTO
        List<StaffListDTO> dtoList = new ArrayList<>();

        // Duyệt qua từng StaffEntity
        for (StaffEntity s : staffPage) {
            // Convert entity sang DTO
            StaffListDTO dto = staffListConverter.toDto(s);
            dtoList.add(dto);
        }

        // Tạo PageImpl giữ nguyên thông tin phân trang gốc
        Page<StaffListDTO> result = new PageImpl<>(
                dtoList,
                staffPage.getPageable(),
                staffPage.getTotalElements()
        );

        return result;
    }

    @Override
    public void save(StaffFormDTO dto) {
        StaffEntity entity;

        if (staffRepository.existsByUsername(dto.getUsername()) || customerRepository.existsByUsername(dto.getUsername())) {
            throw new BusinessException("Tên đăng nhập đã tồn tại");
        }

        if (staffRepository.existsByEmail(dto.getEmail()) || customerRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Email đã tồn tại");
        }

        if (staffRepository.existsByPhone(dto.getPhone()) || customerRepository.existsByPhone(dto.getPhone())) {
            throw new BusinessException("Số điện thoại đã tồn tại");
        }

        if (dto.getId() != null) {
            // Update
            entity = staffRepository.findById(dto.getId())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên để sửa"));
        } else {
            // Thêm mới
            entity = staffFormConverter.toEntity(dto);
            entity.setAuthOrigin("LOCAL");
        }

        // Mã hóa dữ liệu
        entity.setPassword(passwordEncoder.encode(dto.getPassword()));

        // Lưu nhân viên
        StaffEntity saved = staffRepository.save(entity);
    }

    @Override
    public void delete(Long id) {
        if (!staffRepository.existsById(id)) {
            throw new BusinessException("Không tìm thấy nhân viên để xóa");
        }
        long buildingCnt = staffRepository.countBuildingsByStaffId(id);
        if (buildingCnt > 0) {
            throw new BusinessException("Không thể xóa! Nhân viên này đang chịu trách nhiệm quản lý tòa nhà.");
        }
        long customerCnt = staffRepository.countCustomersByStaffId(id);
        if (customerCnt > 0) {
            throw new BusinessException("Không thể xóa! Nhân viên này đang chịu trách nhiệm chăm sóc khách hàng.");
        }
        staffRepository.deleteById(id);
    }

    @Override
    public StaffDetailDTO viewById(Long id) {
        StaffEntity staffEntity = staffRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));
        StaffDetailDTO staffDetailDTO = staffDetailConverter.toDTO(staffEntity);
        return staffDetailDTO;
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));

        if (staffRepository.existsByUsernameAndIdNot(dto.getNewUsername(), staffId)
        || customerRepository.existsByUsername(dto.getNewUsername())) {
            throw new BusinessException("Tên đăng nhập đã được sử dụng!");
        }

        profileOtpService.verifyOtp(resolveOtpEmail(staff), "PROFILE_USERNAME", dto.getOtp());

        staffRepository.usernameUpdate(dto.getNewUsername(), staffId);
    }

    @Override
    public void emailUpdate(EmailChangeDTO dto, Long staffId) {
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));

        boolean isCorrect = passwordEncoder.matches(
                dto.getPassword(),
                staff.getPassword()
        );

        if (!isCorrect) {
            throw new BusinessException("Mật khẩu sai");
        }

        if (customerRepository.existsByEmail(dto.getNewEmail()) ||
                staffRepository.existsByEmailAndIdNot(dto.getNewEmail(), staffId)
        ) {
            throw new BusinessException("Email này đã được sử dụng");
        }

        staffRepository.emailUpdate(dto.getNewEmail(), staffId);
    }

    @Override
    public void phoneNumberUpdate(PhoneNumberChangeDTO dto, Long staffId) {
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));

        if (customerRepository.existsByPhone(dto.getNewPhoneNumber()) ||
                staffRepository.existsByPhoneAndIdNot(dto.getNewPhoneNumber(), staffId)
        ) {
            throw new BusinessException("Số điện thoại này đã được sử dụng");
        }

        profileOtpService.verifyOtp(resolveOtpEmail(staff), "PROFILE_PHONE", dto.getOtp());
        staffRepository.phoneNumberUpdate(dto.getNewPhoneNumber(), staffId);
    }

    @Override
    public void passwordUpdate(PasswordChangeDTO dto, Long staffId) {
        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));

        if (dto.getNewPassword() == null || dto.getNewPassword().length() < 8) {
            throw new BusinessException("Mật khẩu phải có ít nhất 8 ký tự");
        }

        profileOtpService.verifyOtp(resolveOtpEmail(staff), "PROFILE_PASSWORD", dto.getOtp());

        if (!dto.getConfirmPassword().equals(dto.getNewPassword())) {
            throw new BusinessException("Mật khẩu xác nhận sai");
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy nhân viên"));
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
        if (newBuildingIds == null) newBuildingIds = new ArrayList<>();

        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new InputValidationException("Không tìm thấy nhân viên"));

        // IDs hiện tại đang assigned
        List<Long> currentIds = staffRepository.findAssignedBuildingIds(staffId);

        // Tìm IDs bị bỏ (có trong current, không có trong new)
        List<Long> finalNewBuildingIds1 = newBuildingIds;
        List<Long> removedIds = currentIds.stream()
                .filter(id -> !finalNewBuildingIds1.contains(id))
                .toList();

        // Tìm IDs được thêm mới (có trong new, không có trong current)
        final List<Long> finalNewBuildingIds = newBuildingIds;
        List<Long> addedIds = finalNewBuildingIds.stream()
                .filter(id -> !currentIds.contains(id))
                .toList();

        // Validate: building bị bỏ không được có active contract với staff này
        for (Long buildingId : removedIds) {
            if (contractRepository.existsActiveByStaffAndBuilding(staffId, buildingId)) {
                BuildingEntity b = buildingRepository.findById(buildingId).orElse(null);
                String name = (b != null) ? b.getName() : "ID " + buildingId;
                throw new InputValidationException(
                        "Không thể bỏ phân công tòa nhà \"" + name +
                                "\" vì có hợp đồng đang khả dụng."
                );
            }
        }

        // Xử lý từ OWNING SIDE (BuildingEntity) để JPA thực sự persist vào DB

        // Xóa staff ra khỏi các building bị bỏ
        for (Long removedId : removedIds) {
            buildingRepository.findById(removedId).ifPresent(building -> {
                building.getStaffs_buildings().remove(staff);
                buildingRepository.save(building);
            });
        }

        // Thêm staff vào các building mới
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
        if (newCustomerIds == null) newCustomerIds = new ArrayList<>();

        StaffEntity staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new InputValidationException("Không tìm thấy nhân viên"));

        // IDs hiện tại đang assigned
        List<Long> currentIds = staffRepository.findAssignedCustomerIds(staffId);

        // Tìm IDs bị bỏ
        List<Long> finalNewCustomerIds1 = newCustomerIds;
        List<Long> removedIds = currentIds.stream()
                .filter(id -> !finalNewCustomerIds1.contains(id))
                .toList();

        // Tìm IDs được thêm mới
        final List<Long> finalNewCustomerIds = newCustomerIds;
        List<Long> addedIds = finalNewCustomerIds.stream()
                .filter(id -> !currentIds.contains(id))
                .toList();

        // Validate: customer bị bỏ không được có active contract với staff này
        for (Long removedId : removedIds) {
            if (contractRepository.existsActiveByStaffAndCustomer(staffId, removedId)) {
                CustomerEntity c = customerRepository.findById(removedId).orElse(null);
                String name = (c != null) ? c.getFullName() : "ID " + removedId;
                throw new InputValidationException(
                        "Không thể bỏ phân công khách hàng \"" + name +
                                "\" vì có hợp đồng đang khả dụng."
                );
            }
        }

        // Xử lý từ OWNING SIDE (CustomerEntity) để JPA thực sự persist vào DB

        // Xóa staff ra khỏi các customer bị bỏ
        for (Long customerId : removedIds) {
            customerRepository.findById(customerId).ifPresent(customer -> {
                customer.getStaffs_customers().remove(staff);
                customerRepository.save(customer);
            });
        }

        // Thêm staff vào các customer mới
        for (Long customerId : addedIds) {
            customerRepository.findById(customerId).ifPresent(customer -> {
                if (!customer.getStaffs_customers().contains(staff)) {
                    customer.getStaffs_customers().add(staff);
                    customerRepository.save(customer);
                }
            });
        }
    }
}
