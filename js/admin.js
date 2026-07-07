/*
 * ==========================================
 * TRIATHLON LỤC NAM - ADMIN LOGIC (admin.js)
 * ==========================================
 * Quản lý giao diện admin, tải danh sách thành viên, tổng hợp dữ liệu từ Google Sheets
 */

let listUsersCache = []; // Lưu trữ tạm danh sách để nạp vào Select Form

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
   
   

    // Đổ danh sách người dùng vào các ô Select Dropdown và List Modal
   

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
            
            // 1. Lấy dữ liệu đầu vào
            const userId = document.getElementById('resetUserSelect').value;
            const newPin = document.getElementById('resetNewPin').value.trim();

            // 2. Kiểm tra dữ liệu nhanh (Client-side Validation)
            if (!userId || !newPin) {
                alert("Vui lòng chọn thành viên và nhập mã PIN mới!");
                return;
            }

            // Sử dụng Regex để đảm bảo PIN chỉ gồm 4-6 chữ số
            const pinRegex = /^[0-9]{4,6}$/;
            if (!pinRegex.test(newPin)) {
                alert("Mã PIN mới phải là số và có độ dài từ 4 đến 6 ký số!");
                return;
            }

            // 3. Khóa nút bấm chống spam click
            const btn = e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = "Đang cập nhật..."; 
            btn.disabled = true;

            try {
                // 4. Gọi API hệ thống với hành động "resetPin"
                const res = await callSystemAPI("resetPin", { userId, newPin });
                alert(res.msg);

                // 5. Nếu thành công, làm sạch form và đóng modal
                if (res.success) {
                    e.target.reset();
                    toggleModal('modalResetPin');
                    if (typeof loadDashboardData === "function") {
                        await loadDashboardData(); // Cập nhật lại giao diện nếu cần
                    }
                }
            } catch (error) {
                console.error("Lỗi khi đặt lại mã PIN:", error);
                alert("Đã xảy ra lỗi kết nối. Không thể cập nhật mã PIN lúc này!");
            } finally {
                // 6. Luôn mở khóa nút bấm dù thành công hay thất bại
                btn.textContent = originalText; 
                btn.disabled = false;
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

            
    // 3. Đổ dữ liệu Top Vận động viên (Hàng 2)
    if (res.rankings && res.rankings.length > 0) {
        const list = res.rankings;
        const findMax = (arr, key) => arr.reduce((max, curr) => 
            (parseFloat(curr[key]) || 0) > (parseFloat(max[key]) || 0) ? curr : max, arr[0]);

        const topData = {
            swim: { data: findMax(list, 'swim'), key: 'swim', unit: 'km', factor: 1000 },
            bike: { data: findMax(list, 'bike'), key: 'bike', unit: 'km', factor: 1 },
            run: { data: findMax(list, 'run'), key: 'run', unit: 'km', factor: 1 }
        };

        // Hàm cập nhật cả tên và số liệu
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
        // D. Đổ dữ liệu Hoạt động gần đây (HIỂN THỊ TẤT CẢ, CÓ CUỘN & ĐIỂM SỐ)
        const actList = document.getElementById('activityList');
        if (actList && res.activities) {
            actList.innerHTML = "";
            
            // 1. Cấu hình khung cuộn bằng JS
            actList.style.maxHeight = "400px"; 
            actList.style.overflowY = "auto";  
            actList.style.paddingRight = "5px"; 

            // 2. Sắp xếp hoạt động: mới nhất lên đầu
            const sortedActivities = [...res.activities].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            sortedActivities.forEach((act, index) => {
                // 3. Logic làm tròn số
                const swimVal = act.swim ? parseFloat(act.swim).toFixed(0) : "0";
                const bikeVal = act.bike ? parseFloat(act.bike).toFixed(1) : "0";
                const runVal = act.run ? parseFloat(act.run).toFixed(1) : "0";
                
                // 4. Tính điểm dựa trên công thức từ member_2.js
                const points = calculateEstimatedPoints(act.swim, act.bike, act.run);

                // 5. Định dạng thời gian
                const dateObj = new Date(act.date);
                const formattedDate = act.date ? dateObj.toLocaleString('vi-VN', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                }) : 'Hôm nay';

                // 6. Tạo phần tử hiển thị
                const div = document.createElement('div');
                div.className = 'activity-item animate-fade-in';
                div.style.cssText = `background: #FFFFFF; border-bottom: 1px solid #EDF2F7; padding: 12px 0; display: flex; justify-content: space-between; align-items: center;`;
                
                div.innerHTML = `
                    <div>
                        <span style="font-weight: 600; color: #0A3D25; display: block; font-size: 11px; margin-bottom: 4px;">
                            ${act.name} - ${formattedDate}
                        </span>
                        <span style="color: #718096; font-size: 12px; font-weight: 500;">
                            ${act.swim ? `🏊 ${swimVal}m ` : ''}
                            ${act.bike ? `🚴 ${bikeVal}km ` : ''}
                            ${act.run ? `🏃 ${runVal}km` : ''}
                        </span>
                    </div>


                    <div style="font-weight: 700; color: #0F5132; background-color: #EBF8F2; padding: 10px 10px; border-radius: 20px; font-size: 12px;">
                        +${points}đ
                    </div>
                    <button class="btn-edit-small" onclick="openEditModal(${index + 2}, ${JSON.stringify(act).replace(/"/g, '&quot;')})">
                        <i class="fa-solid fa-pen"></i>
                    </button>                        
                `;
                actList.appendChild(div);
            });
        }

        /**
         * Hàm hỗ trợ tính điểm số đồng bộ với member_2.js
         */
        function calculateEstimatedPoints(swim, bike, run) {
            const sPts = (parseFloat(swim) || 0) * 0.008; // 1m = 0.008đ
            const bPts = (parseFloat(bike) || 0) * 0.6;   // 1km = 0.6đ
            const rPts = (parseFloat(run) || 0) * 1.4;    // 1km = 1.4đ
            return (sPts + bPts + rPts).toFixed(1);
        }
    // --- E. Lưu danh sách thành viên vào bộ nhớ tạm phục vụ Form Thao Tác ---
    listUsersCache = res.rankings || [];
    populateUserDropdowns();
}

