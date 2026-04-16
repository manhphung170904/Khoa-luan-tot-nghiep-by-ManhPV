package com.estate.api.v1.admin;

import com.estate.dto.ApiMessageResponse;
import com.estate.dto.InvoiceFilterDTO;
import com.estate.dto.InvoiceFormDTO;
import com.estate.dto.InvoiceListDTO;
import com.estate.dto.PageResponse;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/invoices")
@RequiredArgsConstructor
public class AdminInvoiceV1API {
    private final InvoiceService invoiceService;

    @GetMapping
    public PageResponse<InvoiceListDTO> getInvoices(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @ModelAttribute InvoiceFilterDTO filter
    ) {
        return PageResponse.from(invoiceService.search(filter, page - 1, size));
    }

    @PostMapping
    public ResponseEntity<ApiMessageResponse<Void>> addInvoice(@RequestBody InvoiceFormDTO dto) {
        invoiceService.save(dto);
        return ResponseEntity.ok(ApiMessageResponse.of("Tạo hóa đơn thành công."));
    }

    @PutMapping("/{id}")
    public ApiMessageResponse<Void> editInvoice(@PathVariable Long id, @RequestBody InvoiceFormDTO dto) {
        dto.setId(id);
        invoiceService.save(dto);
        return ApiMessageResponse.of("Cập nhật hóa đơn thành công.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        invoiceService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/confirm")
    public ApiMessageResponse<Void> confirmInvoice(@PathVariable Long id) {
        invoiceService.invoiceConfirm(id);
        return ApiMessageResponse.of("Xác nhận hóa đơn thành công.");
    }

    @PutMapping("/status")
    public ApiMessageResponse<Void> updateStatuses() {
        invoiceService.statusUpdate();
        return ApiMessageResponse.of("Cập nhật trạng thái hóa đơn thành công.");
    }
}
