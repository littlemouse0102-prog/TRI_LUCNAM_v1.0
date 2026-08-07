/**
 * ==========================================
 * TRIATHLON LỤC NAM - CORE API (api.js)
 * ==========================================
 */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjIwkbSvpfN5wg3jZoYy50OUJkLpRYn7WIyNsX9-sHoL4VcUt3E7GSBHBuA18F5V6F/exec";

async function callSystemAPI(action, data = {}, cacheDurationMinutes = 3) {
    const isCacheable = ['getDashboard', 'getRankings', 'getMemberList'].includes(action);
    const cacheKey = `cache_${action}_${JSON.stringify(data)}`;
    const now = new Date().getTime();

    if (isCacheable) {
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(`${cacheKey}_time`);

        if (cachedData && cachedTime) {
            const ageInMinutes = (now - parseInt(cachedTime)) / (1000 * 60);
            if (ageInMinutes < cacheDurationMinutes) {
                return JSON.parse(cachedData);
            }
        }
    }

    try {
        const url = `${APPS_SCRIPT_URL}?_t=${now}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action, ...data })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const textData = await response.text();
        const result = JSON.parse(textData);

        if (result && result.success && isCacheable) {
            localStorage.setItem(cacheKey, JSON.stringify(result));
            localStorage.setItem(`${cacheKey}_time`, now.toString());
        }

        return result;

    } catch (error) {
        console.error("❌ Lỗi API:", error);
        const fallbackData = localStorage.getItem(cacheKey);
        if (fallbackData) return JSON.parse(fallbackData);
        return { success: false, msg: "Lỗi kết nối server" };
    }
}

// Hàm upload hoạt động và xóa sạch cache cũ ngay lập tức
async function uploadActivityData(activityData) {
    const result = await callSystemAPI('addActivity', activityData);

    if (result && result.success) {
        console.log("🚀 Upload thành công, đang dọn dẹp cache cũ...");
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cache_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    return result;
}

function getCurrentUser() {
    try {
        const userJson = localStorage.getItem("triathlon_user");
        return userJson ? JSON.parse(userJson) : null;
    } catch (err) {
        console.error("Lỗi đọc LocalStorage:", err);
        return null;
    }
}
