package com.estate.controller.admin;

import com.estate.dto.InvoiceFilterDTO;
import com.estate.dto.InvoiceFormDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.ContractService;
import com.estate.service.CustomerService;
import com.estate.service.InvoiceService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Map;

@Controller
@RequestMapping("/admin/invoice")
@RequiredArgsConstructor
public class AdminInvoiceController {
    private final CustomerService customerService;
    private final InvoiceService invoiceService;
    private final ContractService contractService;
    private final StaffService staffService;

    @GetMapping("/list")
    public String listInvoices(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("customers", customerService.getCustomersName());

        addCommonAttributes(model, user);

        return "admin/invoice-list";
    }

    @GetMapping("/search")
    public String searchInvoices(
            InvoiceFilterDTO filter,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("filter", filter);

        model.addAttribute("customers", customerService.getCustomersName());

        addCommonAttributes(model, user);

        return "admin/invoice-search";
    }

    @GetMapping("/add")
    public String addInvoiceForm(
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("customers", customerService.getCustomersName());

        model.addAttribute("contracts", contractService.getActiveContracts());
        model.addAttribute("contractFees", contractService.getContractsFees());

        model.addAttribute("rentAreas", invoiceService.getRentAreaByContract());

        addCommonAttributes(model, user);

        return "admin/invoice-add";
    }

    @GetMapping("/{id}")
    public String detailInvoice(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("invoice", invoiceService.viewById(id));

        addCommonAttributes(model, user);

        return "admin/invoice-detail";
    }

    @GetMapping("/edit/{id}")
    public String editInvoice(
            @PathVariable("id") Long id,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        model.addAttribute("invoice", invoiceService.findById(id));
        model.addAttribute("rentArea", invoiceService.getRentArea(id));

        model.addAttribute("customers", customerService.getCustomersName());

        addCommonAttributes(model, user);

        return "admin/invoice-edit";
    }

    // HELPER
    private void addCommonAttributes(Model model, CustomUserDetails user) {
        model.addAttribute("page", "invoice");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));
    }
}
