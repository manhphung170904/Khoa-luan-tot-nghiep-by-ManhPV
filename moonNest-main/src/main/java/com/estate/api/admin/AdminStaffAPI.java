package com.estate.api.admin;

import com.estate.dto.BuildingSelectDTO;
import com.estate.dto.CustomerSelectDTO;
import com.estate.dto.StaffFormDTO;
import com.estate.dto.StaffListDTO;
import com.estate.exception.InputValidationException;
import com.estate.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/staff")
@RequiredArgsConstructor
public class AdminStaffAPI {
    private final StaffService staffService;

    @GetMapping("/list/page")
    public Page<StaffListDTO> getCustomersPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String role
    ) {
        return staffService.getStaffs(page - 1, size, role);
    }

    @GetMapping("/search/page")
    public Page<StaffListDTO> getStaffsSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam Map<String, String> filter
    ) {
        return staffService.search(filter, page - 1, size);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addStaff(
            @Valid @RequestBody StaffFormDTO dto,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            String message;

            if (!result.getFieldErrors().isEmpty()) {
                message = result.getFieldErrors().getFirst().getDefaultMessage();
            } else {
                message = result.getAllErrors().getFirst().getDefaultMessage();
            }

            throw new InputValidationException(message);
        }

        staffService.save(dto);
        return ResponseEntity.ok("Thêm nhân viên thành công");
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable Long id) {
        staffService.delete(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerSelectDTO>> getAllCustomers() {
        return ResponseEntity.ok(staffService.getAllCustomersForSelect());
    }

    @GetMapping("/{id}/assignments/customers")
    public ResponseEntity<List<Long>> getAssignedCustomers(@PathVariable Long id) {
        return ResponseEntity.ok(staffService.getAssignedCustomerIds(id));
    }

    @PutMapping("/{id}/assignments/customers")
    public ResponseEntity<?> updateCustomerAssignments(
            @PathVariable Long id,
            @RequestBody List<Long> customerIds
    ) {
        staffService.updateCustomerAssignments(id, customerIds);
        return ResponseEntity.ok("Cập nhật phân công khách hàng thành công");
    }

    @GetMapping("/buildings")
    public ResponseEntity<List<BuildingSelectDTO>> getAllBuildings() {
        return ResponseEntity.ok(staffService.getAllBuildingsForSelect());
    }

    @GetMapping("/{id}/assignments/buildings")
    public ResponseEntity<List<Long>> getAssignedBuildings(@PathVariable Long id) {
        return ResponseEntity.ok(staffService.getAssignedBuildingIds(id));
    }

    @PutMapping("/{id}/assignments/buildings")
    public ResponseEntity<?> updateBuildingAssignments(
            @PathVariable Long id,
            @RequestBody List<Long> buildingIds
    ) {
        staffService.updateBuildingAssignments(id, buildingIds);
        return ResponseEntity.ok("Cập nhật phân công tòa nhà thành công");
    }
}
