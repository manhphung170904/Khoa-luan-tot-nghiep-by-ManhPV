function formatStaffDashboardCurrency(value) {
    const amount = Number(value || 0);
    return amount.toLocaleString('vi-VN') + ' VNĐ';
}

function formatStaffDashboardDate(value) {
    if (!value) {
        return '--';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString('vi-VN');
}

function escapeStaffDashboardHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderStaffDashboardRows(bodyId, rowsHtml, colspan, emptyMessage, height) {
    const body = document.getElementById(bodyId);
    if (!body) {
        return;
    }

    body.innerHTML = rowsHtml || `
        <tr>
            <td colspan="${colspan}">
                <div style="
                    height: ${height};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    color: #777;
                ">
                    ${emptyMessage}
                </div>
            </td>
        </tr>
    `;
}

function renderOverdueInvoices(invoices) {
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const title = document.getElementById('overdueInvoicesTitle');
    const viewAll = document.getElementById('viewAllOverdueInvoices');

    if (title) {
        title.textContent = `Hóa đơn quá hạn (${safeInvoices.length})`;
    }
    if (viewAll) {
        viewAll.classList.toggle('d-none', safeInvoices.length === 0);
    }

    const rows = safeInvoices.slice(0, 2).map(invoice => `
        <tr>
            <td><strong>${escapeStaffDashboardHtml(invoice.id)}</strong></td>
            <td>${escapeStaffDashboardHtml(invoice.customer?.fullName || '--')}</td>
            <td><strong>${formatStaffDashboardCurrency(invoice.totalAmount)}</strong></td>
            <td><span class="badge-status badge-unpaid">${formatStaffDashboardDate(invoice.dueDate)}</span></td>
        </tr>
    `).join('');

    renderStaffDashboardRows('overdueInvoicesBody', rows, 4, 'Hiện không có hóa đơn quá hạn', '66.8px');
}

function renderExpiringContracts(contracts) {
    const safeContracts = Array.isArray(contracts) ? contracts : [];
    const title = document.getElementById('expiringContractsTitle');
    const viewAll = document.getElementById('viewAllExpiringContracts');

    if (title) {
        title.textContent = `Hợp đồng sắp hết hạn (${safeContracts.length})`;
    }
    if (viewAll) {
        viewAll.classList.toggle('d-none', safeContracts.length === 0);
    }

    const rows = safeContracts.slice(0, 2).map(contract => `
        <tr>
            <td><strong>${escapeStaffDashboardHtml(contract.id)}</strong></td>
            <td>${escapeStaffDashboardHtml(contract.customer || '--')}</td>
            <td>${escapeStaffDashboardHtml(contract.building || '--')}</td>
            <td><span class="badge-status badge-expired">${formatStaffDashboardDate(contract.endDate)}</span></td>
        </tr>
    `).join('');

    renderStaffDashboardRows('expiringContractsBody', rows, 4, 'Hiện không có hợp đồng sắp hết hạn', '66.8px');
}

function renderExpiringInvoices(invoices) {
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const title = document.getElementById('expiringInvoicesTitle');
    const viewAll = document.getElementById('viewAllExpiringInvoices');

    if (title) {
        title.textContent = `Hóa đơn sắp hết hạn (${safeInvoices.length})`;
    }
    if (viewAll) {
        viewAll.classList.toggle('d-none', safeInvoices.length === 0);
    }

    const rows = safeInvoices.slice(0, 3).map(invoice => `
        <tr>
            <td><strong>${escapeStaffDashboardHtml(invoice.id)}</strong></td>
            <td>${escapeStaffDashboardHtml(invoice.customerName || '--')}</td>
            <td>${escapeStaffDashboardHtml(invoice.buildingName || '--')}</td>
            <td>${escapeStaffDashboardHtml(invoice.month || '--')}/${escapeStaffDashboardHtml(invoice.year || '--')}</td>
            <td>${formatStaffDashboardCurrency(invoice.totalAmount)}</td>
            <td><span class="badge-status badge-unpaid">${formatStaffDashboardDate(invoice.dueDate)}</span></td>
            <td><span class="badge-status badge-unpaid">${invoice.status === 'PENDING' ? 'Chưa thanh toán' : escapeStaffDashboardHtml(invoice.status || '--')}</span></td>
        </tr>
    `).join('');

    renderStaffDashboardRows('expiringInvoicesBody', rows, 7, 'Hiện không có hóa đơn sắp hết hạn', '87px');
}

async function loadStaffDashboard() {
    const response = await fetch('/api/v1/staff/dashboard', {
        credentials: 'same-origin'
    });

    if (!response.ok) {
        throw new Error('Failed to load staff dashboard');
    }

    const dashboard = await response.json();
    document.getElementById('buildingCntStat').textContent = dashboard.buildingCnt ?? 0;
    document.getElementById('contractCntStat').textContent = dashboard.contractCnt ?? 0;
    document.getElementById('customerCntStat').textContent = dashboard.customerCnt ?? 0;
    document.getElementById('unpaidInvoiceCntStat').textContent = dashboard.unpaidInvoiceCnt ?? 0;

    renderOverdueInvoices(dashboard.overdueInvoices);
    renderExpiringContracts(dashboard.expiringContracts);
    renderExpiringInvoices(dashboard.expiringInvoices);
}
