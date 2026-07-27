/*
 * ==========================================
 * TRIATHLON LỤC NAM - ADMIN LOGIC (admin.js)
 * ==========================================
 * Quản lý giao diện admin, tải danh sách thành viên, tổng hợp dữ liệu từ Google Sheets
 */

let listUsersCache = []; // Lưu trữ tạm danh sách để nạp vào Select Form

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 0. XỬ LÝ THEME VÀ ĐĂNG XUẤT HỆ THỐNG
    // ==========================================================================
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) {
        loadThemeCss(savedTheme);
    }

    // Xử lý nút Đăng xuất hệ thống
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "index.html";
        });
    }

    // ==========================================================================
    // 1. KIỂM TRA BẢO MẬT & PHÂN QUYỀN (ĐỒNG BỘ CHUẨN LOCALSTORAGE)
    // ==========================================================================
    let currentUser = null;
    try {
        const userJson = localStorage.getItem("triathlon_user");
        currentUser = userJson ? JSON.parse(userJson) : null;

        if (currentUser) {
            if (currentUser.role === 'ADMIN') {
                renderAdminProfile(currentUser);
            } else {
                renderBasicProfile(currentUser);
            }
        }
    } catch (err) {
        console.error("Lỗi đọc cấu hình bảo mật:", err);
    }

    if (!currentUser || currentUser.role !== 'ADMIN') {
        alert('Cảnh báo bảo mật: Vui lòng đăng nhập tài khoản ADMIN để truy cập!');
        localStorage.removeItem("triathlon_user");
        window.location.href = 'index.html';
        return;
    }
     
    // Gắn ngày hiện tại chuẩn định dạng DD/MM/YYYY
    const today = new Date();
    document.getElementById('currentDate').textContent = 
        `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

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

            if (!name || !pin || !role) {
                alert("Vui lòng điền đầy đủ tất cả các trường thông tin!");
                return;
            }

            if (isNaN(pin) || pin.length < 4) {
                alert("Mã PIN phải là một chuỗi số (tối thiểu 4 ký số)!");
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = "Đang xử lý..."; 
            btn.disabled = true;

            try {
                const res = await callSystemAPI("addMember", { name, pin, role });
                alert(res.msg);

                if (res.success) {
                    e.target.reset();
                    toggleModal('modalAddMember');
                    await loadDashboardData();
                }
            } catch (error) {
                console.error("Lỗi khi thêm thành viên:", error);
                alert("Đã xảy ra lỗi kết nối đến máy chủ. Vui lòng thử lại sau!");
            } finally {
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

            if (!userId || !newPin) {
                alert("Vui lòng chọn thành viên và nhập mã PIN mới!");
                return;
            }

            const pinRegex = /^[0-9]{4,6}$/;
            if (!pinRegex.test(newPin)) {
                alert("Mã PIN mới phải là số và có độ dài từ 4 đến 6 ký số!");
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = "Đang cập nhật..."; 
            btn.disabled = true;

            try {
                const res = await callSystemAPI("resetPin", { userId, newPin });
                alert(res.msg);

                if (res.success) {
                    e.target.reset();
                    toggleModal('modalResetPin');
                    if (typeof loadDashboardData === "function") {
                        await loadDashboardData();
                    }
                }
            } catch (error) {
                console.error("Lỗi khi đặt lại mã PIN:", error);
                alert("Đã xảy ra lỗi kết nối. Không thể cập nhật mã PIN lúc này!");
            } finally {
                btn.textContent = originalText; 
                btn.disabled = false;
            }
        });
    }

    // Form Sửa Thành Tích
    const editActivityForm = document.getElementById('editActivityForm');
    if (editActivityForm) {
        editActivityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                rowIndex: document.getElementById('editRowIndex').value,
                swim: document.getElementById('editSwim').value,
                bike: document.getElementById('editBike').value,
                run: document.getElementById('editRun').value
            };

            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = "Đang cập nhật...";

            try {
                const res = await callSystemAPI("editActivity", data);
                alert(res.msg);
                if (res.success) {
                    toggleModal('modalEditActivity');
                    await loadDashboardData();
                }
            } catch (err) {
                console.error(err);
                alert("Lỗi kết nối máy chủ!");
            } finally {
                btn.disabled = false;
                btn.textContent = "Cập Nhật Dữ Liệu";
            }
        });
    }
});

function populateUserDropdowns() {
    const selectDrop = document.getElementById('resetUserSelect');
    const listContainer = document.getElementById('membersContainerList');
    
    if(selectDrop) selectDrop.innerHTML = '<option value="">-- Chọn thành viên --</option>';
    if(listContainer) listContainer.innerHTML = '';

    listUsersCache.forEach(user => {
        if (selectDrop) {
            const opt = document.createElement('option');
            opt.value = user.id;
            opt.textContent = user.name;
            selectDrop.appendChild(opt);
        }

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

async function loadDashboardData() {
    const res = await callSystemAPI("getDashboard");

    if (!res || !res.success) {
        console.error("Dữ liệu trả về bị lỗi hoặc trống:", res);
        alert("Không thể tải dữ liệu: " + (res?.msg || "Lỗi không xác định"));
        return;
    }

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

    if (res.rankings && res.rankings.length > 0) {
        const list = res.rankings;
        const findMax = (arr, key) => arr.reduce((max, curr) => 
            (parseFloat(curr[key]) || 0) > (parseFloat(max[key]) || 0) ? curr : max, arr[0]);

        const topData = {
            swim: { data: findMax(list, 'swim'), key: 'swim', unit: 'km', factor: 1000 },
            bike: { data: findMax(list, 'bike'), key: 'bike', unit: 'km', factor: 1 },
            run: { data: findMax(list, 'run'), key: 'run', unit: 'km', factor: 1 }
        };

        const updateTop = (nameId, valId, obj) => {
            const nameEl = document.getElementById(nameId);
            const valEl = document.getElementById(valId);
            const val = parseFloat(obj.data[obj.key] || 0) / obj.factor;

            if (nameEl) {
                nameEl.textContent = obj.data?.name || "--";
                nameEl.parentElement.classList.remove('skeleton-text');
            }
            if (valEl) {
                valEl.textContent = `${val.toFixed(1)} ${obj.unit}`;
            }
        };

        updateTop('topSwimName', 'topSwimVal', topData.swim);
        updateTop('topBikeName', 'topBikeVal', topData.bike);
        updateTop('topRunName', 'topRunVal', topData.run);
    }

    listUsersCache = res.rankings || [];
    populateUserDropdowns();
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.toggle('show');
        if (modalId === 'modalMembers' && modal.classList.contains('show')) {
            renderMembersList();
        }
    }
}

function renderAdminProfile(admin) {
    const adminNameEl = document.getElementById("adminName");
    const adminRoleEl = document.getElementById("adminCode");
    const adminAvatarEl = document.getElementById("adminCardAvatar");

    if (adminNameEl) adminNameEl.innerText = admin.name || "Quản Trị Viên";
    if (adminRoleEl) adminRoleEl.innerText = `Mã số: ${admin.id || "AD--"}`;

    if (adminAvatarEl && admin.id) {
        adminAvatarEl.src = `avatars/${admin.id}.jpg`;
        adminAvatarEl.onerror = function() {
            this.src = 'avatars/default.jpg';
            this.onerror = null;
        };
    }
}

function renderBasicProfile(user) {
    // Hàm phụ trợ nếu cần dùng cho tài khoản thường
}

function openEditModal(rowIndex, act) {
    document.getElementById('editRowIndex').value = rowIndex;
    document.getElementById('editSwim').value = act.swim || 0;
    document.getElementById('editBike').value = act.bike || 0;
    document.getElementById('editRun').value = act.run || 0;
    toggleModal('modalEditActivity');
}

function renderMembersList() {
    const container = document.getElementById('membersContainerList');
    if (!container) return;

    let htmlContent = ''; 

    listUsersCache.forEach(user => {
        const userName = user.name || user.Name || user.NAME || user.hoTen || "Không tên"; 
        const userRole = user.role || user.Role || user.ROLE || "MEMBER";
        const userId = user.id || user.ID || user.Id || "default";

        const isAdmin = String(userRole).toUpperCase() === 'ADMIN';
        const badgeClass = isAdmin ? 'role-admin' : 'role-member';
        
        htmlContent += `
            <div class="member-item">
                <div style="display: flex; align-items: center;">
                    <img src="avatars/${userId}.jpg" 
                         onerror="this.src='avatars/default.jpg'" 
                         style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
                    <div><strong>${userName}</strong></div>
                </div>
                <span class="role-badge ${badgeClass}">${userRole}</span>
            </div>
        `;
    });

    container.innerHTML = htmlContent;
}

// Các hàm hỗ trợ Theme
function setTheme(themeName) {
    localStorage.setItem('app_theme', themeName);
    loadThemeCss(themeName);
    
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) dropdown.classList.remove('show');
}

function loadThemeCss(themeName) {
    let themeLink = document.getElementById('dynamic-theme-css');
    
    if (!themeLink) {
        themeLink = document.createElement('link');
        themeLink.id = 'dynamic-theme-css';
        themeLink.rel = 'stylesheet';
        document.head.appendChild(themeLink);
    }

    if (themeName === 'default') {
        themeLink.href = '';
    } else {
        themeLink.href = `css/${themeName}.css`;
    }
}
