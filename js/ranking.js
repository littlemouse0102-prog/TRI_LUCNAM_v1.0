/**
 * File: ranking.js - Cập nhật hiển thị Top 3 và ảnh đại diện
 */

document.addEventListener('DOMContentLoaded', () => {
    let rawMembersData = [];
    const leaderboardRows = document.getElementById('leaderboardRows');
    const podiumContainer = document.getElementById('podiumContainer');
    const searchBar = document.getElementById('searchBar');

    // Hàm gọi API tới Google Apps Script
    async function callSystemAPI(action) {
        return new Promise((resolve) => {
            google.script.run
                .withSuccessHandler(resolve)
                .withFailureHandler((err) => { console.error("Lỗi API:", err); resolve(null); })
                .doPost({ postData: { contents: JSON.stringify({ action: action }) } });
        });
    }

    // Hàm render Podium (Bục vinh quang) với ảnh avatar
    function renderPodium(data) {
        const top3 = data.slice(0, 3); // Lấy 3 người đứng đầu

        podiumContainer.innerHTML = top3.map((p, index) => {
            // Đường dẫn ảnh: thư mục 'avatars/' + ID + '.jpg'
            const avatarUrl = `avatars/${p.id}.jpg`; 

            return `
                <div class="podium-card rank-${index + 1}">
                    <div class="avatar-frame">
                        <img src="${avatarUrl}" alt="${p.name}" 
                             onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <div class="name">${p.name}</div>
                    <div class="podium-score">${p.points} Pts</div>
                    <div class="podium-cups">🏆 ${p.cups}</div>
                </div>
            `;
        }).join('');
    }

    // Khởi tạo trang
    async function initRankingPage() {
        const res = await callSystemAPI("getDashboard");
        
        if (!res || !res.success) return;

        // 1. Cập nhật chỉ số tổng CLB
        if (res.summary) {
            document.getElementById('clubSwim').textContent = res.summary.swim + " km";
            document.getElementById('clubBike').textContent = res.summary.bike + " km";
            document.getElementById('clubRun').textContent = res.summary.run + " km";
            document.getElementById('clubCups').textContent = res.summary.cups;
        }

        // 2. QUAN TRỌNG: Lưu dữ liệu vào biến toàn cục để hàm render dùng
        if (res.rankings) {
            rawMembersData = res.rankings; // Gán dữ liệu từ Sheets vào đây
            renderPodium(rawMembersData);   // Hiển thị bục vinh quang
            renderLeaderboard();           // Hiển thị danh sách bên dưới
        }
    }

    // Hiển thị danh sách lên giao diện
    function renderLeaderboard() {
        const keyword = searchBar.value.trim().toLowerCase();
        let filtered = [...rawMembersData];

        if (keyword) {
            filtered = filtered.filter(item => item.name.toLowerCase().includes(keyword));
        }

        leaderboardRows.innerHTML = "";
        filtered.forEach((item, index) => {
            const row = `
                <div class="row-item">
                    <div class="row-left">
                        <div class="row-index">${index + 1}</div>
                        <span class="row-name">${item.name}</span>
                    </div>
                    <div class="row-right">
                        <div class="row-score">${item.points} Pts</div>
                        <div class="row-cups">🏆 ${item.cups}</div>
                    </div>
                </div>
            `;
            leaderboardRows.insertAdjacentHTML('beforeend', row);
        });
    }

    searchBar.addEventListener('input', renderLeaderboard);
    initRankingPage();
});

//dữ liệu JSON
async function loadMemberDashboardData(userId) {
    const response = await callSystemAPI("getDashboard", { userId: userId });
    
    // THÊM DÒNG NÀY VÀO ĐỂ XEM DỮ LIỆU
    console.log("Dữ liệu từ Google Sheets trả về:", response); 

    if (response.success) {
        // ... các xử lý tiếp theo
    }
}
