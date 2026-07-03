/**
 * ==========================================
 * TRIATHLON LỤC NAM - LOGIN LOGIC (login.js)
 * ==========================================
 * Xử lý kiểm tra dữ liệu đầu vào (Mã PIN độc nhất) và kết nối trực tiếp Google Sheets
 */

document.addEventListener('DOMContentLoaded', () => {
    // Cấu hình đồng bộ chính xác các phần tử giao diện từ index.html
    const loginForm = document.getElementById('loginForm');
    const pinInput = document.getElementById('pinInput');
    const errorMessage = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('submitBtn');
    
    // Bóc tách văn bản và vòng xoay tải dữ liệu bên trong nút bấm
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    const spinner = submitBtn ? submitBtn.querySelector('.spinner') : null;

        
    // Tự động nhấp nháy con trỏ chuột vào ô nhập PIN khi vừa mở trang
    // TỰ ĐỘNG NHÁY CON TRỎ (FOCUS)
    if (pinInput) {
        pinInput.focus(); // Lệnh này giúp con trỏ tự động xuất hiện trong ô nhập
    }

    // TỰ ĐỘNG ĐĂNG NHẬP KHI ĐỦ 6 SỐ
    if (pinInput) {
        pinInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length === 6) {
                loginForm.dispatchEvent(new Event('submit'));
                pinInput.blur(); // Bỏ focus sau khi đã gửi để tránh gõ thêm
            }
        });
    }

    /**
     * XỬ LÝ SỰ KIỆN SUBMIT FORM ĐĂNG NHẬP THỜI GIAN THỰC
     */
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Ngăn trang web bị tải lại trang bất ngờ
            
            const pinValue = pinInput ? pinInput.value.trim() : "";

            // Kiểm tra tính hợp lệ dữ liệu: Không được để trống ô PIN
            if (!pinValue) {
                showError("Vui lòng nhập mã PIN bảo mật!");
                return;
            }

            // Kích hoạt hiệu ứng Loading xoay tròn trên nút bấm và xóa lỗi cũ
            setLoading(true);
            clearError();

            try {
                // BẮN DUY NHẤT MÃ PIN LÊN GOOGLE APPS SCRIPT (Action: login)
                // Server phía Google Sheets sẽ tự động tìm kiếm dòng chứa mã PIN này
                const response = await callSystemAPI("login", {
                    pin: pinValue
                });

                // Tắt hiệu ứng loading sau khi nhận phản hồi từ Server Google
                setLoading(false);

                if (response.success) {
                    // ĐĂNG NHẬP THÀNH CÔNG: Lưu thông tin phiên làm việc vào trình duyệt (Local Storage)
                    localStorage.setItem("triathlon_user", JSON.stringify(response.user));

                    // PHÂN QUYỀN ĐIỀU HƯỚNG: Kiểm tra cột Role trên file Sheets của mã PIN này
                    if (response.user.role2 === "ADMIN") {
                        window.location.href = "admin.html"; // Chuyển hướng thẳng sang trang Admin
                    } else {
                        window.location.href = "member.html"; // Chuyển hướng sang trang Thành viên thường
                    }
                } else {
                    // THẤT BẠI: Hiển thị thông báo lỗi chi tiết từ Server trả về (ví dụ: Mã PIN không tồn tại)
                    showError(response.msg || "Mã PIN không chính xác. Vui lòng kiểm tra lại!");
                }

            } catch (error) {
                // Xử lý khi mất mạng hoặc đường link Web App Apps Script cấu hình bị lỗi
                setLoading(false);
                showError("Không thể kết nối tới máy chủ Google Sheets. Anh kiểm tra lại mạng nhé!");
                console.error("Lỗi đăng nhập hệ thống:", error);
            }
        });
    }

    /**
     * Hàm hiển thị trạng thái lỗi (Bật viền đỏ ô nhập + Hiện chữ cảnh báo)
     */
    function showError(msg) {
        if (pinInput) pinInput.classList.add('invalid');
        if (errorMessage) {
            errorMessage.innerText = msg; // Thay đổi nội dung chữ báo lỗi linh hoạt theo phản hồi thực tế
            errorMessage.classList.add('show');
        }
    }

    /**
     * Hàm xóa bỏ hoàn toàn trạng thái lỗi để giao diện trở lại bình thường
     */
    function clearError() {
        if (pinInput) pinInput.classList.remove('invalid');
        if (errorMessage) errorMessage.classList.remove('show');
    }

    /**
     * Hàm bật/tắt trạng thái xoay tròn Loading của nút Đăng nhập
     */
    function setLoading(isLoading) {
        if (!submitBtn) return;
        if (isLoading) {
            submitBtn.disabled = true;
            if (btnText) btnText.classList.add('hidden'); // Ẩn chữ "Đăng nhập"
            if (spinner) spinner.classList.remove('hidden'); // Hiện vòng xoay "Đang xác thực..."
        } else {
            submitBtn.disabled = false;
            if (btnText) btnText.classList.remove('hidden'); // Hiện lại chữ "Đăng nhập"
            if (spinner) spinner.classList.add('hidden'); // Ẩn vòng xoay đi
        }
    }
});
