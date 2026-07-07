/**
 * ==========================================
 * TRIATHLON LỤC NAM - CORE API (api.js)
 * ==========================================
 * Tối ưu hóa cơ chế fetch tránh lỗi CORS khắt khe của Google Web App
 */

// Đường link Web App chính thức kết nối tới Google Apps Script của anh
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjIwkbSvpfN5wg3jZoYy50OUJkLpRYn7WIyNsX9-sHoL4VcUt3E7GSBHBuA18F5V6F/exec";

/**
 * Hàm gọi API chung cho toàn hệ thống
 * @param {string} action - Hành động cần xử lý (login, submitActivity, loadDashboard,...)
 * @param {object} data - Dữ liệu gửi kèm theo yêu cầu
 */
async function callSystemAPI(action, data = {}) {
    try {

        const url = `${APPS_SCRIPT_URL}?_t=${new Date().getTime()}`;
        
        let res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action, ...data })
        });
        // Sử dụng text/plain để biến thành Simple Request, tránh bị chặn CORS khắt khe bởi trình duyệt
         resp = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "text/plain" 
            },
            body: JSON.stringify({ action, ...data })
        });

        // Đọc toàn bộ nội dung phản hồi dưới dạng văn bản (text)
        const textData = await res.text();
        
        // Chuyển đổi chuỗi văn bản nhận được thành đối tượng JSON và trả về
        return JSON.parse(textData);

    } catch (error) {
        console.error("❌ Lỗi cục bộ hệ thống API:", error);
        return { success: false, msg: "Lỗi kết nối server" }; // Đảm bảo luôn trả về Object
    }
}

/**
 * Hàm tiện ích lấy thông tin người dùng đang đăng nhập từ LocalStorage
 * ĐỒNG BỘ 100% VỚI FILE LOGIN.JS ĐỂ ĐỌC ĐÚNG BIẾN 'triathlon_user'
 */
function getCurrentUser() {
    try {
        const userJson = localStorage.getItem("triathlon_user");
        return userJson ? JSON.parse(userJson) : null;
    } catch (err) {
        console.error("Lỗi đọc thông tin phiên đăng nhập từ LocalStorage:", err);
        return null;
    }
}
