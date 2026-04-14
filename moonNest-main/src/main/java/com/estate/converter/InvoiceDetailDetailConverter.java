package com.estate.converter;

import com.estate.dto.InvoiceDetailDetailDTO;
import com.estate.exception.BusinessException;
import com.estate.repository.InvoiceRepository;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.InvoiceDetailEntity;
import com.estate.repository.entity.InvoiceEntity;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class InvoiceDetailDetailConverter {
    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private InvoiceRepository invoiceRepository;

    public InvoiceDetailDetailDTO toDTO (InvoiceDetailEntity entity) {
        InvoiceDetailDetailDTO dto = modelMapper.map(entity, InvoiceDetailDetailDTO.class);
        return dto;
    }

    public void toEntity (InvoiceDetailDetailDTO dto, InvoiceDetailEntity entity) {
        modelMapper.map(dto, entity);

        InvoiceEntity invoice = invoiceRepository.findById(dto.getInvoiceId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy hóa đơn"));
        entity.setInvoice(invoice);
    }
}
