package com.estate.service;

import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.BuildingFormDTO;
import com.estate.dto.BuildingListDTO;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

public interface BuildingService {
    long countAll();
    List<BuildingListDTO> findRecent();
    Map<String, Long> getBuildingCountByDistrict();
    Page<BuildingListDTO> getBuildings(int page, int size);
    Page<BuildingListDTO> search(BuildingFilterDTO filter, int page, int size);
    List<String> getWardName();
    List<String> getStreetName();
    void save(BuildingFormDTO dto);
    BuildingFormDTO findById(Long id);
    void delete(Long id);
    BuildingDetailDTO viewById(Long id);
    Map<String, Long> getBuildingsName();
    Map<String, Long> getBuildingsNameByStaff(Long staffId);
    List<BuildingDetailDTO> searchByCustomer(BuildingFilterDTO filter);
    Page<BuildingDetailDTO> searchByCustomer(BuildingFilterDTO filter, int page, int size);
    Page<BuildingDetailDTO> searchByStaff(BuildingFilterDTO filter, int page, int size);
    boolean isStaffManagesBuilding(Long staffId, Long buildingId);
}
