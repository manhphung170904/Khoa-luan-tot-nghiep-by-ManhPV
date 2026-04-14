package com.estate.converter;

import com.estate.dto.*;
import com.estate.repository.entity.InvoiceDetailEntity;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.repository.entity.UtilityMeterEntity;
import com.estate.util.MoneyToWords;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class InvoiceDetailConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ContractDetailConverter contractDetailConverter;

    @Autowired
    private CustomerDetailConverter customerDetailConverter;

    @Autowired
    private InvoiceDetailDetailConverter invoiceDetailDetailConverter;

    @Autowired
    private UtilityMeterDetailConverter utilityMeterDetailConverter;

    public InvoiceDetailDTO toDTO(InvoiceEntity entity, UtilityMeterEntity utilityMeter) {
        InvoiceDetailDTO dto = modelMapper.map(entity, InvoiceDetailDTO.class);

        String formattedDueDate = entity.getDueDate()
                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"));
        dto.setDueDate(formattedDueDate);

        String formattedCreatedDate = entity.getCreatedDate()
                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"));
        dto.setCreatedDate(formattedCreatedDate);

        if (entity.getPaidDate() != null) {
            String formattedPaidDate = entity.getPaidDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"));
            dto.setPaidDate(formattedPaidDate); // <-- sửa gán ở đây
        } else {
            dto.setPaidDate(null);
        }

        BigDecimal totalServiceFeeAmount = entity.getDetails().stream()
                .filter(d -> !d.getDescription().toLowerCase().contains("thuê"))
                .map(InvoiceDetailEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        dto.setTotalServiceFeeAmount(totalServiceFeeAmount);

        ContractDetailDTO contractDTO = contractDetailConverter.toDto(entity.getContract());
        dto.setContract(contractDTO);

        CustomerDetailDTO customerDTO = customerDetailConverter.toDTO(entity.getCustomer());
        dto.setCustomer(customerDTO);

        List<InvoiceDetailEntity> detailsEntities = entity.getDetails();
        List<InvoiceDetailDetailDTO> detailsList = new ArrayList<>();
        for (InvoiceDetailEntity details : detailsEntities) {
            detailsList.add(invoiceDetailDetailConverter.toDTO(details));
        }
        dto.setDetails(detailsList);

        UtilityMeterDetailDTO utilityMeterDTO = utilityMeterDetailConverter.toDTO(utilityMeter);
        dto.setUtilityMeter(utilityMeterDTO);

        dto.setAmountInWords(MoneyToWords.convert(entity.getTotalAmount()));

        return dto;
    }
}
