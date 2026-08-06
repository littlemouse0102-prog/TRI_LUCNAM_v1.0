// profile.js - Xử lý chuyển đổi Tab, đồng bộ Theme, Biểu đồ và nạp dữ liệu từ Google Sheets[cite: 3]

let clubMembers = [];
let currentUser = null;
let globalActivitiesList = []; // Lưu trữ danh sách hoạt động toàn cục để render tab Hoạt động

// ==========================================
// 1. KHỞI TẠO KHI TẢI TRANG (DOM LOADED)
// ==========================================
document.addEventListener("DOMContentLoaded", async function() {
    // Tự động nạp theme đã lưu cho trang profile[cite: 3]
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) {
        loadThemeCss(savedTheme);
    }

    // Xử lý bật/tắt menu chấm màu sổ xuống
    const themeBtn = document.getElementById('themeSwitcherBtn');
    const themeDropdown = document.getElementById('themeDropdown');

    if (themeBtn && themeDropdown) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            themeDropdown.classList.remove('show');
        });
        
        themeDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    if (typeof getCurrentUser === "function") {
        currentUser = getCurrentUser();
    } else {
        const userJson = localStorage.getItem("triathlon_user");
        currentUser = userJson ? JSON.parse(userJson) : null;
    }

    if (!currentUser) {
        currentUser = { id: "hungvu", name: "Hưng Vũ", location: "Lục Nam" };
    }

    await fetchClubMembersData(currentUser.id);

    // Lắng nghe sự kiện tìm kiếm hoạt động ở Tab Hoạt động
    const searchInput = document.getElementById('activity-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderUserActivities(currentUser.id, this.value);
        });
    }
});

// ==========================================
// 2. TÍCH HỢP GOOGLE SHEETS & ĐỒNG BỘ DỮ LIỆU BƠI - ĐẠP - CHẠY[cite: 3]
// ==========================================
async function fetchClubMembersData(currentUserId) {
    try {
        const response = await callSystemAPI("getDashboard", { userId: currentUserId });
        
        if (response && response.success) {
            // Lưu lại danh sách hoạt động toàn cục nếu có trả về từ server
            if (response.activities) {
                globalActivitiesList = response.activities;
            }

            let rankingsTarget = response.rankings;
            if (rankingsTarget && rankingsTarget.data) {
                rankingsTarget = rankingsTarget.data;
            }

            if (rankingsTarget && Array.isArray(rankingsTarget)) {
                clubMembers = rankingsTarget.map(item => {
                    let idVal = '', nameVal = 'Thành viên', locVal = 'Lục Nam', swimVal = 0, bikeVal = 0, runVal = 0, pointsVal = 0, rankVal = '--', cupVal = 0;
                    
                    for (let key in item) {
                        if (item.hasOwnProperty(key)) {
                            let k = key.toLowerCase().trim();
                            let val = item[key];
                            
                            if (k.includes('id') || k.includes('mã')) idVal = String(val).trim();
                            else if (k.includes('tên') || k.includes('name')) nameVal = String(val).trim();
                            else if (k.includes('địa điểm') || k.includes('location')) locVal = String(val).trim();
                            else if (k.includes('bơi') || k.includes('swim')) swimVal += parseVietnameseNumber(val);
                            else if (k.includes('đạp') || k.includes('bike')) bikeVal += parseVietnameseNumber(val);
                            else if (k.includes('chạy') || k.includes('run')) runVal += parseVietnameseNumber(val);
                            else if (k.includes('điểm') || k.includes('point')) pointsVal = parseVietnameseNumber(val);
                            else if (k.includes('hạng') || k.includes('rank')) rankVal = val;
                            else if (k.includes('cup') || k.includes('cúp')) cupVal = parseVietnameseNumber(val);
                        }
                    }

                    let finalCalculatedPoints = pointsVal;
                    if (!pointsVal || pointsVal === 0) {
                        const sKm = swimVal >= 1000 ? swimVal / 1000 : swimVal;
                        finalCalculatedPoints = Math.round((sKm * 8) + (bikeVal * 0.6) + (runVal * 1.4));
                    }

                    return {
                        id: idVal || nameVal,
                        name: nameVal,
                        location: locVal,
                        swim: swimVal,
                        bike: bikeVal,
                        run: runVal,
                        points: Math.round(finalCalculatedPoints),
                        rank: rankVal,
                        cup: cupVal
                    };
                });
            }
        } 
        
        if (!clubMembers || clubMembers.length === 0) {
            clubMembers = [
                { id: currentUser.id, name: currentUser.name, location: currentUser.location || "Lục Nam", swim: 0, bike: 0, run: 0, points: 0 }
            ];
        }

        renderMembersCarousel(clubMembers);

        const activeUser = clubMembers.find(m => String(m.id).toLowerCase() === String(currentUserId).toLowerCase()) || clubMembers[0];
        currentUser = activeUser;

        renderBasicProfile(currentUser);
        renderUserSportMetrics(currentUser);
        renderUserActivities(currentUser.id);
        updatePieChart();

    } catch (error) {
        console.error("Lỗi tải danh sách thành viên từ Sheets:", error);
        clubMembers = [currentUser];
        
        renderMembersCarousel(clubMembers);
        renderBasicProfile(currentUser);
        renderUserSportMetrics(currentUser);
        renderUserActivities(currentUser.id);
        updatePieChart();
    }
}

