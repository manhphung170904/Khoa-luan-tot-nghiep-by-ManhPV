export const apiExpectedMessages = {
  auth: {
    login: "Đăng nhập thành công.",
    logout: "Đăng xuất thành công.",
    forgotPassword: "Nếu tài khoản tồn tại, mã đặt lại mật khẩu đã được gửi."
  },
  admin: {
    buildings: {
      create: "Thêm bất động sản thành công.",
      update: "Cập nhật bất động sản thành công.",
      delete: "Xóa bất động sản thành công.",
      upload: "Tải ảnh lên thành công."
    },
    customers: {
      create: "Thêm khách hàng thành công.",
      delete: "Xóa khách hàng thành công."
    },
    staff: {
      create: "Thêm nhân viên thành công.",
      delete: "Xóa nhân viên thành công.",
      updateCustomerAssignments: "Cập nhật phân công khách hàng thành công.",
      updateBuildingAssignments: "Cập nhật phân công tòa nhà thành công.",
      quickAssign: "Phân công nhanh thành công."
    },
    contracts: {
      create: "Tạo hợp đồng thành công.",
      update: "Cập nhật hợp đồng thành công.",
      delete: "Xóa hợp đồng thành công.",
      updateStatus: "Cập nhật trạng thái hợp đồng thành công."
    },
    invoices: {
      create: "Tạo hóa đơn thành công.",
      update: "Cập nhật hóa đơn thành công.",
      delete: "Xóa hóa đơn thành công.",
      confirm: "Xác nhận hóa đơn thành công.",
      updateStatus: "Cập nhật trạng thái hóa đơn thành công."
    },
    saleContracts: {
      create: "Tạo hợp đồng mua bán thành công.",
      update: "Cập nhật hợp đồng mua bán thành công.",
      delete: "Xóa hợp đồng mua bán thành công."
    },
    propertyRequests: {
      reject: "Từ chối yêu cầu thành công.",
      approve: "Duyệt yêu cầu thành công."
    },
    profile: {
      username: "Cập nhật tên đăng nhập thành công.",
      email: "Cập nhật email thành công.",
      phone: "Cập nhật số điện thoại thành công.",
      password: "Cập nhật mật khẩu thành công.",
      otp: "Gửi mã OTP thành công."
    },
    buildingAdditionalInformation: {
      upload: "Tải ảnh lên thành công."
    }
  },
  customer: {
    propertyRequests: {
      create: "Gửi yêu cầu bất động sản thành công.",
      delete: "Hủy yêu cầu bất động sản thành công."
    },
    profile: {
      username: "Cập nhật tên đăng nhập thành công.",
      email: "Cập nhật email thành công.",
      phone: "Cập nhật số điện thoại thành công.",
      password: "Cập nhật mật khẩu thành công.",
      otp: "Gửi mã OTP thành công."
    }
  },
  staff: {
    invoices: {
      create: "Tạo hóa đơn thành công.",
      update: "Cập nhật hóa đơn thành công.",
      delete: "Xóa hóa đơn thành công."
    },
    profile: {
      username: "Cập nhật tên đăng nhập thành công.",
      email: "Cập nhật email thành công.",
      phone: "Cập nhật số điện thoại thành công.",
      password: "Cập nhật mật khẩu thành công.",
      otp: "Gửi mã OTP thành công."
    }
  }
} as const;
