package com.estate.service.impl;

import com.estate.repository.DistrictRepository;
import com.estate.repository.entity.DistrictEntity;
import com.estate.service.DistrictService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DistrictServiceImpl implements DistrictService {

    @Autowired
    DistrictRepository districtRepository;

    @Override
    public Map<String, Long> findAll() {
        List<Object[]> list = districtRepository.getDistricts();

        Map<String, Long> result = new LinkedHashMap<>();
        for (Object[] row : list) {
            result.put((String) row[0], (Long) row[1]);
        }

        return result;
    }
}
