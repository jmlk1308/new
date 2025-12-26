// ==========================================
// 1. INIT & GLOBAL VARIABLES
// ==========================================
const params = new URLSearchParams(window.location.search);
const courseId = params.get('course') || 'BSIT';

// GLOBAL VARIABLES
let allSubjects = [];
let currentYearFilter = "All Years";
let showAllCards = false;
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. SECURITY CHECK (Prevent Professors from seeing Student View)
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'student-login.html';
        return;
    }
    const user = JSON.parse(userJson);
    if (user.role !== 'student') {
        if (user.role === 'professor') window.location.href = '../Teaching_Staff/professor-dashboard.html';
        else if (user.role === 'admin') window.location.href = '../Admin/admin.html';
        return;
    }

    // 2. LOAD COURSE INFO
    console.log("Fetching Course:", courseId);
    fetch(`http://localhost:8080/api/courses/${courseId}`)
        .then(r => {
            if (!r.ok) throw new Error("Course ID '" + courseId + "' not found in Database.");
            return r.json();
        })
        .then(data => {
            const titleEl = document.getElementById('dashboard-title');
            if(titleEl) titleEl.innerText = data.title;
            fetchSubjects(courseId);
        })
        .catch(e => {
            console.error("Error loading course:", e);
            const titleEl = document.getElementById('dashboard-title');
            if(titleEl) {
                titleEl.innerText = "Error: Course Not Found";
                titleEl.style.color = "red";
                titleEl.style.fontSize = "1.2rem";
            }
        });

    // 3. LOAD UI COMPONENTS
    setupGridClickListener();
    setupDropdownListeners();
    renderRecentViews();
    loadUserProfile();
});

// ==========================================
// 2. DATA FETCHING
// ==========================================
function fetchSubjects(cId) {
    fetch(`http://localhost:8080/api/courses/${cId}/subjects`)
        .then(r => r.json())
        .then(subjects => {
            console.log("Subjects Loaded:", subjects);
            allSubjects = subjects;
            applyFilter();
        })
        .catch(e => console.error("Error loading subjects:", e));
}

// ==========================================
// 3. RENDERING CARDS
// ==========================================
function renderCards(subjects) {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    if (!subjects || subjects.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; margin-top: 20px;">No subjects found for this category.</p>';
        return;
    }

    const visibleSubjects = showAllCards ? subjects : subjects.slice(0, 3);
    const hasHiddenCards = subjects.length > 3;
    const palette = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];

    let html = visibleSubjects.map((s, index) => {
        const color = palette[index % palette.length];
        return `
        <div class="card" style="border-top-color: ${color}">
            <div>
                <div class="card-code" style="color:${color}">${s.code}</div>
                <div class="card-title">${s.title}</div>
                <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 5px;">
                    ${convertYear(s.yearLevel)}
                </div>
            </div>
            <div>
                <button type="button"
                        class="btn-view"
                        style="background:${color}"
                        data-code="${s.code}">
                    View
                </button>
            </div>
        </div>`;
    }).join('');

    if (hasHiddenCards) {
        const btnText = showAllCards ? "Show Less ▲" : `View More (${subjects.length - 3} hidden) ▼`;
        html += `
        <div style="grid-column: 1 / -1; display: flex; justify-content: center; margin-top: 10px;">
            <button type="button" id="toggleViewBtn"
                    style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 20px; cursor: pointer; font-weight: 600; color: #374151;">
                ${btnText}
            </button>
        </div>`;
    }

    grid.innerHTML = html;

    const toggleBtn = document.getElementById('toggleViewBtn');
    if(toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAllCards = !showAllCards;
            applyFilter();
        });
    }
}

// ==========================================
// 4. CLICK HANDLING
// ==========================================
function setupGridClickListener() {
    const grid = document.getElementById('cardsGrid');
    if(!grid) return;

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            const code = btn.dataset.code;
            const subject = allSubjects.find(s => s.code === code);
            if (subject) goToSubject(subject);
        }
    });
}

function goToSubject(subject) {
    try {
        let recent = JSON.parse(localStorage.getItem('recentSubjects')) || [];
        recent = recent.filter(r => r.code !== subject.code);
        recent.unshift({
            title: subject.title,
            code: subject.code,
            yearLevel: subject.yearLevel
        });
        if (recent.length > 3) recent.pop();
        localStorage.setItem('recentSubjects', JSON.stringify(recent));

        window.location.href = `Roadmap.html?id=${subject.code}&title=${encodeURIComponent(subject.title)}`;
    } catch(err) { console.error("Navigation Error:", err); }
}

