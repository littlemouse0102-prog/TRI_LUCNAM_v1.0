/**
 * ==========================================
 * TRIATHLON LỤC NAM - MEMBER LOGIC (member.js)
 * ==========================================
 * Quản lý trạng thái thành viên, hiển thị dữ liệu và gửi thành tích
 */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP (Cơ chế phòng vệ an toàn chống bị đá ra ngoài)
    let currentUser = null;
    try {
        if (typeof getCurrentUser === "function") {
            currentUser = getCurrentUser();
        } else {
            // Giải pháp dự phòng nếu file api.js chưa tải kịp hoặc lỗi liên kết
            const userJson = localStorage.getItem("triathlon_user");
            currentUser = userJson ? JSON.parse(userJson) : null;
        }
    } catch (err) {
        console.error("Lỗi đọc bộ nhớ trình duyệt:", err);
    }

    // Nếu chưa đăng nhập (không có dữ liệu), lập tức đẩy người dùng về trang login
    if (!currentUser) {
        alert("🔒 Vui lòng đăng nhập để tiếp tục!");
        window.location.href = "index.html";
        return;
    }

    // Nếu đã đăng nhập, hiển thị thông tin cơ bản ngay để tối ưu trải nghiệm (chưa cần đợi API)
    renderBasicProfile(currentUser);

    // 2. TẢI DỮ LIỆU THỜI GIAN THỰC TỪ GOOGLE SHEETS
    await loadMemberDashboardData(currentUser.id);

    // 3. XỬ LÝ SỰ KIỆN GỬI THÀNH TÍCH TẬP LUYỆN (SUBMIT FORM TỰ ĐỘNG ĐẨY VÀO SHEET ACTIVITIES)
    const activityForm = document.getElementById("activityForm");
    if (activityForm) {
        activityForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Thu thập dữ liệu từ các ô Input
            const swimVal = parseFloat(document.getElementById("swimInput").value) || 0;
            const bikeVal = parseFloat(document.getElementById("bikeInput").value) || 0;
            const runVal = parseFloat(document.getElementById("runInput").value) || 0;

            // Kiểm tra tính hợp lệ tối thiểu (Tránh gửi form trống toàn bộ số 0)
            if (swimVal === 0 && bikeVal === 0 && runVal === 0) {
                alert("⚠️ Vui lòng nhập thành tích của ít nhất 1 môn trước khi gửi!");
                return;
            }

            // Hiển thị trạng thái đang xử lý trên nút bấm
            const submitBtn = activityForm.querySelector(".submit-btn");
            if (submitBtn) {
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi lên Sheets...`;

                // Chuẩn bị gói dữ liệu gửi lên Google Apps Script (Đồng bộ chữ thường khớp với cột của Sheets)
                const activityData = {
                    id: currentUser.id,      // Khớp cột 'id' trên sheet
                    name: currentUser.name,  // Khớp cột 'name' trên sheet
                    swim: swimVal,           // Khớp cột 'swim' trên sheet
                    bike: bikeVal,           // Khớp cột 'bike' trên sheet
                    run: runVal              // Khớp cột 'run' trên sheet
                };

                // Gọi hàm API gửi dữ liệu (Sử dụng hành động mặc định: addActivity)
                const response = await callSystemAPI("addActivity", activityData);

                if (response.success) {
                    alert("🎉 Đã ghi nhận thành tích thành công vào hệ thống!");
                    activityForm.reset(); // Xóa sạch dữ liệu ô nhập sau khi gửi thành công
                    
                    // Tải lại bảng dữ liệu nhật ký mới nhất hiển thị dưới giao diện
                    await loadMemberDashboardData(currentUser.id);
                } else {
                    alert("❌ Lỗi: " + response.msg);
                }

                // Khôi phục lại nút bấm ban đầu
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
});

/**
 * Đổ thông tin cơ bản của User lên Thẻ Profile ngay khi vừa load trang
 * Tối ưu tải trực tiếp Avatar định dạng .jpg theo ID từ thư mục avatars/
 */
function renderBasicProfile(user) {
    const userNameEl = document.getElementById("userName");
    const userCodeEl = document.getElementById("userCode");
    const userAvatarEl = document.getElementById("userAvatar");

    if (userNameEl) userNameEl.innerText = user.name || "Thành viên";
    if (userCodeEl) userCodeEl.innerText = `Mã số: ${user.id || "TL--"}`;
    
    if (userAvatarEl && user.id) {
        // Đường dẫn thẳng tới file .jpg theo ID
        const jpgAvatar = `avatars/${user.id}.jpg`; 
        
        // Ảnh chữ dự phòng nếu thành viên đó chưa có ảnh chân dung trong thư mục
        const defaultAvatar = `avatars/default.jpg`;

        // Gắn ảnh .jpg vào hiển thị
        userAvatarEl.src = jpgAvatar;

        // Nếu file .jpg bị lỗi (không tìm thấy ảnh của ID này) -> Chuyển sang ảnh chữ dự phòng
        userAvatarEl.onerror = function() {
            userAvatarEl.src = defaultAvatar;
            userAvatarEl.onerror = null; // Ngắt vòng lặp lỗi tránh treo trình duyệt
        };
    }
}

/**
 * Gọi API lấy dữ liệu chỉ số cá nhân, thứ hạng và nhật ký hoạt động từ Sheets
 */
async function loadMemberDashboardData(userId) {
    const historyLogList = document.getElementById("historyLogList");
    if (!historyLogList) return;
    
    // Gọi API lấy dữ liệu tổng hợp (Hành động: getDashboard)
    const response = await callSystemAPI("getDashboard", { userId: userId });

    if (response.success) {
        // 1. Cập nhật các khối thông tin Huy chương, Điểm số, Thứ hạng từ dữ liệu thật
        const currentUserName = document.getElementById("userName") ? document.getElementById("userName").innerText : "";
        
        // Chuẩn hóa so sánh chuỗi để không bị lệch kiểu dữ liệu Số/Chữ
        const userInRank = response.rankings ? response.rankings.find(r => String(r.id).trim() === String(userId).trim() || String(r.name).trim() === currentUserName.trim()) : null;
        
        const rankEl = document.getElementById("userGlobalRank");
        const scoreEl = document.getElementById("userTotalScore");
        const cupsEl = document.getElementById("userCups");

       if (userInRank) {
            // 1. Hiển thị Hạng đoàn (Lấy chính xác chuỗi "TOP 1", "TOP 2" từ cột G sheet Rankings)
            if (rankEl) {
                rankEl.innerText = userInRank.rank || "Chưa xếp hạng"; 
            }
            
            // 2. Hiển thị Điểm số (Lấy từ cột F sheet Rankings, ép kiểu số và làm tròn 2 chữ số thập phân)
            if (scoreEl) {
                const pointsValue = Number(userInRank.points) || 0;
                scoreEl.innerText = pointsValue.toFixed(2) + "đ";
            }
            
            // 3. Hiển thị Cúp (Nếu có)
            if (cupsEl) {
                cupsEl.innerText = `🏆 ${userInRank.cups || userInRank.cup || 0}`;
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
