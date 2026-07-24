/**
 * ==========================================
 * TRIATHLON LỤC NAM - MEMBER LOGIC (member.js)
 * ==========================================
 */

// 1. CÁC HÀM TIỆN ÍCH (Global Scope)
function parseDecimal(value) {
    if (!value) return 0;
    return parseFloat(value.toString().replace(',', '.')) || 0;
}

function calculateEstimatedPoints(swim, bike, run) {
    const sPts = (parseFloat(swim) || 0) * 0.008; // 1m = 0.008đ
    const bPts = (parseFloat(bike) || 0) * 0.6;   // 1km = 0.6đ
    const rPts = (parseFloat(run) || 0) * 1.4;    // 1km = 1.4đ
    return (sPts + bPts + rPts).toFixed(1);
}

// 2. SỰ KIỆN KHỞI TẠO DOM
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
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9.,]/g, '');
            const parts = this.value.split(/[,.]/);
            if (parts.length > 2) {
                this.value = parts[0] + (this.value.includes(',') ? ',' : '.') + parts[1];
            }
        });
    });

    await loadMemberDashboardData(currentUser.id);

    // Xử lý Form gửi thành tích
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

            if ((swimVal > 0 && swimVal < 100) || (bikeVal > 0 && bikeVal < 5) || (runVal > 0 && runVal < 3.5)) {
                alert("⚠️ Giá trị nhập không hợp lệ:\nBơi >= 100m, Đạp >= 5km, Chạy >= 3.5km");
                return;
            }

            const submitBtn = activityForm.querySelector(".submit-btn");
            if (submitBtn) {
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = `Đang gửi...`;

                const activityData = { id: currentUser.id, name: currentUser.name, swim: swimVal, bike: bikeVal, run: runVal };
                const response = await callSystemAPI("addActivity", activityData);

                if (response && response.success) {
                    alert("🎉 Ghi nhận thành công!");
                    activityForm.reset();
                    await loadMemberDashboardData(currentUser.id);
                } else {
                    alert("❌ Lỗi: " + (response?.msg || "Không thể kết nối hệ thống"));
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // Đăng xuất từ nút chính bên dưới
    const adminLogoutBtn = document.getElementById("adminLogoutBtn");
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener("click", handleLogout);
    }

    // Đăng xuất từ nút nhỏ trên Header
    const logoutBtnTop = document.getElementById("logoutBtnTop");
    if (logoutBtnTop) {
        logoutBtnTop.addEventListener("click", handleLogout);
    }
});

function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "index.html";
}

// 3. CÁC HÀM RENDER & XỬ LÝ DỮ LIỆU
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
 * Gọi API lấy dữ liệu chỉ số cá nhân, thứ hạng, nhật ký và bảng xếp hạng từ Sheets
 */
