package com.estate.api.v1.admin;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.FileUploadResponseDTO;
import com.estate.dto.LegalAuthorityDTO;
import com.estate.dto.NearbyAmenityDTO;
import com.estate.dto.PlanningMapDTO;
import com.estate.dto.SupplierDTO;
import com.estate.exception.InputValidationException;
import com.estate.service.BuildingDetailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/building-additional-information")
@RequiredArgsConstructor
public class AdminBuildingAdditionalInformationV1API {
    private static final String UPLOAD_DIR = "src/main/resources/static/images/planning_map_img/";

    private final BuildingDetailService buildingDetailService;

    @GetMapping("/legal-authorities/{buildingId}")
    public List<LegalAuthorityDTO> listLegalAuthorities(@PathVariable Long buildingId) {
        return buildingDetailService.getLegalAuthoritiesByBuilding(buildingId);
    }

    @PostMapping("/legal-authorities")
    public ResponseEntity<LegalAuthorityDTO> createLegalAuthority(@RequestBody LegalAuthorityDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(buildingDetailService.createLegalAuthority(dto));
    }

    @PutMapping("/legal-authorities/{id}")
    public LegalAuthorityDTO updateLegalAuthority(@PathVariable Long id, @RequestBody LegalAuthorityDTO dto) {
        return buildingDetailService.updateLegalAuthority(id, dto);
    }

    @DeleteMapping("/legal-authorities/{id}")
    public ResponseEntity<Void> deleteLegalAuthority(@PathVariable Long id) {
        buildingDetailService.deleteLegalAuthority(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/nearby-amenities/{buildingId}")
    public List<NearbyAmenityDTO> listNearbyAmenities(@PathVariable Long buildingId) {
        return buildingDetailService.getNearbyAmenitiesByBuilding(buildingId);
    }

    @PostMapping("/nearby-amenities")
    public ResponseEntity<NearbyAmenityDTO> createNearbyAmenity(@RequestBody NearbyAmenityDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(buildingDetailService.createNearbyAmenity(dto));
    }

    @PutMapping("/nearby-amenities/{id}")
    public NearbyAmenityDTO updateNearbyAmenity(@PathVariable Long id, @RequestBody NearbyAmenityDTO dto) {
        return buildingDetailService.updateNearbyAmenity(id, dto);
    }

    @DeleteMapping("/nearby-amenities/{id}")
    public ResponseEntity<Void> deleteNearbyAmenity(@PathVariable Long id) {
        buildingDetailService.deleteNearbyAmenity(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/suppliers/{buildingId}")
    public List<SupplierDTO> listSuppliers(@PathVariable Long buildingId) {
        return buildingDetailService.getSuppliersByBuilding(buildingId);
    }

    @PostMapping("/suppliers")
    public ResponseEntity<SupplierDTO> createSupplier(@RequestBody SupplierDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(buildingDetailService.createSupplier(dto));
    }

    @PutMapping("/suppliers/{id}")
    public SupplierDTO updateSupplier(@PathVariable Long id, @RequestBody SupplierDTO dto) {
        return buildingDetailService.updateSupplier(id, dto);
    }

    @DeleteMapping("/suppliers/{id}")
    public ResponseEntity<Void> deleteSupplier(@PathVariable Long id) {
        buildingDetailService.deleteSupplier(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/planning-maps/{buildingId}")
    public List<PlanningMapDTO> listPlanningMaps(@PathVariable Long buildingId) {
        return buildingDetailService.getPlanningMapsByBuilding(buildingId);
    }

    @PostMapping("/planning-maps")
    public ResponseEntity<PlanningMapDTO> createPlanningMap(@RequestBody PlanningMapDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(buildingDetailService.createPlanningMap(dto));
    }

    @PutMapping("/planning-maps/{id}")
    public PlanningMapDTO updatePlanningMap(@PathVariable Long id, @RequestBody PlanningMapDTO dto) {
        return buildingDetailService.updatePlanningMap(id, dto);
    }

    @DeleteMapping("/planning-maps/{id}")
    public ResponseEntity<Void> deletePlanningMap(@PathVariable Long id) {
        buildingDetailService.deletePlanningMap(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/planning-maps/image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        boolean useUnifiedContract = true;
        if (useUnifiedContract) {
            String contentType = file.getContentType();
            if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/webp"))) {
                throw new InputValidationException("Invalid file type. Only JPG, PNG, and WEBP are supported.");
            }
            if (file.getSize() > 5 * 1024 * 1024) {
                throw new InputValidationException("File is too large. Maximum allowed size is 5 MB.");
            }

            try {
                String originalFilename = file.getOriginalFilename();
                String ext = "";
                if (originalFilename != null && originalFilename.contains(".")) {
                    ext = originalFilename.substring(originalFilename.lastIndexOf("."));
                }
                String filename = "planning_" + UUID.randomUUID().toString().replace("-", "") + ext;

                Path uploadPath = Paths.get(UPLOAD_DIR);
                Files.createDirectories(uploadPath);
                Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

                return ResponseEntity.status(HttpStatus.CREATED).body(
                        ApiMessageResponse.of("Upload completed successfully.", FileUploadResponseDTO.of(filename))
                );
            } catch (IOException e) {
                throw new IllegalStateException("Unable to store uploaded file.", e);
            }
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/webp"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Định dạng không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP."));
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "File quá lớn. Tối đa 5MB."));
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = "planning_" + UUID.randomUUID().toString().replace("-", "") + ext;

            Path uploadPath = Paths.get(UPLOAD_DIR);
            Files.createDirectories(uploadPath);
            Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("filename", filename));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Lỗi lưu file: " + e.getMessage()));
        }
    }
}
