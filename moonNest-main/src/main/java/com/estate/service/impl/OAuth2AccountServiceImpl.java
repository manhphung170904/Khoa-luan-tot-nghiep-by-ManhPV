package com.estate.service.impl;

import com.estate.repository.OAuthIdentityRepository;
import com.estate.repository.CustomerRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.OAuthIdentityEntity;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.StaffEntity;
import com.estate.security.CustomUserDetails;
import com.estate.security.oauth2.OAuth2PrincipalInfo;
import com.estate.service.OAuth2AccountService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Locale;

@Service
@Transactional
public class OAuth2AccountServiceImpl implements OAuth2AccountService {
    private static final String ACCOUNT_SOURCE_LOCAL = "LOCAL";
    private static final String ACCOUNT_SOURCE_OAUTH = "OAUTH";
    private static final String CONFLICT_LINK_MESSAGE =
            "Tài khoản này chỉ có thể đăng nhập qua username/email hoặc tài khoản Google đã liên kết.";

    private final StaffRepository staffRepository;
    private final CustomerRepository customerRepository;
    private final OAuthIdentityRepository oauthIdentityRepository;

    public OAuth2AccountServiceImpl(StaffRepository staffRepository,
                                    CustomerRepository customerRepository,
                                    OAuthIdentityRepository oauthIdentityRepository) {
        this.staffRepository = staffRepository;
        this.customerRepository = customerRepository;
        this.oauthIdentityRepository = oauthIdentityRepository;
    }

    @Override
    public CustomUserDetails resolveOAuth2User(OAuth2PrincipalInfo principalInfo) {
        if (!StringUtils.hasText(principalInfo.provider()) || !StringUtils.hasText(principalInfo.providerUserId())) {
            throw new IllegalArgumentException("OAuth2 provider identity is missing");
        }

        OAuthIdentityEntity linkedIdentity = oauthIdentityRepository
                .findByProviderAndProviderUserId(principalInfo.provider(), principalInfo.providerUserId())
                .orElse(null);
        if (linkedIdentity != null) {
            return loadUser(linkedIdentity.getUserType(), linkedIdentity.getUserId());
        }

        String email = normalizeEmail(principalInfo.email());
        if (StringUtils.hasText(email)) {
            StaffEntity staff = staffRepository.findByEmail(email).orElse(null);
            if (staff != null && isLocalAccount(staff.getAuthOrigin())) {
                ensureNoConflictingGoogleLink("STAFF", staff.getId(), principalInfo);
                return linkAndLoad(principalInfo, "STAFF", staff.getId());
            }

            CustomerEntity customer = customerRepository.findByEmail(email).orElse(null);
            if (customer != null && isLocalAccount(customer.getAuthOrigin())) {
                ensureNoConflictingGoogleLink("CUSTOMER", customer.getId(), principalInfo);
                return linkAndLoad(principalInfo, "CUSTOMER", customer.getId());
            }
        }

        CustomerEntity customer = createOAuthCustomer(principalInfo);
        linkIdentity(principalInfo, "CUSTOMER", customer.getId(), customer.getEmail(), customer.getFullName());
        return loadUser("CUSTOMER", customer.getId());
    }

    @Override
    public CustomUserDetails linkOAuth2User(OAuth2PrincipalInfo principalInfo, String userType, Long userId) {
        if (!StringUtils.hasText(principalInfo.provider()) || !StringUtils.hasText(principalInfo.providerUserId())) {
            throw new IllegalArgumentException("OAuth2 provider identity is missing");
        }
        if (!StringUtils.hasText(userType) || userId == null) {
            throw new IllegalArgumentException("Target account is missing");
        }

        OAuthIdentityEntity existingIdentity = oauthIdentityRepository
                .findByProviderAndProviderUserId(principalInfo.provider(), principalInfo.providerUserId())
                .orElse(null);
        if (existingIdentity != null
                && !userType.equalsIgnoreCase(existingIdentity.getUserType())
                && !userId.equals(existingIdentity.getUserId())) {
            throw new IllegalArgumentException("Tài khoản Google này đã được sử dụng");
        }

        OAuthIdentityEntity currentLink = oauthIdentityRepository
                .findByProviderAndUserTypeAndUserId(principalInfo.provider(), userType, userId)
                .orElse(null);
        if (currentLink != null) {
            oauthIdentityRepository.delete(currentLink);
        }

        linkIdentity(principalInfo, userType, userId, principalInfo.email(), principalInfo.displayName());
        return loadUser(userType, userId);
    }

    private CustomUserDetails linkAndLoad(OAuth2PrincipalInfo principalInfo,
                                          String userType,
                                          Long userId) {
        linkIdentity(principalInfo, userType, userId, principalInfo.email(), principalInfo.displayName());
        return loadUser(userType, userId);
    }

