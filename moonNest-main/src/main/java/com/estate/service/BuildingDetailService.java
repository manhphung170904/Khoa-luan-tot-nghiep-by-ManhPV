package com.estate.service;

import com.estate.dto.*;
import java.util.List;

public interface BuildingDetailService {
    List<SupplierDTO>       getSuppliers      (Long buildingId);
    List<PlanningMapDTO>    getPlanningMaps   (Long buildingId);
    List<LegalAuthorityDTO> getLegalAuthorities(Long buildingId);
    List<NearbyAmenityDTO>  getNearbyAmenities (Long buildingId);

    // =================== LEGAL AUTHORITY ===================
    List<LegalAuthorityDTO> getLegalAuthoritiesByBuilding(Long buildingId);
    LegalAuthorityDTO getLegalAuthorityById(Long id);
    LegalAuthorityDTO createLegalAuthority(LegalAuthorityDTO dto);
    LegalAuthorityDTO updateLegalAuthority(Long id, LegalAuthorityDTO dto);
    void deleteLegalAuthority(Long id);

    // =================== NEARBY AMENITY ===================
    List<NearbyAmenityDTO> getNearbyAmenitiesByBuilding(Long buildingId);
    NearbyAmenityDTO getNearbyAmenityById(Long id);
    NearbyAmenityDTO createNearbyAmenity(NearbyAmenityDTO dto);
    NearbyAmenityDTO updateNearbyAmenity(Long id, NearbyAmenityDTO dto);
    void deleteNearbyAmenity(Long id);

    // =================== PLANNING MAP ===================
    List<PlanningMapDTO> getPlanningMapsByBuilding(Long buildingId);
    PlanningMapDTO getPlanningMapById(Long id);
    PlanningMapDTO createPlanningMap(PlanningMapDTO dto);
    PlanningMapDTO updatePlanningMap(Long id, PlanningMapDTO dto);
    void deletePlanningMap(Long id);

    // =================== SUPPLIER ===================
    List<SupplierDTO> getSuppliersByBuilding(Long buildingId);
    SupplierDTO getSupplierById(Long id);
    SupplierDTO createSupplier(SupplierDTO dto);
    SupplierDTO updateSupplier(Long id, SupplierDTO dto);
    void deleteSupplier(Long id);
}