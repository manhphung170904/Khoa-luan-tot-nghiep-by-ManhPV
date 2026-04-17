package com.estate.api.v1.admin;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.FileUploadResponseDTO;
import com.estate.dto.LegalAuthorityDTO;
import com.estate.dto.NearbyAmenityDTO;
import com.estate.dto.PlanningMapDTO;
import com.estate.dto.SupplierDTO;
import com.estate.exception.InputValidationException;
import com.estate.exception.PayloadTooLargeException;
import com.estate.exception.UnsupportedMediaTypeApiException;
import com.estate.service.BuildingDetailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/api/v1/admin/building-additional-information")
@RequiredArgsConstructor
public class AdminBuildingAdditionalInformationV1API {
    private final BuildingDetailService buildingDetailService;

    @Value("${planning.map.image.upload-dir:src/main/resources/static/images/planning_map_img}")
    private String uploadDir;

    private static final List<String> ALLOWED_TYPES = List.of("image/jpeg", "image/png", "image/webp");
    private static final List<String> ALLOWED_EXTS = List.of(".jpg", ".jpeg", ".png", ".webp");
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024;

    @GetMapping("/legal-authorities/{buildingId}")
    public List<LegalAuthorityDTO> listLegalAuthorities(@PathVariable Long buildingId) {
        return buildingDetailService.getLegalAuthoritiesByBuilding(buildingId);
    }

    @PostMapping("/legal-authorities")
    public ResponseEntity<LegalAuthorityDTO> createLegalAuthority(@Valid @RequestBody LegalAuthorityDTO dto) {
        return ResponseEntity.ok(buildingDetailService.createLegalAuthority(dto));
    }

    @PutMapping("/legal-authorities/{id}")
    public LegalAuthorityDTO updateLegalAuthority(@PathVariable Long id, @Valid @RequestBody LegalAuthorityDTO dto) {
        return buildingDetailService.updateLegalAuthority(id, dto);
    }

    @DeleteMapping("/legal-authorities/{id}")
    public ResponseEntity<Void> deleteLegalAuthority(@PathVariable Long id) {
        buildingDetailService.deleteLegalAuthority(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/nearby-amenities/{buildingId}")
    public List<NearbyAmenityDTO> listNearbyAmenities(@PathVariable Long buildingId) {
        return buildingDetailService.getNearbyAmenitiesByBuilding(buildingId);
    }

    @PostMapping("/nearby-amenities")
    public ResponseEntity<NearbyAmenityDTO> createNearbyAmenity(@RequestBody NearbyAmenityDTO dto) {
        return ResponseEntity.ok(buildingDetailService.createNearbyAmenity(dto));
    }

    @PutMapping("/nearby-amenities/{id}")
    public NearbyAmenityDTO updateNearbyAmenity(@PathVariable Long id, @RequestBody NearbyAmenityDTO dto) {
        return buildingDetailService.updateNearbyAmenity(id, dto);
    }

    @DeleteMapping("/nearby-amenities/{id}")
    public ResponseEntity<Void> deleteNearbyAmenity(@PathVariable Long id) {
        buildingDetailService.deleteNearbyAmenity(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/suppliers/{buildingId}")
    public List<SupplierDTO> listSuppliers(@PathVariable Long buildingId) {
        return buildingDetailService.getSuppliersByBuilding(buildingId);
    }

    @PostMapping("/suppliers")
    public ResponseEntity<SupplierDTO> createSupplier(@RequestBody SupplierDTO dto) {
        return ResponseEntity.ok(buildingDetailService.createSupplier(dto));
    }

    @PutMapping("/suppliers/{id}")
    public SupplierDTO updateSupplier(@PathVariable Long id, @RequestBody SupplierDTO dto) {
        return buildingDetailService.updateSupplier(id, dto);
    }

    @DeleteMapping("/suppliers/{id}")
    public ResponseEntity<Void> deleteSupplier(@PathVariable Long id) {
        buildingDetailService.deleteSupplier(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/planning-maps/{buildingId}")
    public List<PlanningMapDTO> listPlanningMaps(@PathVariable Long buildingId) {
        return buildingDetailService.getPlanningMapsByBuilding(buildingId);
    }

    @PostMapping("/planning-maps")
    public ResponseEntity<PlanningMapDTO> createPlanningMap(@RequestBody PlanningMapDTO dto) {
        return ResponseEntity.ok(buildingDetailService.createPlanningMap(dto));
    }

    @PutMapping("/planning-maps/{id}")
    public PlanningMapDTO updatePlanningMap(@PathVariable Long id, @RequestBody PlanningMapDTO dto) {
        return buildingDetailService.updatePlanningMap(id, dto);
    }

    @DeleteMapping("/planning-maps/{id}")
    public ResponseEntity<Void> deletePlanningMap(@PathVariable Long id) {
        buildingDetailService.deletePlanningMap(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/planning-maps/image")
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

        try {
            String ext = originalName.substring(originalName.lastIndexOf('.'));
            String filename = "planning_" + UUID.randomUUID().toString().replace("-", "") + ext;

            Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
            Files.createDirectories(uploadPath);
            Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok(
                    ApiMessageResponse.of("File uploaded successfully.", FileUploadResponseDTO.of(filename))
            );
        } catch (IOException e) {
            throw new IllegalStateException("Unable to store uploaded file", e);
        }
    }
}
