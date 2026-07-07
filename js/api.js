/**
 * ==========================================
 * TRIATHLON LỤC NAM - CORE API (api.js)
 * ==========================================
 * Tối ưu hóa cơ chế fetch tránh lỗi CORS khắt khe của Google Web App
 */

// Đường link Web App chính thức kết nối tới Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjIwkbSvpfN5wg3jZoYy50OUJkLpRYn7WIyNsX9-sHoL4VcUt3E7GSBHBuA18F5V6F/exec";

/**
 * Hàm gọi API chung cho toàn hệ thống
 */
async function callSystemAPI(action, data = {}) {
    try {
        // Thêm tham số _t để chống cache trình duyệt
        const url = `${APPS_SCRIPT_URL}?_t=${new Date().getTime()}`;
        
        // Chỉ thực hiện fetch 1 lần duy nhất
        const response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "text/plain" 
            },
            body: JSON.stringify({ action, ...data })
        });

        // Kiểm tra nếu phản hồi không thành công
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Đọc nội dung phản hồi
        const textData = await response.text();
        
        // Chuyển đổi sang JSON
        return JSON.parse(textData);

    } catch (error) {
        console.error("❌ Lỗi API:", error);
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
