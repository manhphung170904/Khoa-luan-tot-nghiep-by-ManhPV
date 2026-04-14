package com.estate.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomerFormDTO {
    private Long id;

    @Size(min = 4, max = 30, message = "Username phải từ 4–30 ký tự")
    private String username;

    @Size(min = 6, max = 50, message = "Password phải từ 6–50 ký tự")
    private String password;

    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    private String fullName;

    @Pattern(
            regexp = "^(0[0-9]{9})$",
            message = "Số điện thoại không hợp lệ (phải gồm 10 số và bắt đầu bằng 0)"
    )
    private String phone;

    @Size(max = 100, message = "Email tối đa 100 ký tự")
    private String email;

    @Size(min = 1, message = "Vui lòng chọn ít nhất một nhân viên quản lý")
    private List<Long> staffIds = new ArrayList<>();
}
