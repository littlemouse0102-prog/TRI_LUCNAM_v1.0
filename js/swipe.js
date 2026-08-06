document.addEventListener("DOMContentLoaded", function () {
    let startX = 0;
    let endX = 0;
    const minSwipeDistance = 50; // Khoảng cách tối thiểu để tính là vuốt (pixels)

    function handleGesture() {
        let distance = endX - startX;
        if (Math.abs(distance) < minSwipeDistance) return;

        // Thứ tự các trang từ trái qua phải trên thanh điều hướng
        const pages = [
            'admin.html',
            'profile.html',
            'member.html',
            'wall.html',
            'ranking.html'
        ];

        let currentPage = window.location.pathname.split("/").pop();
        if (!currentPage || currentPage === "") currentPage = 'member.html';

        let currentIndex = pages.indexOf(currentPage);
        if (currentIndex === -1) return;

        if (distance > 0) {
            // Vuốt sang phải -> Chuyển về trang bên trái
            if (currentIndex > 0) {
                window.location.href = pages[currentIndex - 1];
            } else {
                // Nếu đang ở trang đầu (admin.html) mà vuốt sang phải -> Vòng về trang cuối (ranking.html)
                window.location.href = pages[pages.length - 1];
            }
        } else {
            // Vuốt sang trái -> Chuyển sang trang bên phải
            if (currentIndex < pages.length - 1) {
                window.location.href = pages[currentIndex + 1];
            } else {
                // Nếu đang ở trang cuối (ranking.html) mà vuốt sang trái -> Vòng lại trang đầu (admin.html)
                window.location.href = pages[0];
            }
        }
    }

    // Gắn sự kiện cho cả Điện thoại (Touch) và Máy tính (Mouse Drag)
    const container = document.querySelector('.app-container') || document.body;

    container.addEventListener('touchstart', e => {
        if (e.changedTouches && e.changedTouches.length > 0) {
            startX = e.changedTouches[0].screenX;
        }
    }, { passive: true });

    container.addEventListener('touchend', e => {
        if (e.changedTouches && e.changedTouches.length > 0) {
            endX = e.changedTouches[0].screenX;
            handleGesture();
        }
    }, { passive: true });

    container.addEventListener('mousedown', e => {
        startX = e.clientX;
    });

    container.addEventListener('mouseup', e => {
        endX = e.clientX;
        handleGesture();
    });
});