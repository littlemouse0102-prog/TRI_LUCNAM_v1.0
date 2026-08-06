/**
 * ==========================================
 * TRIATHLON LỤC NAM - CORE API (api.js)
 * ==========================================
 * Tối ưu hóa cơ chế fetch kết hợp LocalStorage Cache chống lặp request
 */

// Đường link Web App chính thức kết nối tới Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjIwkbSvpfN5wg3jZoYy50OUJkLpRYn7WIyNsX9-sHoL4VcUt3E7GSBHBuA18F5V6F/exec";

/**
 * Hàm gọi API chung cho toàn hệ thống có kèm Cache LocalStorage
 * @param {string} action - Tên hành động (ví dụ: 'getDashboard', 'login', ...)
 * @param {object} data - Dữ liệu truyền lên
 * @param {number} cacheDurationMinutes - Thời gian lưu cache tính bằng phút (mặc định 3 phút)
 */
async function callSystemAPI(action, data = {}, cacheDurationMinutes = 3) {
    const isCacheable = ['getDashboard', 'getRankings', 'getMemberList'].includes(action);
    const cacheKey = `cache_${action}_${JSON.stringify(data)}`;
    const now = new Date().getTime();

    // 1. Kiểm tra Cache nếu là các action đọc dữ liệu
    if (isCacheable) {
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(`${cacheKey}_time`);

        if (cachedData && cachedTime) {
            const ageInMinutes = (now - parseInt(cachedTime)) / (1000 * 60);
            if (ageInMinutes < cacheDurationMinutes) {
                console.log(`⚡ Lấy dữ liệu tức thì từ Cache cho: ${action}`);
                return JSON.parse(cachedData);
            }
        }
    }

    // 2. Nếu không có cache hoặc đã hết hạn, tiến hành gọi API thật từ Google Sheets
    try {
        const url = `${APPS_SCRIPT_URL}?_t=${now}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "text/plain" 
            },
            body: JSON.stringify({ action, ...data })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const textData = await response.text();
        const result = JSON.parse(textData);

        // 3. Lưu kết quả vào localStorage nếu thành công
        if (result && result.success && isCacheable) {
            localStorage.setItem(cacheKey, JSON.stringify(result));
            localStorage.setItem(`${cacheKey}_time`, now.toString());
        }

        return result;

    } catch (error) {
        console.error("❌ Lỗi API:", error);
        
        // Fallback: Nếu mất mạng nhưng trong cache có sẵn dữ liệu cũ, lấy ra dùng đỡ
        const fallbackData = localStorage.getItem(cacheKey);
        if (fallbackData) {
            console.warn("⚠️ Mất kết nối mạng, hiển thị dữ liệu từ cache cũ.");
            return JSON.parse(fallbackData);
        }

        return { success: false, msg: "Lỗi kết nối server" };
    }
}

/**
 * Hàm tiện ích lấy thông tin người dùng đang đăng nhập
 */
function getCurrentUser() {
    try {
        const userJson = localStorage.getItem("triathlon_user");
        return userJson ? JSON.parse(userJson) : null;
    } catch (err) {
        console.error("Lỗi đọc LocalStorage:", err);
        return null;
    }
}
