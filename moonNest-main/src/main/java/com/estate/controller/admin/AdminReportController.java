package com.estate.controller.admin;

import com.estate.dto.ReportDTO;
import com.estate.security.CustomUserDetails;
import com.estate.service.ReportService;
import com.estate.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Controller
@RequestMapping("/admin/report")
@RequiredArgsConstructor
public class AdminReportController {
    private final ReportService reportService;
    private final StaffService staffService;
    private static final int YEAR_RANGE = 3; // Số năm hiển thị trong dropdown

    @GetMapping("")
    public String showReport(
            @RequestParam(value = "year", required = false) Integer year,
            Model model,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        int currentYear = LocalDate.now().getYear();

        // Nếu không truyền year hoặc truyền năm ngoài range → fallback về năm hiện tại
        int selectedYear = (year != null && year >= currentYear - YEAR_RANGE + 1 && year <= currentYear)
                ? year
                : currentYear;
        model.addAttribute("report", reportService.getReport(selectedYear));

        // Danh sách năm cho dropdown: 3 năm gần nhất, mới nhất lên đầu
        List<Integer> availableYears = IntStream
                .rangeClosed(currentYear - YEAR_RANGE + 1, currentYear)
                .boxed()
                .sorted((a, b) -> b - a) // giảm dần: 2026, 2025, 2024
                .collect(Collectors.toList());
        model.addAttribute("availableYears", availableYears);

        addCommonAttributes(model, user);

        return "admin/report";
    }

    // HELPER
    private void addCommonAttributes(Model model, CustomUserDetails user) {
        model.addAttribute("page", "report");
        model.addAttribute("staffName", staffService.getStaffName(user.getUserId()));
        model.addAttribute("staffAvatar", staffService.getStaffAvatar(user.getUserId()));
    }
}