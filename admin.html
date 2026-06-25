/*
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

        // 2. Kiểm tra và chạy hàm
        if (currentUser) {
            if (currentUser.role === 'ADMIN') {
                renderAdminProfile(currentUser); // Chạy hàm cho Admin
            } else {
                renderBasicProfile(currentUser); // Chạy hàm cho thành viên thường
            }
        }

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
    
        // Kiểm tra xem res có tồn tại và thành công không
        if (!res || !res.success) {
            console.error("Dữ liệu trả về bị lỗi hoặc trống:", res);
            alert("Không thể tải dữ liệu: " + (res?.msg || "Lỗi không xác định"));
            return;
        }


       // --- A. Đổ dữ liệu Thống kê tổng quan & Tắt Skeleton ---
        const m = document.getElementById('statMembers');
        if (m && res.rankings) { m.textContent = res.rankings.length; m.classList.remove('skeleton'); }
        
        const c = document.getElementById('statCups');
        if (c) { c.textContent = res.summary?.cups || 0; c.classList.remove('skeleton'); }
        
        const s = document.getElementById('statSwim');
        if (s) { s.innerHTML = `${res.summary?.swim ? res.summary.swim.toFixed(1) : 0} <span>km</span>`; s.classList.remove('skeleton'); }
        
        const b = document.getElementById('statBike');
        if (b) { b.innerHTML = `${res.summary?.bike ? res.summary.bike.toFixed(1) : 0} <span>km</span>`; b.classList.remove('skeleton'); }
        
        const r = document.getElementById('statRun');
        if (r) { r.innerHTML = `${res.summary?.run ? res.summary.run.toFixed(1) : 0} <span>km</span>`; r.classList.remove('skeleton'); }

        // // --- B. Đổ dữ liệu Thống kê nhanh (SỬA ĐỂ TRÁNH SẬP DO THIẾU QUICKSTATS) ---
        // // Thêm dấu ?. sau res.quickStats để nếu Backend chưa làm tính năng này thì Frontend không bị sập
        // if(document.getElementById('topSwimName')) {
        //     document.getElementById('topSwimName').textContent = res.quickStats?.topSwim?.name || "Chưa cập nhật";
        //     document.getElementById('topSwimName').classList.remove('skeleton-text');
        //     document.getElementById('topSwimVal').textContent = `${res.quickStats?.topSwim?.val || 0} km`;
        // }

        // if(document.getElementById('topBikeName')) {
        //     document.getElementById('topBikeName').textContent = res.quickStats?.topBike?.name || "Chưa cập nhật";
        //     document.getElementById('topBikeName').classList.remove('skeleton-text');
        //     document.getElementById('topBikeVal').textContent = `${res.quickStats?.topBike?.val || 0} km`;
        // }

        // if(document.getElementById('topRunName')) {
        //     document.getElementById('topRunName').textContent = res.quickStats?.topRun?.name || "Chưa cập nhật";
        //     document.getElementById('topRunName').classList.remove('skeleton-text');
        //     document.getElementById('topRunVal').textContent = `${res.quickStats?.topRun?.val || 0} km`;
        // }

        // if(document.getElementById('topTotalName')) {
        //     document.getElementById('topTotalName').textContent = res.quickStats?.topTotal?.name || "Chưa cập nhật";
        //     document.getElementById('topTotalName').classList.remove('skeleton-text');
        //     document.getElementById('topTotalVal').textContent = `${res.quickStats?.topTotal?.val || 0} Pts`;
        // }
        
// --- C. Đổ dữ liệu Bảng xếp hạng (ĐÃ SẮP XẾP, LÀM TRÒN & CÓ AVATAR THEO ID) ---
        const tbody = document.getElementById('rankingTableBody');
        if (tbody && res.rankings) {
            tbody.innerHTML = ""; // Xóa dữ liệu cũ / Hàng Skeleton

            // 1. Sao chép và Sắp xếp danh sách theo điểm (points) từ cao xuống thấp
            const sortedRankings = [...res.rankings].sort((a, b) => {
                const pointsA = parseFloat(a.points) || 0;
                const pointsB = parseFloat(b.points) || 0;
                return pointsB - pointsA; // Xếp điểm cao lên đầu
            });

            // 2. Chạy vòng lặp đổ dữ liệu lên bảng
            sortedRankings.forEach((item, index) => {
                const currentRank = index + 1; // Thứ hạng thực tế sau khi sắp xếp
                
                // Xử lý hiển thị danh hiệu/huy chương cho Top 3
                let rankDisplay = `<span class="rank-badge rank-${currentRank}">${currentRank}</span>`;
                if (currentRank === 1) rankDisplay = "🥇";
                if (currentRank === 2) rankDisplay = "🥈";
                if (currentRank === 3) rankDisplay = "🥉";

                // Làm tròn điểm số chính xác 2 chữ số thập phân
                const displayPoints = item.points ? parseFloat(item.points).toFixed(2) : "0.00";

                // Đường dẫn ảnh theo ID của từng người (Ví dụ: avatars/U001.jpg)
                const avatarPath = `avatars/${item.id || 'default'}.jpg`;

                const row = `
                    <tr>
                        <td style="text-align: center;">${rankDisplay}</td>
                        <td>
                            <div class="user-cell">
                                <img src="${avatarPath}" 
                                     onerror="this.onerror=null; this.src='avatars/default.jpg';" 
                                     alt="user">
                                <span>${item.name}</span>
                            </div>
                        </td>
                        <td style="text-align: right; font-weight: 600; color: var(--primary);">${displayPoints}</td>
                        <td style="text-align: center; font-weight: bold; color: #D97706;">${item.cups || 0}</td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
        }
      // --- D. Đổ dữ liệu Hoạt động gần đây (GIỚI HẠN 10, CÓ CUỘN & ĐỊNH DẠNG LẠI THỜI GIAN) ---
        const actList = document.getElementById('activityList');
        if (actList && res.activities) {
            actList.innerHTML = "";
            
            // 1. Cấu hình khung cuộn bằng JS
            actList.style.maxHeight = "380px"; 
            actList.style.overflowY = "auto";  
            actList.style.paddingRight = "5px"; 

            // 2. Lấy đúng 10 hoạt động đầu tiên
            const top10Activities = res.activities.slice(0, 10);

            top10Activities.forEach(act => {
                // 3. Logic làm tròn số thực của bạn
                const swimMeters = act.swim ? parseFloat(act.swim).toFixed(0) : "0";
                const bikeKm = act.bike ? parseFloat(act.bike).toFixed(2) : "0";
                const runKm = act.run ? parseFloat(act.run).toFixed(2) : "0";

                // 4. XỬ LÝ ĐỊNH DẠNG THỜI GIAN (Giờ:Phút Ngày/Tháng/Năm)
                let displayDate = "Chưa rõ thời gian";
                if (act.date) {
                    const dateObj = new Date(act.date);
                    
                    // Kiểm tra xem chuỗi ngày tháng có hợp lệ không
                    if (!isNaN(dateObj.getTime())) {
                        const hours = String(dateObj.getHours()).padStart(2, '0');
                        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Tháng trong JS chạy từ 0-11
                        const year = dateObj.getFullYear();

                        displayDate = `${hours}:${minutes} ${day}/${month}/${year}`;
                    } else {
                        // Nếu chuỗi không parse trực tiếp được (vd dạng dd/mm/yyyy hh:mm sẵn), giữ nguyên chuỗi gốc
                        displayDate = act.date;
                    }
                }

                const item = `
                    <div class="activity-item" style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                        <div class="activity-top" style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="activity-user" style="font-weight: 700; color: #2d3748;">${act.name}</span>
                            <span class="activity-date" style="font-size: 11px; color: #A0AEC0;">${displayDate}</span>
                        </div>
                        <div class="activity-metrics" style="margin-top: 4px; display: flex; gap: 12px; font-size: 13px;">
                            <span>🏊 ${swimMeters}m</span>
                            <span>🚴 ${bikeKm}km</span>
                            <span>🏃 ${runKm}km</span>
                        </div>
                    </div>
                `;
                actList.insertAdjacentHTML('beforeend', item);
            });
        }
        // --- E. Lưu danh sách thành viên vào bộ nhớ tạm phục vụ Form Thao Tác ---
        listUsersCache = res.rankings || [];
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

            // 1. Lấy và chuẩn hóa dữ liệu đầu vào
            const name = document.getElementById('addName').value.trim();
            const pin = document.getElementById('addPin').value.trim();
            const role = document.getElementById('addRole').value;

            // 2. Kiểm tra dữ liệu nhanh (Client-side Validation)
            if (!name || !pin || !role) {
                alert("Vui lòng điền đầy đủ tất cả các trường thông tin!");
                return;
            }

            if (isNaN(pin) || pin.length < 4) { // Ví dụ: kiểm tra mã PIN phải là số và tối thiểu 4 số
                alert("Mã PIN phải là một chuỗi số (tối thiểu 4 ký số)!");
                return;
            }

            // 3. Thay đổi trạng thái Button để tránh người dùng click liên tục (Spam)
            const btn = e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = "Đang xử lý..."; 
            btn.disabled = true;

            try {
                // 4. Gọi API hệ thống
                const res = await callSystemAPI("addMember", { name, pin, role });
                
                alert(res.msg);

                // 5. Nếu thành công, làm sạch form và đóng modal
                if (res.success) {
                    e.target.reset();
                    toggleModal('modalAddMember');
                    await loadDashboardData(); // Thêm await nếu loadDashboardData cũng là hàm async
                }
            } catch (error) {
                console.error("Lỗi khi thêm thành viên:", error);
                alert("Đã xảy ra lỗi kết nối đến máy chủ. Vui lòng thử lại sau!");
            } finally {
                // 6. Khối này luôn chạy dù API thành công hay thất bại -> Trả lại trạng thái nút ban đầu
                btn.textContent = originalText; 
                btn.disabled = false;
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

/**
 * Render thông tin chuyên biệt cho Admin
 * @param {Object} admin - Đối tượng thông tin admin
 */
function renderAdminProfile(admin) {
    const adminNameEl = document.getElementById("adminName");
    const adminRoleEl = document.getElementById("adminCode");
    const adminAvatarEl = document.getElementById("adminCardAvatar");

    if (adminNameEl) adminNameEl.innerText = admin.name || "Quản Trị Viên";
    if (adminRoleEl) adminRoleEl.innerText = `Mã số: ${admin.id || "AD--"}`;

    // Xử lý Avatar chuyên biệt cho Admin
    if (adminAvatarEl && admin.id) {
        adminAvatarEl.src = `avatars/${admin.id}.jpg`;
        adminAvatarEl.onerror = function() {
            this.src = 'avatars/default.jpg';
            this.onerror = null;
        };
    }
}