    private void linkIdentity(OAuth2PrincipalInfo principalInfo,
                              String userType,
                              Long userId,
                              String email,
                              String displayName) {
        OAuthIdentityEntity existingIdentity = oauthIdentityRepository
                .findByProviderAndProviderUserId(principalInfo.provider(), principalInfo.providerUserId())
                .orElse(null);
        if (existingIdentity != null
                && (!userType.equalsIgnoreCase(existingIdentity.getUserType()) || !userId.equals(existingIdentity.getUserId()))) {
            throw new IllegalArgumentException("Tài khoản Google này đã được sử dụng");
        }

        OAuthIdentityEntity identity = new OAuthIdentityEntity();
        identity.setProvider(principalInfo.provider());
        identity.setProviderUserId(principalInfo.providerUserId());
        identity.setUserType(userType);
        identity.setUserId(userId);
        identity.setEmail(normalizeEmail(email));
        identity.setDisplayName(resolveDisplayName(principalInfo.displayName(), displayName, email));
        oauthIdentityRepository.save(identity);
    }

    private void ensureNoConflictingGoogleLink(String userType,
                                               Long userId,
                                               OAuth2PrincipalInfo principalInfo) {
        OAuthIdentityEntity currentLink = oauthIdentityRepository
                .findByProviderAndUserTypeAndUserId(principalInfo.provider(), userType, userId)
                .orElse(null);
        if (currentLink != null && !principalInfo.providerUserId().equals(currentLink.getProviderUserId())) {
            throw new IllegalArgumentException(CONFLICT_LINK_MESSAGE);
        }
    }

    private CustomerEntity createOAuthCustomer(OAuth2PrincipalInfo principalInfo) {
        CustomerEntity customer = new CustomerEntity();
        customer.setUsername(generateUsername(principalInfo));
        customer.setPassword(null);
        customer.setFullName(resolveFullName(principalInfo.displayName(), principalInfo.email()));
        customer.setEmail(normalizeEmail(principalInfo.email()));
        customer.setRole("CUSTOMER");
        customer.setAuthOrigin(ACCOUNT_SOURCE_OAUTH);
        return customerRepository.save(customer);
    }

    private String generateUsername(OAuth2PrincipalInfo principalInfo) {
        String base = normalizeUsernameSeed(principalInfo.displayName());
        if (!StringUtils.hasText(base)) {
            base = normalizeUsernameSeed(principalInfo.email());
        }
        if (!StringUtils.hasText(base)) {
            base = "googleuser";
        }

        String candidate = base;
        int suffix = 1;
        while (staffRepository.existsByUsername(candidate) || customerRepository.existsByUsername(candidate)) {
            candidate = base + suffix;
            suffix++;
        }
        return candidate;
    }

    private String normalizeUsernameSeed(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "");
        return normalized.length() > 20 ? normalized.substring(0, 20) : normalized;
    }

    private CustomUserDetails loadUser(String userType, Long userId) {
        if ("STAFF".equals(userType)) {
            StaffEntity staff = staffRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("Linked staff account not found"));
            return new CustomUserDetails(
                    staff.getId(),
                    staff.getUsername(),
                    staff.getPassword(),
                    staff.getRole(),
                    "STAFF",
                    accountSource(staff.getAuthOrigin())
            );
        }

        CustomerEntity customer = customerRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Linked customer account not found"));
        return new CustomUserDetails(
                customer.getId(),
                customer.getUsername(),
                customer.getPassword(),
                customer.getRole(),
                "CUSTOMER",
                accountSource(customer.getAuthOrigin())
        );
    }

    private String resolveFullName(String displayName, String email) {
        if (StringUtils.hasText(displayName)) {
            String trimmed = displayName.trim();
            return trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
        }

        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail)) {
            return "Google User";
        }

        int at = normalizedEmail.indexOf('@');
        String fallback = at > 0 ? normalizedEmail.substring(0, at) : normalizedEmail;
        return fallback.length() > 100 ? fallback.substring(0, 100) : fallback;
    }

    private String resolveDisplayName(String fallbackDisplayName, String existingDisplayName, String email) {
        if (StringUtils.hasText(fallbackDisplayName)) {
            return fallbackDisplayName;
        }
        if (StringUtils.hasText(existingDisplayName)) {
            return existingDisplayName;
        }
        return resolveFullName(null, email);
    }

    private boolean isLocalAccount(String authOrigin) {
        return authOrigin == null || ACCOUNT_SOURCE_LOCAL.equalsIgnoreCase(authOrigin);
    }

    private String accountSource(String authOrigin) {
        return StringUtils.hasText(authOrigin) ? authOrigin : ACCOUNT_SOURCE_LOCAL;
    }

    private String fetchEmail(String userType, Long userId) {
        if ("STAFF".equalsIgnoreCase(userType)) {
            StaffEntity staff = staffRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("Linked staff account not found"));
            return staff.getEmail();
        }
        CustomerEntity customer = customerRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Linked customer account not found"));
        return customer.getEmail();
    }

    private String fetchDisplayName(String userType, Long userId) {
        if ("STAFF".equalsIgnoreCase(userType)) {
            StaffEntity staff = staffRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("Linked staff account not found"));
            return staff.getFullName();
        }
        CustomerEntity customer = customerRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Linked customer account not found"));
        return customer.getFullName();
    }

    private String normalizeEmail(String email) {
        return StringUtils.hasText(email) ? email.trim().toLowerCase(Locale.ROOT) : null;
    }
}
