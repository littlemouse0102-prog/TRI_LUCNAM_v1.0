/**
 * ==========================================
 * TRIATHLON LỤC NAM - MEMBER LOGIC (member.js)
 * ==========================================
 */

// 1. CÁC HÀM TIỆN ÍCH (Global Scope)
function parseDecimal(value) {
    return parseFloat(value.replace(',', '.')) || 0;
}

function calculateEstimatedPoints(swim, bike, run) {
    const sPts = (parseFloat(swim) || 0) * 0.008;
    const bPts = (parseFloat(bike) || 0) * 0.6;
    const rPts = (parseFloat(run) || 0) * 1.4;
    return (sPts + bPts + rPts).toFixed(1);
}

// 2. SỰ KIỆN CHÍNH
document.addEventListener("DOMContentLoaded", async () => {
    let currentUser = null;
    try {
        if (typeof getCurrentUser === "function") {
            currentUser = getCurrentUser();
        } else {
            const userJson = localStorage.getItem("triathlon_user");
            currentUser = userJson ? JSON.parse(userJson) : null;
        }
    } catch (err) {
        console.error("Lỗi đọc bộ nhớ:", err);
    }

    if (!currentUser) {
        alert("🔒 Vui lòng đăng nhập!");
        window.location.href = "index.html";
        return;
    }

    renderBasicProfile(currentUser);

    // Xử lý Input số thập phân
    document.querySelectorAll('.decimal-input').forEach(input => {
        input.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^0-9.,]/g, '');
            const parts = this.value.split(/[,.]/);
            if (parts.length > 2) {
                this.value = parts[0] + (this.value.includes(',') ? ',' : '.') + parts[1];
            }
        });
    });

    await loadMemberDashboardData(currentUser.id);

    // Xử lý Form
    const activityForm = document.getElementById("activityForm");
    if (activityForm) {
        activityForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const swimVal = parseDecimal(document.getElementById("swimInput").value);
            const bikeVal = parseDecimal(document.getElementById("bikeInput").value);
            const runVal = parseDecimal(document.getElementById("runInput").value);

            if (swimVal === 0 && bikeVal === 0 && runVal === 0) {
                alert("⚠️ Vui lòng nhập thành tích!");
                return;
            }

            if ((swimVal > 0 && swimVal < 500) || (bikeVal > 0 && bikeVal < 5) || (runVal > 0 && runVal < 3.5)) {
                alert("⚠️ Giá trị nhập không hợp lệ:\nBơi >= 500m, Đạp >= 5km, Chạy >= 3.5km");
                return;
            }

            const submitBtn = activityForm.querySelector(".submit-btn");
            if (submitBtn) {
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = `Đang gửi...`;

                const activityData = { id: currentUser.id, name: currentUser.name, swim: swimVal, bike: bikeVal, run: runVal };
                const response = await callSystemAPI("addActivity", activityData);

                if (response.success) {
                    alert("🎉 Ghi nhận thành công!");
                    activityForm.reset();
                    await loadMemberDashboardData(currentUser.id);
                } else {
                    alert("❌ Lỗi: " + response.msg);
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // Đăng xuất
    const adminLogoutBtn = document.getElementById("adminLogoutBtn");
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener("click", () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "index.html";
        });
    }
});

// 3. CÁC HÀM RENDER (Tách biệt ngoài DOMContentLoaded)
function renderBasicProfile(user) {
    const userNameEl = document.getElementById("userName");
    const userCodeEl = document.getElementById("userCode");
    const userAvatarEl = document.getElementById("userAvatar");

    if (userNameEl) userNameEl.innerText = user.name || "Thành viên";
    if (userCodeEl) userCodeEl.innerText = `Mã số: ${user.id || "TL--"}`;
    
    if (userAvatarEl && user.id) {
        userAvatarEl.src = `avatars/${user.id}.jpg`;
        userAvatarEl.onerror = function() { this.src = `avatars/default.jpg`; };
    }
}


/**
 * Gọi API lấy dữ liệu chỉ số cá nhân, thứ hạng và nhật ký hoạt động từ Sheets
 */
