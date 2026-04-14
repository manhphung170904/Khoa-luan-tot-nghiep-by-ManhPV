-- ===================================================================================
-- DATABASE : estate
-- SYSTEM   : Estate Management System v2 + Phase 2 (Bản đồ số)
-- AUTHOR   : MẠNH
-- ===================================================================================
--
-- MÔ TẢ TỔNG QUAN
-- ---------------
-- Hệ thống quản lý bất động sản (BĐS) trên toàn quốc, hỗ trợ 2 loại giao dịch:
--   (1) CHO THUÊ : khách hàng thuê diện tích theo m², phát sinh hóa đơn hàng tháng.
--   (2) MUA BÁN  : khách hàng mua toàn bộ tài sản, không phát sinh hóa đơn.
--   Tích hợp bản đồ số: tọa độ building, tọa độ tiện ích lân cận,
--   Tìm kiếm theo bán kính Haversine, GeoJSON API cho Leaflet.js + Goong Maps.
--
-- ===================================================================================
-- PHÂN LOẠI BẤT ĐỘNG SẢN (property_type)
-- ----------------------------------------
--   OFFICE    : Tòa nhà văn phòng cho thuê hoặc mua bán toàn bộ.
--   SHOPHOUSE : Nhà phố thương mại, tầng trệt kinh doanh.
--   APARTMENT : Căn hộ chung cư cao cấp.
--   WAREHOUSE : Kho xưởng, bãi hàng trong khu công nghiệp.
--
-- PHÂN BỔ 19 BUILDING (đa tỉnh thành):
--   OFFICE    : 5 FOR_RENT (HN×2, HCM×1, ĐN×1, Quảng Ninh×1)
--               2 FOR_SALE (HCM×1, Khánh Hòa×1)
--   SHOPHOUSE : 2 FOR_RENT (HCM×1, HN×1)
--               1 FOR_SALE (HCM×1)
--   APARTMENT : 3 FOR_RENT (HCM×2, HN×1)
--               2 FOR_SALE (HCM×1, ĐN×1)
--   WAREHOUSE : 2 FOR_RENT (HCM×1, Đồng Nai×1)
--               2 FOR_SALE (Bình Dương×1, Quảng Ninh×1)
--
-- ===================================================================================
-- LOẠI GIAO DỊCH (transaction_type)
-- ------------------------------------
--   FOR_RENT : Cho thuê theo m²/tháng. Có contract, invoice, utility_meter, rent_area.
--   FOR_SALE : Bán toàn bộ một lần. Có sale_contract. KHÔNG có invoice, utility_meter.
--              Mỗi building chỉ được bán 1 lần (UNIQUE). Khách mua: NULL username/password.
--
-- ===================================================================================
-- PHÂN QUYỀN HỆ THỐNG (role)
-- ---------------------------
--   ADMIN    : Toàn quyền hệ thống.
--   STAFF    : Nhân viên quản lý tòa nhà và khách hàng được phân công.
--   CUSTOMER : Khách thuê — có tài khoản (xem hóa đơn, thanh toán).
--              Khách mua  — NULL username/password, không cần tài khoản.
--
-- ===================================================================================
-- QUY TẮC NGHIỆP VỤ QUAN TRỌNG
-- --------------------------------
--
-- [1] PHÂN CÔNG NHÂN VIÊN
--     - assignment_building  : gắn staff với building mà họ phụ trách quản lý.
--     - assignment_customer  : gắn staff với customer mà họ phụ trách chăm sóc.
--     - Một building / customer có thể được nhiều staff cùng quản lý.
--
-- [2] TẠO HỢP ĐỒNG THUÊ (contract)
--     - Staff ký hợp đồng PHẢI đồng thời quản lý cả building lẫn customer.
--       → TRIGGER: trg_contract_staff_validate
--     - rent_area PHẢI thuộc building tương ứng.
--       → TRIGGER: trg_contract_rentarea_validate
--     - Building FOR_SALE không được tạo contract thuê.
--       → TRIGGER: trg_contract_forsale_validate
--
-- [3] TẠO HỢP ĐỒNG MUA BÁN (sale_contract)
--     - Chỉ tạo được với building FOR_SALE.
--       → TRIGGER: trg_sale_contract_validate
--     - Luồng: Ký hợp đồng → Bàn giao (cập nhật transfer_date).
--
-- [4] HÓA ĐƠN & ĐIỆN NƯỚC (invoice / utility_meter)
--     - Chỉ phát sinh với hợp đồng THUÊ. Sinh qua script Python.
--     - Tháng gần nhất: PENDING. Các tháng trước: PAID.
--
-- [5] TRANG PUBLIC
--     - supplier, planning_map, nearby_amenity : hiển thị công khai (GET only).
--     - legal_authority : CHỈ ADMIN và STAFF phụ trách building đó mới xem được.
--
-- [6] BẢN ĐỒ SỐ
--     - building.latitude / longitude  : tọa độ tòa nhà, dùng render marker bản đồ.
--     - nearby_amenity.latitude / longitude : tọa độ tiện ích, filter gần tiện ích.
--     - API GET /buildings/geojson      : trả GeoJSON FeatureCollection cho Leaflet.
--     - API GET /buildings/nearby       : tìm building trong bán kính (Haversine query).
--     - Frontend: Leaflet.js + Goong Maps tile / Geocoding API.
--
-- ===================================================================================
-- DANH SÁCH BẢNG (19 bảng)
-- -------------------------
--   district             : Danh mục quận/huyện/tỉnh toàn quốc.
--   staff                : Nhân viên hệ thống (ADMIN / STAFF).
--   building             : Tòa nhà / BĐS — core table, có latitude/longitude.
--   rent_area            : Các mức diện tích cho thuê của từng building FOR_RENT.
--   customer             : Khách hàng (thuê: có tài khoản | mua: NULL credential).
--   assignment_building  : Phân công nhân viên quản lý tòa nhà.
--   assignment_customer  : Phân công nhân viên quản lý khách hàng.
--   contract             : Hợp đồng thuê (FOR_RENT).
--   sale_contract        : Hợp đồng mua bán (FOR_SALE).
--   invoice              : Hóa đơn hàng tháng (chỉ FOR_RENT).
--   invoice_detail       : Chi tiết từng khoản phí trong hóa đơn.
--   utility_meter        : Chỉ số điện/nước theo tháng của từng hợp đồng thuê.
--   supplier             : Đơn vị thi công / thiết kế của từng building.
--   planning_map         : Bản đồ quy hoạch của từng building.
--   legal_authority      : Cơ quan tư pháp — chỉ ADMIN/STAFF phụ trách xem được.
--   nearby_amenity       : Tiện ích lân cận — có latitude/longitude (Phase 2).
--   password_reset_token : Token đặt lại mật khẩu.
--
-- ===================================================================================

DROP DATABASE IF EXISTS estate;
CREATE DATABASE estate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE estate;

-- =============================================================================
-- BẢNG QUẬN / HUYỆN / THỊ XÃ - DISTRICT
-- =============================================================================
CREATE TABLE district (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

INSERT INTO district (name) VALUES
-- ================= HÀ NỘI =================
('Quận Ba Đình, Hà Nội'),
('Quận Hoàn Kiếm, Hà Nội'),
('Quận Hai Bà Trưng, Hà Nội'),
('Quận Đống Đa, Hà Nội'),
('Quận Tây Hồ, Hà Nội'),
('Quận Cầu Giấy, Hà Nội'),
('Quận Thanh Xuân, Hà Nội'),
('Quận Hoàng Mai, Hà Nội'),
('Quận Long Biên, Hà Nội'),
('Quận Bắc Từ Liêm, Hà Nội'),
('Quận Nam Từ Liêm, Hà Nội'),
('Quận Hà Đông, Hà Nội'),
('Huyện Gia Lâm, Hà Nội'),

-- ================= TP HCM =================
('Quận 1, TP. Hồ Chí Minh'),
('Quận 3, TP. Hồ Chí Minh'),
('Quận 4, TP. Hồ Chí Minh'),
('Quận 5, TP. Hồ Chí Minh'),
('Quận 6, TP. Hồ Chí Minh'),
('Quận 7, TP. Hồ Chí Minh'),
('Quận 8, TP. Hồ Chí Minh'),
('Quận 10, TP. Hồ Chí Minh'),
('Quận 11, TP. Hồ Chí Minh'),
('Quận 12, TP. Hồ Chí Minh'),
('Quận Bình Tân, TP. Hồ Chí Minh'),
('Quận Tân Phú, TP. Hồ Chí Minh'),
('Quận Gò Vấp, TP. Hồ Chí Minh'),
('Quận Phú Nhuận, TP. Hồ Chí Minh'),
('Quận Bình Thạnh, TP. Hồ Chí Minh'),
('Quận Tân Bình, TP. Hồ Chí Minh'),
('TP. Thủ Đức, TP. Hồ Chí Minh'),

-- ================= HẢI PHÒNG =================
('Quận Hồng Bàng, Hải Phòng'),
('Quận Ngô Quyền, Hải Phòng'),
('Quận Lê Chân, Hải Phòng'),
('Quận Hải An, Hải Phòng'),
('Quận Kiến An, Hải Phòng'),
('Quận Đồ Sơn, Hải Phòng'),
('Quận Dương Kinh, Hải Phòng'),

-- ================= ĐÀ NẴNG =================
('Quận Hải Châu, Đà Nẵng'),
('Quận Thanh Khê, Đà Nẵng'),
('Quận Sơn Trà, Đà Nẵng'),
('Quận Ngũ Hành Sơn, Đà Nẵng'),
('Quận Liên Chiểu, Đà Nẵng'),
('Quận Cẩm Lệ, Đà Nẵng'),

-- ================= CẦN THƠ =================
('Quận Ninh Kiều, Cần Thơ'),
('Quận Bình Thủy, Cần Thơ'),
('Quận Cái Răng, Cần Thơ'),
('Quận Ô Môn, Cần Thơ'),
('Quận Thốt Nốt, Cần Thơ'),

-- ================= HUẾ =================
('TP. Huế, Huế'),

-- ================= 28 TỈNH =================
('Tỉnh Cao Bằng'),
('Tỉnh Lạng Sơn'),
('Tỉnh Lai Châu'),
('Tỉnh Điện Biên'),
('Tỉnh Sơn La'),
('Tỉnh Lào Cai'),
('Tỉnh Tuyên Quang'),
('Tỉnh Thái Nguyên'),
('Tỉnh Phú Thọ'),
('Tỉnh Bắc Ninh'),
('Tỉnh Quảng Ninh'),
('Tỉnh Hưng Yên'),
('Tỉnh Ninh Bình'),
('Tỉnh Thanh Hóa'),
('Tỉnh Nghệ An'),
('Tỉnh Hà Tĩnh'),
('Tỉnh Quảng Trị'),
('Tỉnh Quảng Ngãi'),
('Tỉnh Gia Lai'),
('Tỉnh Đắk Lắk'),
('Tỉnh Khánh Hòa'),
('Tỉnh Lâm Đồng'),
('Tỉnh Đồng Nai'),
('Tỉnh Tây Ninh'),
('Tỉnh Đồng Tháp'),
('Tỉnh An Giang'),
('Tỉnh Vĩnh Long'),
('Tỉnh Cà Mau');

-- =============================================================================
-- BẢNG NHÂN VIÊN / STAFF
-- =============================================================================
CREATE TABLE staff (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50),
    password      VARCHAR(255),
    full_name     VARCHAR(100),
    phone         VARCHAR(20),
    email         VARCHAR(100),
    image         VARCHAR(30),
    role          VARCHAR(50),
    auth_origin   VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',
    created_date  DATETIME,
    modified_date DATETIME
);

