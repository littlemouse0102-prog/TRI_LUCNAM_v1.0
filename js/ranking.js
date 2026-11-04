/**
 * ==========================================
 * TRIATHLON LỤC NAM - RANKING LOGIC (ranking.js)
 * ==========================================
 */

// Xử lý chung: Nạp theme, phân quyền Admin và nút Đăng xuất khi trang được tải
document.addEventListener("DOMContentLoaded", () => {
    // 1. Xử lý nút Đăng xuất
    const logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "index.html";
        });
    }

    // 2. Kiểm tra quyền Admin để hiển thị icon trên thanh menu đáy
    const userJson = localStorage.getItem("triathlon_user");
    const user = userJson ? JSON.parse(userJson) : null;

    if (user && user.role === "ADMIN") {
        const container = document.getElementById('admin-link-container');
        if (container) {
            container.innerHTML = `
                <a href="admin.html" class="nav-item">
                    <i class="fa-solid fa-shield-halved"></i>
                    <span>ADMIN</span>
                </a>
            `;
        }
    }

    // 3. Tự động nạp theme đã lưu cho trang
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) {
        loadThemeCss(savedTheme);
    }
});

// Hàm thay đổi, lưu trữ và đồng bộ hóa theme
function setTheme(themeName) {
    localStorage.setItem('app_theme', themeName);
    loadThemeCss(themeName);
    
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) dropdown.classList.remove('show');
}

// Hàm thực thi chèn link CSS tương ứng vào thẻ <head>
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
        themeLink.href = `css/theme/${themeName}.css`;
    }
}

