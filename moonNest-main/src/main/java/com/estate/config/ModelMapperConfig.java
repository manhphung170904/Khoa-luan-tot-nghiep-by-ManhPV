package com.estate.config;

import com.estate.dto.*;
import com.estate.repository.entity.*;
import org.modelmapper.AbstractConverter;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeMap;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Configuration
public class ModelMapperConfig {
    @Bean
    public ModelMapper modelMapper() {
        ModelMapper mapper = new ModelMapper();

        mapper.getConfiguration()
                .setSkipNullEnabled(true)
                .setFieldMatchingEnabled(true)
                .setMatchingStrategy(MatchingStrategies.STRICT);

        // Converter LocalDateTime -> LocalDate
        mapper.addConverter(new AbstractConverter<LocalDateTime, LocalDate>() {
            @Override
            protected LocalDate convert(LocalDateTime source) {
                return source == null ? null : source.toLocalDate();
            }
        });

        // Converter LocalDate -> LocalDateTime
        mapper.addConverter(new AbstractConverter<LocalDate, LocalDateTime>() {
            @Override
            protected LocalDateTime convert(LocalDate source) {
                return source == null ? null : source.atStartOfDay();
            }
        });


        /* -------------------- BUILDING -------------------- **/
        TypeMap<BuildingFormDTO, BuildingEntity> buildingMap =
                mapper.createTypeMap(BuildingFormDTO.class, BuildingEntity.class); // tạo trống

        buildingMap.addMappings(m -> {
            m.skip(BuildingEntity::setDistrict);
            m.skip(BuildingEntity::setStaffs_buildings);
            m.skip(BuildingEntity::setRentAreas);
        });

        buildingMap.implicitMappings();


        /* -------------------- CONTRACT -------------------- **/
        TypeMap<ContractFormDTO, ContractEntity> contractMap =
                mapper.createTypeMap(ContractFormDTO.class, ContractEntity.class);

        contractMap.addMappings(m -> {
            m.skip(ContractEntity::setBuilding);
            m.skip(ContractEntity::setCustomer);
            m.skip(ContractEntity::setStaff);
        });

        contractMap.implicitMappings();

        /* -------------------- INVOICE -------------------- **/
        TypeMap<InvoiceFormDTO, InvoiceEntity> invoiceMap =
                mapper.createTypeMap(InvoiceFormDTO.class, InvoiceEntity.class);

        invoiceMap.addMappings(m -> {
            m.skip(InvoiceEntity::setContract);
            m.skip(InvoiceEntity::setCustomer);
            m.skip(InvoiceEntity::setDetails);
        });

        invoiceMap.implicitMappings();

        /* -------------------- INVOICE DETAIL -------------------- **/
        TypeMap<InvoiceDetailDetailDTO, InvoiceDetailEntity> invoiceDetailMap =
                mapper.createTypeMap(InvoiceDetailDetailDTO.class, InvoiceDetailEntity.class);

        invoiceDetailMap.addMappings(m ->
                m.skip(InvoiceDetailEntity::setInvoice));

        invoiceDetailMap.implicitMappings();

        /* -------------------- UTILITY METER -------------------- **/
        TypeMap<UtilityMeterDetailDTO, UtilityMeterEntity> utilityMeterMap =
                mapper.createTypeMap(UtilityMeterDetailDTO.class, UtilityMeterEntity.class);

        utilityMeterMap.addMappings(m ->
                m.skip(UtilityMeterEntity::setContract));

        utilityMeterMap.implicitMappings();

        return mapper;
    }
}

