package com.estate.service.impl;

import com.estate.repository.RentAreaRepository;
import com.estate.service.RentAreaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RentAreaServiceImpl implements RentAreaService {
    @Autowired
    RentAreaRepository rentAreaRepository;

    @Override
    public Map<Long, List<Integer>> getAllRentAreas() {
        List<Object[]> raw = rentAreaRepository.getAllRentAreasRaw();

        Map<Long, List<Integer>> result = new HashMap<>();

        for (Object[] row : raw) {
            Long buildingId = (Long) row[0];
            Integer value = (Integer) row[1];

            result.computeIfAbsent(buildingId, k -> new ArrayList<>()).add(value);
        }

        return result;
    }
}
