-- =====================================================
-- Tạo bảng property_request cho tính năng Yêu cầu Thuê/Mua
-- =====================================================

CREATE TABLE IF NOT EXISTS property_request (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id         BIGINT NOT NULL,
    building_id         BIGINT NOT NULL,
    request_type        VARCHAR(20) NOT NULL COMMENT 'RENT hoặc BUY',
    
    -- Snapshot thông tin KH tại thời điểm gửi
    full_name           VARCHAR(100),
    phone               VARCHAR(15),
    email               VARCHAR(100),
    
    -- Chi tiết yêu cầu
    desired_area        INT COMMENT 'Diện tích muốn thuê (chỉ cho RENT)',
    desired_start_date  DATE COMMENT 'Ngày muốn bắt đầu (chỉ cho RENT)',
    desired_end_date    DATE COMMENT 'Ngày muốn kết thúc (chỉ cho RENT)',
    offered_price       DECIMAL(15,2) COMMENT 'Giá KH đề xuất',
    message             TEXT COMMENT 'Ghi chú của KH',
    
    -- Xử lý bởi Admin
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / APPROVED / REJECTED / CANCELLED',
    admin_note          TEXT COMMENT 'Lý do từ chối',
    processed_by        BIGINT COMMENT 'Staff xử lý',
    
    -- Liên kết hợp đồng (sau khi duyệt)
    contract_id         BIGINT COMMENT 'FK → contract (cho RENT)',
    sale_contract_id    BIGINT COMMENT 'FK → sale_contract (cho BUY)',
    
    created_date        DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_date       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_pr_customer FOREIGN KEY (customer_id) REFERENCES customer(id),
    CONSTRAINT fk_pr_building FOREIGN KEY (building_id) REFERENCES building(id),
    CONSTRAINT fk_pr_staff FOREIGN KEY (processed_by) REFERENCES staff(id),
    CONSTRAINT fk_pr_contract FOREIGN KEY (contract_id) REFERENCES contract(id),
    CONSTRAINT fk_pr_sale_contract FOREIGN KEY (sale_contract_id) REFERENCES sale_contract(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
