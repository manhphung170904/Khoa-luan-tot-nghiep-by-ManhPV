package com.estate.api.staff;

import com.estate.dto.InvoiceDetailDTO;
import com.estate.dto.InvoiceFilterDTO;
import com.estate.dto.InvoiceFormDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/staff/invoices")
@RequiredArgsConstructor
public class StaffInvoiceAPI {
    private final InvoiceService invoiceService;

    @GetMapping("/search")
    public Page<InvoiceDetailDTO> getInvoicesSearchPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            InvoiceFilterDTO filter,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        return invoiceService.searchByStaff(filter, page - 1, size, user.getUserId());
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteInvoice(@PathVariable Long id) {
        invoiceService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping ("/edit")
    public ResponseEntity<?> editInvoice(@RequestBody InvoiceFormDTO dto) {
        invoiceService.save(dto);
        return ResponseEntity.ok("Sửa hóa đơn thành công");
    }

    @PostMapping("/add")
    public ResponseEntity<?> addInvoice(@RequestBody InvoiceFormDTO dto) {
        invoiceService.save(dto);
        return ResponseEntity.ok("Thêm hóa đơn thành công");
    }
}
