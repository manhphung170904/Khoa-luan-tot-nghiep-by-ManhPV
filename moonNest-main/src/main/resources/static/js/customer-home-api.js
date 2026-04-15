let currentInvoiceId = null;

function formatDashboardCurrency(value) {
    const amount = Number(value || 0);
    return amount.toLocaleString('vi-VN') + ' VNĐ';
}

function getDashboardInvoiceDetailAmount(invoice, index) {
    return invoice && Array.isArray(invoice.details) && invoice.details[index]
        ? invoice.details[index].amount
        : 0;
}

function escapeDashboardHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCustomerContracts(contracts) {
    const safeContracts = Array.isArray(contracts) ? contracts : [];
    const title = document.getElementById('contractsTitle');
    const container = document.getElementById('contractsContainer');

    if (!title || !container) {
        return;
    }

    title.textContent = `Hợp đồng của tôi (${safeContracts.length})`;

    if (safeContracts.length === 0) {
        container.innerHTML = `
            <div class="contract-card p-3 mb-3">
                <p class="text-muted mb-0">Chưa có hợp đồng nào</p>
            </div>
        `;
        return;
    }

    container.innerHTML = safeContracts.slice(0, 2).map(contract => `
        <div class="contract-card p-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="contract-id">Mã hợp đồng: ${escapeDashboardHtml(contract.id)}</span>
                <span class="badge rounded-pill px-3 py-2 ${contract.status === 'ACTIVE' ? 'badge-active' : 'badge-expired'}">
                    ${escapeDashboardHtml(contract.status || '')}
                </span>
            </div>
            <div class="row g-3">
                <div class="col-6">
                    <div class="detail-label">Tòa nhà</div>
                    <div class="detail-value">${escapeDashboardHtml(contract.building?.name || '--')}</div>
                </div>
                <div class="col-6">
                    <div class="detail-label">Ngày bắt đầu</div>
                    <div class="detail-value">${escapeDashboardHtml(contract.formattedStartDate || '--')}</div>
                </div>
                <div class="col-6">
                    <div class="detail-label">Diện tích</div>
                    <div class="detail-value">${escapeDashboardHtml(contract.rentArea || 0)} m²</div>
                </div>
                <div class="col-6">
                    <div class="detail-label">Ngày kết thúc</div>
                    <div class="detail-value">${escapeDashboardHtml(contract.formattedEndDate || '--')}</div>
                </div>
                <div class="col-6">
                    <div class="detail-label">Giá thuê</div>
                    <div class="detail-value">${formatDashboardCurrency(contract.rentPrice)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCustomerInvoice(invoice, totalUnpaidInvoices) {
    const title = document.getElementById('pendingInvoicesTitle');
    const container = document.getElementById('pendingInvoiceContainer');
    const modalBody = document.getElementById('paymentModalBody');
    const confirmButton = document.getElementById('confirmPaymentButton');

    if (!title || !container || !modalBody || !confirmButton) {
        return;
    }

    title.textContent = `Hóa đơn chờ thanh toán (${totalUnpaidInvoices || 0})`;

    if (!invoice) {
        currentInvoiceId = null;
        confirmButton.classList.add('d-none');
        container.innerHTML = `
            <div class="card-body text-center py-4">
                <p class="text-muted mb-0">Chưa có hóa đơn nào</p>
            </div>
        `;
        modalBody.innerHTML = `<p class="text-muted mb-0">Chưa có hóa đơn nào.</p>`;
        return;
    }

    currentInvoiceId = invoice.id;
    confirmButton.classList.remove('d-none');

    container.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h5 class="mb-1" style="color: var(--primary-color); font-size: 15px; font-weight: 600;">
                        Hóa đơn tháng ${escapeDashboardHtml(invoice.month)}/${escapeDashboardHtml(invoice.year)}
                    </h5>
                    <p class="text-muted mb-0 small">Hạn thanh toán: ${escapeDashboardHtml(invoice.dueDate || '--')}</p>
                    <p class="text-muted mb-0 small">Tòa ${escapeDashboardHtml(invoice.contract?.building?.name || '--')} - Thuê ${escapeDashboardHtml(invoice.contract?.rentArea || 0)}m²</p>
                </div>
                <span class="badge bg-warning text-dark rounded-pill px-3 py-2" style="font-size: 11px;">Chờ thanh toán</span>
            </div>
            <div class="border-top pt-3 mb-3">
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted small">Tiền thuê mặt bằng:</span>
                    <span class="fw-semibold small">${formatDashboardCurrency(invoice.contract?.rentPrice)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted small">Dịch vụ khác:</span>
                    <span class="fw-semibold small">${formatDashboardCurrency(invoice.totalServiceFeeAmount)}</span>
                </div>
                <div class="border-top pt-2 mt-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold" style="color: var(--primary-color);">Tổng cộng:</span>
                        <span class="fw-bold fs-5" style="color: #dc3545;">${formatDashboardCurrency(invoice.totalAmount)}</span>
                    </div>
                </div>
            </div>
            <div class="container mt-5 d-flex justify-content-center align-items-center">
                <button type="button" class="btn btn-primary d-flex justify-content-center align-items-center" data-bs-toggle="modal" data-bs-target="#paymentModal">
                    <i class="bi bi-credit-card me-2"></i>Thanh toán ngay
                </button>
            </div>
        </div>
    `;

    modalBody.innerHTML = `
        <div class="invoice-header">
            <div class="invoice-id">
                <i class="bi bi-receipt me-2"></i>
                <span>Mã hóa đơn: ${escapeDashboardHtml(invoice.id)}</span>
            </div>
            <div class="invoice-period">
                <i class="bi bi-calendar-month me-2"></i>
                <span>Tháng ${escapeDashboardHtml(invoice.month)}/${escapeDashboardHtml(invoice.year)}</span>
            </div>
        </div>
        <div class="info-section">
            <div class="info-section-title">
                <i class="bi bi-info-circle me-2"></i>Thông Tin Chung
            </div>
            <div class="info-row">
                <span class="info-label">Ngày tạo hóa đơn</span>
                <span class="info-value">${escapeDashboardHtml(invoice.createdDate || '--')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Hạn thanh toán</span>
                <span class="info-value text-danger">${escapeDashboardHtml(invoice.dueDate || '--')}</span>
            </div>
            <div class="info-row">
                <p class="text-muted mb-0 small">Tòa ${escapeDashboardHtml(invoice.contract?.building?.name || '--')} - Thuê ${escapeDashboardHtml(invoice.contract?.rentArea || 0)}m²</p>
            </div>
            <div class="info-row">
                <span class="info-label">Trạng thái</span>
                <span class="status-badge status-unpaid">
                    <i class="bi bi-exclamation-circle"></i>
                    Chưa thanh toán
                </span>
            </div>
        </div>
        <div class="info-section">
            <div class="info-section-title">
                <i class="bi bi-cash-stack me-2"></i>Chi Phí Cố Định
            </div>
            <div class="info-row">
                <span class="info-label">Tiền thuê mặt bằng</span>
                <span class="info-value">${formatDashboardCurrency(invoice.contract?.rentPrice)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Phí dịch vụ</span>
                <span class="info-value">${formatDashboardCurrency(getDashboardInvoiceDetailAmount(invoice, 1))}</span>
            </div>
        </div>
        <div class="info-section">
            <div class="info-section-title">
                <i class="bi bi-car-front me-2"></i>Phí Gửi Xe
            </div>
            <div class="utility-grid">
                <div class="utility-item">
                    <div class="utility-label"><i class="bi bi-car-front-fill me-1"></i>Ô tô</div>
                    <div class="utility-value">${formatDashboardCurrency(getDashboardInvoiceDetailAmount(invoice, 2))}</div>
                </div>
                <div class="utility-item">
                    <div class="utility-label"><i class="bi bi-bicycle me-1"></i>Xe máy</div>
                    <div class="utility-value">${formatDashboardCurrency(getDashboardInvoiceDetailAmount(invoice, 3))}</div>
                </div>
            </div>
        </div>
        <div class="info-section">
            <div class="info-section-title">
                <i class="bi bi-house me-2"></i>Phí Sinh Hoạt
            </div>
            <div class="utility-grid">
                <div class="utility-item">
                    <div class="utility-label"><i class="bi bi-lightning-charge me-1"></i>Phí điện</div>
                    <div class="utility-value">${formatDashboardCurrency(invoice.contract?.building?.electricityFee)}</div>
                </div>
                <div class="utility-item">
                    <div class="utility-label"><i class="bi bi-droplet me-1"></i>Phí nước</div>
                    <div class="utility-value">${formatDashboardCurrency(invoice.contract?.building?.waterFee)}</div>
                </div>
            </div>
        </div>
        <div class="info-section">
            <div class="info-section-title">
                <i class="bi bi-house me-2"></i>Sinh Hoạt
            </div>
            <div class="meter-reading">
                <div class="meter-info">
                    <div class="meter-icon">
                        <i class="bi bi-lightning-charge-fill"></i>
                    </div>
                    <div class="meter-details">
                        <span class="meter-label">Điện</span>
                        <span class="meter-values">${escapeDashboardHtml(invoice.utilityMeter?.electricityOld || 0)} → ${escapeDashboardHtml(invoice.utilityMeter?.electricityNew || 0)} kWh</span>
                    </div>
                </div>
                <div class="text-end">
                    <div class="usage-badge">${(invoice.utilityMeter?.electricityNew || 0) - (invoice.utilityMeter?.electricityOld || 0)} kWh</div>
                    <div class="info-value mt-1">${formatDashboardCurrency(getDashboardInvoiceDetailAmount(invoice, 4))}</div>
                </div>
            </div>
            <div class="meter-reading">
                <div class="meter-info">
                    <div class="meter-icon">
                        <i class="bi bi-droplet-fill"></i>
                    </div>
                    <div class="meter-details">
                        <span class="meter-label">Nước</span>
                        <span class="meter-values">${escapeDashboardHtml(invoice.utilityMeter?.waterOld || 0)} → ${escapeDashboardHtml(invoice.utilityMeter?.waterNew || 0)} m³</span>
                    </div>
                </div>
                <div class="text-end">
                    <div class="usage-badge">${(invoice.utilityMeter?.waterNew || 0) - (invoice.utilityMeter?.waterOld || 0)} m³</div>
                    <div class="info-value mt-1">${formatDashboardCurrency(getDashboardInvoiceDetailAmount(invoice, 5))}</div>
                </div>
            </div>
        </div>
        <div class="total-section">
            <div class="total-row">
                <span class="total-label">
                    <i class="bi bi-cash-coin me-2"></i>TỔNG CỘNG
                </span>
                <span class="total-amount">${formatDashboardCurrency(invoice.totalAmount)}</span>
            </div>
        </div>
    `;
}

async function loadCustomerDashboard() {
    const response = await fetch('/api/v1/customer/dashboard', {
        credentials: 'same-origin'
    });

    if (!response.ok) {
        throw new Error('Failed to load customer dashboard');
    }

    const dashboard = await response.json();
    const totalContractsStat = document.getElementById('totalContractsStat');
    const totalPaymentStat = document.getElementById('totalPaymentStat');
    const systemToday = document.getElementById('systemToday');
    const systemIp = document.getElementById('systemIp');

    if (totalContractsStat) {
        totalContractsStat.textContent = dashboard.totalContracts ?? 0;
    }
    if (totalPaymentStat) {
        totalPaymentStat.textContent = dashboard.totalPayment ?? '0';
    }
    if (systemToday) {
        systemToday.textContent = dashboard.today ?? '--';
    }
    if (systemIp) {
        systemIp.textContent = dashboard.clientIp ?? '--';
    }

    renderCustomerContracts(dashboard.contracts);
    renderCustomerInvoice(dashboard.detailInvoice, dashboard.totalUnpaidInvoices);
}
