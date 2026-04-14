package com.estate.service.impl;

import com.estate.dto.*;
import com.estate.repository.*;
import com.estate.repository.entity.*;
import com.estate.service.BuildingDetailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BuildingDetailServiceImpl implements BuildingDetailService {

    private final SupplierRepository        supplierRepo;
    private final PlanningMapRepository     planningMapRepo;
    private final LegalAuthorityRepository  legalAuthorityRepo;
    private final NearbyAmenityRepository   nearbyAmenityRepo;
    private final BuildingRepository buildingRepository;
    private final LegalAuthorityRepository legalAuthorityRepository;
    private final NearbyAmenityRepository nearbyAmenityRepository;
    private final PlanningMapRepository planningMapRepository;
    private final SupplierRepository supplierRepository;

    // ── Label map cho authority_type ─────────────────────────────────────────
    private static final Map<String, String> AUTHORITY_LABELS = Map.of(
            "NOTARY",        "Công chứng",
            "LAND_REGISTRY", "Đăng ký đất đai",
            "LAW_FIRM",      "Văn phòng luật",
            "TAX_OFFICE",    "Cơ quan thuế"
    );

    // ── Label map cho amenity_type ────────────────────────────────────────────
    private static final Map<String, String> AMENITY_LABELS = Map.of(
            "SHOPPING",  "Mua sắm",
            "PARK",      "Công viên",
            "HOSPITAL",  "Bệnh viện",
            "SCHOOL",    "Trường học",
            "RESTAURANT","Nhà hàng",
            "BANK",      "Ngân hàng",
            "GYM",       "Thể dục",
            "TRANSPORT", "Giao thông",
            "OTHER",     "Khác"
    );

    // ================== HELPERS ==================
    private BuildingEntity requireBuilding(Long buildingId) {
        return buildingRepository.findById(buildingId)
                .orElseThrow(() -> new RuntimeException("Building not found: " + buildingId));
    }

    @Override
    public List<SupplierDTO> getSuppliers(Long buildingId) {
        return supplierRepo.findByBuildingId(buildingId)
                .stream()
                .map(this::toSupplierDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<PlanningMapDTO> getPlanningMaps(Long buildingId) {
        return planningMapRepo.findByBuildingId(buildingId)
                .stream()
                .map(this::toPlanningMapDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegalAuthorityDTO> getLegalAuthorities(Long buildingId) {
        return legalAuthorityRepo.findByBuildingId(buildingId)
                .stream()
                .map(this::toLegalAuthorityDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<NearbyAmenityDTO> getNearbyAmenities(Long buildingId) {
        return nearbyAmenityRepo.findByBuildingId(buildingId)
                .stream()
                .map(this::toNearbyAmenityDTO)
                .collect(Collectors.toList());
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private SupplierDTO toSupplierDTO(SupplierEntity e) {
        SupplierDTO dto = new SupplierDTO();
        dto.setId(e.getId());
        dto.setName(e.getName());
        dto.setServiceType(e.getServiceType());
        dto.setPhone(e.getPhone());
        dto.setEmail(e.getEmail());
        dto.setAddress(e.getAddress());
        dto.setNote(e.getNote());
        dto.setCreatedDate(e.getCreatedDate());
        dto.setModifiedDate(e.getModifiedDate());
        return dto;
    }

    private PlanningMapDTO toPlanningMapDTO(PlanningMapEntity e) {
        PlanningMapDTO dto = new PlanningMapDTO();
        dto.setId(e.getId());
        dto.setMapType(e.getMapType());
        dto.setIssuedBy(e.getIssuedBy());
        dto.setIssuedDate(e.getIssuedDate());
        dto.setExpiredDate(e.getExpiredDate());
        dto.setImageUrl(e.getImageUrl());
        dto.setNote(e.getNote());
        dto.setCreatedDate(e.getCreatedDate());
        // Đánh dấu hết hạn để Thymeleaf hiển thị cảnh báo
        dto.setExpired(e.getExpiredDate() != null
                && e.getExpiredDate().isBefore(LocalDate.now()));
        return dto;
    }

    private LegalAuthorityDTO toLegalAuthorityDTO(LegalAuthorityEntity e) {
        LegalAuthorityDTO dto = new LegalAuthorityDTO();
        dto.setId(e.getId());
        dto.setAuthorityName(e.getAuthorityName());
        dto.setAuthorityType(e.getAuthorityType());
        dto.setAuthorityTypeLabel(
                AUTHORITY_LABELS.getOrDefault(e.getAuthorityType(), e.getAuthorityType()));
        dto.setAddress(e.getAddress());
        dto.setPhone(e.getPhone());
        dto.setEmail(e.getEmail());
        dto.setNote(e.getNote());
        dto.setCreatedDate(e.getCreatedDate());
        return dto;
    }

    private NearbyAmenityDTO toNearbyAmenityDTO(NearbyAmenityEntity e) {
        NearbyAmenityDTO dto = new NearbyAmenityDTO();
        dto.setId(e.getId());
        dto.setName(e.getName());
        dto.setAmenityType(e.getAmenityType());
        dto.setAmenityTypeLabel(
                AMENITY_LABELS.getOrDefault(e.getAmenityType(), e.getAmenityType()));
        dto.setDistanceMeter(e.getDistanceMeter());
        dto.setAddress(e.getAddress());
        dto.setLatitude(e.getLatitude());
        dto.setLongitude(e.getLongitude());
        dto.setCreatedDate(e.getCreatedDate());
        return dto;
    }

    // ================ LEGAL AUTHORITY ================
    @Override
    public List<LegalAuthorityDTO> getLegalAuthoritiesByBuilding(Long buildingId) {
        return legalAuthorityRepository.findByBuildingId(buildingId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public LegalAuthorityDTO getLegalAuthorityById(Long id) {
        return toDto(legalAuthorityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("LegalAuthority not found: " + id)));
    }

    @Override
    public LegalAuthorityDTO createLegalAuthority(LegalAuthorityDTO dto) {
        LegalAuthorityEntity e = new LegalAuthorityEntity();
        e.setBuilding(requireBuilding(dto.getBuildingId()));
        mapToEntity(dto, e);
        e.setCreatedDate(LocalDateTime.now());
        return toDto(legalAuthorityRepository.save(e));
    }

    @Override
    public LegalAuthorityDTO updateLegalAuthority(Long id, LegalAuthorityDTO dto) {
        LegalAuthorityEntity e = legalAuthorityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("LegalAuthority not found: " + id));
        mapToEntity(dto, e);
        return toDto(legalAuthorityRepository.save(e));
    }

    @Override
    public void deleteLegalAuthority(Long id) {
        legalAuthorityRepository.deleteById(id);
    }

    private void mapToEntity(LegalAuthorityDTO dto, LegalAuthorityEntity e) {
        e.setAuthorityName(dto.getAuthorityName());
        e.setAuthorityType(dto.getAuthorityType());
        e.setAddress(dto.getAddress());
        e.setPhone(dto.getPhone());
        e.setEmail(dto.getEmail());
        e.setNote(dto.getNote());
    }

    private LegalAuthorityDTO toDto(LegalAuthorityEntity e) {
        LegalAuthorityDTO dto = new LegalAuthorityDTO();
        dto.setId(e.getId());
        dto.setBuildingId(e.getBuilding().getId());
        dto.setBuildingName(e.getBuilding().getName());
        dto.setAuthorityName(e.getAuthorityName());
        dto.setAuthorityType(e.getAuthorityType());
        dto.setAddress(e.getAddress());
        dto.setPhone(e.getPhone());
        dto.setEmail(e.getEmail());
        dto.setNote(e.getNote());
        dto.setCreatedDate(e.getCreatedDate());
        return dto;
    }

    // ================ NEARBY AMENITY ================
    @Override
    public List<NearbyAmenityDTO> getNearbyAmenitiesByBuilding(Long buildingId) {
        return nearbyAmenityRepository.findByBuildingId(buildingId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public NearbyAmenityDTO getNearbyAmenityById(Long id) {
        return toDto(nearbyAmenityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("NearbyAmenity not found: " + id)));
    }

    @Override
    public NearbyAmenityDTO createNearbyAmenity(NearbyAmenityDTO dto) {
        NearbyAmenityEntity e = new NearbyAmenityEntity();
        e.setBuilding(requireBuilding(dto.getBuildingId()));
        mapToEntity(dto, e);
        e.setCreatedDate(LocalDateTime.now());
        return toDto(nearbyAmenityRepository.save(e));
    }

    @Override
    public NearbyAmenityDTO updateNearbyAmenity(Long id, NearbyAmenityDTO dto) {
        NearbyAmenityEntity e = nearbyAmenityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("NearbyAmenity not found: " + id));
        mapToEntity(dto, e);
        return toDto(nearbyAmenityRepository.save(e));
    }

    @Override
    public void deleteNearbyAmenity(Long id) {
        nearbyAmenityRepository.deleteById(id);
    }

    private void mapToEntity(NearbyAmenityDTO dto, NearbyAmenityEntity e) {
        e.setName(dto.getName());
        e.setAmenityType(dto.getAmenityType());
        e.setDistanceMeter(dto.getDistanceMeter());
        e.setAddress(dto.getAddress());
        e.setLatitude(dto.getLatitude());
        e.setLongitude(dto.getLongitude());
    }

    private NearbyAmenityDTO toDto(NearbyAmenityEntity e) {
        NearbyAmenityDTO dto = new NearbyAmenityDTO();
        dto.setId(e.getId());
        dto.setBuildingId(e.getBuilding().getId());
        dto.setBuildingName(e.getBuilding().getName());
        dto.setName(e.getName());
        dto.setAmenityType(e.getAmenityType());
        dto.setDistanceMeter(e.getDistanceMeter());
        dto.setAddress(e.getAddress());
        dto.setLatitude(e.getLatitude());
        dto.setLongitude(e.getLongitude());
        dto.setCreatedDate(e.getCreatedDate());
        return dto;
    }

    // ================ PLANNING MAP ================
    @Override
    public List<PlanningMapDTO> getPlanningMapsByBuilding(Long buildingId) {
        return planningMapRepository.findByBuildingId(buildingId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public PlanningMapDTO getPlanningMapById(Long id) {
        return toDto(planningMapRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PlanningMap not found: " + id)));
    }

    @Override
    public PlanningMapDTO createPlanningMap(PlanningMapDTO dto) {
        PlanningMapEntity e = new PlanningMapEntity();
        e.setBuilding(requireBuilding(dto.getBuildingId()));
        mapToEntity(dto, e);
        e.setCreatedDate(LocalDateTime.now());
        return toDto(planningMapRepository.save(e));
    }

    @Override
    public PlanningMapDTO updatePlanningMap(Long id, PlanningMapDTO dto) {
        PlanningMapEntity e = planningMapRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PlanningMap not found: " + id));
        mapToEntity(dto, e);
        return toDto(planningMapRepository.save(e));
    }

    @Override
    public void deletePlanningMap(Long id) {
        planningMapRepository.deleteById(id);
    }

    private void mapToEntity(PlanningMapDTO dto, PlanningMapEntity e) {
        e.setMapType(dto.getMapType());
        e.setIssuedBy(dto.getIssuedBy());
        e.setIssuedDate(dto.getIssuedDate());
        e.setExpiredDate(dto.getExpiredDate());
        e.setImageUrl(dto.getImageUrl());
        e.setNote(dto.getNote());
    }

    private PlanningMapDTO toDto(PlanningMapEntity e) {
        PlanningMapDTO dto = new PlanningMapDTO();
        dto.setId(e.getId());
        dto.setBuildingId(e.getBuilding().getId());
        dto.setBuildingName(e.getBuilding().getName());
        dto.setMapType(e.getMapType());
        dto.setIssuedBy(e.getIssuedBy());
        dto.setIssuedDate(e.getIssuedDate());
        dto.setExpiredDate(e.getExpiredDate());
        dto.setImageUrl(e.getImageUrl());
        dto.setNote(e.getNote());
        dto.setCreatedDate(e.getCreatedDate());
        return dto;
    }

    // ================ SUPPLIER ================
    @Override
    public List<SupplierDTO> getSuppliersByBuilding(Long buildingId) {
        return supplierRepository.findByBuildingId(buildingId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public SupplierDTO getSupplierById(Long id) {
        return toDto(supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found: " + id)));
    }

    @Override
    public SupplierDTO createSupplier(SupplierDTO dto) {
        SupplierEntity e = new SupplierEntity();
        e.setBuilding(requireBuilding(dto.getBuildingId()));
        mapToEntity(dto, e);
        e.setCreatedDate(LocalDateTime.now());
        e.setModifiedDate(LocalDateTime.now());
        return toDto(supplierRepository.save(e));
    }

    @Override
    public SupplierDTO updateSupplier(Long id, SupplierDTO dto) {
        SupplierEntity e = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found: " + id));
        mapToEntity(dto, e);
        e.setModifiedDate(LocalDateTime.now());
        return toDto(supplierRepository.save(e));
    }

    @Override
    public void deleteSupplier(Long id) {
        supplierRepository.deleteById(id);
    }

    private void mapToEntity(SupplierDTO dto, SupplierEntity e) {
        e.setName(dto.getName());
        e.setServiceType(dto.getServiceType());
        e.setPhone(dto.getPhone());
        e.setEmail(dto.getEmail());
        e.setAddress(dto.getAddress());
        e.setNote(dto.getNote());
    }

    private SupplierDTO toDto(SupplierEntity e) {
        SupplierDTO dto = new SupplierDTO();
        dto.setId(e.getId());
        dto.setBuildingId(e.getBuilding().getId());
        dto.setBuildingName(e.getBuilding().getName());
        dto.setName(e.getName());
        dto.setServiceType(e.getServiceType());
        dto.setPhone(e.getPhone());
        dto.setEmail(e.getEmail());
        dto.setAddress(e.getAddress());
        dto.setNote(e.getNote());
        dto.setCreatedDate(e.getCreatedDate());
        dto.setModifiedDate(e.getModifiedDate());
        return dto;
    }
}