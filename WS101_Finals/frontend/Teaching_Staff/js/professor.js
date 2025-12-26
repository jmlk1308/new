const API_URL = "http://localhost:8080/api/professor";
const USER_KEY = 'user';
let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. SECURITY GUARD
    const userJson = localStorage.getItem(USER_KEY);

    // If no user is logged in
    if (!userJson) {
        alert("Session expired. Please login.");
        window.location.href = '../Student/student-login.html';
        return;
    }

    const user = JSON.parse(userJson);

    // Case-Insensitive Check
    if (user.role.toLowerCase() !== 'professor') {
        alert("Access Denied: You are not a Professor.");
        window.location.href = '../Student/student-login.html';
        return;
    }

    // 2. Load Initial Data
    loadUserProfile(user);

    // Load Dashboard Stats
    if (document.getElementById('totalStudents')) loadDashboardStats(user.courseId);

    // Load Tables
    if (document.getElementById('quizTable')) loadQuizzes();
    if (document.getElementById('lessonTable')) loadLessons();

    // Initialize Dropdowns
    initializeDropdowns(user.courseId);

    // Setup Listeners
    setupEventListeners(user);
    setupModuleToggle();
});

// ==========================================
// EXISTING PROFILE FUNCTIONS
// ==========================================
function loadUserProfile(user) {
    const nameEl = document.getElementById('sidebar-profile-name');
    if (nameEl) nameEl.innerText = `Prof. ${user.username}`;
    if (user.profileImage) {
        updateSidebarImage(`http://localhost:8080/uploads/${user.profileImage}`);
    }
}

function updateSidebarImage(src) {
    const img = document.getElementById('sidebar-profile-img');
    const placeholder = document.getElementById('sidebar-profile-placeholder');
    if (img && placeholder) {
        img.src = src;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    }
}

function openProfileModal() {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    if (user) {
        document.getElementById('profile-username').value = user.username;
        const modalImg = document.getElementById('modal-profile-img');
        const placeholder = document.getElementById('modal-profile-placeholder');

        if (modalImg && user.profileImage) {
            modalImg.src = `http://localhost:8080/uploads/${user.profileImage}`;
            modalImg.style.display = 'block';
            if(placeholder) placeholder.style.display = 'none';
        }
    }
    document.getElementById('profileModal').style.display = 'flex';
}

