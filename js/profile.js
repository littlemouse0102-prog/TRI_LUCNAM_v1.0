// profile.js - Xử lý chuyển đổi Tab, đồng bộ Theme, Biểu đồ và nạp dữ liệu từ Google Sheets[cite: 3]

let clubMembers = [];
let currentUser = null;

// ==========================================
// 1. KHỞI TẠO KHI TẢI TRANG (DOM LOADED)
// ==========================================
document.addEventListener("DOMContentLoaded", async function() {
    // Tự động nạp theme đã lưu cho trang profile[cite: 3, 7, 8]
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) {
        loadThemeCss(savedTheme);
    }

    // Xử lý bật/tắt menu chấm màu sổ xuống[cite: 6, 7]
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
});

// ==========================================
// 2. TÍCH HỢP GOOGLE SHEETS & ĐỒNG BỘ DỮ LIỆU BƠI - ĐẠP - CHẠY[cite: 3]
// ==========================================
async function fetchClubMembersData(currentUserId) {
    try {
        const response = await callSystemAPI("getDashboard", { userId: currentUserId });
        
        if (response && response.success && response.rankings) {
            let rankingsTarget = response.rankings;
            if (rankingsTarget.data) {
                rankingsTarget = rankingsTarget.data;
            }

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
        } else {
            clubMembers = [
                { id: currentUser.id, name: currentUser.name, location: currentUser.location || "Lục Nam", swim: 0, bike: 0, run: 0, points: 0 }
            ];
        }

        renderMembersCarousel(clubMembers);

        const activeUser = clubMembers.find(m => String(m.id).toLowerCase() === String(currentUserId).toLowerCase()) || clubMembers[0];
        currentUser = activeUser;

        renderBasicProfile(currentUser);
        renderUserSportMetrics(currentUser);
        updatePieChart();

    } catch (error) {
        console.error("Lỗi tải danh sách thành viên từ Sheets:", error);
        clubMembers = [currentUser];
        
        renderMembersCarousel(clubMembers);
        renderBasicProfile(currentUser);
        renderUserSportMetrics(currentUser);
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
        scoreEl.textContent = `${isNaN(calculatedScore) ? 0 : Math.round(calculatedScore)} `;
    }

    updatePieChart();
}

// ==========================================
// 3. ĐIỀU HƯỚNG TAB & BỘ LỌC MÔN THỂ THAO[cite: 3]
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
        scoreEl.textContent = `${Math.round(targetScore)} `;
    }
}

// ==========================================
// 4. QUẢN LÝ THEME & GIAO DIỆN SÁNG/TỐI[cite: 3, 7, 8]
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
// 5. BIỂU ĐỒ & BỘ LỌC THỜI GIAN[cite: 3]
// ==========================================
function switchChartTime(timeType, event) {
    document.querySelectorAll('.time-filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    const titleEl = document.getElementById('chart-title');
    const xLabelsEl = document.getElementById('chart-x-labels');
    const yLabelsEl = document.getElementById('chart-y-max');
    const pathSvg = document.getElementById('chart-path-svg');

    if (yLabelsEl) {
        yLabelsEl.innerHTML = `<span>0 km</span><span>0 km</span><span>0 km</span>`;
    }

    if (pathSvg) {
        pathSvg.setAttribute('d', 'M 0,90 L 50,90 L 100,90 L 150,90 L 200,90 L 250,90 L 300,90');
    }

    if (timeType === 'week') {
        if (titleEl) titleEl.textContent = "Tuần này";
        if (xLabelsEl) xLabelsEl.innerHTML = `<span>T2</span><span>T4</span><span>T6</span><span class="peak-label">CN (0 km)</span>`;
    } 
    else if (timeType === 'month') {
        if (titleEl) titleEl.textContent = "Tháng này";
        if (xLabelsEl) xLabelsEl.innerHTML = `<span>TUẦN 1</span><span>TUẦN 2</span><span>TUẦN 3</span><span class="peak-label">TUẦN 4 (0 km)</span>`;
    } 
    else if (timeType === 'year') {
        if (titleEl) titleEl.textContent = "Năm nay";
        if (xLabelsEl) xLabelsEl.innerHTML = `<span>Q1</span><span>Q2</span><span>Q3</span><span class="peak-label">Q4 (0 km)</span>`;
    }

    updatePieChart(timeType);
}

function updatePieChart(timeType) {
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

// ==========================================
// 6. HÀM TÍNH ĐIỂM IM TỪ HOẠT ĐỘNG (ĐỘC LẬP)[cite: 3]
// ==========================================
function calculateIMScore(activitiesData) {
    let totalSwimKm = 0;
    let totalBikeKm = 0;
    let totalRunKm = 0;
    let totalDirectPoints = 0;
    let useDirectPoints = false;

    activitiesData.forEach(activity => {
        const distance = parseFloat(activity.distance) || 0;
        const point = parseFloat(activity.point) || 0;
        const type = activity.type ? activity.type.toLowerCase() : '';

        if (point > 0 && !activity.distance) {
            totalDirectPoints += point;
            useDirectPoints = true;
        }

        if (type.includes('swim') || type.includes('bơi')) {
            totalSwimKm += distance;
        } else if (type.includes('bike') || type.includes('đạp')) {
            totalBikeKm += distance;
        } else if (type.includes('run') || type.includes('chạy')) {
            totalRunKm += distance;
        }
    });

    if (useDirectPoints) {
        return Math.round(totalDirectPoints);
    }

    const calculatedScore = (totalSwimKm * 8) + (totalBikeKm * 0.6) + (totalRunKm * 1.4);
    return Math.round(calculatedScore);
}

function updateIMScoreUI(sheetData) {
    const finalScore = calculateIMScore(sheetData);
    
    const scoreElement = document.getElementById('im-score-value');
    if (scoreElement) {
        scoreElement.innerText = Math.round(finalScore);
    }
}