async function loadMemberDashboardData(userId) {
    const historyLogList = document.getElementById("historyLogList");
    if (!historyLogList) return;
    
    const response = await callSystemAPI("getDashboard", { userId: userId });
    console.log("gói dữ liệu", response);

    if (response && response.success) {
        const currentUserName = document.getElementById("userName")?.innerText || "";
        
        // 1. Tìm thông tin user trong bảng xếp hạng tổng
        const userInRank = response.rankings?.find(r => 
            String(r.id).trim() === String(userId).trim() || 
            String(r.name).trim().toLowerCase() === currentUserName.trim().toLowerCase()
        );

        // 2. Lọc hoạt động cá nhân của user
        const myActivities = (response.activities || []).filter(act => 
            String(act.userId || "").trim() === String(userId).trim() ||
            (act.name && String(act.name).trim().toLowerCase() === currentUserName.trim().toLowerCase())
        );

        // 3. Tính toán tổng chỉ số
        const totalSwim = userInRank?.swim || myActivities.reduce((sum, act) => sum + (parseFloat(act.swim) || 0), 0);
        const totalBike = userInRank?.bike || myActivities.reduce((sum, act) => sum + (parseFloat(act.bike) || 0), 0);
        const totalRun = userInRank?.run || myActivities.reduce((sum, act) => sum + (parseFloat(act.run) || 0), 0);

        // 4. Gán giá trị vào HTML Profile Badges
        const rankEl = document.getElementById("userGlobalRank");
        const scoreEl = document.getElementById("userTotalScore");
        const cupsEl = document.getElementById("userCups");
        const swimEl = document.getElementById("userTotalSwim");
        const bikeEl = document.getElementById("userTotalBike");
        const runEl = document.getElementById("userTotalRun");

        if (userInRank) {
            if (rankEl) rankEl.innerText = userInRank.rank ? `#${userInRank.rank}` : "N/A"; 
            if (scoreEl) {
                const pointsValue = Number(userInRank.points) || 0;
                scoreEl.innerText = pointsValue.toFixed(0) + "đ";
            }
            if (cupsEl) {
                const cupCount = userInRank.cups || userInRank.cup || 0;
                cupsEl.innerText = cupCount > 0 ? "🏆".repeat(cupCount) : "0 🏆";
            }
        } else {
            if (rankEl) rankEl.innerText = "#--";
            if (scoreEl) scoreEl.innerText = "0đ";
            if (cupsEl) cupsEl.innerText = "0 🏆";
        }

        if (swimEl) swimEl.innerText = (totalSwim / 1000).toFixed(1);
        if (bikeEl) bikeEl.innerText = totalBike.toFixed(1);
        if (runEl) runEl.innerText = totalRun.toFixed(1);

        // 4.1 Điền dữ liệu độ lệch chuẩn và đề xuất luyện tập vào member.html
        const deviationEl = document.getElementById("deviationStatus");
        const suggestionEl = document.getElementById("trainingSuggestion");

        if (userInRank) {
            if (deviationEl) {
                deviationEl.textContent = userInRank.deviation ? `Độ lệch: ${userInRank.deviation}` : "Đang cập nhật chỉ số độ lệch...";
            }
            if (suggestionEl) {
                suggestionEl.textContent = userInRank.missing || "Chưa có đề xuất tập luyện mới.";
            }
        } else {
            if (deviationEl) deviationEl.textContent = "Chưa có dữ liệu phân tích.";
            if (suggestionEl) suggestionEl.textContent = "Hãy cập nhật thành tích để nhận đề xuất tối ưu!";
        }

        // 5. Cập nhật Nhật ký hoạt động Cá Nhân
        if (myActivities.length > 0) {
            historyLogList.innerHTML = "";
            myActivities.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            myActivities.forEach(act => {
                const logItem = document.createElement("div");
                logItem.className = "history-item";
                
                const swimText = act.swim ? `🏊 ${act.swim}m ` : '';
                const bikeText = act.bike ? `🚴 ${act.bike}km ` : '';
                const runText = act.run ? `🏃 ${act.run}km` : '';
                const points = calculateEstimatedPoints(act.swim, act.bike, act.run);

                const formattedDate = act.date 
                    ? new Date(act.date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                    : 'Hôm nay';

                logItem.innerHTML = `
                    <div>
                        <span style="font-weight: 600; display: block; font-size: 11px; margin-bottom: 4px;">Ngày gửi: ${formattedDate}</span>
                        <span style="color: var(--text-muted); font-size: 12px; font-weight: 500;">${swimText}${bikeText}${runText}</span>
                    </div>
                    <div style="font-weight: 700; color: var(--primary); background-color: var(--light); padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                        +${points}đ
                    </div>
                `;
                historyLogList.appendChild(logItem);
            });
        } else {
            historyLogList.innerHTML = `<div class="empty-log">Bạn chưa có hoạt động nào được ghi nhận gần đây. Hãy tập luyện và cập nhật kết quả ngay nhé!</div>`;
        }

        // 6. Cập nhật Hoạt động gần đây của Team
        const actList = document.getElementById('activityList');
        if (actList && response.activities) {
            actList.innerHTML = "";
            const sortedTeamActivities = [...response.activities].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            if (sortedTeamActivities.length === 0) {
                actList.innerHTML = `<div class="empty-log">Chưa có hoạt động nào từ team.</div>`;
            } else {
                sortedTeamActivities.forEach((act) => {
                    const swimVal = act.swim ? parseFloat(act.swim).toFixed(0) : "0";
                    const bikeVal = act.bike ? parseFloat(act.bike).toFixed(1) : "0";
                    const runVal = act.run ? parseFloat(act.run).toFixed(1) : "0";
                    const points = calculateEstimatedPoints(act.swim, act.bike, act.run);

                    const formattedDate = act.date 
                        ? new Date(act.date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : 'Hôm nay';

                    const div = document.createElement('div');
                    div.className = 'activity-item animate-fade-in';
                    
                    div.innerHTML = `
                        <div>
                            <span style="font-weight: 600; display: block; font-size: 11px; margin-bottom: 4px;">
                                ${act.name || "Thành viên"} - ${formattedDate}
                            </span>
                            <span style="color: var(--text-muted); font-size: 12px; font-weight: 500;">
                                ${act.swim ? `🏊 ${swimVal}m ` : ''}
                                ${act.bike ? `🚴 ${bikeVal}km ` : ''}
                                ${act.run ? `🏃 ${runVal}km` : ''}
                            </span>
                        </div>
                        <div style="font-weight: 700; color: var(--primary); background-color: var(--light); padding: 4px 10px; border-radius: 20px; font-size: 12px;">
                            +${points}đ
                        </div>
                    `;
                    actList.appendChild(div);
                });
            }
        }

        // 7. Cập nhật Bảng xếp hạng trong trang cá nhân
        const rankingTableBody = document.getElementById("rankingTableBody");
        if (rankingTableBody && response.rankings) {
            rankingTableBody.innerHTML = "";
            
            const sortedRankings = [...response.rankings].sort((a, b) => (parseFloat(b.points) || 0) - (parseFloat(a.points) || 0));

            if (sortedRankings.length === 0) {
                rankingTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; color: var(--text-muted);">Chưa có dữ liệu xếp hạng.</td></tr>`;
            } else {
                sortedRankings.forEach((rankItem, index) => {
                    const row = document.createElement("tr");
                    row.style.borderBottom = "1px solid var(--border)";
                    
                    const isCurrentUser = String(rankItem.id).trim() === String(userId).trim() || 
                                          String(rankItem.name).trim().toLowerCase() === currentUserName.toLowerCase();
                    
                    if (isCurrentUser) {
                        row.style.backgroundColor = "var(--light)";
                        row.style.fontWeight = "600";
                    }

                    const pointsVal = parseFloat(rankItem.points) || 0;
                    const cupsVal = rankItem.cups || rankItem.cup || 0;

                    row.innerHTML = `
                        <td style="text-align: center; font-weight: 700; padding: 10px 8px;">#${rankItem.rank || (index + 1)}</td>
                        <td style="padding: 10px 8px; color: var(--text-main);">${rankItem.name || "Thành viên"}</td>
                        <td style="text-align: right; color: var(--primary); font-weight: 700; padding: 10px 8px;">${pointsVal.toFixed(0)}đ</td>
                        <td style="text-align: center; padding: 10px 8px;">${cupsVal > 0 ? "🏆 " + cupsVal : "-"}</td>
                    `;
                    rankingTableBody.appendChild(row);
                });
            }
        }

    } else {
        historyLogList.innerHTML = `<div class="empty-log" style="color: var(--danger);">⚠️ Không thể tải dữ liệu: ${response?.msg || "Lỗi kết nối"}</div>`;
    }
}

/**
 * Hàm chuyển đổi hiển thị giữa tab Cá nhân và tab Team
 */
function switchActivityTab(tabName) {
    const btnPersonal = document.getElementById("btnTabPersonal");
    const btnTeam = document.getElementById("btnTabTeam");
    const contentPersonal = document.getElementById("tabContentPersonal");
    const contentTeam = document.getElementById("tabContentTeam");

    if (tabName === "personal") {
        btnPersonal.style.background = "var(--primary)";
        btnPersonal.style.color = "#fff";
        btnTeam.style.background = "var(--white)";
        btnTeam.style.color = "var(--primary)";
        
        contentPersonal.style.display = "block";
        contentTeam.style.display = "none";
    } else {
        btnTeam.style.background = "var(--primary)";
        btnTeam.style.color = "#fff";
        btnPersonal.style.background = "var(--white)";
        btnPersonal.style.color = "var(--primary)";
        
        contentTeam.style.display = "block";
        contentPersonal.style.display = "none";
    }
}