async function loadMemberDashboardData(userId) {
    const historyLogList = document.getElementById("historyLogList");
    if (!historyLogList) return;
    
// Gọi API lấy dữ liệu tổng hợp
const response = await callSystemAPI("getDashboard", { userId: userId });
console.log("gói dữ liệu", response);

if (response && response.success) {
    const currentUserName = document.getElementById("userName")?.innerText || "";
    
    // 1. Tìm thông tin user
    const userInRank = response.rankings?.find(r => 
        String(r.id).trim() === String(userId).trim() || 
        String(r.name).trim() === currentUserName.trim()
    );

    // 2. Lọc hoạt động của user (đề phòng trường hợp userId có thể là kiểu khác nhau)
    const myActivities = (response.activities || []).filter(act => 
        String(act.userId || "").trim() === String(userId).trim()
    );

    // 3. Tính toán tổng (ưu tiên lấy từ userInRank trước nếu có, nếu không thì cộng từ myActivities)
    const totalSwim = userInRank?.swim || myActivities.reduce((sum, act) => sum + (parseFloat(act.swim) || 0), 0);
    const totalBike = userInRank?.bike || myActivities.reduce((sum, act) => sum + (parseFloat(act.bike) || 0), 0);
    const totalRun = userInRank?.run || myActivities.reduce((sum, act) => sum + (parseFloat(act.run) || 0), 0);
    const totalCups = userInRank?.cups || userInRank?.cup || 0;

    // 4. Gán giá trị vào HTML
    const rankEl = document.getElementById("userGlobalRank");
    const scoreEl = document.getElementById("userTotalScore");
    const cupsEl = document.getElementById("userCups");
    const swimEl = document.getElementById("userTotalSwim");
    const bikeEl = document.getElementById("userTotalBike");
    const runEl = document.getElementById("userTotalRun");

    if (rankEl) rankEl.innerText = userInRank?.rank || "N/A";
    if (scoreEl) scoreEl.innerText = userInRank?.score || "0";
    
    // Hiển thị cúp dạng icon 🏆
    if (cupsEl) {
        cupsEl.innerText = totalCups > 0 ? "🏆".repeat(totalCups) : "0 🏆";
    }

    // Hiển thị chỉ số (giả sử đơn vị bơi là mét nên chia 1000)
    if (swimEl) swimEl.innerText = (totalSwim / 1000).toFixed(1);
    if (bikeEl) bikeEl.innerText = totalBike.toFixed(1);
    if (runEl) runEl.innerText = totalRun.toFixed(1);


       if (userInRank) {
            // 1. Hiển thị Hạng đoàn (Lấy chính xác chuỗi "TOP 1", "TOP 2" từ cột G sheet Rankings)
            if (rankEl) {
                rankEl.innerText = userInRank.rank || "Chưa xếp hạng"; 
            }
            
            // 2. Hiển thị Điểm số (Lấy từ cột F sheet Rankings, ép kiểu số và làm tròn 2 chữ số thập phân)
            if (scoreEl) {
                const pointsValue = Number(userInRank.points) || 0;
                scoreEl.innerText = pointsValue.toFixed(0) + "đ";
            }
            
            // 3. Hiển thị Cúp (Nếu có)
            if (cupsEl) {
                const cupCount = userInRank.cups || userInRank.cup || 0;
    
                //  Sử dụng .repeat() để nhân bản emoji theo số lượng
                cupsEl.innerText = "🏆".repeat(cupCount);
            }
        }

        // 2. Cập nhật Nhật ký hoạt động gần đây (History Log)
        if (response.activities && response.activities.length > 0) {
            historyLogList.innerHTML = ""; // Xóa dòng chữ Chờ "Đang tải..."
            
            // Lọc an toàn bằng cách chuyển hết ID về dạng String viết thường hoặc đối chiếu theo tên viết thường
            const myActivities = response.activities.filter(act => 
                (act.userId && String(act.userId).trim() === String(userId).trim()) || 
                (act.name && String(act.name).trim().toLowerCase() === currentUserName.trim().toLowerCase())
            );
            myActivities.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            if (myActivities.length === 0) {
                historyLogList.innerHTML = `<div class="empty-log">Bạn chưa có hoạt động nào được ghi nhận gần đây. Hãy tập luyện và cập nhật kết quả ngay nhé!</div>`;
                return;
            }

            // Đổ danh sách hoạt động vào giao diện
            myActivities.forEach(act => {
                const logItem = document.createElement("div");
                logItem.style.cssText = `
                    background-color: #FFFFFF;
                    border: 1px solid #D9E2DC;
                    border-radius: 12px;
                    padding: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 13px;
                    margin-bottom: 10px;
                `;
                
                logItem.innerHTML = `
                    <div>
                    <span style="font-weight: 600; color: #0A3D25; display: block; font-size: 11px; margin-bottom: 4px;">Ngày gửi: ${act.date 
                        ? new Date(act.date).toLocaleString('vi-VN', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        }) 
                        : 'Hôm nay'}
                    </span>
                        <span style="color: #718096; font-size: 12px; font-weight: 500;">
                            ${act.swim ? `🏊 ${act.swim}m ` : ''}
                            ${act.bike ? `🚴 ${act.bike}km ` : ''}
                            ${act.run ? `🏃 ${act.run}km` : ''}
                        </span>
                    </div>
                    <div style="font-weight: 700; color: #0F5132; background-color: #EBF8F2; padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                        +${calculateEstimatedPoints(act.swim, act.bike, act.run)}đ
                    </div>
                `;
                historyLogList.appendChild(logItem);
            });
        } else {
            historyLogList.innerHTML = `<div class="empty-log">Chưa có nhật ký hoạt động nào trên hệ thống Sheets.</div>`;
        }
    } else {
        historyLogList.innerHTML = `<div class="empty-log" style="color: #C53030;">⚠️ Không thể tải nhật ký hoạt động: ${response.msg}</div>`;
    }
}

/**
 * Hàm hỗ trợ tính nhẩm điểm số hiển thị tạm thời trên giao diện nhật ký thành viên
 */
function calculateEstimatedPoints(swim, bike, run) {
    const sPts = (parseFloat(swim) || 0) * 0.008; // 100m được 0.8đ -> 1m = 0.008đ
    const bPts = (parseFloat(bike) || 0) * 0.6;  // 1km được 0.6đ
    const rPts = (parseFloat(run) || 0) * 1.4;   // 1km được 1.4đ
    return (sPts + bPts + rPts).toFixed(1);
}
// Sự kiện cho nút Đăng xuất ở cuối trang (không hiện thông báo)
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", function() {
        // Xóa dữ liệu phiên làm việc ngay lập tức
        localStorage.clear(); 
        sessionStorage.clear();
        
        // Chuyển hướng về trang đăng nhập
        window.location.href = "index.html"; 
    });
}

