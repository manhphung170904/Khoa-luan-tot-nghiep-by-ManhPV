let adminDashboardCharts = [];

function destroyAdminDashboardCharts() {
    adminDashboardCharts.forEach(chart => chart.destroy());
    adminDashboardCharts = [];
}

function escapeAdminDashboardHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatAdminDashboardBillions(value) {
    return Number(value || 0) / 1_000_000_000;
}

function getAdminDashboardRankClass(index) {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return '';
}

function renderPotentialCustomers(customers) {
    const body = document.getElementById('potentialCustomersBody');
    if (!body) return;

    const safeCustomers = Array.isArray(customers) ? customers : [];
    if (safeCustomers.length === 0) {
        body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Không có dữ liệu</td></tr>`;
        return;
    }

    body.innerHTML = safeCustomers.map((customer, index) => `
        <tr onclick="window.location='/admin/customer/${customer.customerId}'">
            <td><span class="rank-badge ${getAdminDashboardRankClass(index)}">${index + 1}</span></td>
            <td>KH-${escapeAdminDashboardHtml(customer.customerId)}</td>
            <td>${escapeAdminDashboardHtml(customer.fullName)}</td>
            <td style="text-align:right;"><span class="bc bc-primary">${escapeAdminDashboardHtml(customer.contractCount)}</span></td>
        </tr>
    `).join('');
}

function renderTopStaffs(staffs) {
    const body = document.getElementById('topStaffsBody');
    if (!body) return;

    const safeStaffs = Array.isArray(staffs) ? staffs : [];
    if (safeStaffs.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:1.5rem;">Chưa có dữ liệu hiệu suất</td></tr>`;
        return;
    }

    body.innerHTML = safeStaffs.map((staff, index) => `
        <tr onclick="window.location='/admin/staff/${staff.staffId}'">
            <td><span class="rank-badge ${getAdminDashboardRankClass(index)}">${index + 1}</span></td>
            <td class="col-manv">NV-${escapeAdminDashboardHtml(staff.staffId)}</td>
            <td>${escapeAdminDashboardHtml(staff.fullName)}</td>
            <td style="text-align:center;">${escapeAdminDashboardHtml(staff.contractCount)}</td>
            <td>
                <div class="perf-bar-wrap">
                    <div class="perf-bar-bg">
                        <div class="perf-bar-fill" style="width:${Number(staff.performancePercent || 0)}%"></div>
                    </div>
                    <span class="perf-pct">${Number(staff.performancePercent || 0)}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderRecentBuildings(buildings) {
    const container = document.getElementById('recentBuildingsContainer');
    if (!container) return;

    const safeBuildings = Array.isArray(buildings) ? buildings.slice(0, 4) : [];
    if (safeBuildings.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;color:#9ca3af;font-size:0.8125rem;padding:1rem 0;">
                Không có dữ liệu gần đây
            </div>
        `;
        return;
    }

    container.innerHTML = safeBuildings.map(building => `
        <div class="recent-item" onclick="window.location='/admin/building/${building.id}'">
            <i class="bi bi-building"></i>
            <div style="min-width:0;">
                <div class="ri-name">${escapeAdminDashboardHtml(building.name)}</div>
                <div class="ri-sub">Quản lý: <span>${escapeAdminDashboardHtml(building.managerName || '--')}</span></div>
            </div>
            <i class="bi bi-chevron-right ms-auto" style="color:#d1d5db;font-size:0.75rem;flex-shrink:0;"></i>
        </div>
    `).join('');
}

