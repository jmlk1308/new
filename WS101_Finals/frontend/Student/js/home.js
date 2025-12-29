//

// ==========================================
// 1. CONFIGURATION
// ==========================================
let courses = [];
let currentIndex = 0;
let autoPlayInterval;

const bgContainer = document.getElementById('bg-container');
const cardTrack = document.getElementById('card-track');
const textContent = document.getElementById('text-content');

// Your Backend URLs
const IMG_BASE_URL = "https://new-ed9m.onrender.com/uploads/";
const API_URL = "https://new-ed9m.onrender.com/api/admin/courses";

// ==========================================
// 2. DATA FETCHING
// ==========================================
async function fetchCourses() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch courses");

        const dbCourses = await response.json();

        // Process Data
        courses = dbCourses.map(c => {
            let imgPart = c.image || '';
            let finalUrl;

            // Image Logic (Cloudinary vs Local)
            if (imgPart.startsWith('http')) {
                finalUrl = imgPart.replace('http://', 'https://');
            } else {
                if (imgPart.startsWith('uploads/') || imgPart.startsWith('uploads\\')) {
                    imgPart = imgPart.substring(8);
                }
                if (imgPart.startsWith('/')) imgPart = imgPart.substring(1);
                finalUrl = imgPart ? `${IMG_BASE_URL}${imgPart}` : 'https://via.placeholder.com/280x350?text=No+Image';
            }

            const color = c.themeColor || '#3b82f6';
            const darkerColor = adjustBrightness(color, -50);

            return {
                            id: c.id,
                            title: c.title,
                            desc: c.description,
                            color: color,

                            // ✅ FIX 1: CARD STYLE (Text is at the bottom, so we add a dark fade at the bottom)
                            // We put the linear-gradient FIRST so it sits ON TOP of the image
                            cardStyle: `background-color: ${color};
                                        background-image: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.9) 100%),
                                                          url('${finalUrl}');
                                        background-size: cover; background-position: center;`,

                            // ✅ FIX 2: BIG BACKGROUND (Text is on the left, so we add a dark fade on the left)
                            bgStyle: `background-color: #000;
                                      background-image: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%),
                                                        url('${finalUrl}');
                                      background-size: cover; background-position: center;`
                        };
        });

        if (courses.length > 0) {
            renderCardsInitial(); // Create cards once
            currentIndex = 0;
            updateCarousel();     // Apply classes & listeners
            startAutoPlay();      // Start timer
        } else {
            if(cardTrack) cardTrack.innerHTML = '<div style="color:white; text-align:center;">No courses available.</div>';
        }

    } catch (error) {
        console.error("Error loading courses:", error);
    }
}

// ==========================================
// 3. LOGIC: CHECK LOGIN BEFORE REDIRECT
// ==========================================
function handleCourseClick(courseId) {
    // 1. Check if user data exists in Local Storage
    // (Adjust 'user' or 'token' based on what your login.js saves)
    const user = localStorage.getItem('user');

    if (!user) {
        // ❌ Not Logged In
        alert("Please login to view this course.");
        window.location.href = "login.html"; // Redirect to Login Page
    } else {
        // ✅ Logged In - Go to Course
        window.location.href = `dashboard.html?course=${courseId}`;
    }
}

// ==========================================
// 3. CAROUSEL RENDERING
// ==========================================

function renderCardsInitial() {
    if (!cardTrack) return;
    cardTrack.innerHTML = '';

    courses.forEach((course, index) => {
        const card = document.createElement('div');
        // We add the index as a data attribute to track it easily
        card.dataset.index = index;
        card.className = 'course-card hidden-card';
        card.style = course.cardStyle;

        // Add Logo
        const logoDiv = document.createElement('div');
        logoDiv.className = 'card-logo';


        card.appendChild(logoDiv);
        cardTrack.appendChild(card);
    });
}

function updateCarousel() {
    if (!cardTrack) return;

    const cardElements = Array.from(cardTrack.children);
    const data = courses[currentIndex];

    // 1. Update Classes & Click Events
    cardElements.forEach((card, index) => {
        let positionClass = 'hidden-card';
        // Reset click listener
        card.onclick = null;
        card.style.cursor = 'default';

        if (index === currentIndex) {
            positionClass = 'active';
            // If active, clicking takes you to dashboard (or you can remove this if you prefer the button)
            card.onclick = () => {
                 window.location.href = `dashboarh.html?course=${courses[currentIndex].id}`;
            };
            card.style.cursor = 'pointer';

        } else if (index === (currentIndex - 1 + courses.length) % courses.length) {
            positionClass = 'prev';
            // ✅ TOUCH SIDE TO MOVE: Click Left -> Go Prev
            card.onclick = () => {
                stopAutoPlay();
                movePrev();
                startAutoPlay();
            };
            card.style.cursor = 'pointer';

        } else if (index === (currentIndex + 1) % courses.length) {
            positionClass = 'next';
            // ✅ TOUCH SIDE TO MOVE: Click Right -> Go Next
            card.onclick = () => {
                stopAutoPlay();
                moveNext();
                startAutoPlay();
            };
            card.style.cursor = 'pointer';
        }

        card.className = `course-card ${positionClass}`;
    });

    // 2. Update Background
    if(bgContainer) {
        const bg = document.createElement('div');
        bg.className = 'bg-slide';
        bg.style = data.bgStyle;
        bgContainer.appendChild(bg);
        setTimeout(() => bg.classList.add('active'), 10);
        if (bgContainer.children.length > 2) {
            bgContainer.removeChild(bgContainer.children[0]);
        }
    }

    // 3. Update Text
    const titleEl = document.getElementById('course-title');
    const descEl = document.getElementById('course-desc');

    if (textContent && titleEl && descEl) {
        textContent.style.opacity = '0';
        textContent.style.transform = 'translateY(20px)';

        setTimeout(() => {
            titleEl.innerHTML = data.title;
            descEl.innerText = data.desc;
            descEl.style.borderColor = data.color;

            textContent.style.opacity = '1';
            textContent.style.transform = 'translateY(0)';
        }, 300);
    }
}

// ==========================================
// 4. CONTROLS & HELPERS
// ==========================================

function movePrev() {
    currentIndex = (currentIndex - 1 + courses.length) % courses.length;
    updateCarousel();
}

function moveNext() {
    currentIndex = (currentIndex + 1) % courses.length;
    updateCarousel();
}

function startAutoPlay() {
    stopAutoPlay();
    autoPlayInterval = setInterval(() => {
        moveNext();
    }, 30000);
}

function stopAutoPlay() {
    if (autoPlayInterval) clearInterval(autoPlayInterval);
}

function adjustBrightness(col, amt) {
    let usePound = false;
    if (col[0] === "#") {
        col = col.slice(1);
        usePound = true;
    }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', fetchCourses);

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const viewLessonBtn = document.getElementById('viewLessonBtn');

if (prevBtn) prevBtn.onclick = () => {
    stopAutoPlay();
    movePrev();
    startAutoPlay();
};

if (nextBtn) nextBtn.onclick = () => {
    stopAutoPlay();
    moveNext();
    startAutoPlay();
};

if (viewLessonBtn) viewLessonBtn.onclick = () => {
    if (courses[currentIndex]) {
        window.location.href = `dashboard.html?course=${courses[currentIndex].id}`;
    }
};