// HÀM ĐIỀU KHIỂN BẬT TẮT SLIDE UP POPUP MODAL (GLOBAL SCOPE)
// Sửa hàm toggleModal trong admin.js
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.toggle('show');
        
        // Nếu mở đúng modal quản lý thành viên, thì chạy hàm render
        if (modalId === 'modalMembers' && modal.classList.contains('show')) {
            renderMembersList();
        }
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
/**
 * Hàm mở Modal Sửa Hoạt Động
 * @param {number} rowIndex - Vị trí dòng trong sheet (bao gồm cả header)
 * @param {Object} act - Đối tượng hoạt động
 */
function openEditModal(rowIndex, act) {
    // Điền dữ liệu vào form
    document.getElementById('editRowIndex').value = rowIndex;
    document.getElementById('editSwim').value = act.swim || 0;
    document.getElementById('editBike').value = act.bike || 0;
    document.getElementById('editRun').value = act.run || 0;
    
    // Hiển thị modal
    toggleModal('modalEditActivity');
}

// Xử lý gửi form Sửa
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
                await loadDashboardData(); // Làm mới dashboard
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
function renderMembersList() {
    const container = document.getElementById('membersContainerList');
    if (!container) return;

    // 1. Log dữ liệu để xem tên trường chính xác (Mở F12 -> Console để xem)
    console.log("Dữ liệu listUsersCache đang có:", listUsersCache);
    if (listUsersCache.length > 0) {
        console.log("Cấu trúc của một user:", listUsersCache[0]);
    }

    let htmlContent = ''; 

    listUsersCache.forEach(user => {
        // 2. Tự động lấy giá trị từ bất kỳ tên trường nào có thể xảy ra
        // Nếu tên trường là 'Name', 'name', 'hoTen',... code này vẫn chạy được
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
