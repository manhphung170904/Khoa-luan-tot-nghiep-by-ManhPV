package com.estate.service.impl;

import com.estate.converter.BuildingDetailConverter;
import com.estate.converter.BuildingFormConverter;
import com.estate.converter.BuildingListConverter;
import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.BuildingFormDTO;
import com.estate.dto.BuildingListDTO;
import com.estate.exception.BusinessException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.BuildingRepository;
import com.estate.repository.ContractRepository;
import com.estate.repository.SaleContractRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.service.BuildingService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BuildingServiceImpl implements BuildingService {
    @Autowired private BuildingRepository buildingRepository;
    @Autowired private SaleContractRepository saleContractRepository;
    @Autowired private BuildingListConverter buildingListConverter;
    @Autowired private StaffRepository staffRepository;
    @Autowired private ContractRepository contractRepository;
    @Autowired private BuildingFormConverter buildingFormConverter;
    @Autowired private BuildingDetailConverter buildingDetailConverter;

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    @Override
    public long countAll() {
        return buildingRepository.count();
    }

    @Override
    public List<BuildingListDTO> findRecent() {
        List<BuildingEntity> buildingEntities = buildingRepository.findRecentBuildings(PageRequest.of(0, 5));
        List<BuildingListDTO> result = new ArrayList<>();
        for (BuildingEntity building : buildingEntities) {
            List<String> staffNames = staffRepository.findStaffNamesByBuildingId(building.getId());
            result.add(buildingListConverter.toDto(
                    building,
                    String.join(" - ", staffNames != null ? staffNames : Collections.emptyList()))
            );
        }
        return result;
    }

    @Override
    public Map<String, Long> getBuildingCountByDistrict() {
        List<Object[]> result = buildingRepository.countBuildingsByDistrict();
        Map<String, Long> map = new LinkedHashMap<>();
        for (Object[] row : result) {
            map.put((String) row[0], (Long) row[1]);
        }
        return map;
    }

    @Override
    public Page<BuildingListDTO> getBuildings(int page, int size) {
        Page<BuildingEntity> buildingPage = buildingRepository.findAll(PageRequest.of(page, size));
        List<BuildingListDTO> dtoList = new ArrayList<>();
        for (BuildingEntity building : buildingPage) {
            List<String> managersName = staffRepository.findStaffNamesByBuildingId(building.getId());
            dtoList.add(buildingListConverter.toDto(building, String.join(" - ", managersName)));
        }
        return new PageImpl<>(dtoList, buildingPage.getPageable(), buildingPage.getTotalElements());
    }

    @Override
    public Page<BuildingListDTO> search(BuildingFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (filter.getLat() != null && filter.getLng() != null) {
            Page<BuildingEntity> allMatchedPage =
                    buildingRepository.searchBuildings(filter, PageRequest.of(0, Integer.MAX_VALUE));
            List<BuildingEntity> filtered = filterByLocation(allMatchedPage.getContent(), filter);
            List<BuildingListDTO> dtoList = filtered.stream()
                    .map(building -> {
                        List<String> names = staffRepository.findStaffNamesByBuildingId(building.getId());
                        return buildingListConverter.toDto(building, String.join(" - ", names));
                    })
                    .collect(Collectors.toList());
            return toPage(dtoList, pageable);
        }

        Page<BuildingEntity> buildingPage = buildingRepository.searchBuildings(filter, pageable);
        List<BuildingListDTO> dtoList = new ArrayList<>();
        for (BuildingEntity building : buildingPage) {
            List<String> managersName = staffRepository.findStaffNamesByBuildingId(building.getId());
            dtoList.add(buildingListConverter.toDto(building, String.join(" - ", managersName)));
        }
        return new PageImpl<>(dtoList, buildingPage.getPageable(), buildingPage.getTotalElements());
    }

    private double haversine(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private List<BuildingEntity> filterByLocation(List<BuildingEntity> buildings, BuildingFilterDTO filter) {
        double lat = filter.getLat();
        double lng = filter.getLng();
        int radius = filter.getRadius() != null ? filter.getRadius() : 1000;
        return buildings.stream()
                .filter(building -> building.getLatitude() != null && building.getLongitude() != null)
                .filter(building -> haversine(
                        lat,
                        lng,
                        building.getLatitude().doubleValue(),
                        building.getLongitude().doubleValue()) <= radius
                )
                .collect(Collectors.toList());
    }

    private <T> Page<T> toPage(List<T> list, Pageable pageable) {
        int total = list.size();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), total);
        List<T> pageContent = start >= total ? Collections.emptyList() : list.subList(start, end);
        return new PageImpl<>(pageContent, pageable, total);
    }

    @Override
    public List<String> getWardName() {
        return buildingRepository.getWardName();
    }

    @Override
    public List<String> getStreetName() {
        return buildingRepository.getStreetName();
    }

    @Override
    public void save(BuildingFormDTO dto) {
        BuildingEntity entity;
        if (dto.getId() != null) {
            entity = buildingRepository.findById(dto.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Building was not found"));
            if (saleContractRepository.countByBuildingId(dto.getId()) == 1) {
                throw new BusinessException("Sold buildings cannot be updated");
            }
        } else {
            entity = new BuildingEntity();
        }
        buildingFormConverter.toEntity(entity, dto);
        buildingRepository.save(entity);
    }

    @Override
    public BuildingFormDTO findById(Long id) {
        BuildingEntity buildingEntity = buildingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Building was not found"));
        return buildingFormConverter.toDTO(buildingEntity);
    }

    @Override
    public void delete(Long id) {
        if (!buildingRepository.existsById(id)) {
            throw new ResourceNotFoundException("Building was not found");
        }
        long count = contractRepository.countByBuildingId(id);
        if (count > 0) {
            throw new BusinessException("Cannot delete a building with related contracts");
        }
        buildingRepository.deleteById(id);
    }

    @Override
    public BuildingDetailDTO viewById(Long id) {
        BuildingEntity buildingEntity = buildingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Building was not found"));
        return buildingDetailConverter.toDTO(buildingEntity);
    }

    @Override
    public Map<String, Long> getBuildingsName() {
        List<BuildingEntity> buildingEntities = buildingRepository.findAll();
        Map<String, Long> result = new LinkedHashMap<>();
        for (BuildingEntity building : buildingEntities) {
            result.put(building.getName(), building.getId());
        }
        return result;
    }

    @Override
    public Map<String, Long> getBuildingsNameByStaff(Long staffId) {
        List<BuildingEntity> buildingEntities = buildingRepository.findAllByStaffId(staffId);
        Map<String, Long> result = new LinkedHashMap<>();
        for (BuildingEntity building : buildingEntities) {
            result.put(building.getName(), building.getId());
        }
        return result;
    }

    @Override
    public List<BuildingDetailDTO> searchByCustomer(BuildingFilterDTO filter) {
        List<BuildingEntity> buildings = buildingRepository.searchBuildingsByCustomer(filter);
        List<BuildingDetailDTO> dtoList = new ArrayList<>();
        for (BuildingEntity building : buildings) {
            dtoList.add(buildingDetailConverter.toDTO(building));
        }
        return dtoList;
    }

    @Override
    public Page<BuildingDetailDTO> searchByCustomer(BuildingFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        List<BuildingDetailDTO> dtoList = searchByCustomer(filter);
        return toPage(dtoList, pageable);
    }

    @Override
    public Page<BuildingDetailDTO> searchByStaff(BuildingFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (filter.getLat() != null && filter.getLng() != null) {
            Page<BuildingEntity> allMatchedPage =
                    buildingRepository.searchBuildings(filter, PageRequest.of(0, Integer.MAX_VALUE));
            List<BuildingEntity> filtered = filterByLocation(allMatchedPage.getContent(), filter);
            List<BuildingDetailDTO> dtoList = filtered.stream()
                    .map(buildingDetailConverter::toDTO)
                    .collect(Collectors.toList());
            return toPage(dtoList, pageable);
        }

        Page<BuildingEntity> buildingPage = buildingRepository.searchBuildings(filter, pageable);
        List<BuildingDetailDTO> dtoList = new ArrayList<>();
        for (BuildingEntity building : buildingPage) {
            dtoList.add(buildingDetailConverter.toDTO(building));
        }
        return new PageImpl<>(dtoList, buildingPage.getPageable(), buildingPage.getTotalElements());
    }

    @Override
    public boolean isStaffManagesBuilding(Long staffId, Long buildingId) {
        return buildingRepository.isStaffManagesBuilding(staffId, buildingId);
    }
}
