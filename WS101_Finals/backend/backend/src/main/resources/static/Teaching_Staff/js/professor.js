const API_URL = "http://localhost:8080/api/professor";
const USER_KEY = 'user';
let selectedFile = null; // Store selected image file

document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    if (!user || user.role !== 'professor') {
        alert("Access Denied. Please Login.");
        window.location.href = '../Student/student-login.html';
        return;
    }

    // ✅ 1. Load Profile Info (Name & Image)
    loadUserProfile(user);

    // Existing Dashboard Logic
    if (document.getElementById('totalStudents')) loadDashboardStats(user.courseId);
    if (document.getElementById('quizTable')) loadQuizzes();
    if (document.getElementById('lessonTable')) loadLessons();

    initializeDropdowns(user.courseId);
    setupEventListeners(user);
    setupModuleToggle();
});

// ✅ 2. NEW: Load User Profile into Sidebar
function loadUserProfile(user) {
    // Set Name
    const nameEl = document.getElementById('sidebar-profile-name');
    if (nameEl) nameEl.innerText = `Prof. ${user.username}`;

    // Set Image if exists
    if (user.profileImage) {
        updateSidebarImage(`http://localhost:8080/uploads/${user.profileImage}`);
    }
}

// ✅ 3. NEW: Update Image UI Helper
function updateSidebarImage(src) {
    const img = document.getElementById('sidebar-profile-img');
    const placeholder = document.getElementById('sidebar-profile-placeholder');
    if (img && placeholder) {
        img.src = src;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    }
}

// ✅ 4. NEW: Modal Logic - Open
function openProfileModal() {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    if (user) {
        document.getElementById('profile-username').value = user.username;

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

// ✅ 5. NEW: Modal Logic - Preview Image
function handleImagePreview(input) {
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const modalImg = document.getElementById('modal-profile-img');
            const placeholder = document.getElementById('modal-profile-placeholder');
            modalImg.src = e.target.result;
            modalImg.style.display = 'block';
            placeholder.style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// ✅ 6. NEW: Save Changes (Username, Password, Photo)
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
                if(newPassword) user.password = newPassword;

                // Update UI
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

    // Save & Close
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    document.getElementById('profileModal').style.display = 'none';
    selectedFile = null;
    document.getElementById('profile-password').value = "";
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem(USER_KEY);
        sessionStorage.clear();
        window.location.href = '../Student/student-login.html';
    }
}

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

//

async function loadLessons() {
    const tableBody = document.querySelector('#lessonTable tbody');
    if (!tableBody) return;

    // Get user from storage to access their courseId
    const user = JSON.parse(localStorage.getItem(USER_KEY));

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    try {
        // ✅ FIX: Pass the courseId in the URL
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
                    <td>${l.type.toUpperCase()}</td>
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
            const uploadSubjectSelect = document.getElementById('subjectSelect');
            if (uploadSubjectSelect) {
                uploadSubjectSelect.addEventListener('change', loadModulesForSubject);
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
                toggleBtn.innerHTML = '<i class="fa-solid fa-times"></i> Cancel';
                toggleBtn.style.background = '#dc2626';
                moduleSelect.disabled = true;
                moduleSelect.value = "";
            } else {
                toggleBtn.innerHTML = '<i class="fa-solid fa-plus"></i> New';
                toggleBtn.style.background = '#2563EB';
                moduleSelect.disabled = false;
            }
        });
    }
}

function setupEventListeners(user) {
    // A. Create Quiz Form
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

    // ✅ B. UPLOAD FORM (Matches the ID in HTML)
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('fileInput');
            const subjectSelect = document.getElementById('subjectSelect');
            const moduleSelect = document.getElementById('moduleSelect');

            let finalModuleId = moduleSelect.value;
            const isNewModule = document.getElementById('newModuleFields').style.display === 'block';

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