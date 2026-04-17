package com.estate.api.v1.staff;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.InvoiceDetailDTO;
import com.estate.dto.InvoiceFilterDTO;
import com.estate.dto.InvoiceFormDTO;
import com.estate.dto.PageResponse;
import com.estate.security.CustomUserDetails;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff/invoices")
@RequiredArgsConstructor
public class StaffInvoiceV1API {
    private final InvoiceService invoiceService;

    @GetMapping
    public PageResponse<InvoiceDetailDTO> getInvoices(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            InvoiceFilterDTO filter,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        return PageResponse.from(invoiceService.searchByStaff(filter, page - 1, size, user.getUserId()));
    }

    @PostMapping
    public ResponseEntity<ApiMessageResponse<Void>> addInvoice(@RequestBody InvoiceFormDTO dto,
                                                               @AuthenticationPrincipal CustomUserDetails user) {
        invoiceService.saveForStaff(dto, user.getUserId());
        return ResponseEntity.ok(ApiMessageResponse.of("Invoice created successfully."));
    }

    @PutMapping("/{id}")
    public ApiMessageResponse<Void> editInvoice(@PathVariable Long id,
                                                @RequestBody InvoiceFormDTO dto,
                                                @AuthenticationPrincipal CustomUserDetails user) {
        dto.setId(id);
        invoiceService.saveForStaff(dto, user.getUserId());
        return ApiMessageResponse.of("Invoice updated successfully.");
    }

    @DeleteMapping("/{id}")
    public ApiMessageResponse<Void> deleteInvoice(@PathVariable Long id,
                                                  @AuthenticationPrincipal CustomUserDetails user) {
        invoiceService.deleteForStaff(id, user.getUserId());
        return ApiMessageResponse.of("Invoice deleted successfully.");
    }
}
