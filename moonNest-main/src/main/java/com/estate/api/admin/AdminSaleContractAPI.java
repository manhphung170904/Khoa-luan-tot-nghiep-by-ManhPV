package com.estate.api.admin;

import com.estate.dto.SaleContractFilterDTO;
import com.estate.dto.SaleContractFormDTO;
import com.estate.dto.SaleContractListDTO;
import com.estate.exception.InputValidationException;
import com.estate.service.SaleContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/sale-contract")
@RequiredArgsConstructor
public class AdminSaleContractAPI {
    private final SaleContractService saleContractService;

    @GetMapping("/list/page")
    public Page<SaleContractListDTO> getSaleContractsPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        return saleContractService.getSaleContracts(page - 1, size);
    }

    @GetMapping("/search/page")
    public Page<SaleContractListDTO> getSaleContractsSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            SaleContractFilterDTO filter
    ) {
        return saleContractService.search(filter, page - 1, size);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteSaleContract(@PathVariable Long id) {
        saleContractService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/add")
    public ResponseEntity<?> addSaleContract(
            @Valid @RequestBody SaleContractFormDTO dto,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            String message = result.getFieldErrors().isEmpty()
                    ? result.getAllErrors().getFirst().getDefaultMessage()
                    : result.getFieldErrors().getFirst().getDefaultMessage();
            throw new InputValidationException(message);
        }
        saleContractService.save(dto);
        return ResponseEntity.ok("Thêm hợp đồng mua bán thành công");
    }

    @PutMapping("/edit")
    public ResponseEntity<?> editSaleContract(
            @Valid @RequestBody SaleContractFormDTO dto,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            String message = result.getFieldErrors().isEmpty()
                    ? result.getAllErrors().getFirst().getDefaultMessage()
                    : result.getFieldErrors().getFirst().getDefaultMessage();
            throw new InputValidationException(message);
        }
        saleContractService.save(dto);
        return ResponseEntity.ok("Sửa hợp đồng mua bán thành công");
    }
}