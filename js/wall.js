document.addEventListener('DOMContentLoaded', async () => {
    console.log("Đã khởi chạy wall.js");

    const cabinet = document.querySelector('.achievement-cabinet');
    if (!cabinet) return;

    // HIỆN LOADING NGAY KHI VỪA VÀO TRANG
    cabinet.innerHTML = '<div class="loading-spinner">Đang tải huy chương...</div>';

    // 1. Lấy ID người dùng
    let userId = null;
    try {
        const userDataRaw = localStorage.getItem("triathlon_user");
        if (userDataRaw) {
            const user = JSON.parse(userDataRaw);
            userId = user.id || user.ID || user.ms || user.ma;
        }
    } catch (e) { console.error(e); }

    if (!userId) {
        cabinet.innerHTML = '<p style="color:white; text-align:center;">Vui lòng đăng nhập!</p>';
        return;
    }
    
    try {
        // 2. Gọi API (Lúc này Loading vẫn đang hiển thị trên màn hình)
        const res = await callSystemAPI("getDashboard");
        
        if (!res || !res.success) throw new Error("Lỗi kết nối");

        let rankings = res.rankings || res.data || [];
        const currentUser = rankings.find(m => {
            const memberId = String(m.id || m.ID || m.ms || m.ma || "").toLowerCase().trim();
            return memberId === String(userId).toLowerCase().trim();
        });
       
        if (!currentUser) {
            cabinet.innerHTML = '<p style="color:white; text-align:center;">Không tìm thấy dữ liệu.</p>';
            return;
        }

        // ... (đoạn code lấy dữ liệu currentUser trong wall.js)
        const medalData = currentUser.medal || "";
        // const cmtData = currentUser.cmt || ""; // Lấy dữ liệu cmt từ đối tượng currentUser

        // Render huy chương
        cabinet.innerHTML = '<a href="member.html" class="back-btn">← Quay lại</a>';
                
        if (medalData && String(medalData).trim() !== "") {
            const medals = String(medalData).split(',').map(m => m.trim()).filter(m => m !== "");
            // const cmts = String(cmtData).split(',').map(c => c.trim()); // Tách danh sách cmt tương ứng với huy chương

            const positionClasses = [
                'top-left', 'top-center', 'top-right',
                'mid-left', 'mid-center', 'mid-right',
                'bot-left', 'bot-center', 'bot-right'
            ];

            medals.forEach((medalImg, index) => {
                let fileName = medalImg.includes('.') ? medalImg : `${medalImg}.png`;
                const slot = document.createElement('div');
                const posClass = positionClasses[index] || 'bot-right';
                slot.className = `cup-slot ${posClass}`; 
                
                // Lấy nội dung cmt tương ứng với huy chương
                // const cmtText = cmts[index] || "Vinh danh thành tích"; 
                
                slot.innerHTML = `
                    <img src="avatars/${fileName}" class="avatar-img" onerror="this.onerror=null; this.src='avatars/default.jpg';">

                `;
                                    // <div class="cmt-overlay">${cmtText}</div> cho trong ngoặc
                slot.addEventListener('click', function() {
                    this.classList.toggle('is-full-screen');
                });
                cabinet.appendChild(slot);
            });
        }
        

    } catch (err) {
        console.error("Lỗi:", err);
        cabinet.innerHTML = '<p style="text-align:center; color:red;">Lỗi tải dữ liệu!</p>';
    }
});