// Logic chính của Bảng Xếp Hạng và Nhật ký
document.addEventListener('DOMContentLoaded', () => {
    let rawMembersData = [];
    let currentTab = 'all'; // Lưu trạng thái tab hiện tại

    const leaderboardRows = document.getElementById('leaderboardRows');
    const podiumContainer = document.getElementById('podiumContainer');
    const searchBar = document.getElementById('searchBar');

    // ==========================================
    // 1. SỰ KIỆN CLICK CHUYỂN TAB
    // ==========================================
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            currentTab = this.getAttribute('data-type').toLowerCase();

            renderPodium(rawMembersData);
            renderLeaderboard(); 
        });
    });

    // ==========================================
    // HÀM CHUYỂN ĐỔI CHUỖI SỐ VIỆT NAM (15257,00 -> 15257.00)
    // ==========================================
    function parseVietnameseNumber(val) {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        
        let str = String(val).trim().replace(/\s/g, '');
        str = str.replace(/[^0-9.,-]/g, '');

        if (str.includes('.') && str.includes(',')) {
            if (str.indexOf('.') < str.indexOf(',')) {
                str = str.replace(/\./g, '').replace(',', '.');
            } else {
                str = str.replace(/,/g, '');
            }
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        }
        
        return parseFloat(str) || 0;
    }

    // ==========================================
    // HÀM CHUẨN HÓA & LỌC DỮ LIỆU CHUẨN XÁC
    // ==========================================
    function cleanAndNormalizeData(dataArray) {
        if (!dataArray || !Array.isArray(dataArray)) return [];
        
        return dataArray
            .map((item, index) => {
                if (!item) return null;

                return {
                    rowIndex: index,
                    id: String(item.id || "").trim(),
                    name: String(item.name || "").trim(),
                    swim: parseVietnameseNumber(item.swim),
                    bike: parseVietnameseNumber(item.bike),
                    run: parseVietnameseNumber(item.run),
                    points: parseVietnameseNumber(item.points),
                    cup: parseVietnameseNumber(item.cup),
                    rank: String(item.rank || ""),
                    deviation: String(item.deviation || "0.00%"),
                    missing: String(item.missing || ""),
                    medal: String(item.medal || ""),
                    dev: String(item.dev || "") // Ánh xạ dữ liệu cột dev chuẩn xác
                };
            })
            .filter(item => {
                if (!item) return false;
                const hasValidId = item.id !== "" && item.id.toUpperCase().startsWith("TL");
                const hasValidName = item.name !== "" && item.name !== "Ẩn danh" && item.name.toLowerCase() !== "null";
                return hasValidId && hasValidName;
            });
    }

    // ==========================================
    // 2. KHỞI TẠO TRANG & LẤY DỮ LIỆU TỪ GOOGLE SHEETS
    // ==========================================
    async function initRankingPage() {
        try {
            // Ép làm mới cache để nhận dữ liệu mới nhất từ server
            const res = await callSystemAPI("getDashboard", { forceRefresh: true });
            console.log("Dữ liệu gốc từ API:", res);

            if (!res || !res.success) {
                console.error("Lỗi: Không lấy được dữ liệu từ Google Sheets");
                return;
            }

            let rankingsTarget = null;
            if (res.users) {
                rankingsTarget = Array.isArray(res.users) ? res.users : res.users.data;
            } else if (res.data && res.data.users) {
                rankingsTarget = Array.isArray(res.data.users) ? res.data.users : res.data.users.data;
            } else if (Array.isArray(res.data)) {
                rankingsTarget = res.data;
            }

            if (rankingsTarget && Array.isArray(rankingsTarget)) {
                rawMembersData = cleanAndNormalizeData(rankingsTarget);
                console.log("Dữ liệu sau khi làm sạch:", rawMembersData);
                
                const totalClubSwim = rawMembersData.reduce((sum, user) => sum + (parseFloat(user.swim) || 0), 0);
                const totalClubBike = rawMembersData.reduce((sum, user) => sum + (parseFloat(user.bike) || 0), 0);
                const totalClubRun  = rawMembersData.reduce((sum, user) => sum + (parseFloat(user.run) || 0), 0);
                const totalClubCups = rawMembersData.reduce((sum, user) => sum + (parseInt(user.cup) || 0), 0);

                if (document.getElementById('clubSwim')) {
                    document.getElementById('clubSwim').textContent = (totalClubSwim / 1000).toFixed(1) + " km";
                }
                if (document.getElementById('clubBike')) {
                    document.getElementById('clubBike').textContent = totalClubBike.toFixed(1) + " km";
                }
                if (document.getElementById('clubRun')) {
                    document.getElementById('clubRun').textContent = totalClubRun.toFixed(1) + " km";
                }
                if (document.getElementById('clubCups')) {
                    document.getElementById('clubCups').textContent = totalClubCups;
                }

                renderPodium(rawMembersData); 
                renderLeaderboard();
            } else {
                console.error("Không tìm thấy cấu trúc mảng danh sách xếp hạng phù hợp trong API!");
            }

            let historyTarget = res.history || res.logs || res.activities || [];
            if (historyTarget.length === 0 && res.data) {
                historyTarget = res.data.history || res.data.logs || res.data.activities || [];
            }
            renderActivityLogs(historyTarget);

        } catch (error) {
            console.error("Lỗi khởi tạo trang:", error);
        }
    }

    // ==========================================
    // 3. LOGIC SẮP XẾP CHUNG THEO TAB ĐANG CHỌN
    // ==========================================
    function sortMembersByTab(membersArray) {
        return [...membersArray].sort((a, b) => {
            if (currentTab === 'all') {
                if (b.points !== a.points) return b.points - a.points;
                return b.cup - a.cup; 
            } else if (currentTab === 'deviation' || currentTab === 'dev' || currentTab === 'lech') {
                return parseFloat(b.deviation) - parseFloat(a.deviation);
            } else {
                return b[currentTab] - a[currentTab];
            }
        });
    }

    // ==========================================
    // 4. HÀM RENDER BỤC VINH QUANG TOP 3 (PODIUM)
    // ==========================================
    function renderPodium(members) {
        if (!podiumContainer) return;

        const activeMembers = members.filter(item => {
            if (currentTab === 'all') return item.points > 0 || item.cup > 0;
            if (currentTab === 'deviation' || currentTab === 'dev' || currentTab === 'lech') return item.dev !== "" || item.deviation !== "0.00%";
            return item[currentTab] > 0;
        });

        const sorted = sortMembersByTab(activeMembers).slice(0, 3);
        const top3 = [sorted[1], sorted[0], sorted[2]]; 

        podiumContainer.innerHTML = top3.map((item, index) => {
            if (!item) return '<div class="podium-card empty"></div>';
            
            const originalRank = index === 1 ? 1 : (index === 0 ? 2 : 3);
            const label = originalRank === 1 ? "1st" : (originalRank === 2 ? "2nd" : "3rd");
            const jpgAvatar = item.id ? `avatars/${item.id}.jpg` : 'avatars/default.jpg';

            let subText = '';
            if (currentTab === 'all') {
                subText = `${Math.round(item.points)} đ`;
            } else if (currentTab === 'swim') {
                subText = `${(item.swim / 1000).toFixed(1)} km`; 
            } else if (currentTab === 'bike') {
                subText = `${item.bike.toFixed(1)} km`;
            } else if (currentTab === 'run') {
                subText = `${item.run.toFixed(1)} km`;
            } else if (currentTab === 'deviation' || currentTab === 'dev' || currentTab === 'lech') {
                subText = `${item.deviation}`;
            }

            return `
                <div class="podium-card rank-${originalRank}">
                    <div class="rank-label">${label}</div>
                    <div class="avatar-frame">
                         <img src="${jpgAvatar}" onerror="this.src='avatars/default.jpg';" alt="Avatar">
                    </div>
                    <div class="member-name" style="font-size: 13px; font-weight: bold; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; text-align: center;">${item.name}</div>
                    <div class="member-score" style="font-size: 12px; font-weight: bold; margin-top: 2px;">${subText}</div>
                </div>
            `;
        }).join('');
    }

    // ==========================================
    // 5. HÀM RENDER DANH SÁCH BẢNG XẾP HẠNG
    // ==========================================
    function renderLeaderboard() {
        if (!leaderboardRows) return;
        const keyword = searchBar ? searchBar.value.trim().toLowerCase() : '';
        leaderboardRows.innerHTML = "";
        
        let filtered = rawMembersData.filter(item => 
            item.name.toLowerCase().includes(keyword) || 
            item.id.toLowerCase().includes(keyword)
        );

        filtered = filtered.filter(item => {
            if (currentTab === 'all') {
                return (parseFloat(item.points) || 0) > 0 || (parseInt(item.cup) || 0) > 0;
            } else if (currentTab === 'swim') {
                return (parseFloat(item.swim) || 0) > 0;
            } else if (currentTab === 'bike') {
                return (parseFloat(item.bike) || 0) > 0;
            } else if (currentTab === 'run') {
                return (parseFloat(item.run) || 0) > 0;
            } else if (currentTab === 'deviation' || currentTab === 'dev' || currentTab === 'lech') {
                return true; // Hiển thị toàn bộ danh sách ở tab lệch để kiểm tra chi tiết cột dev
            }
            return true;
        });

        const sortedMembers = sortMembersByTab(filtered);

        sortedMembers.forEach((item, index) => {
            let displayRightSide = ''; 
            let devInfoHtml = '';

            // ------------------------------------------
            // PHÂN LOẠI HIỂN THỊ CHÍNH XÁC THEO TỪNG TAB
            // ------------------------------------------
            if (currentTab === 'all') {
                displayRightSide = `
                    <div class="row-score">${item.points.toFixed(0)} điểm </div>
                    <div class="row-cups">🏆 ${item.cup}</div>
                `;
            } else if (currentTab === 'swim') {
                displayRightSide = `<div class="row-score">${(item.swim / 1000).toFixed(1)} km 🏊</div>`;
            } else if (currentTab === 'bike') {
                displayRightSide = `<div class="row-score">${item.bike.toFixed(1)} km 🚴</div>`;
            } else if (currentTab === 'run') {
                displayRightSide = `<div class="row-score">${item.run.toFixed(1)} km 🏃</div>`;
            } else if (currentTab === 'deviation' || currentTab === 'dev' || currentTab === 'lech') {
                // Tab Lệch: Hiển thị độ lệch bên phải và chi tiết cột dev bên dưới
                displayRightSide = `<div class="row-score" style="color: #e67e22; font-weight: bold;">T/L: ${item.deviation}</div>`;
                if (item.dev) {
                    devInfoHtml = `<div class="row-dev" style="font-size: 11px; color: #888; margin-top: 4px;">⚠️ ${item.dev}</div>`;
                } else {
                    devInfoHtml = `<div class="row-dev" style="font-size: 11px; color: #aaa; margin-top: 4px;">✅ Đạt chuẩn </div>`;
                }
            }
            
            const row = `
                <div class="row-item" style="flex-direction: column; align-items: stretch;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div class="row-left" style="display: flex; align-items: center; gap: 8px;">
                            <div class="row-index">${index + 1}</div>
                            <span class="row-name" style="font-weight: bold;">${item.name}</span>
                        </div>
                        <div class="row-right" style="display: flex; align-items: center; gap: 10px;">
                            ${displayRightSide}
                        </div>
                    </div>
                    ${devInfoHtml}
                </div>
            `;
            leaderboardRows.insertAdjacentHTML('beforeend', row);
        });

        if (sortedMembers.length === 0) {
            leaderboardRows.innerHTML = `<div class="text-center text-muted" style="padding: 20px;">Không tìm thấy thành viên phù hợp</div>`;
        }
    }

    if (searchBar) {
        searchBar.addEventListener('input', renderLeaderboard);
    }

    // ==========================================
    // 6. HÀM RENDER CHI TIẾT NHẬT KÝ THÀNH TÍCH GẦN ĐÂY
    // ==========================================
    function renderActivityLogs(logsArray) {
        const logsContainer = document.getElementById('activityLogsRows');
        if (!logsContainer) return;

        if (!logsArray || logsArray.length === 0) {
            logsContainer.innerHTML = `<div class="text-center text-muted" style="padding: 10px; font-size: 13px;">Chưa có dữ liệu nhật ký</div>`;
            return;
        }

        logsContainer.innerHTML = "";

        logsArray.forEach(item => {
            const name = item.name || item.Tên || "Thành viên";
            const date = item.date || item.Ngày || "Gần đây";
            const category = item.category || item.Loại || "Sprint";
            const history = item.history || item.Thành_tích || "";
            const time = item.time || item.Thời_gian || "";

            const row = `
                <div class="row-item">
                    <div class="row-header">
                        <div class="row-user-info">
                            <span class="row-name">${name}</span>
                            <span class="row-category">${category}</span>
                        </div>
                        <span class="row-date">📅 ${date}</span>
                    </div>
                    <div class="row-details">
                        ${history}
                    </div>
                    <div class="row-time">
                        ⏱️ Tổng thời gian: <strong>${time}</strong>
                    </div>
                </div>
            `;
            logsContainer.insertAdjacentHTML('beforeend', row);
        });
    }

    // Khởi chạy toàn bộ hệ thống
    initRankingPage();
});