// ==========================================
// 5. DROPDOWN & FILTER LOGIC
// ==========================================
function setupDropdownListeners() {
    const filterBtn = document.getElementById('filterBtn');
    const filterDropdown = document.getElementById('filterDropdown');
    const filterText = document.getElementById('filterBtnText');
    const filterOptions = document.querySelectorAll('.filter-option');
    const searchInput = document.getElementById('searchInput');

    if (filterBtn && filterDropdown) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            filterDropdown.classList.toggle('show');
        });
    }

    filterOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const val = e.target.getAttribute('data-value');
            if (val) {
                currentYearFilter = val;
                if(filterText) filterText.innerText = val;
                filterDropdown.classList.remove('show');
                showAllCards = false;
                applyFilter();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (filterDropdown && filterBtn) {
            if (!filterDropdown.contains(e.target) && !filterBtn.contains(e.target)) {
                filterDropdown.classList.remove('show');
            }
        }
    });

    if(searchInput) {
        searchInput.addEventListener('keyup', () => applyFilter());
    }
}

function convertYear(num) {
    if(num == 1) return "1st Year";
    if(num == 2) return "2nd Year";
    if(num == 3) return "3rd Year";
    if(num == 4) return "4th Year";
    return num + " Year";
}

function applyFilter() {
    if (!Array.isArray(allSubjects)) return;
    let filtered = [...allSubjects];

    if (currentYearFilter !== "All Years") {
        const yearMap = { "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4 };
        const targetYear = yearMap[currentYearFilter];
        if (targetYear) filtered = filtered.filter(s => s.yearLevel === targetYear);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim() !== "") {
        const term = searchInput.value.toLowerCase().trim();
        filtered = filtered.filter(s =>
            s.title.toLowerCase().includes(term) ||
            s.code.toLowerCase().includes(term)
        );
    }
    renderCards(filtered);
}

// ==========================================
// 6. PROFILE & RECENT VIEWS
// ==========================================
function renderRecentViews() {
    const recentListEl = document.querySelector('.recent-list');
    if (!recentListEl) return;
    const recent = JSON.parse(localStorage.getItem('recentSubjects')) || [];
    if (recent.length === 0) {
        recentListEl.innerHTML = '<div style="color:#9ca3af; padding:10px;">No recently viewed subjects.</div>';
        return;
    }
    recentListEl.innerHTML = recent.map(s => `
        <div class="recent-item"
             onclick="window.location.href='Roadmap.html?id=${s.code}&title=${encodeURIComponent(s.title)}'">
            <div class="recent-title">${s.code}</div>
            <div class="recent-year">${s.title}</div>
        </div>
    `).join('');
}

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('user'));

    // NOTE: Security check is already done at top of file
    if (!user) return;

    // Update Name
    if (document.getElementById('nav-profile-name')) {
        document.getElementById('nav-profile-name').innerText = user.username;
    }

    // Update Image
    if (user.profileImage) {
        const imgUrl = `http://localhost:8080/uploads/${user.profileImage}`;
        const navImg = document.getElementById('nav-profile-img');
        const navPlaceholder = document.getElementById('nav-profile-placeholder');

        if (navImg) {
            navImg.src = imgUrl;
            navImg.style.display = 'block';
            if(navPlaceholder) navPlaceholder.style.display = 'none';
        }
    }
}

// ==========================================
// 7. GLOBAL MODAL FUNCTIONS
// ==========================================
window.openProfileModal = function() {
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('profileModal').style.display = 'flex';
    if(user) document.getElementById('profile-username').value = user.username;
};

// Handle File Selection
window.handleImagePreview = function(input) {
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const modalImg = document.getElementById('modal-profile-img');
            const placeholder = document.getElementById('modal-profile-placeholder');
            if(modalImg) { modalImg.src = e.target.result; modalImg.style.display = 'block'; }
            if(placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.saveProfileChanges = async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        alert("Error: User not found. Please login again.");
        return;
    }

    const newUsername = document.getElementById('profile-username').value;
    const newPassword = document.getElementById('profile-password').value;
    const saveBtn = document.querySelector('#profileModal button[onclick="window.saveProfileChanges()"]');

    if(saveBtn) {
        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;
    }

    try {
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const res = await fetch(`http://localhost:8080/api/auth/users/${user.id}/photo`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                user.profileImage = data.image;
            }
        }

        const updateData = {};
        if (newUsername && newUsername !== user.username) updateData.username = newUsername;
        if (newPassword) updateData.password = newPassword;

        if (Object.keys(updateData).length > 0) {
            const res = await fetch(`http://localhost:8080/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            if (!res.ok) throw new Error("Failed to update profile details.");
            const updatedUser = await res.json();
            user.username = updatedUser.username;
        }

        localStorage.setItem('user', JSON.stringify(user));
        loadUserProfile();
        document.getElementById('profileModal').style.display = 'none';
        alert("Profile saved successfully!");
        selectedFile = null;
        document.getElementById('profile-password').value = "";

    } catch (error) {
        console.error("Save Error:", error);
        alert("Save Failed: " + error.message);
    } finally {
        if(saveBtn) {
            saveBtn.innerText = "Save";
            saveBtn.disabled = false;
        }
    }
};