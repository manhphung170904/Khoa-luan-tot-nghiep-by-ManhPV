package com.estate.api.v1.admin;

import com.estate.dto.AdminBuildingFilterMetadataDTO;
import com.estate.dto.ApiMessageResponse;
import com.estate.dto.ApiOptionDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.BuildingFormDTO;
import com.estate.dto.BuildingListDTO;
import com.estate.dto.FileUploadResponseDTO;
import com.estate.dto.PageResponse;
import com.estate.dto.StaffSelectDTO;
import com.estate.enums.Direction;
import com.estate.enums.Level;
import com.estate.enums.PropertyType;
import com.estate.enums.TransactionType;
import com.estate.exception.InputValidationException;
import com.estate.exception.PayloadTooLargeException;
import com.estate.exception.UnsupportedMediaTypeApiException;
import com.estate.service.BuildingService;
import com.estate.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/buildings")
@RequiredArgsConstructor
public class AdminBuildingV1API {
    private final BuildingService buildingService;
    private final StaffService staffService;

    @Value("${building.image.upload-dir:src/main/resources/static/images/building_img}")
    private String uploadDir;

    private static final List<String> ALLOWED_TYPES = List.of("image/jpeg", "image/png", "image/webp");
    private static final List<String> ALLOWED_EXTS = List.of(".jpg", ".jpeg", ".png", ".webp");
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024;

    @GetMapping
    public PageResponse<BuildingListDTO> getBuildings(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @ModelAttribute BuildingFilterDTO filter
    ) {
        return PageResponse.from(buildingService.search(filter, page - 1, size));
    }

    @GetMapping("/metadata")
    public AdminBuildingFilterMetadataDTO getMetadata() {
        return AdminBuildingFilterMetadataDTO.of(
                toOptions(PropertyType.values()),
                toOptions(TransactionType.values()),
                toOptions(Direction.values()),
                toOptions(Level.values()),
                staffService.getStaffsName().stream()
                        .map(staff -> ApiOptionDTO.of(String.valueOf(staff.getId()), staff.getFullName()))
                        .toList()
        );
    }

    @PostMapping
    public ResponseEntity<ApiMessageResponse<Void>> addBuilding(
            @Valid @RequestBody BuildingFormDTO dto,
            BindingResult result
    ) {
        validate(result);
        buildingService.save(dto);
        return ResponseEntity.ok(ApiMessageResponse.of("Thêm bất động sản thành công."));
    }

    @PutMapping("/{id}")
    public ApiMessageResponse<Void> editBuilding(
            @PathVariable Long id,
            @Valid @RequestBody BuildingFormDTO dto,
            BindingResult result
    ) {
        validate(result);
        dto.setId(id);
        buildingService.save(dto);
        return ApiMessageResponse.of("Cập nhật bất động sản thành công.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBuilding(@PathVariable Long id) {
        buildingService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new InputValidationException("Please select an image file");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new PayloadTooLargeException("Image size must not exceed 5 MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new UnsupportedMediaTypeApiException("Only JPG, PNG and WEBP files are supported");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        boolean validExt = ALLOWED_EXTS.stream().anyMatch(originalName::endsWith);
        if (!validExt) {
            throw new UnsupportedMediaTypeApiException("Only .jpg, .jpeg, .png and .webp extensions are supported");
        }

        String ext = originalName.substring(originalName.lastIndexOf('.'));
        String newFilename = UUID.randomUUID().toString().replace("-", "") + ext;

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
            Files.createDirectories(uploadPath);
            Path targetPath = uploadPath.resolve(newFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok(
                    ApiMessageResponse.of("Tải tệp lên thành công", FileUploadResponseDTO.of(newFilename))
            );
        } catch (IOException e) {
            throw new IllegalStateException("Unable to store uploaded file", e);
        }
    }

    private void validate(BindingResult result) {
        if (result.hasErrors()) {
            if (!result.getFieldErrors().isEmpty()) {
                throw new InputValidationException(result.getFieldErrors().getFirst().getDefaultMessage());
            }
            throw new InputValidationException(result.getAllErrors().getFirst().getDefaultMessage());
        }
    }

    @GetMapping("/{id}/staffs")
    public List<StaffSelectDTO> getStaffs(
            @PathVariable Long id,
            @RequestParam(required = false) Long customerId
    ) {
        return staffService.getStaffsByAssignment(id, customerId);
    }

    private List<ApiOptionDTO> toOptions(Direction[] values) {
        return java.util.Arrays.stream(values)
                .map(direction -> ApiOptionDTO.of(direction.name(), direction.getLabel()))
                .toList();
    }

    private List<ApiOptionDTO> toOptions(Level[] values) {
        return java.util.Arrays.stream(values)
                .map(level -> ApiOptionDTO.of(level.name(), level.getLabel()))
                .toList();
    }

    private List<ApiOptionDTO> toOptions(PropertyType[] values) {
        return java.util.Arrays.stream(values)
                .map(propertyType -> ApiOptionDTO.of(propertyType.name(), propertyType.getLabel()))
                .toList();
    }

    private List<ApiOptionDTO> toOptions(TransactionType[] values) {
        return java.util.Arrays.stream(values)
                .map(transactionType -> ApiOptionDTO.of(transactionType.name(), transactionType.getLabel()))
                .toList();
    }
}
