package com.estate.api.v1.admin;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.BuildingSelectDTO;
import com.estate.dto.CustomerSelectDTO;
import com.estate.dto.PageResponse;
import com.estate.dto.StaffFormDTO;
import com.estate.dto.StaffListDTO;
import com.estate.exception.InputValidationException;
import com.estate.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/staff")
@RequiredArgsConstructor
public class AdminStaffV1API {
    private final StaffService staffService;

    @GetMapping
    public PageResponse<StaffListDTO> getStaffs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String role,
            @RequestParam Map<String, String> filter
    ) {
        if (hasSearchCriteria(filter)) {
            return PageResponse.from(staffService.search(filter, page - 1, size));
        }
        return PageResponse.from(staffService.getStaffs(page - 1, size, role));
    }

    @PostMapping
    public ResponseEntity<ApiMessageResponse<Void>> addStaff(
            @Valid @RequestBody StaffFormDTO dto,
            BindingResult result
    ) {
        validate(result);
        staffService.save(dto);
        return ResponseEntity.ok(ApiMessageResponse.of("Thêm nhân viên thành công."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStaff(@PathVariable Long id) {
        staffService.delete(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/customers")
    public List<CustomerSelectDTO> getAllCustomers() {
        return staffService.getAllCustomersForSelect();
    }

    @GetMapping("/{id}/assignments/customers")
    public List<Long> getAssignedCustomers(@PathVariable Long id) {
        return staffService.getAssignedCustomerIds(id);
    }

    @PutMapping("/{id}/assignments/customers")
    public ApiMessageResponse<Void> updateCustomerAssignments(@PathVariable Long id, @RequestBody List<Long> customerIds) {
        staffService.updateCustomerAssignments(id, customerIds);
        return ApiMessageResponse.of("Cập nhật phân công khách hàng thành công.");
    }

    @GetMapping("/buildings")
    public List<BuildingSelectDTO> getAllBuildings() {
        return staffService.getAllBuildingsForSelect();
    }

    @GetMapping("/{id}/assignments/buildings")
    public List<Long> getAssignedBuildings(@PathVariable Long id) {
        return staffService.getAssignedBuildingIds(id);
    }

    @PutMapping("/{id}/assignments/buildings")
    public ApiMessageResponse<Void> updateBuildingAssignments(@PathVariable Long id, @RequestBody List<Long> buildingIds) {
        staffService.updateBuildingAssignments(id, buildingIds);
        return ApiMessageResponse.of("Cập nhật phân công tòa nhà thành công.");
    }

    @PostMapping("/{id}/quick-assign")
    public ApiMessageResponse<Void> quickAssign(
            @PathVariable Long id,
            @RequestParam Long buildingId,
            @RequestParam Long customerId
    ) {
        staffService.quickAssign(id, buildingId, customerId);
        return ApiMessageResponse.of("Phân công nhanh thành công.");
    }

    private void validate(BindingResult result) {
        if (result.hasErrors()) {
            if (!result.getFieldErrors().isEmpty()) {
                throw new InputValidationException(result.getFieldErrors().getFirst().getDefaultMessage());
            }
            throw new InputValidationException(result.getAllErrors().getFirst().getDefaultMessage());
        }
    }

    private boolean hasSearchCriteria(Map<String, String> filter) {
        return filter.entrySet().stream()
                .anyMatch(entry -> !"page".equals(entry.getKey())
                        && !"size".equals(entry.getKey())
                        && !"role".equals(entry.getKey())
                        && entry.getValue() != null
                        && !entry.getValue().isBlank());
    }
}
