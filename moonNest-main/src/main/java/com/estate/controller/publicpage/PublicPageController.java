package com.estate.controller.publicpage;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/moonnest")
@RequiredArgsConstructor
public class PublicPageController {
    @GetMapping("")
    public String home(
            Model model,
            @RequestParam(required = false) String buildingName
    ) {
        model.addAttribute("buildingName", buildingName == null ? "" : buildingName);

        return "publicPage/publicPage";
    }
}
