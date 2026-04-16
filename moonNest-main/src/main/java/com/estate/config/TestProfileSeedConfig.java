package com.estate.config;

import com.estate.repository.CustomerRepository;
import com.estate.repository.EmailVerificationRepository;
import com.estate.repository.RefreshTokenRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.StaffEntity;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("test")
public class TestProfileSeedConfig {
    @Bean
    CommandLineRunner seedTestUsers(StaffRepository staffRepository,
                                    CustomerRepository customerRepository,
                                    RefreshTokenRepository refreshTokenRepository,
                                    EmailVerificationRepository emailVerificationRepository,
                                    PasswordEncoder passwordEncoder) {
        return args -> {
            refreshTokenRepository.deleteAll();
            emailVerificationRepository.deleteAll();

            if (staffRepository.findByUsername("api_admin").isEmpty()) {
                StaffEntity admin = new StaffEntity();
                admin.setUsername("api_admin");
                admin.setPassword(passwordEncoder.encode("12345678"));
                admin.setFullName("API Admin");
                admin.setPhone("0900000001");
                admin.setEmail("api_admin@moonnest.test");
                admin.setRole("ADMIN");
                admin.setAuthOrigin("LOCAL");
                staffRepository.save(admin);
            }

            if (staffRepository.findByUsername("api_staff").isEmpty()) {
                StaffEntity staff = new StaffEntity();
                staff.setUsername("api_staff");
                staff.setPassword(passwordEncoder.encode("12345678"));
                staff.setFullName("API Staff");
                staff.setPhone("0900000002");
                staff.setEmail("api_staff@moonnest.test");
                staff.setRole("STAFF");
                staff.setAuthOrigin("LOCAL");
                staffRepository.save(staff);
            }

            if (customerRepository.findByUsername("api_customer") == null) {
                CustomerEntity customer = new CustomerEntity();
                customer.setUsername("api_customer");
                customer.setPassword(passwordEncoder.encode("12345678"));
                customer.setFullName("API Customer");
                customer.setPhone("0900000003");
                customer.setEmail("api_customer@moonnest.test");
                customer.setTaxCode("0312345678");
                customer.setRole("CUSTOMER");
                customer.setAuthOrigin("LOCAL");
                customerRepository.save(customer);
            }
        };
    }
}