function createAdminDashboardCharts(dashboard) {
    destroyAdminDashboardCharts();

    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    Chart.defaults.color = '#6b7280';
    Chart.defaults.font.size = 12;

    const tooltipDefaults = {
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 10,
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 6
    };

    const scaleDefaults = {
        y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            border: { display: false }
        },
        x: {
            grid: { display: false },
            border: { display: false }
        }
    };

    adminDashboardCharts.push(new Chart(document.getElementById('revenueChartCombined'), {
        type: 'line',
        data: {
            labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
            datasets: [
                {
                    label: 'Năm ' + dashboard.currentYear,
                    data: (dashboard.monthlyRevenue || []).map(formatAdminDashboardBillions),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6',
                    pointHoverRadius: 6
                },
                {
                    label: 'Năm ' + dashboard.lastYear,
                    data: (dashboard.monthlyRevenueLastYear || []).map(formatAdminDashboardBillions),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.06)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 3],
                    pointRadius: 3,
                    pointBackgroundColor: '#ef4444',
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipDefaults,
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} tỷ VNĐ`
                    }
                }
            },
            scales: scaleDefaults
        }
    }));

    adminDashboardCharts.push(new Chart(document.getElementById('districtChart'), {
        type: 'doughnut',
        data: {
            labels: dashboard.districtNames || [],
            datasets: [{
                data: dashboard.districtCounts || [],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } }
                },
                tooltip: tooltipDefaults
            }
        }
    }));

    adminDashboardCharts.push(new Chart(document.getElementById('revenue3YearChart'), {
        type: 'bar',
        data: {
            labels: [dashboard.yearBeforeLast, dashboard.lastYear, dashboard.currentYear],
            datasets: [{
                label: 'Doanh thu (tỷ VNĐ)',
                data: (dashboard.yearlyRevenue || []).map(formatAdminDashboardBillions),
                backgroundColor: ['#94a3b8', '#60a5fa', '#3b82f6'],
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipDefaults,
                    callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(2)} tỷ VNĐ` }
                }
            },
            scales: scaleDefaults
        }
    }));

    adminDashboardCharts.push(new Chart(document.getElementById('contract3YearChart'), {
        type: 'line',
        data: {
            labels: dashboard.contractYearLabels || [],
            datasets: [{
                label: 'Số hợp đồng',
                data: dashboard.contractYearCounts || [],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.08)',
                fill: true,
                tension: 0.4,
                borderWidth: 2.5,
                pointRadius: 4,
                pointBackgroundColor: '#f59e0b',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipDefaults,
                    callbacks: { label: ctx => ` ${ctx.parsed.y} hợp đồng` }
                }
            },
            scales: {
                ...scaleDefaults,
                y: { ...scaleDefaults.y, ticks: { stepSize: 1 } }
            }
        }
    }));

    adminDashboardCharts.push(new Chart(document.getElementById('contractsByBuildingChart'), {
        type: 'bar',
        data: {
            labels: dashboard.buildingNames || [],
            datasets: [{
                label: 'Số hợp đồng',
                data: dashboard.buildingContractCounts || [],
                backgroundColor: '#3b82f6',
                borderRadius: 5,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipDefaults,
                    callbacks: { label: ctx => ` ${ctx.raw} hợp đồng` }
                }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { precision: 0 } },
                y: { grid: { display: false }, border: { display: false } }
            }
        }
    }));

    const totalSold = Number(dashboard.totalSold || 0);
    const totalNotSold = Number(dashboard.totalNotSold || 0);

    const centerTextPlugin = {
        id: 'centerText',
        afterDraw(chart) {
            const { ctx, chartArea: { width, height, left, top } } = chart;
            const total = totalSold + totalNotSold;
            const pct = total > 0 ? ((totalSold / total) * 100).toFixed(1) + '%' : '0%';
            const cx = left + width / 2;
            const cy = top + height / 2;

            ctx.save();
            ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pct, cx, cy - 10);
            ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText('Đã bán', cx, cy + 14);
            ctx.restore();
        }
    };

    const externalTooltipHandler = (context) => {
        const { chart, tooltip } = context;
        let tooltipEl = document.getElementById('saleRateTooltip');
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'saleRateTooltip';
            tooltipEl.style.cssText = `
                position: absolute;
                background: rgba(17,24,39,0.92);
                color: #f9fafb;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                pointer-events: none;
                transition: opacity 0.2s;
                white-space: nowrap;
                z-index: 100;
                border: 1px solid #374151;
            `;
            chart.canvas.closest('.d-card').style.position = 'relative';
            chart.canvas.closest('.d-card').appendChild(tooltipEl);
        }

        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = '0';
            return;
        }

        const dataIndex = tooltip.dataPoints[0].dataIndex;
        const label = tooltip.dataPoints[0].label;
        const value = tooltip.dataPoints[0].raw;
        const total = totalSold + totalNotSold;
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        const dotColor = dataIndex === 0 ? '#8b5cf6' : '#9ca3af';

        tooltipEl.innerHTML = `
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${dotColor};margin-right:6px;vertical-align:middle;"></span>
            ${label}: <strong style="color:#fff;margin-left:4px;">${value} tòa (${pct}%)</strong>
        `;

        const cardRect = chart.canvas.closest('.d-card').getBoundingClientRect();
        const canvasRect = chart.canvas.getBoundingClientRect();
        const posX = canvasRect.left - cardRect.left + tooltip.caretX;
        const posY = canvasRect.top - cardRect.top + tooltip.caretY - 40;

        tooltipEl.style.left = posX + 'px';
        tooltipEl.style.top = posY + 'px';
        tooltipEl.style.opacity = '1';
        tooltipEl.style.transform = 'translateX(-50%)';
    };

    adminDashboardCharts.push(new Chart(document.getElementById('saleRateChart'), {
        type: 'doughnut',
        plugins: [centerTextPlugin],
        data: {
            labels: ['Đã bán', 'Chưa bán'],
            datasets: [{
                data: [totalSold, totalNotSold],
                backgroundColor: ['#8b5cf6', '#e5e7eb'],
                borderWidth: 0,
                hoverOffset: 8,
                cutout: '72%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 10 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: externalTooltipHandler
                }
            }
        }
    }));
}

async function loadAdminDashboard() {
    const response = await fetch('/api/v1/admin/dashboard', {
        credentials: 'same-origin'
    });

    if (!response.ok) {
        throw new Error('Failed to load admin dashboard');
    }

    const dashboard = await response.json();

    document.getElementById('dashboardUpdatedAt').textContent = dashboard.updatedAt ?? '--';
    document.getElementById('totalBuildingsStat').textContent = dashboard.totalBuildings ?? 0;
    document.getElementById('totalCustomersStat').textContent = dashboard.totalCustomers ?? 0;
    document.getElementById('totalStaffsStat').textContent = dashboard.totalStaffs ?? 0;
    document.getElementById('totalContractsStat').textContent = dashboard.totalContracts ?? 0;
    document.getElementById('currentYearLabel').textContent = dashboard.currentYear ?? '';
    document.getElementById('lastYearLabel').textContent = dashboard.lastYear ?? '';
    document.getElementById('totalForSaleStat').textContent = dashboard.totalForSale ?? 0;
    document.getElementById('totalSoldStat').textContent = dashboard.totalSold ?? 0;
    document.getElementById('totalNotSoldStat').textContent = dashboard.totalNotSold ?? 0;

    renderPotentialCustomers(dashboard.potentialCustomers);
    renderTopStaffs(dashboard.topStaffs);
    renderRecentBuildings(dashboard.recentBuildings);
    createAdminDashboardCharts(dashboard);
}