function parseVietnameseNumber(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim().replace(/\s/g, '').replace(/[^0-9.,-]/g, '');
    if (str.includes('.') && str.includes(',')) {
        str = str.indexOf('.') < str.indexOf(',') ? str.replace(/\./g, '').replace(',', '.') : str.replace(/,/g, '');
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    return parseFloat(str) || 0;
}

function renderMembersCarousel(members) {
    const container = document.getElementById("members-avatar-list");
    if (!container) return;

    container.innerHTML = ""; 
    const duplicatedMembers = [...members, ...members];

    duplicatedMembers.forEach(member => {
        const itemHtml = `
            <div class="member-avatar-item" onclick="selectMember('${member.id}')">
                <img src="avatars/${member.id}.jpg" 
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FC4C02&color=fff&rounded=true'" 
                     alt="${member.name}">
                <span class="member-name">${member.name}</span>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    });
}

function selectMember(memberId) {
    const selectedUser = clubMembers.find(m => String(m.id).toLowerCase() === String(memberId).toLowerCase());
    if (selectedUser) {
        currentUser = selectedUser;
        renderBasicProfile(currentUser);
        renderUserSportMetrics(currentUser);
        renderUserActivities(currentUser.id);
        updatePieChart();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderBasicProfile(user) {
    const userNameEl = document.getElementById("user-name");
    const userLocationEl = document.getElementById("user-location");
    const headerAvatarEl = document.getElementById("header-avatar");
    const userAvatarEl = document.getElementById("user-avatar");

    if (userNameEl) userNameEl.innerText = user.name || "Thành viên";
    if (userLocationEl) userLocationEl.innerText = user.location || "Lục Nam";
    
    if (headerAvatarEl && user.id) {
        headerAvatarEl.src = `avatars/${user.id}.jpg`;
        headerAvatarEl.onerror = function() { 
            this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=FC4C02&color=fff&rounded=true`; 
        };
    }

    if (userAvatarEl && user.id) {
        userAvatarEl.src = `avatars/${user.id}.jpg`;
        userAvatarEl.onerror = function() { 
            this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=FC4C02&color=fff&rounded=true`; 
        };
    }
}

function renderUserSportMetrics(user) {
    const distEl = document.getElementById('val-distance');
    const scoreEl = document.getElementById('val-time'); 

    if (!user) {
        if (distEl) distEl.textContent = "0 km";
        if (scoreEl) scoreEl.textContent = "0 điểm";
        updatePieChart(); 
        return;
    }

    const swimKm = (user.swim || 0) >= 1000 ? (user.swim / 1000) : (user.swim || 0);
    const bikeKm = user.bike || 0;
    const runKm = user.run || 0;
    const totalDist = (parseFloat(swimKm) + parseFloat(bikeKm) + parseFloat(runKm)).toFixed(2);

    if (distEl) {
        distEl.textContent = `${isNaN(totalDist) ? 0 : totalDist} km`;
    }
    
    if (scoreEl) {
        const calculatedScore = (user.points && user.points > 0) ? user.points : Math.round((swimKm * 8) + (bikeKm * 0.6) + (runKm * 1.4));
        scoreEl.textContent = `${isNaN(calculatedScore) ? 0 : Math.round(calculatedScore)}`;
    }

    updatePieChart();
}

// ==========================================
// ==========================================
// 3. RENDER THẺ HOẠT ĐỘNG CÁ NHÂN (CHI TIẾT MỨC ĐỘ, MỤC TIÊU, CHẤN THƯƠNG, GHI CHÚ)
// ==========================================
function renderUserActivities(userId, searchQuery = "") {
    const container = document.getElementById("activities-list-container");
    if (!container) return;

    // Lọc các hoạt động thuộc về user hiện tại
    const myActivities = globalActivitiesList.filter(act => 
        String(act.userId || act.id || "").trim().toLowerCase() === String(userId).trim().toLowerCase() ||
        (act.name && currentUser && String(act.name).trim().toLowerCase() === String(currentUser.name).trim().toLowerCase())
    );

    // Lọc theo từ khóa tìm kiếm (nếu có)
    let filteredActivities = myActivities;
    if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        filteredActivities = myActivities.filter(act => {
            const note = (act.note || "").toLowerCase();
            const goal = (act.goal || "").toLowerCase();
            const level = (act.level || "").toLowerCase();
            return note.includes(query) || goal.includes(query) || level.includes(query);
        });
    }

    if (filteredActivities.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 25px; background: var(--white); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">Chưa có hoạt động nào được ghi nhận.</div>`;
        return;
    }

    // Sắp xếp mới nhất lên đầu
    filteredActivities.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    let html = '';
    filteredActivities.forEach(act => {
        const swimVal = act.swim ? parseFloat(act.swim) : 0;
        const bikeVal = act.bike ? parseFloat(act.bike) : 0;
        const runVal = act.run ? parseFloat(act.run) : 0;

        const sPts = swimVal * 0.008;
        const bPts = bikeVal * 0.6;
        const rPts = runVal * 1.4;
        const points = (sPts + bPts + rPts).toFixed(1);

        const formattedDate = act.date 
            ? new Date(act.date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'Hôm nay';

        const levelBadge = act.level ? `<span style="background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${act.level}</span>` : '';

        html += `
            <div class="activity-card" style="background: var(--white); border-radius: 12px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: var(--text-secondary); font-weight: 500;">🕒 ${formattedDate}</span>
                    <div>
                        ${levelBadge}
                        <span style="font-weight: 700; color: var(--primary); background-color: var(--light); padding: 3px 10px; border-radius: 20px; font-size: 12px; margin-left: 6px;">
                            +${points}đ
                        </span>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; font-weight: 700; margin-bottom: 10px; font-size: 15px; color: var(--text-main);">
                    ${swimVal > 0 ? `<span>🏊‍♂️ Bơi: ${swimVal}m</span>` : ''}
                    ${bikeVal > 0 ? `<span>🚴‍♂️ Đạp: ${bikeVal}km</span>` : ''}
                    ${runVal > 0 ? `<span>🏃‍♂️ Chạy: ${runVal}km</span>` : ''}
                </div>

                <!-- Khu vực hiển thị mục tiêu, chấn thương và ghi chú -->
                <div style="font-size: 13px; color: var(--text-main); border-top: 1px solid var(--border); padding-top: 8px; line-height: 1.5;">
                    ${act.goal ? `<div style="margin-bottom: 3px;">🎯 <b>Mục tiêu:</b> ${act.goal}</div>` : ''}
                    ${act.injury && act.injury !== 'Không' ? `<div style="color: #d32f2f; margin-bottom: 3px;">⚠️ <b>Chấn thương:</b> ${act.injury}</div>` : ''}
                    ${act.note ? `<div style="font-style: italic; color: var(--text-secondary);">📝 <b>Ghi chú:</b> "${act.note}"</div>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ==========================================
// 4. ĐIỀU HƯỚNG TAB & BỘ LỌC MÔN THỂ THAO[cite: 3]
// ==========================================
function switchMainTab(tabName, event) {
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));

    if (tabName === 'progress') {
        document.getElementById('tab-progress').classList.add('active');
        document.getElementById('profile-bio-section').style.display = 'block';
    } else if (tabName === 'workouts') {
        const workoutsPane = document.getElementById('tab-workouts');
        workoutsPane.classList.add('active');
        document.getElementById('profile-bio-section').style.display = 'none';

        if (!workoutsPane.dataset.loaded) {
            fetch('wall.html')
                .then(response => {
                    if (!response.ok) throw new Error('Không thể tải file wall.html');
                    return response.text();
                })
                .then(html => {
                    workoutsPane.innerHTML = html;
                    workoutsPane.dataset.loaded = 'true';
                })
                .catch(error => {
                    console.error('Lỗi khi tải wall.html:', error);
                    workoutsPane.innerHTML = '<p style="text-align: center; padding: 20px; color: red;">Không thể tải nội dung trang thành tích.</p>';
                });
        }
    } else if (tabName === 'activities') {
        document.getElementById('tab-activities').classList.add('active');
        document.getElementById('profile-bio-section').style.display = 'none';
        if (currentUser) {
            renderUserActivities(currentUser.id);
        }
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

function filterSport(sportType, event) {
    document.querySelectorAll('.sport-filter-chips .chip').forEach(chip => chip.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    const distEl = document.getElementById('val-distance');
    const scoreEl = document.getElementById('val-time');

    if (!currentUser) {
        if (distEl) distEl.textContent = "0 km";
        if (scoreEl) scoreEl.textContent = "0 điểm";
        return;
    }

    let targetDist = 0;
    let targetScore = 0;

    const swimKm = (currentUser.swim || 0) >= 1000 ? currentUser.swim / 1000 : (currentUser.swim || 0);
    const bikeKm = currentUser.bike || 0;
    const runKm = currentUser.run || 0;

    if (sportType === 'swim') {
        targetDist = swimKm;
        targetScore = swimKm * 8; 
        if (distEl) distEl.textContent = `${targetDist.toFixed(2)} km 🏊`;
    } else if (sportType === 'bike') {
        targetDist = bikeKm;
        targetScore = bikeKm * 0.6; 
        if (distEl) distEl.textContent = `${targetDist.toFixed(2)} km 🚴`;
    } else if (sportType === 'run') {
        targetDist = runKm;
        targetScore = runKm * 1.4; 
        if (distEl) distEl.textContent = `${targetDist.toFixed(2)} km 🏃`;
    } else {
        targetDist = parseFloat(swimKm) + parseFloat(bikeKm) + parseFloat(runKm);
        targetScore = (currentUser.points && currentUser.points > 0) ? currentUser.points : ((swimKm * 8) + (bikeKm * 0.6) + (runKm * 1.4));
        if (distEl) distEl.textContent = `${isNaN(targetDist) ? 0 : targetDist.toFixed(2)} km`;
    }

    if (scoreEl) {
        scoreEl.textContent = `${Math.round(targetScore)}`;
    }
}

// ==========================================
// 5. QUẢN LÝ THEME & GIAO DIỆN SÁNG/TỐI[cite: 3]
// ==========================================
function setTheme(themeName) {
    localStorage.setItem('app_theme', themeName);
    loadThemeCss(themeName);
    
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) dropdown.classList.remove('show');
}

function loadThemeCss(themeName) {
    let themeLink = document.getElementById('dynamic-theme-css');
    
    if (!themeLink) {
        themeLink = document.createElement('link');
        themeLink.id = 'dynamic-theme-css';
        themeLink.rel = 'stylesheet';
        document.head.appendChild(themeLink);
    }

    if (themeName === 'default') {
        themeLink.href = '';
    } else {
        themeLink.href = `css/theme/${themeName}.css`;
    }
}

// ==========================================
// 6. BIỂU ĐỒ & BỘ LỌC THỜI GIAN[cite: 3]
// ==========================================
function switchChartTime(timeType, event) {
    document.querySelectorAll('.time-filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    const titleEl = document.getElementById('chart-title');
    if (timeType === 'week') {
        if (titleEl) titleEl.textContent = "Tuần này";
    } else if (timeType === 'month') {
        if (titleEl) titleEl.textContent = "Tháng này";
    } else if (titleEl === 'year') {
        if (titleEl) titleEl.textContent = "Năm nay";
    }

    updatePieChart(timeType);
}

function updatePieChart() {
    const pieChart = document.querySelector('.pie-chart');
    const legendItems = document.querySelectorAll('.pie-legend .legend-item strong');

    if (!currentUser) return;

    const swimRaw = currentUser.swim || 0;
    const bikeRaw = currentUser.bike || 0;
    const runRaw = currentUser.run || 0;

    const swimScore = swimRaw * (8 / 1000);
    const bikeScore = bikeRaw * 0.6;
    const runScore = runRaw * 1.4;

    const totalScore = swimScore + bikeScore + runScore;

    let swimPercent = 0;
    let bikePercent = 0;
    let runPercent = 0;

    if (totalScore > 0) {
        swimPercent = (swimScore / totalScore) * 100;
        bikePercent = (bikeScore / totalScore) * 100;
        runPercent = (runScore / totalScore) * 100;
    }

    const bikeEnd = swimPercent + bikePercent;
    
    let gradientStyle = '';
    if (totalScore === 0) {
        gradientStyle = '#e5e7eb 0% 100%';
    } else {
        gradientStyle = `#06b6d4 0% ${swimPercent.toFixed(1)}%, #3b82f6 ${swimPercent.toFixed(1)}% ${bikeEnd.toFixed(1)}%, #f97316 ${bikeEnd.toFixed(1)}% 100%`;
    }

    if (pieChart) {
        pieChart.style.background = `conic-gradient(${gradientStyle})`;
    }

    if (legendItems.length >= 3) {
        legendItems[0].textContent = `${Math.round(swimPercent)}%`;
        legendItems[1].textContent = `${Math.round(bikePercent)}%`;
        legendItems[2].textContent = `${Math.round(runPercent)}%`;
    }
}
