package com.estate.service.impl;

import com.estate.converter.BuildingDetailConverter;
import com.estate.converter.BuildingFormConverter;
import com.estate.converter.BuildingListConverter;
import com.estate.dto.BuildingDetailDTO;
import com.estate.dto.BuildingFilterDTO;
import com.estate.dto.BuildingFormDTO;
import com.estate.dto.BuildingListDTO;
import com.estate.exception.BusinessException;
import com.estate.repository.BuildingRepository;
import com.estate.repository.ContractRepository;
import com.estate.repository.SaleContractRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.BuildingEntity;
import com.estate.service.BuildingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class BuildingServiceImpl implements BuildingService {

    @Autowired
    private BuildingRepository buildingRepository;

    @Autowired
    private SaleContractRepository saleContractRepository;

    @Autowired
    private BuildingListConverter buildingListConverter;

    @Autowired
    private StaffRepository staffRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private BuildingFormConverter buildingFormConverter;

    @Autowired
    private BuildingDetailConverter buildingDetailConverter;

    @Override
    public long countAll() {
        return buildingRepository.count();
    }

    @Override
    public List<BuildingListDTO> findRecent() {
        List<BuildingEntity> buildingEntities = buildingRepository.findRecentBuildings(PageRequest.of(0, 5));
        List<BuildingListDTO> result = new ArrayList<>();
        for (BuildingEntity b : buildingEntities) {
            List<String> staffNames = staffRepository.findStaffNamesByBuildingId(b.getId());
            result.add(buildingListConverter.toDto(b, String.join(" - ", staffNames != null ? staffNames : Collections.emptyList())));
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
        for (BuildingEntity b : buildingPage) {
            List<String> managersName = staffRepository.findStaffNamesByBuildingId(b.getId());
            dtoList.add(buildingListConverter.toDto(b, String.join(" - ", managersName)));
        }
        return new PageImpl<>(dtoList, buildingPage.getPageable(), buildingPage.getTotalElements());
    }

    @Override
    public Page<BuildingListDTO> search(BuildingFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        // ─────────── Trường hợp có lọc theo vị trí ────────────
        // Phải lấy TẤT CẢ kết quả khớp filter DB trước, rồi mới lọc Haversine
        // sau đó tự phân trang, nếu để DB phân trang trước thì
        // tổng số trang sẽ sai (DB không biết bao nhiêu bản ghi sẽ bị loại)
        if (filter.getLat() != null && filter.getLng() != null) {
            // Lấy toàn bộ, không giới hạn trang
            Page<BuildingEntity> allMatchedPage =
                    buildingRepository.searchBuildings(filter, PageRequest.of(0, Integer.MAX_VALUE));

            // Lọc theo khoảng cách
            List<BuildingEntity> filtered = filterByLocation(allMatchedPage.getContent(), filter);

            // Convert sang DTO
            List<BuildingListDTO> dtoList = filtered.stream()
                    .map(b -> {
                        List<String> names = staffRepository.findStaffNamesByBuildingId(b.getId());
                        return buildingListConverter.toDto(b, String.join(" - ", names));
                    })
                    .collect(Collectors.toList());

            // Phân trang thủ công
            return toPage(dtoList, pageable);
        }

        // ── Trường hợp thông thường — giữ nguyên logic cũ ───────────────
        Page<BuildingEntity> buildingPage = buildingRepository.searchBuildings(filter, pageable);
        List<BuildingListDTO> dtoList = new ArrayList<>();
        for (BuildingEntity b : buildingPage) {
            List<String> managersName = staffRepository.findStaffNamesByBuildingId(b.getId());
            dtoList.add(buildingListConverter.toDto(b, String.join(" - ", managersName)));
        }
        return new PageImpl<>(dtoList, buildingPage.getPageable(), buildingPage.getTotalElements());
    }

    // Haversine — tính khoảng cách (mét) giữa 2 tọa độ
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private double haversine(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Lọc danh sách entity theo bán kính Haversine
    private List<BuildingEntity> filterByLocation(List<BuildingEntity> buildings, BuildingFilterDTO filter) {
        double lat = filter.getLat();
        double lng = filter.getLng();
        int radius = filter.getRadius() != null ? filter.getRadius() : 1000;

        return buildings.stream()
                .filter(b -> b.getLatitude() != null && b.getLongitude() != null)
                .filter(b -> haversine(
                        lat,
                        lng,
                        b.getLatitude().doubleValue(),
                        b.getLongitude().doubleValue()) <= radius
                )
                .collect(Collectors.toList());
    }

    // Phân trang thủ công từ một List đã được lọc
    private <T> Page<T> toPage(List<T> list, Pageable pageable) {
        int total = list.size();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), total);
        List<T> pageContent = (start >= total) ? Collections.emptyList() : list.subList(start, end);
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
                    .orElseThrow(() -> new BusinessException("Không tìm thấy bất động sản"));
            if (saleContractRepository.countByBuildingId(dto.getId()) == 1) {
                throw new BusinessException("Bất động sản đã đuọc bán, không thể sửa");
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
                .orElseThrow(() -> new BusinessException("Không tìm thấy bất động sản"));
        return buildingFormConverter.toDTO(buildingEntity);
    }

    @Override
    public void delete(Long id) {
        if (!buildingRepository.existsById(id)) {
            throw new BusinessException("Không tìm thấy tòa nhà để xóa");
        }
        long count = contractRepository.countByBuildingId(id);
        if (count > 0) {
            throw new BusinessException("Không thể xóa! Tòa nhà đang có hợp đồng liên quan.");
        }
        buildingRepository.deleteById(id);
    }

    @Override
    public BuildingDetailDTO viewById(Long id) {
        BuildingEntity buildingEntity = buildingRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy bất động sản"));
        return buildingDetailConverter.toDTO(buildingEntity);
    }

    @Override
    public Map<String, Long> getBuildingsName() {
        List<BuildingEntity> buildingEntities = buildingRepository.findAll();
        Map<String, Long> result = new LinkedHashMap<>();
        for (BuildingEntity b : buildingEntities) {
            result.put(b.getName(), b.getId());
        }
        return result;
    }

    @Override
    public Map<String, Long> getBuildingsNameByStaff(Long staffId) {
        List<BuildingEntity> buildingEntities = buildingRepository.findAllByStaffId(staffId);
        Map<String, Long> result = new LinkedHashMap<>();
        for (BuildingEntity b : buildingEntities) {
            result.put(b.getName(), b.getId());
        }
        return result;
    }

    @Override
    public List<BuildingDetailDTO> searchByCustomer(BuildingFilterDTO filter) {
        List<BuildingEntity> buildings = buildingRepository.searchBuildingsByCustomer(filter);
        List<BuildingDetailDTO> dtoList = new ArrayList<>();
        for (BuildingEntity b : buildings) {
            dtoList.add(buildingDetailConverter.toDTO(b));
        }
        return dtoList;
    }

    @Override
    public Page<BuildingDetailDTO> searchByStaff(BuildingFilterDTO filter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        // Nếu có lọc vị trí — lấy tất cả rồi lọc Haversine rồi phân trang thủ công
        if (filter.getLat() != null && filter.getLng() != null) {
            Page<BuildingEntity> allMatchedPage =
                    buildingRepository.searchBuildings(filter, PageRequest.of(0, Integer.MAX_VALUE));
            List<BuildingEntity> filtered = filterByLocation(allMatchedPage.getContent(), filter);
            List<BuildingDetailDTO> dtoList = filtered.stream()
                    .map(buildingDetailConverter::toDTO)
                    .collect(Collectors.toList());
            return toPage(dtoList, pageable);
        }

        // Nếu không có lọc theo vị trí -> Logic cũ
        Page<BuildingEntity> buildingPage = buildingRepository.searchBuildings(filter, pageable);
        List<BuildingDetailDTO> dtoList = new ArrayList<>();
        for (BuildingEntity b : buildingPage) {
            dtoList.add(buildingDetailConverter.toDTO(b));
        }
        return new PageImpl<>(dtoList, buildingPage.getPageable(), buildingPage.getTotalElements());
    }

    @Override
    public boolean isStaffManagesBuilding(Long staffId, Long buildingId) {
        return buildingRepository.isStaffManagesBuilding(staffId, buildingId);
    }
}
