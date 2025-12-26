// ==========================================
// 1. INIT & GLOBAL VARIABLES
// ==========================================
const params = new URLSearchParams(window.location.search);
const courseId = params.get('course') || 'it';
let allSubjects = [];
let currentYearFilter = "All Years";
let showAllCards = false; // ✅ NEW: Tracks if we should show all cards or just 3

document.addEventListener("DOMContentLoaded", () => {
    // A. Load Course Info
    fetch(`http://localhost:8080/api/courses/${courseId}`)
        .then(r => r.json())
        .then(data => {
            const titleEl = document.getElementById('dashboard-title');
            if(titleEl) titleEl.innerText = data.title;
            fetchSubjects(courseId);
        })
        .catch(e => console.error("Error loading course:", e));

    // B. Load Recent Views (Syncs automatically from LocalStorage)
    renderRecentViews();
});

// ==========================================
// 2. DATA FETCHING
// ==========================================
function fetchSubjects(cId) {
    fetch(`http://localhost:8080/api/courses/${cId}/subjects`)
        .then(r => r.json())
        .then(subjects => {
            allSubjects = subjects;
            applyFilter();
        })
        .catch(e => console.error(e));
}

// ==========================================
// 3. RENDERING CARDS (With "Show More" Logic)
// ==========================================
function renderCards(subjects) {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    if (subjects.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No subjects found for this category.</p>';
        return;
    }

    // ✅ LOGIC: Determine which subjects to show
    // If showAllCards is true, show everything. If false, show only the first 3.
    const visibleSubjects = showAllCards ? subjects : subjects.slice(0, 3);
    const hasHiddenCards = subjects.length > 3;

    const palette = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];

    // 1. Generate HTML for the visible cards
    let html = visibleSubjects.map((s, index) => {
        const color = palette[index % palette.length];
        const subjectData = encodeURIComponent(JSON.stringify(s));

        return `
        <div class="card" style="border-top-color: ${color}">
            <div>
                <div class="card-code" style="color:${color}">${s.code}</div>
                <div class="card-title">${s.title}</div>
                <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 5px;">
                    ${s.yearLevel ? convertYear(s.yearLevel) : 'Year N/A'}
                </div>
            </div>
            <div>
                <button class="btn-view"
                        style="background:${color}"
                        onclick="handleSubjectClick('${subjectData}')">
                    View
                </button>
            </div>
        </div>`;
    }).join('');

    // 2. Add "View More" / "View Less" Button if needed
    if (hasHiddenCards) {
        const btnText = showAllCards ? "Show Less ▲" : `View More (${subjects.length - 3} hidden) ▼`;

        // We append a special div that spans all columns to hold the button
        html += `
        <div style="grid-column: 1 / -1; display: flex; justify-content: center; margin-top: 10px;">
            <button onclick="toggleShowAll()"
                    style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 20px; cursor: pointer; font-weight: 600; color: #374151; transition: background 0.2s;">
                ${btnText}
            </button>
        </div>
        `;
    }

    grid.innerHTML = html;
}

// ✅ NEW: Toggles the view mode
function toggleShowAll() {
    showAllCards = !showAllCards;
    applyFilter(); // Re-render with new state
}

function convertYear(num) {
    if(num == 1) return "1st Year";
    if(num == 2) return "2nd Year";
    if(num == 3) return "3rd Year";
    if(num == 4) return "4th Year";
    return num + " Year";
}

// ==========================================
// 4. FILTERING LOGIC
// ==========================================
function applyFilter() {
    let filtered = allSubjects;

    // Filter by Year
    if (currentYearFilter !== "All Years") {
        const yearMap = { "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4 };
        const targetYear = yearMap[currentYearFilter];
        if (targetYear) filtered = filtered.filter(s => s.yearLevel === targetYear);
    }

    // Filter by Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
        const term = searchInput.value.toLowerCase();
        filtered = filtered.filter(s =>
            s.title.toLowerCase().includes(term) ||
            s.code.toLowerCase().includes(term)
        );
    }

    // Note: We do NOT reset 'showAllCards' here so the user stays expanded if they are searching
    // But if you want to collapse every time they filter, uncomment the next line:
    // showAllCards = false;

    renderCards(filtered);
}

// ==========================================
// 5. DROPDOWN & SEARCH UI
// ==========================================
const filterBtn = document.getElementById('filterBtn');
const filterDropdown = document.getElementById('filterDropdown');
const filterText = document.getElementById('filterBtnText');
const filterOptions = document.querySelectorAll('.filter-option');

if (filterBtn && filterDropdown) {
    filterBtn.onclick = (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('show');
    };
}

filterOptions.forEach(opt => {
    opt.onclick = (e) => {
        const val = e.target.getAttribute('data-value');
        currentYearFilter = val;
        if(filterText) filterText.innerText = val;
        filterDropdown.classList.remove('show');

        showAllCards = false; // Optional: Collapse list when changing year filter
        applyFilter();
    };
});

window.onclick = (e) => {
    if (filterDropdown && !filterBtn.contains(e.target)) filterDropdown.classList.remove('show');
};

const searchInput = document.getElementById('searchInput');
if(searchInput) searchInput.onkeyup = () => applyFilter();

