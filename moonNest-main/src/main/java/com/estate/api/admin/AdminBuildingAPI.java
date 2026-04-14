package com.estate.api.admin;

import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.BuildingFormDTO;
import com.estate.dto.BuildingListDTO;
import com.estate.exception.InputValidationException;
import com.estate.service.BuildingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
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
@RequestMapping("/admin/building")
@RequiredArgsConstructor
public class AdminBuildingAPI {
    private final BuildingService buildingService;

    // Đường dẫn lưu ảnh — cấu hình trong application.properties
    @Value("${building.image.upload-dir:src/main/resources/static/images/building_img}")
    private String uploadDir;

    // Định dạng và dung lượng cho phép
    private static final List<String> ALLOWED_TYPES = List.of("image/jpeg", "image/png", "image/webp");
    private static final List<String> ALLOWED_EXTS = List.of(".jpg", ".jpeg", ".png", ".webp");
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    @GetMapping("/list/page")
    public Page<BuildingListDTO> getBuildingsPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        return buildingService.getBuildings(page - 1, size);
    }

    @GetMapping("/search/page")
    public Page<BuildingListDTO> getBuildingsSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            BuildingFilterDTO filter
    ) {
        return buildingService.search(filter, page - 1, size);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addBuilding(
            @Valid @RequestBody BuildingFormDTO dto,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            throw new InputValidationException(getFirstError(result));
        }
        buildingService.save(dto);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/edit")
    public ResponseEntity<?> editBuilding(
            @Valid @RequestBody BuildingFormDTO dto,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            throw new InputValidationException(getFirstError(result));
        }
        buildingService.save(dto);
        return ResponseEntity.ok("Sửa bất động sản thành công");
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteBuilding(@PathVariable Long id) {
        buildingService.delete(id);
        return ResponseEntity.ok().build();
    }

    // ── Upload ảnh bất động sản ───────────────────────────────────────────────
    @PostMapping("/upload-image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        // 1. Kiểm tra file rỗng
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Vui lòng chọn file ảnh."));
        }

        // 2. Kiểm tra dung lượng (tối đa 5 MB)
        if (file.getSize() > MAX_SIZE_BYTES) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "File quá lớn. Dung lượng tối đa cho phép là 5 MB."));
        }

        // 3. Kiểm tra định dạng theo Content-Type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Định dạng không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP."));
        }

        // 4. Kiểm tra extension tên file
        String originalName = file.getOriginalFilename() != null
                ? file.getOriginalFilename().toLowerCase()
                : "";
        boolean validExt = ALLOWED_EXTS.stream().anyMatch(originalName::endsWith);
        if (!validExt) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Định dạng file không hợp lệ. Chỉ chấp nhận .jpg, .png, .webp."));
        }

        // 5. Lấy extension và tạo tên file unique
        String ext = originalName.substring(originalName.lastIndexOf('.'));
        String newFilename = UUID.randomUUID().toString().replace("-", "") + ext;

        try {
            // 6. Tạo thư mục nếu chưa có
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
            Files.createDirectories(uploadPath);

            // 7. Lưu file
            Path targetPath = uploadPath.resolve(newFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok(Map.of(
                    "filename", newFilename,
                    "message", "Upload thành công"
            ));

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi lưu file: " + e.getMessage()));
        }
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private String getFirstError(BindingResult result) {
        if (!result.getFieldErrors().isEmpty()) {
            return result.getFieldErrors().getFirst().getDefaultMessage();
        }
        return result.getAllErrors().getFirst().getDefaultMessage();
    }
}