function handleImagePreview(input) {
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const modalImg = document.getElementById('modal-profile-img');
            const placeholder = document.getElementById('modal-profile-placeholder');
            if(modalImg) {
                modalImg.src = e.target.result;
                modalImg.style.display = 'block';
            }
            if(placeholder) placeholder.style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveProfileChanges() {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    const newUsername = document.getElementById('profile-username').value;
    const newPassword = document.getElementById('profile-password').value;

    // A. Upload Image
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
                updateSidebarImage(`http://localhost:8080/uploads/${data.image}`);
            }
        } catch (err) { console.error(err); }
    }

    // B. Update Text Data
    const updateData = {};
    if (newPassword) updateData.password = newPassword;
    if (newUsername && newUsername !== user.username) updateData.username = newUsername;

    if (Object.keys(updateData).length > 0) {
        try {
            const res = await fetch(`http://localhost:8080/api/auth/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (res.ok) {
                const updatedUser = await res.json();
                user.username = updatedUser.username;
                loadUserProfile(user);
                alert("Profile updated successfully!");
            } else {
                alert("Update failed: " + await res.text());
                return;
            }
        } catch (err) {
            console.error(err);
            alert("Server Error");
            return;
        }
    } else if (selectedFile) {
        alert("Profile picture updated!");
    }

    localStorage.setItem(USER_KEY, JSON.stringify(user));
    document.getElementById('profileModal').style.display = 'none';
    selectedFile = null;
    if(document.getElementById('profile-password')) document.getElementById('profile-password').value = "";
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem(USER_KEY);
        sessionStorage.clear();
        window.location.href = '../Student/student-login.html';
    }
}

// ==========================================
// EXISTING DASHBOARD & TABLE FUNCTIONS
// ==========================================
async function loadDashboardStats(courseId) {
    try {
        const res = await fetch(`${API_URL}/stats?courseId=${courseId || ''}`);
        const stats = await res.json();
        if (document.getElementById('totalStudents')) document.getElementById('totalStudents').innerText = stats.students || 0;
        if (document.getElementById('activeSubjects')) document.getElementById('activeSubjects').innerText = stats.subjects || 0;
        if (document.getElementById('totalLessons')) document.getElementById('totalLessons').innerText = stats.lessons || 0;
    } catch (err) { console.error("Stats Error:", err); }
}

async function loadQuizzes() {
    const tableBody = document.querySelector('#quizTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_URL}/quizzes`);
        const quizzes = await res.json();
        tableBody.innerHTML = '';
        if (quizzes.length === 0) { tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No quizzes found.</td></tr>'; return; }
        quizzes.forEach(q => {
            tableBody.innerHTML += `
                <tr>
                    <td>${q.title}</td><td>${q.subjectCode}</td><td>${q.dateCreated || '-'}</td>
                    <td class="action-icons"><i class="fa-solid fa-trash" style="color:red; cursor:pointer;" onclick="deleteQuiz(${q.id})"></i></td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
}

async function deleteQuiz(id) {
    if (!confirm("Delete this quiz?")) return;
    try {
        const res = await fetch(`${API_URL}/quizzes/${id}`, { method: 'DELETE' });
        if (res.ok) { alert("Quiz Deleted"); loadQuizzes(); }
    } catch (err) { alert("Error deleting quiz"); }
}

async function loadLessons() {
    const tableBody = document.querySelector('#lessonTable tbody');
    if (!tableBody) return;
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/materials?courseId=${user.courseId}`);
        const lessons = await res.json();
        tableBody.innerHTML = '';
        if (lessons.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No lessons found.</td></tr>';
            return;
        }

        lessons.forEach(l => {
            tableBody.innerHTML += `
                <tr>
                    <td>${l.title}</td>
                    <td>${l.subjectCode}</td>
                    <td>${l.type ? l.type.toUpperCase() : 'FILE'}</td>
                    <td>Module ${l.moduleId || '-'}</td>
                    <td class="action-icons">
                        <i class="fa-solid fa-trash" style="color:red; cursor:pointer;" onclick="deleteLesson(${l.id})"></i>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
}

async function deleteLesson(id) {
    if (!confirm("Delete this lesson?")) return;
    try {
        const res = await fetch(`${API_URL}/materials/${id}`, { method: 'DELETE' });
        if (res.ok) { alert("Lesson Deleted"); loadLessons(); }
    } catch (err) { alert("Error deleting lesson"); }
}

// ==========================================
// DROPDOWNS & FORM LOGIC
// ==========================================
async function initializeDropdowns(courseId) {
    const courseSelect = document.getElementById('courseSelect');
    if (courseSelect) {
        if (courseId) {
            courseSelect.innerHTML = `<option value="${courseId}">${courseId}</option>`;
            courseSelect.disabled = true;
        } else {
            courseSelect.innerHTML = `<option value="">No Course Assigned</option>`;
        }
    }

    // Load subjects for multiple pages
    const subjectSelects = document.querySelectorAll('#subjectSelect, #quiz-subject, #subject-code');
    if (subjectSelects.length > 0 && courseId) {
        try {
            const res = await fetch(`${API_URL}/subjects?courseId=${courseId}`);
            const subjects = await res.json();
            subjectSelects.forEach(select => {
                select.innerHTML = '<option value="">Select Subject</option>';
                subjects.forEach(sub => {
                    const opt = document.createElement('option');
                    opt.value = sub.code;
                    opt.innerText = `${sub.code} - ${sub.title}`;
                    select.appendChild(opt);
                });
            });
            // Attach listener specifically for the Upload page
            const uploadSelect = document.getElementById('subjectSelect');
            if (uploadSelect) {
                uploadSelect.addEventListener('change', loadModulesForSubject);
            }
        } catch (err) { console.error(err); }
    }
}

async function loadModulesForSubject() {
    const subjectCode = this.value;
    const moduleSelect = document.getElementById('moduleSelect');
    if (!moduleSelect || !subjectCode) return;
    moduleSelect.innerHTML = '<option value="">Loading...</option>';
    try {
        const res = await fetch(`http://localhost:8080/api/admin/modules?subjectCode=${subjectCode}`);
        const modules = await res.json();
        moduleSelect.innerHTML = '<option value="">Select Existing Module</option>';
        modules.forEach(mod => {
            const opt = document.createElement('option');
            opt.value = mod.id;
            opt.innerText = `Module ${mod.moduleNumber}: ${mod.title}`;
            moduleSelect.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

function setupModuleToggle() {
    const toggleBtn = document.getElementById('toggleModuleBtn');
    const newModuleFields = document.getElementById('newModuleFields');
    const moduleSelect = document.getElementById('moduleSelect');
    if (toggleBtn && newModuleFields) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = newModuleFields.style.display === 'none';
            newModuleFields.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                toggleBtn.innerHTML = '<i class="fa-solid fa-plus"></i> New';
                moduleSelect.disabled = true;
                moduleSelect.value = "";
                // Reset styling to primary
                toggleBtn.classList.remove('btn-danger');
                toggleBtn.classList.add('btn-primary');
            } else {
                toggleBtn.innerHTML = '<i class="fa-solid fa-times"></i> Cancel';
                // Change style to indicate cancel
                toggleBtn.style.background = '#dc2626';
                toggleBtn.style.color = 'white';
                moduleSelect.disabled = false;
            }
        });
    }
}

function setupEventListeners(user) {
    // 1. Create Quiz Form
    const quizForm = document.getElementById('createQuizForm');
    if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const moduleSelect = document.getElementById('moduleSelect');
            const data = {
                subjectCode: document.getElementById('subjectSelect').value,
                moduleId: moduleSelect ? moduleSelect.value : null,
                title: document.getElementById('quizTitle').value,
                link: document.getElementById('quizLink').value
            };
            try {
                const res = await fetch(`${API_URL}/quizzes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) { alert("Quiz Created!"); window.location.href = "quizzes.html"; }
                else alert("Error creating quiz");
            } catch (err) { console.error(err); }
        });
    }

    // 2. Upload Lesson Form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('fileInput');
            const subjectSelect = document.getElementById('subjectSelect');
            const moduleSelect = document.getElementById('moduleSelect');

            let finalModuleId = moduleSelect.value;
            const isNewModule = document.getElementById('newModuleFields') && document.getElementById('newModuleFields').style.display === 'block';

            if (isNewModule) {
                const newModNum = document.getElementById('newModNum').value;
                const newModTitle = document.getElementById('newModTitle').value;
                try {
                    const modRes = await fetch(`${API_URL}/modules`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            subjectCode: subjectSelect.value,
                            moduleNumber: newModNum,
                            title: newModTitle,
                            description: "Created via Upload",
                            status: "active"
                        })
                    });
                    if (!modRes.ok) throw new Error("Failed module creation");
                    const newMod = await modRes.json();
                    finalModuleId = newMod.id;
                } catch (err) { return alert("Error: " + err.message); }
            }

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('title', document.getElementById('lessonTitle').value);
            formData.append('subjectCode', subjectSelect.value);
            if (finalModuleId) formData.append('moduleId', finalModuleId);

            try {
                const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
                if (res.ok) {
                    alert("Lesson Uploaded!");
                    window.location.href = "view-lesson.html";
                } else alert("Upload failed: " + await res.text());
            } catch (err) { console.error(err); alert("Server Error"); }
        });
    }
}

// ==========================================
// ✅ NEW: MODULE MANAGER LOGIC (ADDED)
// ==========================================
window.openModuleModalFromUpload = function() {
    const subjectSelect = document.getElementById('subjectSelect');
    if (!subjectSelect || !subjectSelect.value) {
        alert("Please select a subject first.");
        return;
    }
    openModuleManager(subjectSelect.value);
};

window.closeModuleModal = function() {
    document.getElementById('moduleModal').style.display = 'none';

    // Trigger change event to refresh the dropdown with updated list
    const subjectSelect = document.getElementById('subjectSelect');
    if(subjectSelect) subjectSelect.dispatchEvent(new Event('change'));
};

window.openModuleManager = async function(subjectCode) {
    const modal = document.getElementById('moduleModal');
    const listBody = document.getElementById('moduleListBody');
    const titleEl = document.getElementById('modalSubjectTitle');

    if(!modal || !listBody) return;

    modal.style.display = 'flex';
    if(titleEl) titleEl.innerText = `Subject: ${subjectCode}`;
    listBody.innerHTML = '<tr><td style="padding:15px; text-align:center;">Loading...</td></tr>';

    try {
        const res = await fetch(`http://localhost:8080/api/admin/modules?subjectCode=${subjectCode}`);
        const modules = await res.json();

        listBody.innerHTML = '';

        if (modules.length === 0) {
            listBody.innerHTML = '<tr><td style="padding:15px; text-align:center;">No modules found.</td></tr>';
            return;
        }

        modules.forEach(mod => {
            const row = `
            <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px; font-weight: 500;">Module ${mod.moduleNumber}: ${mod.title}</td>
                <td style="padding: 12px; text-align: right;">
                    <button onclick="deleteModule(${mod.id}, '${subjectCode}')"
                            style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                        Delete
                    </button>
                </td>
            </tr>`;
            listBody.innerHTML += row;
        });

    } catch (e) {
        console.error(e);
        listBody.innerHTML = '<tr><td style="color:red; padding:15px;">Error loading data.</td></tr>';
    }
};

window.deleteModule = async function(moduleId, subjectCode) {
    if(!confirm("Delete this module? It will be removed from the student roadmap.")) return;

    try {
        const res = await fetch(`${API_URL}/modules/${moduleId}`, { method: 'DELETE' });

        if (res.ok) {
            // Refresh list
            openModuleManager(subjectCode);
        } else {
            alert("Failed to delete module.");
        }
    } catch (e) {
        console.error(e);
        alert("Server Error");
    }
};