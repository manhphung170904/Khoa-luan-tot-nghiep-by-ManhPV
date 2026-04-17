package com.estate.config;

import java.io.File;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Value("${building.image.upload-dir:./uploads/building_img}")
    private String buildingUploadDir;

    @Value("${planning.map.image.upload-dir:./uploads/planning_map_img}")
    private String planningMapUploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/images/planning_map_img/**")
                .addResourceLocations(
                        toFileResourceLocation(planningMapUploadDir),
                        "classpath:/static/images/planning_map_img/"
                );

        registry.addResourceHandler("/images/building_img/**")
                .addResourceLocations(
                        toFileResourceLocation(buildingUploadDir),
                        "classpath:/static/images/building_img/"
                );
    }

    private String toFileResourceLocation(String path) {
        return new File(path).getAbsoluteFile().toURI().toString();
    }
}
