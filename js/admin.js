/**
 * ==========================================
 * TRIATHLON LỤC NAM - ADMIN LOGIC (admin.js)
 * ==========================================
 * Quản lý giao diện admin, tải danh sách thành viên, tổng hợp dữ liệu từ Google Sheets
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 1. KIỂM TRA BẢO MẬT & PHÂN QUYỀN (ĐỒNG BỘ CHUẨN LOCALSTORAGE)
    // ==========================================================================
    let currentUser = null;
    try {
        // Đọc đúng gói dữ liệu "triathlon_user" được sinh ra từ file login.js
        const userJson = localStorage.getItem("triathlon_user");
        currentUser = userJson ? JSON.parse(userJson) : null;
    } catch (err) {
        console.error("Lỗi đọc cấu hình bảo mật:", err);
    }

    // Nếu không có dữ liệu hoặc quyền trong hệ thống KHÔNG PHẢI là ADMIN -> Đá ngược về login
    if (!currentUser || currentUser.role !== 'ADMIN') {
        alert('Cảnh báo bảo mật: Vui lòng đăng nhập tài khoản ADMIN để truy cập!');
        localStorage.removeItem("triathlon_user"); // Dọn dẹp bộ nhớ nếu có dữ liệu rác
        window.location.href = 'index.html';
        return;
    }

    // Gắn thông tin Admin lên thẻ giao diện sau khi xác thực thành công
    document.getElementById('adminName').textContent = currentUser.name || "Người Quản Trị";
    
    // Gắn ngày hiện tại chuẩn định dạng DD/MM/YYYY
    const today = new Date();
    document.getElementById('currentDate').textContent = 
        `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // ==========================================================================
    // 2. TẢI VÀ ĐỔ DỮ LIỆU DASHBOARD HỆ THỐNG
    // ==========================================================================
    let listUsersCache = []; // Lưu trữ tạm danh sách để nạp vào Select Form

    async function loadDashboardData() {
        // Gọi hàm kết nối từ file api.js
        const res = await callSystemAPI("getDashboard");
        
        if (!res.success) {
            alert("Lỗi tải thông tin từ máy chủ Google Sheets!");
            return;
        }

        // --- A. Đổ dữ liệu Thống kê tổng quan & Tắt Skeleton ---
        const m = document.getElementById('statMembers');
        if (m) { m.textContent = res.stats.members; m.classList.remove('skeleton'); }
        
        const c = document.getElementById('statCups');
        if (c) { c.textContent = res.stats.cups; c.classList.remove('skeleton'); }
        
        const s = document.getElementById('statSwim');
        if (s) { s.innerHTML = `${res.stats.swim} <span>km</span>`; s.classList.remove('skeleton'); }
        
        const b = document.getElementById('statBike');
        if (b) { b.innerHTML = `${res.stats.bike} <span>km</span>`; b.classList.remove('skeleton'); }
        
        const r = document.getElementById('statRun');
        if (r) { r.innerHTML = `${res.stats.run} <span>km</span>`; r.classList.remove('skeleton'); }

        // --- B. Đổ dữ liệu Thống kê nhanh ---
        if(document.getElementById('topSwimName')) {
            document.getElementById('topSwimName').textContent = res.quickStats.topSwim.name;
            document.getElementById('topSwimName').classList.remove('skeleton-text');
            document.getElementById('topSwimVal').textContent = `${res.quickStats.topSwim.val} km`;
        }

        if(document.getElementById('topBikeName')) {
            document.getElementById('topBikeName').textContent = res.quickStats.topBike.name;
            document.getElementById('topBikeName').classList.remove('skeleton-text');
            document.getElementById('topBikeVal').textContent = `${res.quickStats.topBike.val} km`;
        }

        if(document.getElementById('topRunName')) {
            document.getElementById('topRunName').textContent = res.quickStats.topRun.name;
            document.getElementById('topRunName').classList.remove('skeleton-text');
            document.getElementById('topRunVal').textContent = `${res.quickStats.topRun.val} km`;
        }

        if(document.getElementById('topTotalName')) {
            document.getElementById('topTotalName').textContent = res.quickStats.topTotal.name;
            document.getElementById('topTotalName').classList.remove('skeleton-text');
            document.getElementById('topTotalVal').textContent = `${res.quickStats.topTotal.val} Pts`;
        }

        // --- C. Đổ dữ liệu Bảng xếp hạng (Top 10) ---
        const tbody = document.getElementById('rankingTableBody');
        if (tbody) {
            tbody.innerHTML = ""; // Xóa dữ liệu cũ / Hàng Skeleton
            res.rankings.forEach(item => {
                let rankDisplay = `<span class="rank-badge rank-${item.rank}">${item.rank}</span>`;
                if (item.rank === 1) rankDisplay = "🥇";
                if (item.rank === 2) rankDisplay = "🥈";
                if (item.rank === 3) rankDisplay = "🥉";

                const row = `
                    <tr>
                        <td style="text-align: center;">${rankDisplay}</td>
                        <td>
                            <div class="user-cell">
                                <img src="${item.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.name) + '&background=0F5132&color=fff'}" alt="user">
                                <span>${item.name}</span>
                            </div>
                        </td>
                        <td style="text-align: right; font-weight: 600; color: var(--primary);">${item.points}</td>
                        <td style="text-align: center; font-weight: bold; color: #D97706;">${item.cups}</td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
        }

        // --- D. Đổ dữ liệu Hoạt động gần đây ---
        const actList = document.getElementById('activityList');
        if (actList) {
            actList.innerHTML = "";
            res.activities.forEach(act => {
                const item = `
                    <div class="activity-item" style="margin-bottom: 8px;">
                        <div class="activity-top">
                            <span class="activity-user" style="font-weight: 700;">${act.name}</span>
                            <span class="activity-date" style="font-size: 11px; color: #A0AEC0;">${act.date}</span>
                        </div>
                        <div class="activity-metrics" style="margin-top: 4px;">
                            <span>🏊 ${act.swim ? act.swim * 1000 : 0}m</span>
                            <span>🚴 ${act.bike || 0}km</span>
                            <span>🏃 ${act.run || 0}km</span>
                        </div>
                    </div>
                `;
                actList.insertAdjacentHTML('beforeend', item);
            });
        }

        // --- E. Lưu danh sách thành viên vào bộ nhớ tạm phục vụ Form Thao Tác ---
        listUsersCache = res.users || [];
        populateUserDropdowns();
    }

    // Đổ danh sách người dùng vào các ô Select Dropdown và List Modal
    function populateUserDropdowns() {
        const selectDrop = document.getElementById('resetUserSelect');
        const listContainer = document.getElementById('membersContainerList');
        
        if(selectDrop) selectDrop.innerHTML = '<option value="">-- Chọn thành viên --</option>';
        if(listContainer) listContainer.innerHTML = '';

        listUsersCache.forEach(user => {
            // Điền vào form Reset PIN
            if (selectDrop) {
                const opt = document.createElement('option');
                opt.value = user.id;
                opt.textContent = user.name;
                selectDrop.appendChild(opt);
            }

            // Điền vào danh sách quản lý thành viên công khai
            if (listContainer) {
                const item = `
                    <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; font-size:13px;">
                        <strong>${user.name}</strong>
                        <span style="color:var(--primary); font-weight:bold; font-size:11px;">${user.role}</span>
                    </div>
                `;
                listContainer.insertAdjacentHTML('beforeend', item);
            }
        });
    }

    // Kích hoạt chạy hàm lấy dữ liệu ngay khi tải xong trang
    loadDashboardData();

    // ==========================================================================
    // 3. XỬ LÝ SỰ KIỆN SUBMIT FORM (THÊM THÀNH VIÊN & ĐẶT LẠI PIN)
    // ==========================================================================
    
    // Form Thêm Thành Viên
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('addName').value.trim();
            const pin = document.getElementById('addPin').value.trim();
            const role = document.getElementById('addRole').value;

            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = "Đang xử lý..."; btn.disabled = true;

            const res = await callSystemAPI("addMember", { name, pin, role });
            alert(res.msg);
            
            btn.textContent = originalText; btn.disabled = false;
            if(res.success) {
                e.target.reset();
                toggleModal('modalAddMember');
                loadDashboardData(); // Tải lại dữ liệu mới tinh
            }
        });
    }

    // Form Đặt Lại Mã PIN
    const resetPinForm = document.getElementById('resetPinForm');
    if (resetPinForm) {
        resetPinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('resetUserSelect').value;
            const newPin = document.getElementById('resetNewPin').value.trim();

            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = "Đang cập nhật..."; btn.disabled = true;

            const res = await callSystemAPI("resetPin", { userId, newPin });
            alert(res.msg);

            btn.textContent = originalText; btn.disabled = false;
            if(res.success) {
                e.target.reset();
                toggleModal('modalResetPin');
            }
        });
    }

    // ==========================================================================
    // 4. XỬ LÝ SỰ KIỆN ĐĂNG XUẤT (LOGOUT LỆNH)
    // ==========================================================================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Anh có chắc chắn muốn đăng xuất quyền Quản trị viên không?')) {
                localStorage.clear(); // Xóa sạch bộ nhớ phiên đăng nhập
                window.location.href = 'index.html'; // Đá ngược về trang đăng nhập chủ
            }
        });
    }
});

// HÀM ĐIỀU KHIỂN BẬT TẮT SLIDE UP POPUP MODAL (GLOBAL SCOPE)
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.toggle('show');
    }
}