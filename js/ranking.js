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
    let currentTab = 'all'; // Lưu trạng thái tab hiện tại (all, swim, bike, run)

    const leaderboardRows = document.getElementById('leaderboardRows');
    const podiumContainer = document.getElementById('podiumContainer');
    const searchBar = document.getElementById('searchBar');

    // ==========================================
    // 1. SỰ KIỆN CLICK CHUYỂN TAB (TỔNG / BƠI / ĐẠP / CHẠY)
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
    // HÀM CHUYỂN ĐỔI CHUỖI SỐ VIỆT NAM KHẮT KHE (15257,00 -> 15257.00)
    // ==========================================
    function parseVietnameseNumber(val) {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        
        // Loại bỏ mọi khoảng trắng ẩn gây lỗi ép kiểu
        let str = String(val).trim().replace(/\s/g, '');
        
        // Giữ lại số, dấu phẩy, dấu chấm và dấu trừ
        str = str.replace(/[^0-9.,-]/g, '');

        if (str.includes('.') && str.includes(',')) {
            if (str.indexOf('.') < str.indexOf(',')) {
                // Trường hợp định dạng: 15.257,00 -> xóa dấu chấm, đổi phẩy thành chấm thập phân
                str = str.replace(/\./g, '').replace(',', '.');
            } else {
                // Trường hợp định dạng: 15,257.00 -> xóa dấu phẩy
                str = str.replace(/,/g, '');
            }
        } else if (str.includes(',')) {
            // Định dạng chỉ có dấu phẩy: 15257,00 hoặc 265,93 -> đổi thành dấu chấm thập phân
            str = str.replace(',', '.');
        }
        
        return parseFloat(str) || 0;
    }

    // ==========================================
    // HÀM CHUẨN HÓA DỮ LIỆU: Đổi tất cả Key thành chữ thường
    // ==========================================
    function cleanAndNormalizeData(dataArray) {
        if (!dataArray || !Array.isArray(dataArray)) return [];
        
        return dataArray.map((item) => {
            if (!item) return null;

            let swimVal = 0, bikeVal = 0, runVal = 0, pointsVal = 0, cupVal = 0, rankVal = 0;
            let idVal = '', nameVal = 'Ẩn danh';

            for (let originalKey in item) {
                if (item.hasOwnProperty(originalKey)) {
                    let key = originalKey.toLowerCase().trim();
                    let val = item[originalKey];

                    // Khớp chính xác theo cấu trúc cột trên Link Google Sheets của bạn
                    if (key === 'id' || key.includes('ms') || key.includes('mã') || key.includes('ma')) {
                        idVal = String(val).trim();
                    } else if (key.includes('tên') || key.includes('ten') || key === 'name') {
                        nameVal = String(val).trim();
                    } else if (key.includes('bơi') || key.includes('boi') || key.includes('swim')) {
                        swimVal = parseVietnameseNumber(val);
                    } else if (key.includes('đạp') || key.includes('dap') || key.includes('bike')) {
                        bikeVal = parseVietnameseNumber(val);
                    } else if (key.includes('chạy') || key.includes('chay') || key.includes('run')) {
                        runVal = parseVietnameseNumber(val);
                    } else if (key.includes('điểm') || key.includes('diem') || key.includes('point')) {
                        pointsVal = parseVietnameseNumber(val);
                    } else if (key.includes('cup') || key.includes('cúp')) {
                        cupVal = parseVietnameseNumber(val);
                    } else if (key.includes('hạng') || key.includes('hang') || key.includes('rank')) {
                        rankVal = parseVietnameseNumber(val);
                    }
                }
            }

            return {
                id: idVal,
                name: nameVal,
                swim: swimVal,
                bike: bikeVal,
                run: runVal,
                points: pointsVal,
                cup: cupVal,
                rank: rankVal
            };
        }).filter(item => item !== null);
    }

    // ==========================================
    // 2. KHỞI TẠO TRANG & LẤY DỮ LIỆU TỪ GOOGLE SHEETS
    // ==========================================
    async function initRankingPage() {
        try {
            const res = await callSystemAPI("getDashboard");
            console.log("Dữ liệu gốc từ API:", res);

            if (!res || !res.success) {
                console.error("Lỗi: Không lấy được dữ liệu từ Google Sheets");
                return;
            }

            // SỬA LỖI BÓC TÁCH: Tự động tìm mảng Summary chuẩn hóa
            let summaryData = res.summary;
            if (summaryData && summaryData.data) { summaryData = summaryData.data; }

            // Xử lý Summary của CLB
            if (summaryData) {
                let cleanSummary = {};
                for (let k in summaryData) { cleanSummary[k.toLowerCase()] = summaryData[k]; }
                
                const swimDist = parseVietnameseNumber(cleanSummary.swim);
                const bikeDist = parseVietnameseNumber(cleanSummary.bike);
                const runDist = parseVietnameseNumber(cleanSummary.run);

                // Hiển thị dữ liệu tổng của CLB
                if (document.getElementById('clubSwim')) document.getElementById('clubSwim').textContent = swimDist.toFixed(1) + " km";
                if (document.getElementById('clubBike')) document.getElementById('clubBike').textContent = bikeDist.toFixed(1) + " km";
                if (document.getElementById('clubRun')) document.getElementById('clubRun').textContent = runDist.toFixed(1) + " km";
                
                const totalCups = Math.min(
                    Math.floor(swimDist / 1900),
                    Math.floor(bikeDist / 90),
                    Math.floor(runDist / 21.1)
                );
                if (document.getElementById('clubCups')) {
                    document.getElementById('clubCups').textContent = cleanSummary.cup || cleanSummary.cups || totalCups;
                }
            }

            // SỬA LỖI BÓC TÁCH CHÍNH: Kiểm tra bọc mảng trong thuộc tính `.data` của API
            let rankingsTarget = null;
            if (res.rankings) {
                rankingsTarget = Array.isArray(res.rankings) ? res.rankings : res.rankings.data;
            } else if (res.data && res.data.rankings) {
                rankingsTarget = Array.isArray(res.data.rankings) ? res.data.rankings : res.data.rankings.data;
            } else if (Array.isArray(res.data)) {
                rankingsTarget = res.data;
            }

            // Xử lý mảng Rankings thành viên sau khi bóc tách đúng tầng
            if (rankingsTarget && Array.isArray(rankingsTarget)) {
                rawMembersData = cleanAndNormalizeData(rankingsTarget);
                console.log("Dữ liệu sau khi giải mã bóc tách thành công:", rawMembersData);
                
                renderPodium(rawMembersData); 
                renderLeaderboard();
            } else {
                console.error("Không tìm thấy cấu trúc mảng danh sách xếp hạng phù hợp trong API!");
            }

            // 3. Xử lý bóc tách mảng history/logs cho phần nhật ký thành tích gần đây
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
            } else {
                return b[currentTab] - a[currentTab];
            }
        });
    }

    // ==========================================
    // 4. HÀM RENDER BỤC VINH QUANG TOP 3 (PODIUM) Theo Tab
    // ==========================================
    function renderPodium(members) {
        if (!podiumContainer) return;

        const sorted = sortMembersByTab(members).slice(0, 3);
        const top3 = [sorted[1], sorted[0], sorted[2]]; // Giao diện bục: Hạng 2 - Hạng 1 - Hạng 3

        podiumContainer.innerHTML = top3.map((item, index) => {
            if (!item) return '<div class="podium-card empty"></div>';
            
            const originalRank = index === 1 ? 1 : (index === 0 ? 2 : 3);
            const label = originalRank === 1 ? "1st" : (originalRank === 2 ? "2nd" : "3rd");
            const jpgAvatar = `avatars/${item.id}.jpg`;

            let subText = '';
            if (currentTab === 'all') {
                subText = `${Math.round(item.points)} đ`;
            } else if (currentTab === 'swim') {
                subText = `${(item.swim / 1000).toFixed(1)} km`; 
            } else if (currentTab === 'bike') {
                subText = `${item.bike.toFixed(1)} km`;
            } else if (currentTab === 'run') {
                subText = `${item.run.toFixed(1)} km`;
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
    // 5. HÀM RENDER DANH SÁCH BẢNG XẾP HẠNG Theo Tab
    // ==========================================
    function renderLeaderboard() {
        if (!leaderboardRows) return;
        const keyword = searchBar ? searchBar.value.trim().toLowerCase() : '';
        leaderboardRows.innerHTML = "";
        
        let filtered = rawMembersData.filter(item => 
            item.name.toLowerCase().includes(keyword) || 
            item.id.toLowerCase().includes(keyword)
        );

        const sortedMembers = sortMembersByTab(filtered);

        sortedMembers.forEach((item, index) => {
            let displayRightSide = ''; 

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
            }
            
            const row = `
                <div class="row-item">
                    <div class="row-left">
                        <div class="row-index">${index + 1}</div>
                        <span class="row-name">${item.name}</span>
                    </div>
                    <div class="row-right">
                        ${displayRightSide}
                    </div>
                </div>
            `;
            leaderboardRows.insertAdjacentHTML('beforeend', row);
        });

        if (filtered.length === 0) {
            leaderboardRows.innerHTML = `<div class="text-center text-muted" style="padding: 20px;">Không tìm thấy thành viên phù hợp</div>`;
        }
    }

    if (searchBar) {
        searchBar.addEventListener('input', renderLeaderboard);
    }

    // ==========================================
    
    // ==========================================
    // 6. HÀM RENDER CHI TIẾT NHẬT KÝ THÀNH TÍCH GẦN ĐÂY (THỨ TỰ TỪ TRÊN XUỐNG DƯỚI)
    // ==========================================
    function renderActivityLogs(logsArray) {
        const logsContainer = document.getElementById('activityLogsRows');
        if (!logsContainer) return;

        if (!logsArray || logsArray.length === 0) {
            logsContainer.innerHTML = `<div class="text-center text-muted" style="padding: 10px; font-size: 13px;">Chưa có dữ liệu nhật ký</div>`;
            return;
        }

        // Giữ nguyên thứ tự dữ liệu từ trên xuống dưới (không đảo ngược)
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

    // Khởi chạy toàn bộ logic trang khi DOM đã sẵn sàng
    initRankingPage();
});