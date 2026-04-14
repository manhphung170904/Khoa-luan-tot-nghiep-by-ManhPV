package com.estate.service;

import com.estate.dto.*;
import com.estate.repository.entity.StaffEntity;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

public interface StaffService {
    Long countAllStaffs();
    List<StaffEntity> getStaffsName();
    Page<StaffListDTO> getStaffs(int page, int size, String role);
    Page<StaffListDTO> search(Map<String, String> filter, int page, int size);
    void save(StaffFormDTO dto);
    void delete(Long id);
    StaffDetailDTO viewById(Long id);
    Long getBuildingCnt(Long staffId);
    Long getCustomertCnt(Long staffId);
    String getStaffName(Long staffId);
    String getStaffAvatar(Long staffId);
    void usernameUpdate(UsernameChangeDTO dto, Long staffId);
    void emailUpdate(EmailChangeDTO dto, Long staffId);
    void phoneNumberUpdate(PhoneNumberChangeDTO dto, Long staffId);
    void passwordUpdate(PasswordChangeDTO dto, Long staffId);
    StaffEntity findById(Long staffId);
    List<BuildingSelectDTO> getAllBuildingsForSelect();
    List<CustomerSelectDTO> getAllCustomersForSelect();
    List<Long> getAssignedBuildingIds(Long staffId);
    List<Long> getAssignedCustomerIds(Long staffId);
    void updateBuildingAssignments(Long staffId, List<Long> buildingIds);
    void updateCustomerAssignments(Long staffId, List<Long> customerIds);
}
