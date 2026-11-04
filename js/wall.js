document.addEventListener('DOMContentLoaded', async () => {
    console.log("Đã khởi chạy wall.js");

    const cabinet = document.querySelector('.achievement-cabinet');
    if (!cabinet) return;

    // 1. Hàm kiểm tra xem một file ảnh có tồn tại hay không
    function checkImageExists(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    // 2. Hàm tự động quét tìm tất cả các file wall, wall1, wall2... cho đến khi hết
    async function detectAvailableBackgrounds() {
        const bgList = ['wall.jpg']; // File gốc bắt buộc có
        let index = 1;
        
        // Vòng lặp quét tuần tự wall1.jpg, wall2.jpg, wall3.jpg...
        while (true) {
            const fileName = `wall${index}.jpg`;
            const exists = await checkImageExists(`avatars/${fileName}`);
            if (exists) {
                bgList.push(fileName);
                index++;
            } else {
                // Nếu không tìm thấy file tiếp theo, dừng quét
                break;
            }
        }
        
        // Hỗ trợ cả định dạng .png nếu anh dùng mở rộng (tuỳ chọn)
        // Kiểm tra thêm wall.png, wall1.png... nếu cần thiết
        const pngExists = await checkImageExists('avatars/wall.png');
        if (pngExists && !bgList.includes('wall.png')) {
            bgList.push('wall.png');
        }

        console.log("Danh sách hình nền tìm thấy:", bgList);
        return bgList;
    }

    // Tải danh sách nền động
    let backgroundList = await detectAvailableBackgrounds();

    // Khởi tạo hoặc khôi phục nền đang dùng từ localStorage
    let currentBgIndex = parseInt(localStorage.getItem('triathlon_wall_bg_index') || '0', 10);
    if (isNaN(currentBgIndex) || currentBgIndex >= backgroundList.length || currentBgIndex < 0) {
        currentBgIndex = 0;
    }

    // Hàm cập nhật hình nền giao diện tủ
    function updateCabinetBackground() {
        if (backgroundList.length > 0) {
            cabinet.style.backgroundImage = `url('avatars/${backgroundList[currentBgIndex]}')`;
        }
    }

    // Hàm thiết lập sự kiện cho nút Đổi nền
    function bindChangeBgEvent() {
        const changeBgBtn = document.getElementById('change-bg-btn');
        if (changeBgBtn) {
            changeBgBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
                if (backgroundList.length > 0) {
                    currentBgIndex = (currentBgIndex + 1) % backgroundList.length;
                    localStorage.setItem('triathlon_wall_bg_index', currentBgIndex);
                    updateCabinetBackground();
                }
            });
        }
    }

    // Áp dụng hình nền ngay khi mở trang
    updateCabinetBackground();

    // 3. HIỆN LOADING NGAY KHI VỪA VÀO TRANG
    cabinet.innerHTML = '<div class="loading-spinner">Đang tải huy chương...</div>';

    // 4. Lấy ID người dùng từ localStorage
    let userId = null;
    try {
        const userDataRaw = localStorage.getItem("triathlon_user");
        if (userDataRaw) {
            const user = JSON.parse(userDataRaw);
            userId = user.id || user.ID || user.ms || user.ma;
        }
    } catch (e) { 
        console.error("Lỗi đọc thông tin người dùng:", e); 
    }

    if (!userId) {
        cabinet.innerHTML = `
            <a href="member.html" class="back-btn">←</a>
            <button id="change-bg-btn" class="change-bg-btn" title="Đổi hình nền tủ">
                <i class="fa-solid fa-image"></i>
            </button>
            <p style="color: white; text-align: center; margin-top: 100px;">Vui lòng đăng nhập!</p>
        `;
        updateCabinetBackground();
        bindChangeBgEvent();
        return;
    }
    
    try {
        // 5. Gọi API lấy dữ liệu vinh danh
        const res = await callSystemAPI("getDashboard");
        
        if (!res || !res.success) throw new Error("Lỗi kết nối API");

        let rankings = res.users || res.data || [];
        const currentUser = rankings.find(m => {
            const memberId = String(m.id || m.ID || m.ms || m.ma || "").toLowerCase().trim();
            return memberId === String(userId).toLowerCase().trim();
        });
       
        if (!currentUser) {
            cabinet.innerHTML = `
                <a href="member.html" class="back-btn">←</a>
                <button id="change-bg-btn" class="change-bg-btn" title="Đổi hình nền tủ">
                    <i class="fa-solid fa-image"></i>
                </button>
                <p style="color: white; text-align: center; margin-top: 100px;">Không tìm thấy dữ liệu cá nhân.</p>
            `;
            updateCabinetBackground();
            bindChangeBgEvent();
            return;
        }

        const medalData = currentUser.medal || "";

        // 6. Render nút điều hướng và nút đổi nền
        cabinet.innerHTML = `
            <a href="member.html" class="back-btn">←</a>
            <button id="change-bg-btn" class="change-bg-btn" title="Đổi hình nền tủ">
                <i class="fa-solid fa-image"></i>
            </button>
        `;

        // Khôi phục lại nền và gắn sự kiện cho nút đổi nền
        updateCabinetBackground();
        bindChangeBgEvent();
                
        // 7. Hiển thị danh sách huy chương
        if (medalData && String(medalData).trim() !== "") {
            const medals = String(medalData).split(',').map(m => m.trim()).filter(m => m !== "");

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
                
                slot.innerHTML = `
                    <img src="avatars/${fileName}" class="avatar-img" onerror="this.onerror=null; this.src='avatars/default.jpg';">
                `;
                
                slot.addEventListener('click', function(e) {
                    e.stopPropagation();
                    this.classList.toggle('is-full-screen');
                });

                cabinet.appendChild(slot);
            });
        }

    } catch (err) {
        console.error("Lỗi tải dữ liệu tủ cúp:", err);
        cabinet.innerHTML = `
            <a href="member.html" class="back-btn">←</a>
            <button id="change-bg-btn" class="change-bg-btn" title="Đổi hình nền tủ">
                <i class="fa-solid fa-image"></i>
            </button>
            <p style="text-align: center; color: #EF4444; margin-top: 100px;">Lỗi tải dữ liệu vinh danh!</p>
        `;
        updateCabinetBackground();
        bindChangeBgEvent();
    }
});