// ==========================================
// 6. RECENT VIEW SYNC LOGIC
// ==========================================
function handleSubjectClick(encodedSubject) {
    const subject = JSON.parse(decodeURIComponent(encodedSubject));

    // 1. Get existing
    let recent = JSON.parse(localStorage.getItem('recentSubjects')) || [];

    // 2. Remove duplicate if exists
    recent = recent.filter(r => r.code !== subject.code);

    // 3. Add to top
    recent.unshift({
        title: subject.title,
        code: subject.code,
        yearLevel: subject.yearLevel
    });

    // 4. Limit to 3 items in history
    if (recent.length > 3) recent.pop();

    // 5. Save
    localStorage.setItem('recentSubjects', JSON.stringify(recent));

    // 6. Redirect
    window.location.href = `Roadmap.html?id=${subject.code}&title=${encodeURIComponent(subject.title)}`;
}

function renderRecentViews() {
    const recentListEl = document.querySelector('.recent-list');
    if (!recentListEl) return;

    const recent = JSON.parse(localStorage.getItem('recentSubjects')) || [];

    if (recent.length === 0) {
        recentListEl.innerHTML = '<div style="color:#9ca3af; padding:10px;">No recently viewed subjects.</div>';
        return;
    }

    // ✅ SYNC: This reads from the same LocalStorage we write to above
    recentListEl.innerHTML = recent.map(s => `
        <div class="recent-item" onclick="window.location.href='Roadmap.html?id=${s.code}&title=${encodeURIComponent(s.title)}'" style="cursor:pointer;">
            <span class="recent-title">${s.code}: ${s.title}</span>
            <span class="recent-year">${convertYear(s.yearLevel)}</span>
        </div>
    `).join('');
}

//

// 1. SYNC NAME ON LOAD
//

// 1. UPDATE: Load User & Image on Page Load
document.addEventListener("DOMContentLoaded", () => {
    // ... existing course fetch code ...

    // ✅ Load User Info
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        if (document.getElementById('nav-profile-name')) {
            document.getElementById('nav-profile-name').innerText = user.username;
        }
        // Check if user has an image
        if (user.profileImage) {
            updateProfileImages(`http://localhost:8080/uploads/${user.profileImage}`);
        }
    }
});

// 2. HELPER: Update Images in Navbar and Modal
function updateProfileImages(src) {
    const navImg = document.getElementById('nav-profile-img');
    const navSvg = document.getElementById('nav-profile-svg');

    if (navImg && navSvg) {
        navImg.src = src;
        navImg.style.display = 'block';
        navSvg.style.display = 'none';
    }
}

// 3. LOGIC: Handle File Selection (Preview)
let selectedFile = null;
function handleImagePreview(input) {
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            // Show preview in modal
            const modalImg = document.getElementById('modal-profile-img');
            const placeholder = document.getElementById('modal-profile-placeholder');
            if(modalImg && placeholder) {
                modalImg.src = e.target.result;
                modalImg.style.display = 'block';
                placeholder.style.display = 'none';
            }
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// 4. LOGIC: Open Modal
function openProfileModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('profile-username').value = user.username;

        // Show current image if exists
        const modalImg = document.getElementById('modal-profile-img');
        const placeholder = document.getElementById('modal-profile-placeholder');

        if (user.profileImage) {
            modalImg.src = `http://localhost:8080/uploads/${user.profileImage}`;
            modalImg.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            modalImg.style.display = 'none';
            placeholder.style.display = 'flex';
        }
    }
    document.getElementById('profileModal').style.display = 'flex';
}

// 5. LOGIC: Save Changes (Password + Image)
//
// ... inside dashboard.js ...

async function saveProfileChanges() {
    const user = JSON.parse(localStorage.getItem('user'));

    const newUsername = document.getElementById('profile-username').value;
    const newPassword = document.getElementById('profile-password').value;

    // 1. Upload Image first (if selected)
    if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await fetch(`http://localhost:8080/api/auth/users/${user.id}/photo`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                user.profileImage = data.image;
                updateProfileImages(`http://localhost:8080/uploads/${data.image}`);
            }
        } catch (err) { console.error(err); }
    }

    // 2. Prepare Data for Username/Password Update
    const updateData = {};
    if (newPassword) updateData.password = newPassword;
    if (newUsername && newUsername !== user.username) updateData.username = newUsername;

    // Only send request if there is data to update
    if (Object.keys(updateData).length > 0) {
        try {
            const res = await fetch(`http://localhost:8080/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (res.ok) {
                const updatedUser = await res.json(); // Get updated user from backend

                // Update LocalStorage
                user.username = updatedUser.username;
                if(newPassword) user.password = newPassword; // (Optional: keep strictly synced)

                // Update UI immediately
                if (document.getElementById('nav-profile-name')) {
                    document.getElementById('nav-profile-name').innerText = user.username;
                }

                alert("Profile updated successfully!");
            } else {
                const msg = await res.text();
                alert("Update failed: " + msg);
                return; // Stop here if failed
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to server.");
            return;
        }
    } else if (selectedFile) {
        alert("Profile picture updated!");
    }

    // Final Save to LocalStorage & Close
    localStorage.setItem('user', JSON.stringify(user));
    document.getElementById('profileModal').style.display = 'none';
    selectedFile = null;
    document.getElementById('profile-password').value = ""; // Clear password field
}