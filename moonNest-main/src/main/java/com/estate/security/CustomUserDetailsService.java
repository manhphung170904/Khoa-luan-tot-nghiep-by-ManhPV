package com.estate.security;

import com.estate.repository.CustomerRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.StaffEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final StaffRepository staffRepository;
    private final CustomerRepository customerRepository;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {
        return loadUserByLoginIdentifier(username);
    }

    public CustomUserDetails loadUserByLoginIdentifier(String identifier)
            throws UsernameNotFoundException {
        Optional<StaffEntity> staff = staffRepository.findByUsername(identifier);
        if (staff.isPresent()) {
            return toUserDetails(staff.get());
        }

        CustomerEntity customer = customerRepository.findByUsername(identifier);
        if (customer != null) {
            return toUserDetails(customer);
        }

        Optional<StaffEntity> staffByEmail = staffRepository.findByEmail(identifier);
        if (staffByEmail.isPresent() && isLocalAccount(staffByEmail.get().getAuthOrigin())) {
            return toUserDetails(staffByEmail.get());
        }

        Optional<CustomerEntity> customerByEmail = customerRepository.findByEmail(identifier);
        if (customerByEmail.isPresent() && isLocalAccount(customerByEmail.get().getAuthOrigin())) {
            return toUserDetails(customerByEmail.get());
        }

        throw new UsernameNotFoundException("User not found");
    }

    public CustomUserDetails loadUserById(String userType, Long userId) {
        if ("STAFF".equals(userType)) {
            StaffEntity staff = staffRepository.findById(userId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));
            return toUserDetails(staff);
        }

        if ("CUSTOMER".equals(userType)) {
            CustomerEntity customer = customerRepository.findById(userId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));
            return toUserDetails(customer);
        }

        throw new UsernameNotFoundException("User not found");
    }

    private CustomUserDetails toUserDetails(StaffEntity staff) {
        return new CustomUserDetails(
                staff.getId(),
                staff.getUsername(),
                staff.getPassword(),
                staff.getRole(),
                "STAFF",
                accountSource(staff.getAuthOrigin())
        );
    }

    private CustomUserDetails toUserDetails(CustomerEntity customer) {
        return new CustomUserDetails(
                customer.getId(),
                customer.getUsername(),
                customer.getPassword(),
                customer.getRole(),
                "CUSTOMER",
                accountSource(customer.getAuthOrigin())
        );
    }

    private boolean isLocalAccount(String authOrigin) {
        return authOrigin == null || "LOCAL".equalsIgnoreCase(authOrigin);
    }

    private String accountSource(String authOrigin) {
        return authOrigin == null || authOrigin.isBlank() ? "LOCAL" : authOrigin;
    }
}
