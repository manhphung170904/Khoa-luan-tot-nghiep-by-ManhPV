package com.estate.api.admin;

import com.estate.dto.LegalAuthorityDTO;
import com.estate.dto.NearbyAmenityDTO;
import com.estate.dto.PlanningMapDTO;
import com.estate.dto.SupplierDTO;
import com.estate.service.BuildingDetailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
@RequestMapping("/admin/building-additional-information")
@RequiredArgsConstructor
public class AdminBuildingAdditionalInformationAPI {
    private final BuildingDetailService buildingDetailService;

    // ===================== LEGAL AUTHORITY =====================
    @GetMapping("/legal-authority/{buildingId}/list")
    public List<LegalAuthorityDTO> listLegalAuthorities(@PathVariable Long buildingId) {
        return buildingDetailService.getLegalAuthoritiesByBuilding(buildingId);
    }

    @PostMapping("/legal-authority")
    public ResponseEntity<LegalAuthorityDTO> createLegalAuthority(@RequestBody LegalAuthorityDTO dto) {
        return ResponseEntity.ok(buildingDetailService.createLegalAuthority(dto));
    }

    @PutMapping("/legal-authority/{id}")
    public ResponseEntity<LegalAuthorityDTO> updateLegalAuthority(
            @PathVariable Long id,
            @RequestBody LegalAuthorityDTO dto
    ) {
        return ResponseEntity.ok(buildingDetailService.updateLegalAuthority(id, dto));
    }

    @DeleteMapping("/legal-authority/{id}")
    public ResponseEntity<Void> deleteLegalAuthority(@PathVariable Long id) {
        buildingDetailService.deleteLegalAuthority(id);
        return ResponseEntity.noContent().build();
    }

    // ===================== NEARBY AMENITY =====================
    @GetMapping("/nearby-amenity/{buildingId}/list")
    public List<NearbyAmenityDTO> listNearbyAmenities(@PathVariable Long buildingId) {
        return buildingDetailService.getNearbyAmenitiesByBuilding(buildingId);
    }

    @PostMapping("/nearby-amenity")
    public ResponseEntity<NearbyAmenityDTO> createNearbyAmenity(@RequestBody NearbyAmenityDTO dto) {
        return ResponseEntity.ok(buildingDetailService.createNearbyAmenity(dto));
    }

    @PutMapping("/nearby-amenity/{id}")
    public ResponseEntity<NearbyAmenityDTO> updateNearbyAmenity(
            @PathVariable Long id,
            @RequestBody NearbyAmenityDTO dto
    ) {
        return ResponseEntity.ok(buildingDetailService.updateNearbyAmenity(id, dto));
    }

    @DeleteMapping("/nearby-amenity/{id}")
    public ResponseEntity<Void> deleteNearbyAmenity(@PathVariable Long id) {
        buildingDetailService.deleteNearbyAmenity(id);
        return ResponseEntity.noContent().build();
    }

    // ===================== SUPPLIER =====================
    @GetMapping("/supplier/{buildingId}/list")
    public List<SupplierDTO> listSuppliers(@PathVariable Long buildingId) {
        return buildingDetailService.getSuppliersByBuilding(buildingId);
    }

    @PostMapping("/supplier")
    public ResponseEntity<SupplierDTO> createSupplier(@RequestBody SupplierDTO dto) {
        return ResponseEntity.ok(buildingDetailService.createSupplier(dto));
    }

    @PutMapping("/supplier/{id}")
    public ResponseEntity<SupplierDTO> updateSupplier(
            @PathVariable Long id,
            @RequestBody SupplierDTO dto
    ) {
        return ResponseEntity.ok(buildingDetailService.updateSupplier(id, dto));
    }

    @DeleteMapping("/supplier/{id}")
    public ResponseEntity<SupplierDTO> deleteSupplier(@PathVariable Long id) {
        buildingDetailService.deleteSupplier(id);
        return ResponseEntity.noContent().build();
    }

    // ===================== PLANNING MAP =====================
    @GetMapping("/planning-map/{buildingId}/list")
    public List<PlanningMapDTO> listPlanningMaps(@PathVariable Long buildingId) {
        return buildingDetailService.getPlanningMapsByBuilding(buildingId);
    }

    @PostMapping("/planning-map")
    public ResponseEntity<PlanningMapDTO> createPlanningMap(@RequestBody PlanningMapDTO dto) {
        return ResponseEntity.ok(buildingDetailService.createPlanningMap(dto));
    }

    @PutMapping("/planning-map/{id}")
    public ResponseEntity<PlanningMapDTO> updatePlanningMap(
            @PathVariable Long id,
            @RequestBody PlanningMapDTO dto
    ) {
        return ResponseEntity.ok(buildingDetailService.updatePlanningMap(id, dto));
    }

    @DeleteMapping("/planning-map/{id}")
    public ResponseEntity<Void> deletePlanningMap(@PathVariable Long id) {
        buildingDetailService.deletePlanningMap(id);
        return ResponseEntity.noContent().build();
    }

    // Lưu vào đúng thư mục static – WebMvcConfig serve từ filesystem nên không cần restart
    private static final String UPLOAD_DIR = "src/main/resources/static/images/planning_map_img/";

    @PostMapping("/planning-map/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equals("image/jpeg") &&
                        !contentType.equals("image/png") &&
                        !contentType.equals("image/webp"))) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Định dạng không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP."));
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "File quá lớn. Tối đa 5MB."));
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            // Tên file ngắn – FE sẽ ghép path /images/planning_map_img/ + filename
            String filename = "planning_" + UUID.randomUUID().toString().replace("-", "") + ext;

            Path uploadPath = Paths.get(UPLOAD_DIR);
            Files.createDirectories(uploadPath);
            Files.copy(file.getInputStream(), uploadPath.resolve(filename),
                    StandardCopyOption.REPLACE_EXISTING);

            // Trả về filename ngắn – giống cách building trả về data.filename
            return ResponseEntity.ok(Map.of("filename", filename));

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi lưu file: " + e.getMessage()));
        }
    }
}
