package com.estate.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Tính absolute path từ working directory của JVM (thường là thư mục gốc project)
        // Dùng File để tự xử lý separator trên cả Windows lẫn Linux
        String staticBase = new File("src/main/resources/static").getAbsolutePath()
                + File.separator;

        // file: URI trên Windows: file:///D:/path/to/static/
        // file: URI trên Linux:   file:/home/user/.../static/
        String resourceBase = new File(staticBase).toURI().toString();

        registry.addResourceHandler("/images/planning_map_img/**")
                .addResourceLocations(resourceBase + "images/planning_map_img/");

        registry.addResourceHandler("/images/building_img/**")
                .addResourceLocations(resourceBase + "images/building_img/");
    }
}