INSERT INTO staff (username, password, full_name, phone, email, image, role, created_date, modified_date) VALUES
('manh1709', '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Phùng Văn Mạnh', '0342821933', 'phungvanmanh179@gmail.com', 'staff_001', 'ADMIN', '2018-01-05', '2018-01-05'),
('tmq0102' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Trần Minh Quân'      , '0812945252', 'quan.tm@gmail.com' , 'staff_002', 'STAFF', '2019-02-15', '2024-04-12'),
('lth2105' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Lê Thị Hồng'         , '0349397989', 'hong.lt@gmail.com' , 'staff_003', 'STAFF', '2019-05-10', '2024-03-18'),
('pvd1208' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Phạm Văn Dũng'       , '0852486437', 'dung.pv@gmail.com' , 'staff_004', 'STAFF', '2020-01-08', '2024-05-09'),
('nha0401' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Nguyễn Hoàng Anh'    , '0384509115', 'anh.nh@gmail.com'  , 'staff_005', 'STAFF', '2020-07-20', '2024-04-28'),
('vnb2511' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Vũ Ngọc Bích'        , '0386213813', 'bich.vn@gmail.com' , 'staff_006', 'STAFF', '2021-02-11', '2025-03-15'),
('dhc2307' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Đặng Hữu Cường'      , '0337240999', 'cuong.dh@gmail.com', 'staff_007', 'STAFF', '2021-09-03', '2024-06-10'),
('ltm1905' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Lương Thị Mai'       , '0385325395', 'mai.lt@gmail.com'  , 'staff_008', 'STAFF', '2022-03-25', '2025-02-02'),
('nta1212' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Ngô Tuấn Anh'        , '0364961972', 'anhtn@gmail.com'   , 'staff_009', 'STAFF', '2022-06-11', '2024-12-30'),
('hdk1311' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Hoàng Đức Khánh'     , '0865890758', 'khanh.hd@gmail.com', 'staff_010', 'STAFF', '2023-01-05', '2025-01-16'),
('ttt1612' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Trịnh Thu Trang'     , '0911848571', 'trang.tt@gmail.com', 'staff_011', 'STAFF', '2023-03-12', '2025-02-25'),
('ntn162' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Nguyễn Thúy Ninh'        , '0345914403', 'ag.ntn@gmail.com' , 'staff_012', 'ADMIN', '2019-09-09', '2024-12-20'),
('nvt1503' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Nguyễn Văn Tùng'     , '0387432641', 'tung.nv@gmail.com' , 'staff_013', 'STAFF', '2020-03-15', '2024-11-08'),
('pth2807' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Phạm Thị Hạnh'       , '0334021344', 'hanh.pt@gmail.com' , 'staff_014', 'STAFF', '2020-07-28', '2025-01-05'),
('tqd0211' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Trần Quang Đức'      , '0869076328', 'duc.tq@gmail.com'  , 'staff_015', 'STAFF', '2021-02-11', '2024-10-19'),
('lmn3006' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Lê Minh Ngọc'        , '0377050627', 'ngoc.lm@gmail.com' , 'staff_016', 'STAFF', '2021-06-30', '2025-02-10'),
('dth1708' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Đỗ Thị Hương'        , '0392613930', 'huong.dt@gmail.com', 'staff_017', 'STAFF', '2022-08-17', '2024-12-14'),
('nqk0404' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Nguyễn Quốc Khánh'   , '0862587123', 'khanh.nq@gmail.com', 'staff_018', 'STAFF', '2022-04-04', '2025-01-28'),
('vtl2210' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Vũ Thị Linh'         , '0356767043', 'linh.vt@gmail.com' , 'staff_019', 'STAFF', '2023-10-22', '2025-03-01');

-- =============================================================================
-- BẢNG TÒA NHÀ / BUILDING
-- =============================================================================
CREATE TABLE building (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    name               VARCHAR(255),
    district_id        BIGINT,
    ward               VARCHAR(100),
    street             VARCHAR(255),
    number_of_floor    INT,
    number_of_basement INT,
    floor_area         INT,
    direction          VARCHAR(50),
    level              VARCHAR(50),
    property_type      ENUM('OFFICE','SHOPHOUSE','APARTMENT','WAREHOUSE') NOT NULL DEFAULT 'OFFICE' COMMENT 'Loại hình bất động sản',
    transaction_type   ENUM('FOR_RENT','FOR_SALE') NOT NULL DEFAULT 'FOR_RENT'                      COMMENT 'Loại hình giao dịch',
    tax_code           VARCHAR(20)  NULL                                                            COMMENT 'Mã số thuế',
    rent_price         DECIMAL(15,2),
    sale_price         DECIMAL(15,2) NULL                                                           COMMENT 'Giá bán toàn bộ. NULL nếu FOR_RENT',
    service_fee        DECIMAL(15,2),
    car_fee            DECIMAL(15,2),
    motorbike_fee      DECIMAL(15,2),
    water_fee          DECIMAL(15,2),
    electricity_fee    DECIMAL(15,2),
    deposit            DECIMAL(15,2),
    link_of_building   TEXT,
    image              TEXT,
    latitude           DECIMAL(10,7) NULL COMMENT 'Vĩ độ — bản đồ số',
    longitude          DECIMAL(10,7) NULL COMMENT 'Kinh độ — bản đồ số',
    created_date       DATETIME,
    modified_date      DATETIME,
    FOREIGN KEY (district_id) REFERENCES district(id)
);

-- -------------------------------------------------------
-- OFFICE FOR_RENT: B1-B5 — HN×3, HCM×1, ĐN×1
-- -------------------------------------------------------
INSERT INTO building
(name, district_id, ward, street, number_of_floor, number_of_basement, floor_area, direction, level, property_type, transaction_type, tax_code, rent_price, sale_price, service_fee, car_fee, motorbike_fee, water_fee, electricity_fee, deposit, link_of_building, image, latitude, longitude, created_date, modified_date) VALUES
('Lotte Center Ha Noi'    , 1 , 'P. Cống Vị'      , '54 Liễu Giai'      , 60, 5, 7000 , 'TAY_BAC' , 'A_PLUS', 'OFFICE', 'FOR_RENT', '0101018580', 1200000, NULL, 2500000, 2000000, 120000,180000,55000, 200000000, 'https://lottecenter.vn'  , 'lotte-center.jpg'  , 21.032319977933223, 105.81268937783526, '2018-11-20', '2025-02-11'),
('Keangnam Landmark 72'   , 11, 'P. Mễ Trì'       , 'E6 Phạm Hùng'      , 72, 5, 10000, 'TAY_BAC' , 'A_PLUS', 'OFFICE', 'FOR_RENT', '0101684957', 1200000, NULL, 3000000, 2600000, 150000,180000,55000, 250000000, 'https://keangnamtower.vn', 'keangnam-tower.jpg', 21.0167517369239  , 105.78377473603696, '2018-08-25', '2024-12-12'),
('Pacific Place'          , 2 , 'P. Trần Hưng Đạo', '83B Lý Thường Kiệt', 20, 3, 3500 , 'NAM'     , 'B'     , 'OFFICE', 'FOR_RENT', '0100107694', 600000 , NULL, 2000000, 2500000, 100000,150000,45000, 100000000, 'https://pacificplace.vn' , 'pacific-place.jpg' , 21.024913138029675, 105.84336779988024, '2019-07-18', '2024-05-02'),
('Bitexco Financial Tower', 14, 'P. Bến Nghé'     , '2 Hải Triều'       , 68, 5, 9000 , 'DONG_NAM', 'A_PLUS', 'OFFICE', 'FOR_RENT', '0301452948', 1100000, NULL, 2800000, 3000000, 160000,200000,55000, 220000000, 'https://bitexco.vn'      , 'bitexco.jpg'       , 10.77170738357016 , 106.70437501713937, '2018-05-20', '2025-01-10'),
('Vincom Plaza Đà Nẵng'   , 40, 'P. An Hải Bắc'   , '910A Ngô Quyền'    , 22, 2, 3800 , 'DONG'    , 'B_PLUS', 'OFFICE', 'FOR_RENT', '0400582356', 550000 , NULL, 1200000, 1500000, 80000 ,120000,40000,  80000000, 'https://vincom-danang.vn', 'vincom-danang.jpg' , 16.071398821656608, 108.22996729971118, '2020-07-14', '2024-11-05');

-- -------------------------------------------------------
-- OFFICE FOR_SALE: B6-B7 — HCM, Khánh Hòa
-- -------------------------------------------------------
INSERT INTO building
(name, district_id, ward, street, number_of_floor, number_of_basement, floor_area, direction, level, property_type, transaction_type, tax_code, rent_price, sale_price, service_fee, car_fee, motorbike_fee, water_fee, electricity_fee, deposit, link_of_building, image, latitude, longitude, created_date, modified_date) VALUES
('Saigon Centre Building', 14, 'P. Sài Gòn' , '67 Lê Lợi' , 25, 3, 5000, 'NAM'     , 'A_PLUS', 'OFFICE', 'FOR_SALE', '0302685834', NULL, 72000000000, 2200000, 2500000, 140000, 22000, 6000, NULL, 'https://saigoncentre.vn'     , 'saigon-centre.jpg'    , 10.773102238637799, 106.70104984112902, '2019-03-15', '2025-01-20'),
('Landmark Nha Trang'    , 70, 'P. Vĩnh Hải', '06 Bắc Sơn', 32, 3, 5500, 'DONG_NAM', 'A_PLUS', 'OFFICE', 'FOR_SALE', '4201432610', NULL, 58000000000, 2000000, 2200000, 130000, 20000, 5500, NULL, 'https://landmark-nhatrang.vn', 'landmark-nhatrang.jpg', 12.278003404832022, 109.19739094817429, '2020-06-10', '2025-02-15');

-- -------------------------------------------------------
-- SHOPHOUSE FOR_RENT: B8-B9 — HCM, HN
-- -------------------------------------------------------
INSERT INTO building
(name, district_id, ward, street, number_of_floor, number_of_basement, floor_area, direction, level, property_type, transaction_type, tax_code, rent_price, sale_price, service_fee, car_fee, motorbike_fee, water_fee, electricity_fee, deposit, link_of_building, image, latitude, longitude, created_date, modified_date) VALUES
('The Manor 2'           , 28, 'P. 22'    , '91 Nguyễn Hữu Cảnh', 4, 1, 160, 'DONG_NAM', 'B', 'SHOPHOUSE', 'FOR_RENT', '0311526103', 35000000, NULL, 500000, 800000, 50000, 90000,30000,  70000000, 'https://themanor-hcm.vn'      , 'shophouse-the-manor.jpg'  , 10.792513365900277, 106.71785936601302, '2020-08-01', '2024-11-15'),
('Vincity Sportia Tây Mỗ', 11, 'P. Tây Mỗ', 'Đại Lộ Thăng Long' , 4, 1, 200, 'TAY_NAM' , 'A', 'SHOPHOUSE', 'FOR_RENT', '0109265782', 28000000, NULL, 400000, 700000, 45000, 80000,28000,  56000000, 'https://vinhomes-smartcity.vn', 'shophouse-vinhomes-sc.jpg', 21.007788596072942, 105.73787479994706, '2021-05-10', '2025-01-20');

-- -------------------------------------------------------
-- SHOPHOUSE FOR_SALE: B10 — HCM
-- -------------------------------------------------------
INSERT INTO building
(name, district_id, ward, street, number_of_floor, number_of_basement, floor_area, direction, level, property_type, transaction_type, tax_code, rent_price, sale_price, service_fee, car_fee, motorbike_fee, water_fee, electricity_fee, deposit, link_of_building, image, latitude, longitude, created_date, modified_date) VALUES
('Masteri Thảo Điền', 30, 'P. Thảo Điền', '159 Võ Nguyên Giáp', 5, 1, 180, 'DONG', 'A_PLUS', 'SHOPHOUSE', 'FOR_SALE', '0314872061', NULL, 23000000000, NULL, NULL, NULL, NULL, NULL, NULL, 'https://masteri-thaodien.vn', 'shophouse-masteri-td.jpg', 10.802020904141203, 106.73956790040825, '2022-03-15', '2025-02-10');

-- -------------------------------------------------------
-- APARTMENT FOR_RENT: B11-B13 — HCM×1, HN×2
-- -------------------------------------------------------
INSERT INTO building
(name, district_id, ward, street, number_of_floor, number_of_basement, floor_area, direction, level, property_type, transaction_type, tax_code, rent_price, sale_price, service_fee, car_fee, motorbike_fee, water_fee, electricity_fee, deposit, link_of_building, image, latitude, longitude, created_date, modified_date) VALUES
('The Ascent Thảo Điền', 30, 'P. Thảo Điền'       , '58 Quốc Hương' , 30, 3, 75, 'NAM', 'A'     , 'APARTMENT', 'FOR_RENT', '0313652907', 25000000, NULL, 800000, 1200000, 60000,100000,35000,  50000000, 'https://theascent.vn'         , 'apt-theascent.jpg' , 10.807198264176137, 106.73141565928037, '2021-07-01', '2024-12-10'),
('Masteri Waterfront'  , 13, 'P. Đa Tốn'          , 'Hải Đăng 2'    , 38, 3, 68, 'TAY', 'B_PLUS', 'APARTMENT', 'FOR_RENT', '0108751349', 18000000, NULL, 600000, 900000 , 50000, 90000,30000,  36000000, 'https://masteri-waterfront.vn', 'apt-masteri-wf.jpg', 20.994602250137632, 105.94490104128745, '2022-09-05', '2025-02-28'),
('Gold Season'         , 7 , 'P. Thanh Xuân Trung', '47 Nguyễn Tuân', 37, 3, 75, 'NAM', 'A'     , 'APARTMENT', 'FOR_RENT', '0100233488', 18000000, NULL, 800000, 1200000, 60000,100000,35000,  36000000, 'https://goldseason.vn'        , 'apt-goldseason.jpg', 20.995411298376332, 105.80463299602404, '2021-07-01', '2024-12-10');

-- -------------------------------------------------------
-- APARTMENT FOR_SALE: B14-B15 — HCM, Đà Nẵng
-- -------------------------------------------------------
INSERT INTO building
(name, district_id, ward, street, number_of_floor, number_of_basement, floor_area, direction, level, property_type, transaction_type, tax_code, rent_price, sale_price, service_fee, car_fee, motorbike_fee, water_fee, electricity_fee, deposit, link_of_building, image, latitude, longitude, created_date, modified_date) VALUES
('Vinhomes Central Park'               , 28, 'P. 22'        , '208 Nguyễn Hữu Cảnh', 45, 4, 95, 'DONG_NAM', 'A_PLUS', 'APARTMENT', 'FOR_SALE', '0303516831', NULL, 15000000000, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vinhomes-centralpark.vn', 'apt-centralpark.jpg', 10.793699887408508, 106.72200904461549, '2019-04-10', '2025-03-01'),
('Vinpearl Condotel Riverfront Da Nang', 40, 'P. An Hải Bắc', '341 Trần Hưng Đạo'  , 25, 3, 65, 'DONG_NAM', 'A_PLUS', 'APARTMENT', 'FOR_SALE', '0400896245', NULL, 12000000000, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vinpearl-danang.vn'     , 'apt-vinpearl-dn.jpg', 16.07083189900832 , 108.22914644974416, '2021-06-01', '2025-01-15');

-- -------------------------------------------------------
-- WAREHOUSE FOR_RENT: B16-B17 — HCM, Đồng Nai
-- -------------------------------------------------------
INSERT INTO building
(name, district_id, ward, street, number_of_floor, number_of_basement, floor_area, direction, level, property_type, transaction_type, tax_code, rent_price, sale_price, service_fee, car_fee, motorbike_fee, water_fee, electricity_fee, deposit, link_of_building, image, latitude, longitude, created_date, modified_date) VALUES
('Cảng Cát Lái'  , 30, 'P. Cát Lái'      , 'Nguyễn Thị Định'     , 2, 0, 1500, 'DONG', 'B', 'WAREHOUSE', 'FOR_RENT', '0301651089', 120000, NULL, NULL, 2000000, NULL, 80000,25000,  36000000, 'https://catlaiport.vn', 'warehouse-cat-lai.jpg' , 10.759855691901775, 106.78723701505041, '2021-04-18', '2025-01-10'),
('Amata Đồng Nai', 72, 'P. Long Bình Tân', 'Đường Số 8 KCN Amata', 2, 0, 1800, 'NAM' , 'B', 'WAREHOUSE', 'FOR_RENT', '3602194875', 100000, NULL, NULL, 1800000, NULL, 70000,22000,  32000000, 'https://amata.com.vn' , 'warehouse-amata-dn.jpg', 10.943214724665408, 106.88020823191884, '2022-01-25', '2025-02-05');

-- -------------------------------------------------------
-- WAREHOUSE FOR_SALE: B18-B19 — HCM, Quảng Ninh
-- -------------------------------------------------------
INSERT INTO building
(name, district_id, ward, street, number_of_floor, number_of_basement, floor_area, direction, level, property_type, transaction_type, tax_code, rent_price, sale_price, service_fee, car_fee, motorbike_fee, water_fee, electricity_fee, deposit, link_of_building, image, latitude, longitude, created_date, modified_date) VALUES
('Khu công nghiệp VSIP 1'                            , 17, 'P. Bình Hòa', '8 Hữu Nghị', 3, 0, 2000, 'BAC' , 'B', 'WAREHOUSE', 'FOR_SALE', '0305847621', NULL, 32000000000, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vsip.com.vn'       , 'warehouse-vsip-bd.jpg' , 10.924383629102962, 106.7135557386782 , '2020-06-10', '2024-10-15'),
('Khu công nghiệp Bắc Tiền Phong - Deep C Quảng Ninh', 60, 'P. Yên Hưng', 'Tiền Phong', 3, 0, 2500, 'DONG', 'B', 'WAREHOUSE', 'FOR_SALE', '5701284936', NULL, 28000000000, NULL, NULL, NULL, NULL, NULL, NULL, 'https://deepc-quangninh.vn', 'warehouse-deepc-qn.jpg', 20.83818117634496 , 106.86106577476207, '2021-08-15', '2025-01-20');

-- =============================================================================
-- BẢNG KHÁCH HÀNG / CUSTOMER
-- =============================================================================
CREATE TABLE customer (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE,
    password      VARCHAR(255),
    full_name     VARCHAR(100),
    phone         VARCHAR(20)  UNIQUE,
    email         VARCHAR(100) UNIQUE,
    tax_code      VARCHAR(20)  NULL COMMENT 'Mã số thuế — NULL nếu là cá nhân',
    role          VARCHAR(50),
    auth_origin   VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',
    created_date  DATETIME,
    modified_date DATETIME
);

-- C1-C8  : Khách THUÊ  — có username/password để login theo dõi hóa đơn
-- C9-C14 : Khách MUA   — NULL username/password, không cần tài khoản
INSERT INTO customer (username, password, full_name, phone, email, tax_code, role, created_date, modified_date) VALUES
('abcVietNam'   , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty TNHH ABC Việt Nam'        , '0903000001', 'contact@abc.com.vn'       , '0312847561', 'CUSTOMER', '2019-06-18', '2024-08-10'),
('VietATMCP'    , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Ngân hàng TMCP Việt Á'            , '0903000002', 'office@vietabank.vn'      , '0100112437', 'CUSTOMER', '2019-12-17', '2024-11-20'),
('SaigonTech'   , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty CP Công nghệ Sài Gòn'     , '0903000003', 'info@saigontech.vn'       , '0315632894', 'CUSTOMER', '2020-03-10', '2024-09-15'),
('DaNangMedia'  , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty TNHH Truyền thông Đà Nẵng', '0903000004', 'contact@dananmedia.vn'    , '0401357829', 'CUSTOMER', '2021-05-20', '2025-01-10'),
('PhoHuongViet' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty CP Phở Hương Việt'        , '0903000005', 'info@phohuongviet.vn'     , '0309284751', 'CUSTOMER', '2020-08-10', '2024-11-15'),
('AoVietFashion', '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty CP Thời trang Áo Việt'    , '0903000006', 'sales@aoviet.vn'          , '0310957346', 'CUSTOMER', '2021-11-15', '2025-01-05'),
('ExpatsHCM'    , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Nhóm khách thuê căn hộ Thủ Đức'   , '0903000007', 'tenant@expatshcm.vn'      ,  NULL       , 'CUSTOMER', '2022-01-10', '2025-02-20'),
('HoangGiaTM'   , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty TNHH Thương mại Hoàng Gia', '0903000008', 'sales@hoanggia.vn'        , '0108463572', 'CUSTOMER', '2021-01-09', '2024-09-18'),
('NoiThatGoDat' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty CP Nội thất Gỗ Đất Việt'  , '0903000009', 'info@godatviet.vn'        , '0316258043', 'CUSTOMER', '2021-04-20', '2025-01-10'),
('SXDongNai'    , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty TNHH Sản xuất Đồng Nai'   , '0903000010', 'info@sxdongnai.vn'        , '3601849275', 'CUSTOMER', '2022-02-15', '2025-02-05'),
('APHoldings'   , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Tập đoàn An Phát Holdings'        , '0903000011', 'contact@anphatholdings.vn', '0200348591', 'CUSTOMER', '2024-01-05', '2024-06-15'),
('VRS'          , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Tập đoàn Vinpearl Resort & Spa'   , '0903000012', 'invest@vinpearl.com'      , '0101436094', 'CUSTOMER', '2025-01-10', '2025-02-28'),
('CPLuxuryViet' , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty CP Bán lẻ Luxury Việt'    , '0903000013', 'info@luxuryviet.vn'       , '0317295840', 'CUSTOMER', '2023-06-01', '2024-01-20'),
('DTNamCuong'   , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Tập đoàn Đầu tư Nam Cường'        , '0903000014', 'office@namcuonggroup.vn'  , '0102573846', 'CUSTOMER', '2023-04-01', '2023-07-01'),
('NMK'          , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Ông Nguyễn Minh Khoa — Nhà đầu tư', '0903000015', 'khoa.nm@gmail.com'        ,  NULL       , 'CUSTOMER', '2024-08-10', '2025-01-15'),
('XDMinhPhat'   , '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Tập đoàn Xây dựng Minh Phát'      , '0903000016', 'info@minhphatgroup.vn'    , '0109384756', 'CUSTOMER', '2025-01-20', '2025-02-01'),
('CPLogisticsDD', '$2a$10$rQcSixUdC.Z3vYMwAP1LreYaFovWjN/pY9n1U5RfFevhhDBWO8K62', 'Công ty CP Logistics Đại Dương'   , '0903000017', 'info@daiduonglogistics.vn', '0318472095', 'CUSTOMER', '2024-11-05', '2025-03-01');

-- =============================================================================
-- BẢNG ĐẶT LẠI MẬT KHẨU / PASSWORD_RESET_TOKEN
-- =============================================================================
CREATE TABLE password_reset_token (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    token      VARCHAR(255) NOT NULL,
    expires_at DATETIME     NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    user_type  VARCHAR(20)  NOT NULL,
    user_id    BIGINT       NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (token)
);

-- =============================================================================
-- BẢNG REFRESH TOKEN / REFRESH_TOKEN
-- =============================================================================
CREATE TABLE refresh_token (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    token_hash  VARCHAR(64)  NOT NULL,
    user_type   VARCHAR(20)  NOT NULL,
    user_id     BIGINT       NOT NULL,
    expires_at  DATETIME     NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (token_hash),
    INDEX idx_refresh_token_user (user_type, user_id)
);

-- =============================================================================
-- BẢNG DIỆN TÍCH THUÊ / RENT_AREA
-- =============================================================================
CREATE TABLE email_verification (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    email        VARCHAR(100) NOT NULL,
    otp_hash     VARCHAR(64)  NOT NULL,
    purpose      VARCHAR(50)  NOT NULL,
    setup_token  VARCHAR(64),
    status       VARCHAR(20)  NOT NULL,
    expires_at   DATETIME     NOT NULL,
    verified_at  DATETIME,
    used_at      DATETIME,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_verification_email (email, purpose, status),
    UNIQUE (setup_token)
);

CREATE TABLE oauth_identity (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    provider         VARCHAR(50)  NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    user_type        VARCHAR(20)  NOT NULL,
    user_id          BIGINT       NOT NULL,
    email            VARCHAR(100),
    display_name     VARCHAR(100),
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_user_id),
    UNIQUE (provider, user_type, user_id),
    INDEX idx_oauth_identity_user (user_type, user_id)
);

CREATE TABLE rent_area (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    building_id   BIGINT,
    value         INT,
    created_date  DATETIME,
    modified_date DATETIME,
    FOREIGN KEY (building_id) REFERENCES building(id)
);

-- Chỉ building FOR_RENT mới có rent_area
INSERT INTO rent_area (building_id, value, created_date, modified_date) VALUES
(1 , 300 , '2018-12-05', '2025-02-10'),
(1 , 250 , '2018-12-05', '2025-02-10'),
(1 , 350 , '2018-12-05', '2025-02-10'),
(2 , 600 , '2018-09-01', '2024-10-05'),
(2 , 400 , '2018-09-01', '2024-10-05'),
(3 , 250 , '2019-08-01', '2024-05-10'),
(3 , 150 , '2019-08-01', '2024-05-10'),
(4 , 400 , '2018-06-01', '2025-01-10'),
(4 , 250 , '2018-06-01', '2025-01-10'),
(4 , 600 , '2018-06-01', '2025-01-10'),
(5 , 200 , '2020-08-01', '2024-11-05'),
(5 , 350 , '2020-08-01', '2024-11-05'),
(8 , 160 , '2020-08-05', '2024-11-15'),
(9 , 200 , '2021-05-15', '2025-01-20'),
(11, 75  , '2021-07-05', '2024-12-10'),
(11, 100 , '2021-07-05', '2024-12-10'),
(12, 68  , '2022-09-10', '2025-02-28'),
(12, 85  , '2022-09-10', '2025-02-28'),
(13, 70  , '2021-07-05', '2024-12-10'),
(13, 90  , '2021-07-05', '2024-12-10'),
(16, 1500, '2021-04-22', '2025-01-10'),
(16, 800 , '2021-04-22', '2025-01-10'),
(17, 1800, '2022-01-30', '2025-02-05'),
(17, 1000, '2022-01-30', '2025-02-05');

-- =============================================================================
-- BẢNG PHÂN CÔNG NHÂN VIÊN / BUILDING
-- =============================================================================
CREATE TABLE assignment_building (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    building_id BIGINT,
    staff_id    BIGINT,
    FOREIGN KEY (building_id) REFERENCES building(id),
    FOREIGN KEY (staff_id)    REFERENCES staff(id)
);

INSERT INTO assignment_building (building_id, staff_id) VALUES
(1 , 2),
(1 , 3),
(2 , 4),
(2 , 5),
(3 , 2),
(3 , 6),
(4 , 7),
(4 , 8),
(5 , 9),
(5 , 10),
(6 , 7),
(6 , 11),
(7 , 9),
(7 , 13),
(8 , 7),
(8 , 14),
(9 , 4),
(9 , 15),
(10, 7),
(10, 16),
(11, 8),
(12, 8),
(12, 18),
(13, 3),
(13, 6),
(14, 8),
(14, 19),
(15, 9),
(15, 13),
(16, 7),
(16, 14),
(17, 9),
(17, 10),
(18, 11),
(18, 13),
(19, 10),
(19, 13);

-- =============================================================================
-- BẢNG PHÂN CÔNG NHÂN VIÊN / CUSTOMER
-- =============================================================================
CREATE TABLE assignment_customer (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT,
    staff_id    BIGINT,
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    FOREIGN KEY (staff_id)    REFERENCES staff(id)
);

INSERT INTO assignment_customer (customer_id, staff_id) VALUES
(1 , 2),
(1 , 3),
(1 , 4),
(1 , 5),
(2 , 2),
(2 , 6),
(3 , 7),
(3 , 8),
(4 , 9),
(4 , 10),
(5 , 7),
(5 , 14),
(6 , 15),
(7 , 8),
(7 , 18),
(8 , 3),
(8 , 6),
(9 , 7),
(9 , 14),
(10, 9),
(10, 10),
-- Bổ sung mapping cho contract mới
(2 , 3),   -- C2 → staff3 (quản lý B1)
(2 , 4),   -- C2 → staff4 (quản lý B2)
(2 , 5),   -- C2 → staff5 (quản lý B2)
(3 , 2),   -- C3 → staff2 (quản lý B3)
(3 , 6),   -- C3 → staff6 (quản lý B3)
(4 , 7),   -- C4 → staff7 (quản lý B4, cần cho contract B4 C4 S7)
(4 , 8),   -- C4 → staff8 (quản lý B4)
(4 , 10);  -- C4 → staff10 (quản lý B5)

-- =============================================================================
-- BẢNG HỢP ĐỒNG THUÊ / CONTRACT
-- =============================================================================
CREATE TABLE contract (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    building_id   BIGINT,
    customer_id   BIGINT,
    staff_id      BIGINT,
    rent_price    DECIMAL(15,2),
    rent_area     INT,
    start_date    DATETIME,
    end_date      DATETIME,
    status        VARCHAR(50),
    created_date  DATETIME,
    modified_date DATETIME,
    FOREIGN KEY (building_id) REFERENCES building(id),
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    FOREIGN KEY (staff_id)    REFERENCES staff(id)
);

-- -------------------------------------------------------
-- TRIGGER 1: Staff phải quản lý cả building lẫn customer
-- -------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_contract_staff_validate
BEFORE INSERT ON contract
FOR EACH ROW
BEGIN
    DECLARE manages_building INT DEFAULT 0;
    DECLARE manages_customer INT DEFAULT 0;

    SELECT COUNT(*) INTO manages_building
    FROM assignment_building
    WHERE building_id = NEW.building_id AND staff_id = NEW.staff_id;

    SELECT COUNT(*) INTO manages_customer
    FROM assignment_customer
    WHERE customer_id = NEW.customer_id AND staff_id = NEW.staff_id;

    IF manages_building = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Staff không quản lý tòa nhà này';
    END IF;

    IF manages_customer = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Staff không quản lý khách hàng này';
    END IF;
END$$
DELIMITER ;

-- -------------------------------------------------------
-- TRIGGER 2: rent_area phải thuộc building tương ứng
-- -------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_contract_rentarea_validate
BEFORE INSERT ON contract
FOR EACH ROW
BEGIN
    DECLARE area_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO area_exists
    FROM rent_area
    WHERE building_id = NEW.building_id AND value = NEW.rent_area;

    IF area_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Diện tích thuê không tồn tại trong tòa nhà này';
    END IF;
END$$
DELIMITER ;

-- -------------------------------------------------------
-- TRIGGER 3: Building FOR_SALE không được tạo contract thuê
-- -------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_contract_forsale_validate
BEFORE INSERT ON contract
FOR EACH ROW
BEGIN
    DECLARE t_type VARCHAR(20);

    SELECT transaction_type INTO t_type
    FROM building WHERE id = NEW.building_id;

    IF t_type = 'FOR_SALE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tòa nhà đang bán, không thể tạo hợp đồng thuê';
    END IF;
END$$
DELIMITER ;

INSERT INTO contract
(building_id, customer_id, staff_id, rent_price, rent_area, start_date, end_date, status, created_date, modified_date) VALUES
-- ── B1 Lotte Center (3 contracts) ────────────────────────────────────────────
(1 , 1 , 2 , 1200000 , 300, '2019-01-01', '2022-01-01', 'EXPIRED', '2018-12-20 09:00:00', '2022-01-02 08:00:00'),
(1 , 2 , 3 , 1200000 , 350, '2022-04-01', '2025-04-01', 'EXPIRED', '2022-03-15 10:00:00', '2025-04-02 08:00:00'),
(1 , 1 , 2 , 1250000 , 250, '2025-07-01', '2028-07-01', 'ACTIVE' , '2025-06-20 09:00:00', '2025-07-02 08:00:00'),
-- ── B2 Keangnam Landmark 72 (3 contracts) ────────────────────────────────────
(2 , 2 , 4 , 1200000 , 400, '2019-03-01', '2022-03-01', 'EXPIRED', '2019-02-10 09:00:00', '2022-03-02 08:00:00'),
(2 , 1 , 4 , 1200000 , 600, '2022-06-01', '2025-06-01', 'ACTIVE' , '2022-05-20 10:00:00', '2024-06-01 08:00:00'),
(2 , 2 , 5 , 1250000 , 600, '2025-10-01', '2028-10-01', 'ACTIVE' , '2025-09-15 09:00:00', '2025-10-02 08:00:00'),
-- ── B3 Pacific Place HCM (3 contracts) ───────────────────────────────────────
(3 , 3 , 2 , 600000  , 250, '2018-06-01', '2021-06-01', 'EXPIRED', '2018-05-20 09:00:00', '2021-06-02 08:00:00'),
(3 , 2 , 2 , 600000  , 250, '2021-09-01', '2024-09-01', 'EXPIRED', '2021-08-15 10:00:00', '2024-09-02 08:00:00'),
(3 , 3 , 6 , 650000  , 150, '2025-01-01', '2028-01-01', 'ACTIVE' , '2024-12-20 09:00:00', '2025-01-02 08:00:00'),
-- ── B4 Bitexco Financial Tower (2 contracts) ─────────────────────────────────
(4 , 4 , 7 , 1100000 , 400, '2021-01-01', '2024-01-01', 'EXPIRED', '2020-12-15 09:00:00', '2024-01-02 08:00:00'),
(4 , 3 , 8 , 1100000 , 600, '2024-05-01', '2027-05-01', 'ACTIVE' , '2024-04-10 10:00:00', '2025-05-01 08:00:00'),
-- ── B5 Vincom Đà Nẵng Office (2 contracts) ───────────────────────────────────
(5 , 4 , 9 , 550000  , 200, '2022-06-01', '2025-09-01', 'ACTIVE' , '2022-05-20 09:00:00', '2024-06-01 08:00:00'),
(5 , 4 , 10, 580000  , 350, '2026-01-01', '2029-01-01', 'ACTIVE' , '2025-12-15 09:00:00', '2026-01-02 08:00:00'),
-- ── B8 Shophouse The Manor HCM (2 contracts) ─────────────────────────────────
(8 , 5 , 7 , 35000000, 160, '2021-08-01', '2025-02-01', 'EXPIRED', '2021-07-20 09:00:00', '2025-02-02 08:00:00'),
(8 , 5 , 14, 35000000, 160, '2025-07-01', '2028-07-01', 'ACTIVE' , '2025-06-15 10:00:00', '2025-07-02 08:00:00'),
-- ── B9 Shophouse Vinhomes Smart City (3 contracts) ───────────────────────────
(9 , 6 , 15, 28000000, 200, '2024-05-01', '2027-05-01', 'ACTIVE' , '2024-04-15 10:00:00', '2024-05-02 08:00:00'),
(9 , 6 , 15, 30000000, 200, '2026-02-01', '2029-02-01', 'ACTIVE' , '2026-01-20 09:00:00', '2026-02-02 08:00:00'),
-- ── B11 The Ascent Thảo Điền (3 contracts) ───────────────────────────────────
(11, 7 , 8 , 25000000, 75 , '2022-06-01', '2025-06-01', 'EXPIRED', '2022-05-20 09:00:00', '2025-06-02 08:00:00'),
(11, 7 , 8 , 26000000, 75 , '2025-10-01', '2028-10-01', 'ACTIVE' , '2025-09-15 09:00:00', '2025-10-02 08:00:00'),
-- ── B12 Masteri Waterfront (1 contract) ──────────────────────────────────────
(12, 7 , 8 , 18000000, 68 , '2023-01-01', '2026-01-01', 'ACTIVE' , '2022-12-15 09:00:00', '2025-01-01 08:00:00'),
-- ── B13 Goldseason HN (2 contracts) ──────────────────────────────────────────
(13, 8 , 3 , 18000000, 70 , '2021-09-01', '2024-09-01', 'EXPIRED', '2021-08-15 09:00:00', '2024-09-02 08:00:00'),
(13, 8 , 6 , 18000000, 90 , '2024-10-01', '2027-10-01', 'ACTIVE' , '2024-09-15 10:00:00', '2024-10-02 08:00:00'),
-- ── B16 Kho Cát Lái (2 contracts) ────────────────────────────────────────────
(16, 9 , 7 , 120000  ,1500, '2021-05-01', '2024-05-01', 'EXPIRED', '2021-04-20 09:00:00', '2024-05-02 08:00:00'),
(16, 9 , 14, 120000  ,1500, '2024-08-01', '2027-08-01', 'ACTIVE' , '2024-07-18 10:00:00', '2024-08-02 08:00:00'),
-- ── B17 KCN Amata Đồng Nai (1 contract) ──────────────────────────────────────
(17, 10, 9 , 100000  ,1800, '2022-06-01', '2025-06-01', 'ACTIVE' , '2022-05-25 09:00:00', '2024-06-02 08:00:00');

-- =============================================================================
-- BẢNG HÓA ĐƠN / INVOICE
-- =============================================================================
CREATE TABLE invoice (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    contract_id      BIGINT        NOT NULL,
    customer_id      BIGINT        NOT NULL,
    month            INT           NOT NULL,
    year             INT           NOT NULL,
    total_amount     DECIMAL(15,2) NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    created_date     DATETIME      NOT NULL,
    due_date         DATETIME      NOT NULL,
    paid_date        DATETIME      NULL,
    payment_method   VARCHAR(50),
    transaction_code VARCHAR(100),
    CONSTRAINT fk_invoice_contract FOREIGN KEY (contract_id) REFERENCES contract(id),
    CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- =============================================================================
-- BẢNG CHI TIẾT HÓA ĐƠN / INVOICE_DETAIL
-- =============================================================================
CREATE TABLE invoice_detail (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_id  BIGINT        NOT NULL,
    description VARCHAR(255)  NOT NULL,
    amount      DECIMAL(15,2) NOT NULL,
    CONSTRAINT fk_invoice_detail FOREIGN KEY (invoice_id) REFERENCES invoice(id)
);

-- =============================================================================
-- BẢNG CHỈ SỐ ĐIỆN NƯỚC / UTILITY_METER
-- =============================================================================
CREATE TABLE utility_meter (
    id              BIGINT   AUTO_INCREMENT PRIMARY KEY,
    contract_id     BIGINT   NOT NULL,
    month           INT      NOT NULL CHECK (month BETWEEN 1 AND 12),
    year            INT      NOT NULL CHECK (year >= 2000),
    electricity_old INT      NOT NULL DEFAULT 0,
    electricity_new INT      NOT NULL DEFAULT 0,
    water_old       INT      NOT NULL DEFAULT 0,
    water_new       INT      NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_utility_contract FOREIGN KEY (contract_id) REFERENCES contract(id),
    CONSTRAINT unique_meter UNIQUE (contract_id, month, year)
);

-- =============================================================================
-- BẢNG HỢP ĐỒNG MUA BÁN / SALE_CONTRACT
-- =============================================================================
CREATE TABLE sale_contract (
    id            BIGINT        AUTO_INCREMENT PRIMARY KEY,
    building_id   BIGINT        NOT NULL UNIQUE COMMENT 'Mỗi building chỉ được bán 1 lần',
    customer_id   BIGINT        NOT NULL,
    staff_id      BIGINT        NOT NULL,
    sale_price    DECIMAL(15,2) NOT NULL COMMENT 'Tổng giá trị mua bán',
    transfer_date DATE          NULL     COMMENT 'Ngày bàn giao. NULL = chưa bàn giao',
    note          TEXT,
    created_date  DATETIME,
    modified_date DATETIME,
    FOREIGN KEY (building_id) REFERENCES building(id),
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    FOREIGN KEY (staff_id)    REFERENCES staff(id)
);

-- -------------------------------------------------------
-- TRIGGER: Building phải là FOR_SALE khi tạo sale_contract
-- -------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_sale_contract_validate
BEFORE INSERT ON sale_contract
FOR EACH ROW
BEGIN
    DECLARE t_type VARCHAR(20);

    SELECT transaction_type INTO t_type
    FROM building WHERE id = NEW.building_id;

    IF t_type != 'FOR_SALE' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tòa nhà không phải FOR_SALE, không thể tạo hợp đồng mua bán';
    END IF;
END$$
DELIMITER ;

INSERT INTO sale_contract (building_id, customer_id, staff_id, sale_price, transfer_date, note, created_date, modified_date) VALUES
(6 , 11, 7 , 72000000000, '2024-06-15', 'An Phát mua Saigon Centre làm trụ sở HCM'        , '2024-01-10', '2024-06-15'),
(10, 13, 7 , 23000000000, '2026-03-09', 'Luxury Việt mua shophouse Masteri mở flagship'   , '2026-03-04', '2026-03-09'),
(14, 14, 8 , 15000000000, '2025-11-30', 'Nam Cường mua Vinhomes Central Park đầu tư'      , '2025-10-16', '2025-11-30'),
(18, 16, 11, 32000000000, NULL        , 'Minh Phát mua KCN VSIP Bình Dương, đang thủ tục' , '2025-02-01', '2025-02-01');

-- =============================================================================
-- BẢNG NHÀ CUNG CẤP / SUPPLIER
-- =============================================================================
CREATE TABLE supplier (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    building_id   BIGINT        NOT NULL,
    name          VARCHAR(255)  NOT NULL,
    service_type  VARCHAR(100)  COMMENT 'Thi công, thiết kế điện nước, nội thất...',
    phone         VARCHAR(20),
    email         VARCHAR(100),
    address       TEXT,
    note          TEXT,
    created_date  DATETIME,
    modified_date DATETIME,
    FOREIGN KEY (building_id) REFERENCES building(id)
);

INSERT INTO supplier (building_id, name, service_type, phone, email, address, note, created_date, modified_date) VALUES
(1 , 'Tập đoàn Xây dựng Delta'        , 'Thi công xây dựng' , '0241000001', 'info@delta-cons.vn'     , '88 Láng Hạ, Đống Đa, HN'             , 'Tổng thầu Lotte Center'           , '2017-05-20', '2025-02-01'),
(1 , 'Công ty Thiết kế Nội thất AZ'   , 'Thiết kế nội thất' , '0241000002', 'design@az-interior.vn'  , '22 Kim Mã, Ba Đình, HN'              , 'Thiết kế không gian văn phòng'    , '2017-08-10', '2025-02-01'),
(2 , 'Keangnam Construction Korea'    , 'Thi công xây dựng' , '0241000003', 'info@keangnam-cons.com' , 'Phạm Hùng, Nam Từ Liêm, HN'          , 'Tổng thầu Keangnam Landmark 72'   , '2016-01-01', '2024-12-01'),
(2 , 'Công ty TNHH Phòng cháy Rồng Đỏ', 'Hệ thống PCCC'     , '0241000004', 'rongdo@pccc.vn'         , '5 Phạm Hùng, Nam Từ Liêm, HN'        , 'Lắp đặt & bảo trì PCCC'           , '2017-06-15', '2024-12-01'),
(3 , 'Công ty CP Xây dựng Thành Đô'   , 'Thi công xây dựng' , '0241000005', 'contact@thanhdo-cons.vn', '10 Lý Thường Kiệt, Hoàn Kiếm, HN'    , 'Nhà thầu thi công phần thô'       , '2018-10-01', '2024-05-01'),
(4 , 'Coteccons Group'                , 'Thi công xây dựng' , '0241000006', 'info@coteccons.vn'      , '236/4 Điện Biên Phủ, Bình Thạnh, HCM', 'Tổng thầu Bitexco Financial Tower', '2016-03-01', '2025-01-10'),
(4 , 'Archplus HCM'                   , 'Thiết kế kiến trúc', '0241000007', 'arch@archplus.vn'       , '123 Nguyễn Đình Chiểu, Q3, HCM'      , 'Thiết kế tổng thể Bitexco'        , '2016-05-01', '2025-01-10'),
(5 , 'Công ty XD Đà Nẵng Invest'      , 'Thi công xây dựng' , '0241000008', 'info@dninvest.vn'       , '120 Bạch Đằng, Hải Châu, ĐN'         , 'Nhà thầu thi công Vincom ĐN'      , '2019-05-01', '2024-11-05'),
(6 , 'Hòa Bình Construction'          , 'Thi công xây dựng' , '0241000009', 'info@hoabinhcons.vn'    , '235 Đinh Bộ Lĩnh, Bình Thạnh, HCM'   , 'Tổng thầu Saigon Centre Tower'    , '2018-01-01', '2025-01-20'),
(7 , 'Công ty Xây dựng Nha Trang'     , 'Thi công xây dựng' , '0241000010', 'info@ntcons.vn'         , '12 Trần Phú, Lộc Thọ, Nha Trang, KH' , 'Nhà thầu Landmark Nha Trang'      , '2019-06-01', '2025-02-15'),
(8 , 'Phú Mỹ Hưng Development Corp'   , 'Thi công xây dựng' , '0283800001', 'info@phumyhung.vn'      , 'Khu đô thị Phú Mỹ Hưng, Q.7, HCM'    , 'Chủ đầu tư & tổng thầu The Manor' , '2019-03-01', '2024-10-01'),
(8 , 'Công ty Nội thất SaigonHome'    , 'Thiết kế nội thất' , '0283800002', 'design@saigonhome.vn'   , '12 Nguyễn Lương Bằng, Q.7, HCM'      , 'Thiết kế shophouse tầng 1–2'      , '2019-06-15', '2025-01-15'),
(9 , 'Vinhomes Corp'                  , 'Thi công xây dựng' , '0241900001', 'contact@vinhomes.vn'    , '458 Minh Khai, Hai Bà Trưng, HN'     , 'Tổng thầu Vinhomes Smart City'    , '2020-01-01', '2024-12-01'),
(9 , 'Hệ thống PCCC An Toàn HN'       , 'Hệ thống PCCC'     , '0241900002', 'info@antoanpccc.vn'     , '22 Trần Đăng Ninh, Cầu Giấy, HN'     , 'Lắp đặt PCCC toàn khu'            , '2020-03-10', '2024-12-01'),
(10, 'Thảo Điền Investment'           , 'Thi công xây dựng' , '0283100001', 'info@thaodien-inv.vn'   , '159 Xa Lộ Hà Nội, P. Thảo Điền, TĐ'  , 'Tổng thầu Masteri Thảo Điền'      , '2018-05-01', '2024-09-01'),
(10, 'Công ty Tư vấn Pháp lý BĐS HCM' , 'Tư vấn pháp lý'    , '0283100002', 'legal@bdshcm.vn'        , '56 Nguyễn Thị Minh Khai, Q.3, HCM'   , 'Hỗ trợ thủ tục mua bán shophouse' , '2020-06-01', '2025-01-01'),
(11, 'Tiến Phát Corp'                 , 'Thi công xây dựng' , '0283110001', 'info@tienphat.vn'       , '65 Hoàng Diệu 2, Thủ Đức, HCM'       , 'Nhà thầu The Ascent Thảo Điền'    , '2018-01-01', '2024-08-01'),
(11, 'Công ty Quản lý Tòa nhà Sao Mai', 'Quản lý vận hành'  , '0283110002', 'fm@saomaipm.vn'         , '134 Đinh Bộ Lĩnh, Bình Thạnh, HCM'   , 'FM: điện, nước, thang máy căn hộ' , '2019-01-01', '2025-02-01'),
(12, 'Masterise Homes'                , 'Thi công xây dựng' , '0283120001', 'contact@masterisehomes.vn', '5 Hà Nội Highway, Long Bình, TĐ, HCM', 'Chủ đầu tư Masteri Waterfront'         , '2020-06-01', '2025-01-01'),
(12, 'Schindler Vietnam'              , 'Cơ điện thang máy' , '0283120002', 'vietnam@schindler.com'    , 'Lầu 10, 152 Điện Biên Phủ, Q.3, HCM' , 'Bảo trì thang máy & hệ thống cơ điện'  , '2021-01-01', '2025-02-01'),
(13, 'Công ty Cổ phần LICOGI 16'      , 'Thi công xây dựng' , '0241300001', 'info@licogi16.vn'       , '3 Thanh Xuân Bắc, Thanh Xuân, HN'    , 'Nhà thầu chính Goldseason 47 Nguyễn Tuân', '2017-09-01', '2024-11-01'),
(13, 'Otis Elevator Vietnam'          , 'Cơ điện thang máy' , '0241300002', 'vietnam@otis.com'       , '14 Láng Hạ, Đống Đa, HN'             , 'Bảo trì thang máy & hệ thống HVAC', '2018-06-01', '2025-01-01'),
(14, 'Vinhomes Corp'                  , 'Thi công xây dựng' , '0283140001', 'contact@vinhomes.vn'    , '720A Điện Biên Phủ, Bình Thạnh, HCM', 'Chủ đầu tư & tổng thầu Vinhomes CP', '2015-01-01', '2024-12-01'),
(14, 'Công ty Pháp lý Minh Khai'      , 'Tư vấn pháp lý'    , '0283140002', 'info@minhkhailegal.vn'  , '215 Điện Biên Phủ, Bình Thạnh, HCM' , 'Tư vấn mua bán căn hộ Vinhomes'    , '2018-06-01', '2025-01-01'),
(15, 'Vinpearl Construction'          , 'Thi công xây dựng' , '0236150001', 'build@vinpearl.com'     , '2 Trường Sa, Ngũ Hành Sơn, ĐN'      , 'Tổng thầu Condotel Đà Nẵng'        , '2019-03-01', '2025-01-01'),
(15, 'Công ty Quản lý DL Biển Đông'   , 'Quản lý vận hành'  , '0236150002', 'fm@biendong-mgmt.vn'    , '10 Lê Đình Lý, Hải Châu, ĐN'        , 'Vận hành condotel & dịch vụ du lịch', '2020-01-01', '2025-01-01'),
(16, 'Tổng Cty Tân Cảng Sài Gòn'      , 'Thi công xây dựng' , '0283160001', 'info@tancang.com.vn'    , 'Cảng Cát Lái, Q.2 (cũ), TP.HCM'     , 'Xây dựng kho bãi & hạ tầng logistics', '2016-06-01', '2024-10-01'),
(16, 'Công ty PCCC & CNCH Phương Nam' , 'Hệ thống PCCC'     , '0283160002', 'info@phuongnampccc.vn'  , '88 Đồng Văn Cống, Q.2, TP.HCM'      , 'Lắp đặt & kiểm định PCCC kho bãi'  , '2017-01-01', '2024-10-01'),
(17, 'Amata Corporation Thailand'     , 'Thi công xây dựng' , '0251170001', 'info@amata.com'         , 'Long Bình, Biên Hòa, Đồng Nai'      , 'Chủ đầu tư & tổng thầu KCN Amata'  , '2014-01-01', '2024-09-01'),
(17, 'Cty Cơ điện Đồng Nai'           , 'Cơ điện thang máy' , '0251170002', 'info@codiendognai.vn'   , '25 Đồng Khởi, Biên Hòa, Đồng Nai'   , 'Hệ thống điện, nước, PCCC kho xưởng', '2015-03-01', '2024-09-01'),
(18, 'VSIP Group'                     , 'Thi công xây dựng' , '0274180001', 'info@vsip.com.vn'       , 'VSIP II, Bình Hòa, Thuận An, BD'    , 'Chủ đầu tư & phát triển hạ tầng KCN', '2010-01-01', '2024-11-01'),
(18, 'Tư vấn Đầu tư KCN Việt Nam'     , 'Tư vấn pháp lý'    , '0274180002', 'info@kcnvn-consult.vn'  , '12 Đại lộ Bình Dương, Thủ Dầu Một'  , 'Tư vấn thủ tục thuê/mua đất KCN'   , '2018-06-01', '2025-01-01'),
(19, 'Deep C Industrial Zones'        , 'Thi công xây dựng' , '0203190001', 'info@deepc.vn'          , 'KCN Deep C, Đông Mai, Quảng Yên, QN', 'Chủ đầu tư & phát triển hạ tầng'   , '2012-01-01', '2024-12-01'),
(19, 'Công ty Xây dựng Quảng Ninh'    , 'Thi công xây dựng' , '0203190002', 'info@xdqn.vn'           , '234 Trần Phú, Hạ Long, Quảng Ninh'  , 'Nhà thầu hạ tầng kỹ thuật KCN'     , '2014-06-01', '2024-12-01');

-- =============================================================================
-- BẢNG BẢN ĐỒ QUY HOẠCH / PLANNING_MAP
-- =============================================================================
CREATE TABLE planning_map (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    building_id   BIGINT       NOT NULL,
    map_type      VARCHAR(100) COMMENT 'Quy hoạch 1/500, 1/2000...',
    issued_by     VARCHAR(255) COMMENT 'Cơ quan ban hành',
    issued_date   DATE,
    expired_date  DATE,
    image_url     TEXT         COMMENT '/uploads/planning/building_id/map.jpg',
    note          TEXT,
    created_date  DATETIME,
    FOREIGN KEY (building_id) REFERENCES building(id)
);

INSERT INTO planning_map (building_id, map_type, issued_by, issued_date, expired_date, image_url, note, created_date) VALUES
(1 , 'Quy hoạch 1/2000', 'Sở Quy hoạch KT Hà Nội'       , '2017-03-15', '2027-03-15', 'map1.jpg' , 'Phân khu N5 Ba Đình'              , '2018-11-20'),
(2 , 'Quy hoạch 1/500' , 'UBND quận Nam Từ Liêm, HN'    , '2016-08-01', '2026-08-01', 'map2.jpg' , 'Hành lang xanh sông Nhuệ'         , '2018-08-25'),
(3 , 'Quy hoạch 1/500' , 'UBND quận Hoàn Kiếm, HN'      , '2018-07-20', '2028-07-20', 'map3.jpg' , 'Khu phố cổ, hạn chế chiều cao'    , '2019-07-18'),
(4 , 'Quy hoạch 1/2000', 'Sở Quy hoạch KT TP.HCM'       , '2016-01-01', '2026-01-01', 'map4.jpg' , 'Khu trung tâm Q1, hạn chế xây mới', '2018-05-20'),
(5 , 'Quy hoạch 1/2000', 'UBND quận Hải Châu, Đà Nẵng'  , '2019-06-01', '2029-06-01', 'map5.jpg' , 'Khu thương mại trung tâm ĐN'      , '2020-07-14'),
(6 , 'Quy hoạch 1/500' , 'Sở Quy hoạch KT TP.HCM'       , '2018-03-01', '2028-03-01', 'map6.jpg' , 'Trục đường Lê Lợi, khu CBD HCM'   , '2019-03-15'),
(8 , 'Quy hoạch 1/2000', 'UBND quận 7, TP.HCM'          , '2018-06-01', '2028-06-01', 'map7.jpg' , 'Khu đô thị Phú Mỹ Hưng, trục thương mại', '2019-03-10'),
(9 , 'Quy hoạch 1/2000', 'UBND quận Nam Từ Liêm, HN'    , '2020-01-15', '2030-01-15', 'map8.jpg' , 'Khu đô thị Vinhomes Smart City'   , '2020-06-01'),
(7 , 'Quy hoạch 1/2000', 'UBND TP. Nha Trang, Khánh Hòa', '2019-09-01', '2029-09-01', 'map9.jpg' , 'Khu du lịch ven biển Trần Phú'    , '2020-06-10'),
(10, 'Quy hoạch 1/500' , 'UBND TP. Thủ Đức, HCM'        , '2021-06-01', '2031-06-01', 'map10.jpg', 'Khu đô thị Thủ Đức mới'           , '2022-03-15'),
(11, 'Quy hoạch 1/500' , 'UBND TP. Thủ Đức, HCM'        , '2018-03-01', '2028-03-01', 'map11.jpg', 'Khu dân cư cao cấp Thảo Điền'     , '2019-01-10'),
(12, 'Quy hoạch 1/500' , 'UBND TP. Thủ Đức, HCM'        , '2020-07-01', '2030-07-01', 'map12.jpg', 'Hành lang sông Đồng Nai, khu đô thị mới' , '2021-03-01'),
(13, 'Quy hoạch 1/500' , 'UBND quận Thanh Xuân, HN'     , '2017-10-01', '2027-10-01', 'map13.jpg', 'Khu dân cư Nguyễn Tuân, hạn chế cao tầng', '2018-05-15'),
(14, 'Quy hoạch 1/500' , 'UBND quận Bình Thạnh, TP.HCM' , '2018-04-01', '2028-04-01', 'map14.jpg', 'Khu ven sông Sài Gòn, Bình Thạnh' , '2019-04-10'),
(15, 'Quy hoạch 1/2000', 'UBND quận Ngũ Hành Sơn, ĐN'   , '2020-05-01', '2030-05-01', 'map15.jpg', 'Khu du lịch Non Nước, bãi biển ĐN', '2021-06-01'),
(16, 'Quy hoạch 1/2000', 'UBND TP.HCM - Sở GTVT'        , '2016-08-01', '2026-08-01', 'map16.jpg', 'Quy hoạch cảng & logistics Cát Lái'      , '2017-03-01'),
(17, 'Quy hoạch 1/2000', 'Ban QL KCN tỉnh Đồng Nai'     , '2014-06-01', '2024-06-01', 'map17.jpg', 'KCN Amata mở rộng giai đoạn 3 — HẾT HẠN' , '2015-01-10'),
(18, 'Quy hoạch 1/2000', 'Ban QL KCN tỉnh Bình Dương'   , '2019-06-01', '2029-06-01', 'map18.jpg', 'KCN VSIP II mở rộng'              , '2020-06-10'),
(19, 'Quy hoạch 1/2000', 'Ban QL KKT tỉnh Quảng Ninh'   , '2020-09-01', '2030-09-01', 'map19.jpg', 'KCN Deep C, Khu KT Ven biển QN'   , '2021-08-15');

-- =============================================================================
-- BẢNG CƠ QUAN TƯ PHÁP / LEGAL_AUTHORITY
-- =============================================================================
-- Chỉ ADMIN và STAFF được phân công quản lý building đó mới được xem.
-- KHÔNG hiển thị tại trang public.
CREATE TABLE legal_authority (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    building_id    BIGINT        NOT NULL,
    authority_name VARCHAR(255)  NOT NULL,
    authority_type VARCHAR(100)  COMMENT 'NOTARY, LAND_REGISTRY, LAW_FIRM, TAX_OFFICE',
    address        TEXT,
    phone          VARCHAR(20),
    email          VARCHAR(100),
    note           TEXT,
    created_date   DATETIME,
    FOREIGN KEY (building_id) REFERENCES building(id)
);

INSERT INTO legal_authority (building_id, authority_name, authority_type, address, phone, email, note, created_date) VALUES
(1 , 'Chi cục Thuế quận Ba Đình, HN'  , 'TAX_OFFICE'   , '18 Liễu Giai, Ba Đình, HN'           , '0241000101', 'cct.badinh@gdt.gov.vn' , 'Kê khai VAT, thuế TNCN nhân viên'   , '2019-01-01'),
(1 , 'Phòng Cảnh sát PCCC Ba Đình'    , 'LAW_FIRM'     , '2 Phạm Huy Thông, Ba Đình, HN'       , '0241000102', 'pccc.badinh@hanoipccc.vn', 'Kiểm định PCCC định kỳ 6 tháng/lần', '2019-01-01'),
(2 , 'Chi cục Thuế quận Nam Từ Liêm'  , 'TAX_OFFICE'   , '72 Trần Bình, Nam Từ Liêm, HN'       , '0241000201', 'cct.ntuliem@gdt.gov.vn', 'Thuế VAT dịch vụ cho thuê văn phòng', '2018-01-01'),
(2 , 'Văn phòng Luật Hà Nội Capital'  , 'LAW_FIRM'     , '15 Phạm Hùng, Nam Từ Liêm, HN'       , '0241000202', 'info@hncapital-law.vn' , 'Soạn thảo & kiểm tra HĐ cho thuê'   , '2018-06-01'),
(3 , 'Chi cục Thuế quận Hoàn Kiếm'    , 'TAX_OFFICE'   , '43 Đinh Tiên Hoàng, Hoàn Kiếm, HN'   , '0241000301', 'cct.hoankiem@gdt.gov.vn', 'Kê khai thuế dịch vụ văn phòng'    , '2020-01-01'),
(3 , 'Phòng CS PCCC quận Hoàn Kiếm'   , 'LAW_FIRM'     , '28 Hàng Bài, Hoàn Kiếm, HN'          , '0241000302', 'pccc.hoankiem@hanoi.vn', 'Kiểm tra PCCC & cấp phép hoạt động' , '2020-01-01'),
(4 , 'Chi cục Thuế quận 1, TP.HCM'    , 'TAX_OFFICE'   , '79 Hàm Nghi, Q.1, TP.HCM'            , '0283000401', 'cct.q1@gdt.gov.vn'     , 'Thuế VAT & môn bài dịch vụ VP'      , '2018-01-01'),
(4 , 'Văn phòng Luật LCT Lawyers'     , 'LAW_FIRM'     , '14 Tôn Thất Đạm, Q.1, TP.HCM'        , '0283000402', 'info@lct-lawyers.vn'   , 'Tư vấn pháp lý HĐ thuê văn phòng'   , '2018-06-01'),
(5 , 'Chi cục Thuế quận Hải Châu, ĐN' , 'TAX_OFFICE'   , '12 Ông Ích Khiêm, Hải Châu, ĐN'      , '0236000501', 'cct.haichau@gdt.gov.vn', 'Kê khai VAT văn phòng cho thuê'     , '2021-01-01'),
(5 , 'Phòng CS PCCC TP. Đà Nẵng'      , 'LAW_FIRM'     , '18 Phan Đình Phùng, Hải Châu, ĐN'    , '0236000502', 'pccc@danang.gov.vn'    , 'Cấp phép & kiểm định PCCC'          , '2021-01-01'),
(6 , 'Văn phòng Công chứng Sài Gòn'   , 'NOTARY'       , '55 Pasteur, Q.3, TP.HCM'             , '0283000001', 'vpcc.saigon@hcmc.vn'   , 'Công chứng HĐ mua bán Saigon Centre', '2024-01-10'),
(6 , 'Sở TN&MT TP. Hồ Chí Minh'       , 'LAND_REGISTRY', '60 Trương Định, Q.3, TP.HCM'         , '0283000002', 'sotnmt@tphcm.gov.vn'   , 'Đăng ký biến động đất đai HCM'      , '2024-01-10'),
(7 , 'Phòng Công chứng số 1 Khánh Hòa', 'NOTARY'       , '16 Lê Thánh Tôn, Lộc Thọ, Nha Trang' , '0258000001', 'pc1@congchung.kh.vn'   , 'Công chứng khu vực Nha Trang'       , '2025-01-10'),
(7 , 'Sở TN&MT tỉnh Khánh Hòa'        , 'LAND_REGISTRY', '04 Trần Phú, Lộc Thọ, Nha Trang, KH' , '0258000002', 'sotnmt@khanhhoa.gov.vn', 'Đăng ký biến động đất đai KH'       , '2025-01-10'),
(8 , 'Chi cục Thuế quận 7, TP.HCM'    , 'TAX_OFFICE'   , '9 Huỳnh Tấn Phát, Q.7, TP.HCM'       , '0283000801', 'cct.q7@gdt.gov.vn'     , 'Thuế VAT kinh doanh shophouse'      , '2020-03-01'),
(8 , 'Văn phòng Công chứng Q.7 HCM'   , 'NOTARY'       , '25 Nguyễn Thị Thập, Q.7, TP.HCM'     , '0283000802', 'vpcc.q7@hcmc.vn'       , 'Công chứng HĐ thuê shophouse'       , '2020-03-01'),
(9 , 'Chi cục Thuế quận Nam Từ Liêm'  , 'TAX_OFFICE'   , '72 Trần Bình, Nam Từ Liêm, HN'       , '0241000901', 'cct.ntuliem@gdt.gov.vn', 'Thuế kinh doanh shophouse'          , '2021-01-01'),
(9 , 'Phòng Công chứng số 4 HN'       , 'NOTARY'       , '34 Xuân Thủy, Cầu Giấy, HN'          , '0241000902', 'pc4@congchung.hn.vn'   , 'Công chứng HĐ thuê mặt bằng'        , '2021-01-01'),
(10, 'Văn phòng Công chứng Thủ Đức'   , 'NOTARY'       , '23 Xa Lộ Hà Nội, P. Thảo Điền, TĐ'   , '0283000003', 'vpcc.thuduc@hcmc.vn'   , 'Công chứng khu vực Thủ Đức'         , '2023-06-01'),
(10, 'Chi cục Thuế TP. Thủ Đức'       , 'TAX_OFFICE'   , '12 Đặng Văn Bi, P. Bình Thọ, TĐ, HCM', '0283000004', 'cct.thuduc@gdt.gov.vn' , 'Kê khai & nộp thuế chuyển nhượng'   , '2023-06-01'),
(11, 'Chi cục Thuế TP. Thủ Đức'       , 'TAX_OFFICE'   , '12 Đặng Văn Bi, Bình Thọ, TĐ, HCM'   , '0283001101', 'cct.thuduc@gdt.gov.vn' , 'Thuế TNCN từ cho thuê căn hộ'       , '2020-01-01'),
(11, 'Văn phòng Công chứng Thủ Đức'   , 'NOTARY'       , '23 Xa Lộ Hà Nội, Thảo Điền, TĐ'      , '0283001102', 'vpcc.thuduc@hcmc.vn'   , 'Công chứng HĐ cho thuê căn hộ'      , '2020-01-01'),
(12, 'Chi cục Thuế TP. Thủ Đức'       , 'TAX_OFFICE'   , '12 Đặng Văn Bi, Bình Thọ, TĐ, HCM'   , '0283001201', 'cct.thuduc@gdt.gov.vn' , 'Thuế từ dịch vụ cho thuê căn hộ'    , '2021-06-01'),
(12, 'Phòng CS PCCC TP. Thủ Đức'      , 'LAW_FIRM'     , '45 Võ Văn Ngân, Bình Thọ, TĐ, HCM'   , '0283001202', 'pccc.thuduc@hcmc.gov.vn', 'Kiểm định PCCC chung cư định kỳ'   , '2021-06-01'),
(13, 'Chi cục Thuế quận Thanh Xuân'   , 'TAX_OFFICE'   , '103 Khuất Duy Tiến, Thanh Xuân, HN'  , '0241001301', 'cct.thxuan@gdt.gov.vn' , 'Thuế TNCN từ cho thuê căn hộ'       , '2019-06-01'),
(13, 'Văn phòng Công chứng Thanh Xuân', 'NOTARY'       , '15 Nguyễn Tuân, Thanh Xuân, HN'      , '0241001302', 'vpcc.thxuan@hanoi.vn'  , 'Công chứng HĐ thuê căn hộ'          , '2019-06-01'),
(14, 'Văn phòng Công chứng Bình Thạnh', 'NOTARY'       , '30 Đinh Bộ Lĩnh, Bình Thạnh, TP.HCM' , '0283000005', 'vpcc.bt@hcmc.vn'       , 'Công chứng HĐ mua bán căn hộ'       , '2023-04-15'),
(14, 'Chi cục Thuế Q. Bình Thạnh'     , 'TAX_OFFICE'   , '32 Nơ Trang Long, Bình Thạnh, TP.HCM', '0283000006', 'cct.bt@gdt.gov.vn'     , 'Nộp thuế thu nhập cá nhân'          , '2023-04-15'),
(15, 'Phòng Công chứng số 3 Đà Nẵng'  , 'NOTARY'       , '28 Nguyễn Văn Linh, Hải Châu, ĐN'    , '0236000001', 'pc3@congchung.dn.vn'   , 'Công chứng khu vực Đà Nẵng'         , '2024-08-10'),
(15, 'Sở TN&MT TP. Đà Nẵng'           , 'LAND_REGISTRY', '62 Lý Tự Trọng, Thạch Thang, ĐN'     , '0236000002', 'sotnmt@danang.gov.vn'  , 'Đăng ký biến động đất đai ĐN'       , '2024-08-10'),
(16, 'Chi cục Thuế TP. Thủ Đức'       , 'TAX_OFFICE'   , '12 Đặng Văn Bi, Bình Thọ, TĐ, HCM'   , '0283001601', 'cct.thuduc@gdt.gov.vn' , 'Thuế VAT dịch vụ kho bãi'           , '2018-01-01'),
(16, 'Cảnh sát PCCC Q. Thủ Đức'       , 'LAW_FIRM'     , '60 Kha Vạn Cân, Thủ Đức, TP.HCM'     , '0283001602', 'pccc.thuduc@hcmc.gov.vn', 'Kiểm định PCCC kho bãi 6 tháng/lần', '2018-01-01'),
(17, 'Chi cục Thuế TP. Biên Hòa, ĐN'  , 'TAX_OFFICE'   , '90 Phạm Văn Thuận, Biên Hòa, ĐN'     , '0251001701', 'cct.bienhoa@gdt.gov.vn', 'Thuế đất KCN & dịch vụ kho xưởng'   , '2016-01-01'),
(17, 'Ban QL KCN tỉnh Đồng Nai'       , 'LAND_REGISTRY', 'KCN Amata, Long Bình, Biên Hòa, ĐN'  , '0251001702', 'bql@kcndongnai.gov.vn' , 'Cấp phép xây dựng & thuê đất KCN'   , '2016-01-01'),
(18, 'Văn phòng Công chứng Bình Dương', 'NOTARY'       , '8 Đại lộ Bình Dương, Hiệp Thành, BD' , '0274000001', 'vpcc.bd@binhduong.vn'  , 'Công chứng khu vực Bình Dương'      , '2025-02-01'),
(18, 'Ban Quản lý KCN Bình Dương'     , 'LAND_REGISTRY', 'VSIP II, Bình Hòa, Thuận An, BD'     , '0274000002', 'bql@vsip.com.vn'       , 'Thủ tục thuê đất KCN, giấy phép'    , '2025-02-01'),
(19, 'Văn phòng Công chứng Quảng Ninh', 'NOTARY'       , '234 Trần Phú, Hồng Hải, Hạ Long, QN' , '0203000001', 'vpcc.qn@quangninh.vn'  , 'Công chứng khu vực Quảng Ninh'      , '2024-11-05'),
(19, 'Ban QL KKT Ven biển QN'         , 'LAND_REGISTRY', 'KCN Deep C, Đông Mai, Quảng Yên, QN' , '0203000002', 'bql@deepc.vn'          , 'Thủ tục đất KKT ven biển QN'        , '2024-11-05');

-- =============================================================================
-- BẢNG TIỆN ÍCH LÂN CẬN / NEARBY_AMENITY
-- =============================================================================
CREATE TABLE nearby_amenity (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    building_id    BIGINT        NOT NULL,
    name           VARCHAR(255)  NOT NULL,
    amenity_type   ENUM('SHOPPING','PARK','HOSPITAL','SCHOOL','RESTAURANT','BANK','GYM','TRANSPORT','OTHER') NOT NULL,
    distance_meter INT           COMMENT 'Khoảng cách tính bằng mét',
    address        VARCHAR(255),
    latitude       DECIMAL(10,7) NULL COMMENT 'Vĩ độ tiện ích — Phase 2',
    longitude      DECIMAL(10,7) NULL COMMENT 'Kinh độ tiện ích — Phase 2',
    created_date   DATETIME,
    FOREIGN KEY (building_id) REFERENCES building(id)
);

INSERT INTO nearby_amenity (building_id, name, amenity_type, distance_meter, address, latitude, longitude, created_date) VALUES
(1 , 'Vincom Center Liễu Giai'        , 'SHOPPING'  , 400 , 'Liễu Giai, Ba Đình, HN'           , 21.0345, 105.8223, '2018-11-20'),
(1 , 'Công viên Thủ Lệ'               , 'PARK'      , 700 , 'Bưởi, Ba Đình, HN'                , 21.0412, 105.8134, '2018-11-20'),
(1 , 'Bệnh viện Hữu Nghị'             , 'HOSPITAL'  , 500 , '1 Trần Khánh Dư, Hai Bà Trưng, HN', 21.0267, 105.8456, '2018-11-20'),
(1 , 'Ga tàu điện Kim Mã'             , 'TRANSPORT' , 300 , 'Kim Mã, Ba Đình, HN'              , 21.0334, 105.8167, '2018-11-20'),
(2 , 'Aeon Mall Hà Đông'              , 'SHOPPING'  , 900 , 'Dương Nội, Hà Đông, HN'           , 20.9789, 105.7712, '2018-08-25'),
(2 , 'Công viên Mễ Trì'               , 'PARK'      , 400 , 'Mễ Trì, Nam Từ Liêm, HN'          , 21.0112, 105.7834, '2018-08-25'),
(2 , 'Bệnh viện 198'                  , 'HOSPITAL'  , 600 , '8 Trần Bình, Nam Từ Liêm, HN'     , 21.0178, 105.7923, '2018-08-25'),
(2 , 'The Garden Mall'                , 'SHOPPING'  , 500 , 'Mễ Trì Hạ, Nam Từ Liêm, HN'       , 21.0123, 105.7856, '2018-08-25'),
(3 , 'Tràng Tiền Plaza'               , 'SHOPPING'  , 200 , '24 Hai Bà Trưng, Hoàn Kiếm, HN'   , 21.0267, 105.8545, '2019-07-18'),
(3 , 'Hồ Hoàn Kiếm'                   , 'PARK'      , 400 , 'Đinh Tiên Hoàng, Hoàn Kiếm, HN'   , 21.0285, 105.8542, '2019-07-18'),
(3 , 'Bệnh viện Việt Đức'             , 'HOSPITAL'  , 600 , '40 Tràng Thi, Hoàn Kiếm, HN'      , 21.0312, 105.8478, '2019-07-18'),
(3 , 'Ga Hà Nội'                      , 'TRANSPORT' , 800 , '120 Lê Duẩn, Hoàn Kiếm, HN'       , 21.0245, 105.8412, '2019-07-18'),
(4 , 'Vincom Center Đồng Khởi'        , 'SHOPPING'  , 300 , '72 Lê Thánh Tôn, Q.1, TP.HCM'     , 10.7745, 106.7023, '2018-05-20'),
(4 , 'Công viên 23/9'                 , 'PARK'      , 800 , 'Phạm Ngũ Lão, Q.1, TP.HCM'        , 10.7656, 106.6934, '2018-05-20'),
(4 , 'Bệnh viện Chợ Rẫy'              , 'HOSPITAL'  , 1500, '201B Nguyễn Chí Thanh, Q.5, HCM'  , 10.7534, 106.6656, '2018-05-20'),
(4 , 'Bến Bạch Đằng'                  , 'TRANSPORT' , 200 , 'Tôn Đức Thắng, Q.1, TP.HCM'       , 10.7712, 106.7034, '2018-05-20'),
(5 , 'Vincom Plaza Đà Nẵng'           , 'SHOPPING'  , 200 , '910A Ngô Quyền, Sơn Trà, ĐN'      , 16.0634, 108.2234, '2020-07-14'),
(5 , 'Công viên 29/3'                 , 'PARK'      , 600 , 'Duy Tân, Hải Châu, ĐN'            , 16.0589, 108.2067, '2020-07-14'),
(5 , 'Bệnh viện C Đà Nẵng'            , 'HOSPITAL'  , 800 , '122 Hải Phòng, Hải Châu, ĐN'      , 16.0645, 108.2156, '2020-07-14'),
(5 , 'Sân bay Đà Nẵng'                , 'TRANSPORT' , 2000, 'Duy Tân, Ngũ Hành Sơn, ĐN'        , 16.0439, 108.1992, '2020-07-14'),
(6 , 'Parkson Lê Thánh Tôn'           , 'SHOPPING'  , 400 , '35 Lê Thánh Tôn, Q.1, TP.HCM'     , 10.7756, 106.7012, '2019-03-15'),
(6 , 'Công viên Tao Đàn'              , 'PARK'      , 700 , 'Trương Định, Q.1, TP.HCM'         , 10.7745, 106.6945, '2019-03-15'),
(6 , 'Bệnh viện FV'                   , 'HOSPITAL'  , 1200, '6 Nguyễn Lương Bằng, Q.7, HCM'    , 10.7234, 106.7056, '2019-03-15'),
(6 , 'Ga Metro Bến Thành'             , 'TRANSPORT' , 300 , 'Lê Lợi, Q.1, TP.HCM'              , 10.7734, 106.6978, '2019-03-15'),
(7 , 'Vincom Plaza Nha Trang'         , 'SHOPPING'  , 500 , '44 Lê Thánh Tôn, Lộc Thọ, NT, KH' , 12.2456, 109.1934, '2020-06-10'),
(7 , 'Biển Nha Trang'                 , 'PARK'      , 300 , 'Trần Phú, Lộc Thọ, Nha Trang, KH' , 12.2445, 109.1978, '2020-06-10'),
(7 , 'Bệnh viện Đa khoa KH'           , 'HOSPITAL'  , 1000, '19 Yersin, Xương Huân, Nha Trang' , 12.2512, 109.1856, '2020-06-10'),
(7 , 'Cảng tàu Nha Trang'             , 'TRANSPORT' , 800 , '2 Trần Phú, Lộc Thọ, Nha Trang'   , 12.2367, 109.1989, '2020-06-10'),
(8 , 'SC VivoCity'                    , 'SHOPPING'  , 600 , '1058 Nguyễn Văn Linh, Q.7, HCM'   , 10.7289, 106.7123, '2020-08-01'),
(8 , 'Công viên Phú Mỹ Hưng'          , 'PARK'      , 400 , 'Nguyễn Lương Bằng, Q.7, HCM'      , 10.7234, 106.7089, '2020-08-01'),
(8 , 'Bệnh viện FV'                   , 'HOSPITAL'  , 800 , '6 Nguyễn Lương Bằng, Q.7, HCM'    , 10.7234, 106.7056, '2020-08-01'),
(8 , 'Café The Coffee House Q7'       , 'RESTAURANT', 200 , 'Nguyễn Lương Bằng, Q.7, HCM'      , 10.7212, 106.7034, '2020-08-01'),
(9 , 'Aeon Mall Hà Đông'              , 'SHOPPING'  , 1200, 'Dương Nội, Hà Đông, HN'           , 20.9789, 105.7712, '2021-05-10'),
(9 , 'Công viên Tây Mỗ'               , 'PARK'      , 300 , 'Tây Mỗ, Nam Từ Liêm, HN'          , 20.9912, 105.7589, '2021-05-10'),
(9 , 'Bệnh viện 103'                  , 'HOSPITAL'  , 1500, '261 Phùng Hưng, Hà Đông, HN'      , 20.9734, 105.7934, '2021-05-10'),
(9 , 'Vietcombank Vinhomes SC'        , 'BANK'      , 100 , 'Đại Lộ Thăng Long, Tây Mỗ, HN'    , 20.9934, 105.7623, '2021-05-10'),
(10, 'Vincom Mega Mall Thảo Điền'     , 'SHOPPING'  , 500 , 'Xa Lộ Hà Nội, TP. Thủ Đức, HCM'   , 10.8034, 106.7345, '2022-03-15'),
(10, 'Công viên bờ sông Thủ Đức'      , 'PARK'      , 400 , 'Xa Lộ Hà Nội, Thảo Điền, TĐ'      , 10.8045, 106.7289, '2022-03-15'),
(10, 'Bệnh viện Ung Bướu HCM'         , 'HOSPITAL'  , 1800, '3 Nơ Trang Long, Bình Thạnh, HCM' , 10.8023, 106.6978, '2022-03-15'),
(10, 'Ga Metro Thảo Điền'             , 'TRANSPORT' , 600 , 'Xa Lộ Hà Nội, Thảo Điền, TĐ'      , 10.8012, 106.7234, '2022-03-15'),
(11, 'Vincom Mega Mall Thảo Điền'     , 'SHOPPING'  , 700 , 'Xa Lộ Hà Nội, TP. Thủ Đức, HCM'   , 10.8034, 106.7345, '2021-07-01'),
(11, 'Công viên Bờ Sông Sài Gòn'      , 'PARK'      , 300 , 'Nguyễn Hữu Cảnh, Bình Thạnh, HCM' , 10.7912, 106.7212, '2021-07-01'),
(11, 'Bệnh viện Tâm Anh HCM'          , 'HOSPITAL'  , 1000, '2B Phổ Quang, Tân Bình, HCM'      , 10.8023, 106.6756, '2021-07-01'),
(11, 'Gym California Thảo Điền'       , 'GYM'       , 400 , 'Xa Lộ Hà Nội, Thảo Điền, TĐ'      , 10.8023, 106.7312, '2021-07-01'),
(12, 'Vincom Mega Mall Thảo Điền'     , 'SHOPPING'  , 1200, 'Xa Lộ Hà Nội, TP. Thủ Đức, HCM'   , 10.8034, 106.7345, '2022-09-05'),
(12, 'Công viên Long Bình'            , 'PARK'      , 500 , 'Long Bình, TP. Thủ Đức, HCM'      , 10.8289, 106.7534, '2022-09-05'),
(12, 'Bệnh viện Đa khoa TĐ'           , 'HOSPITAL'  , 1500, '22 Đặng Văn Bi, Bình Thọ, TĐ'     , 10.8167, 106.7456, '2022-09-05'),
(12, 'Siêu thị Lotte Long Bình'       , 'SHOPPING'  , 800 , 'Long Bình, TP. Thủ Đức, HCM'      , 10.8312, 106.7589, '2022-09-05'),
(13, 'Aeon Mall Hà Đông'              , 'SHOPPING'  , 1500, 'Dương Nội, Hà Đông, HN'           , 20.9789, 105.7712, '2021-07-01'),
(13, 'Công viên Nhân Chính'           , 'PARK'      , 600 , 'Nhân Chính, Thanh Xuân, HN'       , 21.0034, 105.8134, '2021-07-01'),
(13, 'Bệnh viện Bưu Điện'             , 'HOSPITAL'  , 800 , '2 Trịnh Hoài Đức, Thanh Xuân, HN' , 21.0067, 105.8178, '2021-07-01'),
(13, 'BIDV Thanh Xuân'                , 'BANK'      , 300 , 'Nguyễn Tuân, Thanh Xuân, HN'      , 21.0089, 105.8189, '2021-07-01'),
(14, 'Landmark 81 Mall'               , 'SHOPPING'  , 200 , '720A Điện Biên Phủ, Bình Thạnh'   , 10.7956, 106.7212, '2019-04-10'),
(14, 'Công viên Bờ Sông Sài Gòn'      , 'PARK'      , 100 , 'Nguyễn Hữu Cảnh, Bình Thạnh, HCM' , 10.7912, 106.7212, '2019-04-10'),
(14, 'Bệnh viện Gia An 115'           , 'HOSPITAL'  , 800 , '633 Kinh Dương Vương, Bình Tân'   , 10.7678, 106.6723, '2019-04-10'),
(14, 'The Coffee House BT'            , 'RESTAURANT', 150 , 'Nguyễn Hữu Cảnh, Bình Thạnh'      , 10.7923, 106.7189, '2019-04-10'),
(15, 'Gigamall Ngũ Hành Sơn'          , 'SHOPPING'  , 800 , '255 Ngũ Hành Sơn, ĐN'             , 15.9934, 108.2534, '2021-06-01'),
(15, 'Bãi biển Non Nước'              , 'PARK'      , 400 , 'Trường Sa, Ngũ Hành Sơn, ĐN'      , 15.9845, 108.2712, '2021-06-01'),
(15, 'Bệnh viện Ngũ Hành Sơn'         , 'HOSPITAL'  , 900 , '222 Ngũ Hành Sơn, ĐN'             , 15.9912, 108.2456, '2021-06-01'),
(15, 'Sân bay Đà Nẵng'                , 'TRANSPORT' , 4000, 'Duy Tân, Ngũ Hành Sơn, ĐN'        , 16.0439, 108.1992, '2021-06-01'),
(16, 'Cảng Cát Lái'                   , 'TRANSPORT' , 300 , 'P. Cát Lái, TP. Thủ Đức, HCM'     , 10.7423, 106.7889, '2021-04-18'),
(16, 'Big C Thủ Đức'                  , 'SHOPPING'  , 1200, '1 Xa Lộ Hà Nội, Thủ Đức, HCM'     , 10.7823, 106.7456, '2021-04-18'),
(16, 'Bệnh viện Thủ Đức'              , 'HOSPITAL'  , 1500, '29 Phú Châu, Tam Phú, TĐ, HCM'    , 10.7834, 106.7612, '2021-04-18'),
(16, 'BIDV Chi nhánh Cát Lái'         , 'BANK'      , 400 , 'P. Cát Lái, TP. Thủ Đức, HCM'     , 10.7489, 106.7912, '2021-04-18'),
(17, 'Vincom Biên Hòa'                , 'SHOPPING'  , 2000, '1 Đường 3/2, TP. Biên Hòa, ĐN'    , 10.9523, 106.8312, '2022-01-25'),
(17, 'Sân golf Long Thành'            , 'OTHER'     , 3000, 'Long Thành, Đồng Nai'             , 10.9234, 107.0123, '2022-01-25'),
(17, 'Bệnh viện Đồng Nai'             , 'HOSPITAL'  , 2500, '1 Phan Chu Trinh, Biên Hòa, ĐN'   , 10.9345, 106.8234, '2022-01-25'),
(17, 'Sân bay Long Thành'             , 'TRANSPORT' , 5000, 'Huyện Long Thành, Đồng Nai'       , 10.7934, 107.0323, '2022-01-25'),
(18, 'Aeon Mall Bình Dương'           , 'SHOPPING'  , 1500, 'ĐT743, Bình Hòa, Thuận An, BD'    , 10.9023, 106.6745, '2020-06-10'),
(18, 'Công viên Đại Nam'              , 'PARK'      , 5000, 'Hiệp An, Thủ Dầu Một, BD'         , 10.9934, 106.6523, '2020-06-10'),
(18, 'Bệnh viện Becamex BD'           , 'HOSPITAL'  , 2000, 'Mỹ Phước, Thủ Dầu Một, BD'        , 11.0034, 106.6456, '2020-06-10'),
(18, 'BIDV Chi nhánh BD'              , 'BANK'      , 600 , 'ĐL Bình Dương, Bình Hòa, BD'      , 10.9112, 106.6834, '2020-06-10'),
(19, 'Vincom Hạ Long'                 , 'SHOPPING'  , 4000, '2 Hạ Long, Bãi Cháy, QN'          , 20.9534, 107.0712, '2021-08-15'),
(19, 'Vịnh Hạ Long'                   , 'PARK'      , 4500, 'Bãi Cháy, Hạ Long, QN'            , 20.9512, 107.1234, '2021-08-15'),
(19, 'Bệnh viện Việt Nam-Thụy Điển QN', 'HOSPITAL'  , 3500, 'A6 Hùng Thắng, Bãi Cháy, QN'      , 20.9589, 107.0723, '2021-08-15'),
(19, 'Cảng Cái Lân Quảng Ninh'        , 'TRANSPORT' , 2000, 'Cái Lân, Bãi Cháy, Hạ Long, QN'   , 20.9312, 107.0456, '2021-08-15');
