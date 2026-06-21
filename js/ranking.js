document.addEventListener('DOMContentLoaded', () => {
    let rawMembersData = [];
    const leaderboardRows = document.getElementById('leaderboardRows');
    const podiumContainer = document.getElementById('podiumContainer');
    const searchBar = document.getElementById('searchBar');

    // XÓA HÀM callSystemAPI CŨ CỦA BẠN ĐI
    // CHÚNG TA SẼ DÙNG HÀM TRONG FILE api.js
    
    async function initRankingPage() {
        // Gọi trực tiếp hàm từ api.js (đã được load từ ranking.html)
        const res = await callSystemAPI("getDashboard");
        console.log("Dữ liệu nhận được:", res);

        if (!res || !res.success) {
            console.error("Lỗi: Không lấy được dữ liệu từ Google Sheets");
            return;
        }

        // 1. Hiển thị Summary
        if (res.summary) {
            document.getElementById('clubSwim').textContent = parseFloat(res.summary.swim).toFixed(2) + " km";
            document.getElementById('clubBike').textContent = parseFloat(res.summary.bike).toFixed(2) + " km";
            document.getElementById('clubRun').textContent = parseFloat(res.summary.run).toFixed(2) + " km";
            document.getElementById('clubCups').textContent = res.summary.cups; // Cups thường là số nguyên, giữ nguyên hoặc dùng parseInt
        }

        // 2. Lưu và hiển thị danh sách
        if (res.rankings) {
            rawMembersData = res.rankings;
            renderPodium(rawMembersData); // Đảm bảo hàm này đã được định nghĩa
            renderLeaderboard();
        }
    }


   function renderLeaderboard() {
    const keyword = searchBar.value.trim().toLowerCase();
    
    // Lọc dữ liệu
    let filtered = rawMembersData.filter(item => 
        item.name.toLowerCase().includes(keyword) || 
        item.id.toLowerCase().includes(keyword)
    );

    leaderboardRows.innerHTML = "";
    
    filtered.forEach((item, index) => {
        // Định dạng điểm số: ép kiểu về số thực và lấy 2 chữ số thập phân
        const formattedPoints = parseFloat(item.points).toFixed(0);
        
        const row = `
            <div class="row-item">
                <div class="row-left">
                    <div class="row-index">${index + 1}</div>
                    <span class="row-name">${item.name}</span>
                </div>
                <div class="row-right">
                    <div class="row-score">${formattedPoints} điểm </div>
                    <div class="row-cups"> ${item.cups}</div>
                </div>
            </div>
        `;
        leaderboardRows.insertAdjacentHTML('beforeend', row);
    });
}

    // Thêm hàm này vào file ranking.js (bên dưới hoặc bên trên hàm renderLeaderboard)
        function renderPodium(members) {
        const podiumContainer = document.getElementById('podiumContainer');
        if (!podiumContainer) return;

        const sorted = [...members].sort((a, b) => b.points - a.points).slice(0, 3);
        // Tráo thứ tự: 2 - 1 - 3
        const top3 = [sorted[1], sorted[0], sorted[2]];

        podiumContainer.innerHTML = top3.map((item, index) => {
            if (!item) return '';
            const originalRank = index === 1 ? 1 : (index === 0 ? 2 : 3);
            const label = originalRank === 1 ? "1st" : (originalRank === 2 ? "2nd" : "3rd");
            const jpgAvatar = `avatars/${item.id}.jpg`;

            return `
                <div class="podium-card rank-${originalRank}">
                    <div class="rank-label">${label}</div>
                    <div class="avatar-frame">
                         <img src="${jpgAvatar}" onerror="this.src='avatars/default.jpg';" alt="Avatar">
                    </div>
                    <div class="member-score">${Math.round(item.points)} đ</div>
                </div>
            `;
        }).join('');
    }
    searchBar.addEventListener('input', renderLeaderboard);
    initRankingPage();
});
