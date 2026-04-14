package com.estate.api.admin;

import com.estate.dto.ContractFilterDTO;
import com.estate.dto.ContractFormDTO;
import com.estate.dto.ContractListDTO;
import com.estate.exception.InputValidationException;
import com.estate.service.ContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/contract")
@RequiredArgsConstructor
public class AdminContractAPI {
    private final ContractService contractService;

    @GetMapping("/list/page")
    public Page<ContractListDTO> getContractsPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        return contractService.getContracts(page - 1, size);
    }

    @GetMapping("/search/page")
    public Page<ContractListDTO> getContractsSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            ContractFilterDTO filter
    ) {
        return contractService.search(filter, page - 1, size);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addContract(
            @Valid @RequestBody ContractFormDTO dto,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            String message;

            if (!result.getFieldErrors().isEmpty()) {
                message = result.getFieldErrors().getFirst().getDefaultMessage();
            } else {
                message = result.getAllErrors().getFirst().getDefaultMessage();
            }

            throw new InputValidationException(message);
        }

        contractService.save(dto);
        return ResponseEntity.ok("Thêm hợp đồng thành công");
    }

    @PutMapping("/edit")
    public ResponseEntity<?> editContract(
            @Valid @RequestBody ContractFormDTO dto,
            BindingResult result
    ) {
        if (result.hasErrors()) {
            String message;

            if (!result.getFieldErrors().isEmpty()) {
                message = result.getFieldErrors().getFirst().getDefaultMessage();
            } else {
                message = result.getAllErrors().getFirst().getDefaultMessage();
            }

            throw new InputValidationException(message);
        }

        contractService.save(dto);
        return ResponseEntity.ok("Sửa hợp đồng thành công");
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteContract(@PathVariable Long id) {
        contractService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/status")
    public ResponseEntity<?> statusUpdate() {
        contractService.statusUpdate();
        return ResponseEntity.ok("Cập nhật trạng thái hợp đồng thành công");
    }
}
