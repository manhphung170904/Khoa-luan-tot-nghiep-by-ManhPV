package com.estate.controller.auth;

import com.estate.security.CustomUserDetails;
import com.estate.security.CustomUserDetailsService;
import com.estate.security.jwt.AuthCookieService;
import com.estate.security.jwt.JwtTokenService;
import com.estate.security.jwt.RefreshTokenService;
import com.estate.repository.CustomerRepository;
import com.estate.repository.StaffRepository;
import com.estate.repository.entity.CustomerEntity;
import com.estate.repository.entity.StaffEntity;
import com.estate.service.AuthService;
import com.estate.service.RegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final RegistrationService registrationService;
    private final CustomUserDetailsService customUserDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final AuthCookieService authCookieService;
    private final StaffRepository staffRepository;
    private final CustomerRepository customerRepository;

    private static final int MIN_PASSWORD_LENGTH = 8;

    @GetMapping("/login")
    public String login(Authentication authentication,
                        @RequestParam(required = false) String successMessage,
                        @RequestParam(required = false) String errorMessage,
                        HttpServletResponse response,
                        Model model) {
        boolean hasVisibleMessage = (successMessage != null && !successMessage.isBlank())
                || (errorMessage != null && !errorMessage.isBlank());

        if (!hasVisibleMessage
                && authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            return "redirect:/login-success";
        }

        authCookieService.clearOAuthLinkCookies(response);

        if (successMessage != null && !successMessage.isBlank()) {
            model.addAttribute("successMessage", successMessage);
        }
        if (errorMessage != null && !errorMessage.isBlank()) {
            model.addAttribute("errorMessage", errorMessage);
        }

        return "login";
    }

    @GetMapping("/register")
    public String register(Authentication authentication,
                           @RequestParam(required = false) String errorMessage,
                           @RequestParam(required = false) String successMessage,
                           Model model) {
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            return "redirect:/login-success";
        }

        if (errorMessage != null && !errorMessage.isBlank()) {
            model.addAttribute("errorMessage", errorMessage);
        }
        if (successMessage != null && !successMessage.isBlank()) {
            model.addAttribute("successMessage", successMessage);
        }

        return "register";
    }

    @PostMapping("/login")
    public String login(@RequestParam String username,
                        @RequestParam String password,
                        HttpServletResponse response) {
        try {
            String identifier = username == null ? "" : username.trim();
            if (identifier.isBlank()) {
                return "redirect:/login?errorMessage=" + encodeMessage("Vui lòng nhập tài khoản.");
            }

            boolean looksLikeEmail = identifier.contains("@");
            CustomUserDetails user = resolveLoginUser(identifier, looksLikeEmail);
            if (user == null) {
                return "redirect:/login?errorMessage=" + encodeMessage("Tài khoản không tồn tại.");
            }

            if ("OAUTH".equalsIgnoreCase(user.getSignupSource()) && looksLikeEmail) {
                return "redirect:/login?errorMessage=" + encodeMessage("Tài khoản này không đăng nhập bằng email. Vui lòng dùng username hoặc đăng nhập qua tài khoản Google.");
            }

            if (user.getPassword() == null || user.getPassword().isBlank()) {
                return "redirect:/login?errorMessage=" + encodeMessage("Tài khoản này chưa thiết lập mật khẩu. Vui lòng xác thực OTP qua email liên kết để đặt mật khẩu.");
            }
            if (!passwordEncoder.matches(password, user.getPassword())) {
                return "redirect:/login?errorMessage=" + encodeMessage("Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.");
            }

            String accessToken = jwtTokenService.generateAccessToken(user);
            String refreshToken = refreshTokenService.issueToken(user);
            authCookieService.setAccessCookie(response, accessToken);
            authCookieService.setRefreshCookie(response, refreshToken);

            return "redirect:/login-success?target=" + encodeMessage(resolveTargetUrl(user));
        } catch (Exception ex) {
            return "redirect:/login?errorMessage=" + encodeMessage("Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.");
        }
    }

    @PostMapping("/auth/register/send-code")
    public String sendRegistrationCode(@RequestParam String email,
                                       RedirectAttributes redirectAttributes) {
        try {
            registrationService.requestRegistration(email);
            redirectAttributes.addAttribute("email", email);
            redirectAttributes.addAttribute("successMessage", "Mã xác nhận đã được gửi đến email liên kết.");
            return "redirect:/register/verify";
        } catch (Exception ex) {
            redirectAttributes.addAttribute("errorMessage", ex.getMessage());
            return "redirect:/register";
        }
    }

    @GetMapping("/register/verify")
    public String registerVerify(@RequestParam String email,
                                 @RequestParam(required = false) String successMessage,
                                 @RequestParam(required = false) String errorMessage,
                                 Model model) {
        model.addAttribute("email", email);
        if (successMessage != null && !successMessage.isBlank()) {
            model.addAttribute("successMessage", successMessage);
        }
        if (errorMessage != null && !errorMessage.isBlank()) {
            model.addAttribute("errorMessage", errorMessage);
        }
        return "register-verify";
    }

    @PostMapping("/auth/register/verify")
    public String verifyRegistration(@RequestParam String email,
                                     @RequestParam String otp,
                                     RedirectAttributes redirectAttributes) {
        try {
            String setupToken = registrationService.verifyRegistrationCode(email, otp);
            redirectAttributes.addAttribute("ticket", setupToken);
            redirectAttributes.addAttribute("email", email);
            redirectAttributes.addAttribute("successMessage", "Xác thực thành công. Vui lòng hoàn tất thông tin tài khoản.");
            return "redirect:/register/complete";
        } catch (Exception ex) {
            redirectAttributes.addAttribute("email", email);
            redirectAttributes.addAttribute("errorMessage", ex.getMessage());
            return "redirect:/register/verify";
        }
    }

    @GetMapping("/register/complete")
    public String registerComplete(@RequestParam String ticket,
                                   @RequestParam String email,
                                   @RequestParam(required = false) String successMessage,
                                   @RequestParam(required = false) String errorMessage,
                                   Model model) {
        model.addAttribute("ticket", ticket);
        model.addAttribute("email", email);
        if (successMessage != null && !successMessage.isBlank()) {
            model.addAttribute("successMessage", successMessage);
        }
        if (errorMessage != null && !errorMessage.isBlank()) {
            model.addAttribute("errorMessage", errorMessage);
        }
        return "register-complete";
    }

    @PostMapping("/auth/register/complete")
    public String completeRegistration(@RequestParam String ticket,
                                       @RequestParam String email,
                                       @RequestParam String fullName,
                                       @RequestParam String username,
                                       @RequestParam String password,
                                       @RequestParam String confirmPassword,
                                       HttpServletResponse response,
                                       RedirectAttributes redirectAttributes) {
        try {
            CustomUserDetails user = (CustomUserDetails) customUserDetailsService.loadUserByLoginIdentifier(
                    registrationService.completeRegistration(ticket, fullName, username, password, confirmPassword).getUsername()
            );
            String accessToken = jwtTokenService.generateAccessToken(user);
            String refreshToken = refreshTokenService.issueToken(user);
            authCookieService.setAccessCookie(response, accessToken);
            authCookieService.setRefreshCookie(response, refreshToken);
            return "redirect:/login-success?target=" + encodeMessage("/customer/home");
        } catch (Exception ex) {
            redirectAttributes.addAttribute("ticket", ticket);
            redirectAttributes.addAttribute("email", email);
            redirectAttributes.addAttribute("errorMessage", ex.getMessage());
            return "redirect:/register/complete";
        }
    }

    @GetMapping("/auth/link/google")
    public String startGoogleLink(@RequestParam(required = false, defaultValue = "/login-success") String returnTo,
                                  Authentication authentication,
                                  HttpServletResponse response) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return "redirect:/login";
        }

        if (!isSafeReturnTo(returnTo)) {
            return "redirect:/login-success";
        }

        CustomUserDetails user = (CustomUserDetails) authentication.getPrincipal();
        authCookieService.setOAuthLinkTargetCookie(response, user.getUserType() + ":" + user.getUserId());
        authCookieService.setOAuthLinkReturnToCookie(response, returnTo);
        return "redirect:/oauth2/authorization/google";
    }

    @GetMapping("/login-success")
    public String loginSuccess(Authentication authentication,
                               @RequestParam(required = false) String target,
                               HttpServletResponse response,
                               Model model) {
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setDateHeader("Expires", 0);

        String resolvedTarget = target;
        if (resolvedTarget != null && !resolvedTarget.isBlank() && !isSafeReturnTo(resolvedTarget)) {
            resolvedTarget = null;
        }
        if ((resolvedTarget == null || resolvedTarget.isBlank())
                && authentication != null
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            resolvedTarget = resolveTargetUrl(authentication);
        }

        if (resolvedTarget == null || resolvedTarget.isBlank()) {
            return "redirect:/login";
        }

        model.addAttribute("target", resolvedTarget);
        return "login-success";

    }

    @GetMapping("/forgot-password")
    public String forgotPassword(@RequestParam(required = false) String errorMessage,
                                 @RequestParam(required = false) String successMessage,
                                 Model model) {
        if (errorMessage != null && !errorMessage.isBlank()) {
            model.addAttribute("errorMessage", errorMessage);
        }
        if (successMessage != null && !successMessage.isBlank()) {
            model.addAttribute("successMessage", successMessage);
        }
        return "forgot-password";
    }

    @PostMapping("/auth/forgot-password")
    public String forgotPasswordSubmit(@RequestParam String email,
                                       RedirectAttributes redirectAttributes) {
        try {
            authService.forgotPassword(email);
            redirectAttributes.addAttribute("email", email);
            redirectAttributes.addAttribute("successMessage", "Mã xác nhận đã được gửi đến email của bạn.");
            return "redirect:/auth/reset-password";
        } catch (Exception ex) {
            redirectAttributes.addAttribute("errorMessage", ex.getMessage());
            return "redirect:/forgot-password";
        }
    }

    @GetMapping("/auth/reset-password")
    public String resetPasswordPage(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String errorMessage,
            @RequestParam(required = false) String successMessage,
            Model model
    ) {
        if (email == null || email.isBlank()) {
            return "redirect:/forgot-password";
        }
        model.addAttribute("email", email);
        if (errorMessage != null && !errorMessage.isBlank()) {
            model.addAttribute("errorMessage", errorMessage);
        }
        if (successMessage != null && !successMessage.isBlank()) {
            model.addAttribute("successMessage", successMessage);
        }
        return "reset-password";
    }

    @PostMapping("/auth/reset-password")
    public String resetPassword(@RequestParam String email,
                                @RequestParam String otp,
                                @RequestParam String newPassword,
                                @RequestParam String confirmPassword,
                                RedirectAttributes redirectAttributes) {
        try {
            authService.resetPassword(email, otp, newPassword, confirmPassword);
            redirectAttributes.addAttribute("successMessage", "Cập nhật mật khẩu thành công.");
            return "redirect:/login";
        } catch (Exception ex) {
            redirectAttributes.addAttribute("email", email);
            redirectAttributes.addAttribute("errorMessage", ex.getMessage());
            return "redirect:/auth/reset-password";
        }
    }

    @GetMapping("/logout")
    public String logoutPage(HttpServletRequest request, HttpServletResponse response) {
        return performLogout(request, response);
    }

    @PostMapping("/auth/logout")
    public String logout(HttpServletRequest request, HttpServletResponse response) {
        return performLogout(request, response);
    }

    private String performLogout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = authCookieService.readCookie(request, AuthCookieService.REFRESH_COOKIE);
        refreshTokenService.revokeRawToken(refreshToken);
        authCookieService.clearOAuthLinkCookies(response);
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        authCookieService.clearAuthCookies(response);
        SecurityContextHolder.clearContext();
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Clear-Site-Data", "\"cookies\"");
        return "redirect:/login?logout";
    }

    private String resolveTargetUrl(Authentication authentication) {
        if (authentication == null) {
            return "/login";
        }

        boolean isCustomer = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER"));
        if (isCustomer) {
            return "/customer/home";
        }

        boolean isStaff = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"));
        if (isStaff) {
            return "/staff/dashboard";
        }

        return "/admin/dashboard";
    }

    private String resolveTargetUrl(CustomUserDetails user) {
        if (user == null) {
            return "/login";
        }

        if ("CUSTOMER".equalsIgnoreCase(user.getUserType())) {
            return "/customer/home";
        }
        if ("STAFF".equalsIgnoreCase(user.getUserType())) {
            return "/staff/dashboard";
        }
        return "/admin/dashboard";
    }

    private boolean isSafeReturnTo(String returnTo) {
        return returnTo != null
                && returnTo.startsWith("/")
                && !returnTo.startsWith("//")
                && !returnTo.contains("://");
    }

    private CustomUserDetails resolveLoginUser(String identifier, boolean looksLikeEmail) {
        if (!looksLikeEmail) {
            CustomUserDetails byUsername = resolveByUsername(identifier);
            if (byUsername != null) {
                return byUsername;
            }
        }

        CustomerEntity customerByEmail = customerRepository.findByEmail(identifier).orElse(null);
        if (customerByEmail != null) {
            return new CustomUserDetails(
                    customerByEmail.getId(),
                    customerByEmail.getUsername(),
                    customerByEmail.getPassword(),
                    customerByEmail.getRole(),
                    "CUSTOMER",
                    customerByEmail.getAuthOrigin() == null ? "LOCAL" : customerByEmail.getAuthOrigin()
            );
        }

        StaffEntity staffByEmail = staffRepository.findByEmail(identifier).orElse(null);
        if (staffByEmail != null) {
            return new CustomUserDetails(
                    staffByEmail.getId(),
                    staffByEmail.getUsername(),
                    staffByEmail.getPassword(),
                    staffByEmail.getRole(),
                    "STAFF",
                    staffByEmail.getAuthOrigin() == null ? "LOCAL" : staffByEmail.getAuthOrigin()
            );
        }

        if (looksLikeEmail) {
            return null;
        }

        return resolveByUsername(identifier);
    }

    private CustomUserDetails resolveByUsername(String identifier) {
        StaffEntity staff = staffRepository.findByUsername(identifier).orElse(null);
        if (staff != null) {
            return new CustomUserDetails(
                    staff.getId(),
                    staff.getUsername(),
                    staff.getPassword(),
                    staff.getRole(),
                    "STAFF",
                    staff.getAuthOrigin() == null ? "LOCAL" : staff.getAuthOrigin()
            );
        }

        CustomerEntity customer = customerRepository.findByUsername(identifier);
        if (customer != null) {
            return new CustomUserDetails(
                    customer.getId(),
                    customer.getUsername(),
                    customer.getPassword(),
                    customer.getRole(),
                    "CUSTOMER",
                    customer.getAuthOrigin() == null ? "LOCAL" : customer.getAuthOrigin()
            );
        }

        return null;
    }

    private String encodeMessage(String message) {
        return java.net.URLEncoder.encode(message, java.nio.charset.StandardCharsets.UTF_8);
    }
}






