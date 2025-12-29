// ==========================================
// 1. CONFIGURATION
// ==========================================
let courses = [];
let currentIndex = 0;
let autoPlayInterval; // Variable for auto-rotation

const bgContainer = document.getElementById('bg-container');
const cardTrack = document.getElementById('card-track');
const textContent = document.getElementById('text-content');

// Your Backend URL
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
                // We save the style strings here
                cardStyle: `background-color: ${color}; background-image: url('${finalUrl}'), linear-gradient(135deg, ${darkerColor} 80%, ${color} 100%);`,
                bgStyle: `background-color: #000; background-image: url('${finalUrl}'), linear-gradient(to right, #000 0%, ${color} 100%);`
            };
        });

        if (courses.length > 0) {
            // ✅ STEP 1: Create DOM Elements ONCE
            renderCardsInitial();

            // ✅ STEP 2: Start the System
            currentIndex = 0;
            updateCarousel();
            startAutoPlay(); // Starts automatic animation
        } else {
            if(cardTrack) cardTrack.innerHTML = '<div style="color:white; text-align:center;">No courses available.</div>';
        }

    } catch (error) {
        console.error("Error loading courses:", error);
    }
}

// ==========================================
// 3. CAROUSEL RENDERING (The Fix)
// ==========================================

// This function runs ONLY ONCE to build the HTML
function renderCardsInitial() {
    if (!cardTrack) return;
    cardTrack.innerHTML = ''; // Clear loading state

    courses.forEach((course) => {
        const card = document.createElement('div');
        // Initial class is hidden
        card.className = 'course-card hidden-card';
        card.style = course.cardStyle;

        // Add Logo
        const logoDiv = document.createElement('div');
        logoDiv.className = 'card-logo';
        logoDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="white" width="40" height="40"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>';

        card.appendChild(logoDiv);
        cardTrack.appendChild(card);
    });
}

// This function runs EVERY TIME you click Next/Prev
// It only changes CLASSES, so CSS transitions work!
function updateCarousel() {
    if (!cardTrack) return;

    // 1. Get the existing cards from the DOM
    const cardElements = Array.from(cardTrack.children);
    const data = courses[currentIndex];

    // 2. Update Classes for Animation
    cardElements.forEach((card, index) => {
        let positionClass = 'hidden-card';

        if (index === currentIndex) {
            positionClass = 'active';
        } else if (index === (currentIndex - 1 + courses.length) % courses.length) {
            positionClass = 'prev';
        } else if (index === (currentIndex + 1) % courses.length) {
            positionClass = 'next';
        }

        // Apply the class (This triggers the CSS transition)
        card.className = `course-card ${positionClass}`;
    });

    // 3. Update Background (with fade)
    if(bgContainer) {
        const bg = document.createElement('div');
        bg.className = 'bg-slide';
        bg.style = data.bgStyle;
        bgContainer.appendChild(bg);

        // Trigger fade in
        setTimeout(() => bg.classList.add('active'), 10);

        // Remove old backgrounds
        if (bgContainer.children.length > 2) {
            bgContainer.removeChild(bgContainer.children[0]);
        }
    }

    // 4. Update Text
    const titleEl = document.getElementById('course-title');
    const descEl = document.getElementById('course-desc');

    if (textContent && titleEl && descEl) {
        // Simple fade out/in effect for text
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
// 4. AUTO PLAY & EVENTS
// ==========================================
function startAutoPlay() {
    stopAutoPlay(); // Clear existing to prevent duplicates
    autoPlayInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % courses.length;
        updateCarousel();
    }, 5000); // Change slide every 5 seconds
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
    stopAutoPlay(); // Pause if user clicks
    currentIndex = (currentIndex - 1 + courses.length) % courses.length;
    updateCarousel();
    startAutoPlay(); // Restart timer
};

if (nextBtn) nextBtn.onclick = () => {
    stopAutoPlay();
    currentIndex = (currentIndex + 1) % courses.length;
    updateCarousel();
    startAutoPlay();
};

if (viewLessonBtn) viewLessonBtn.onclick = () => {
    if (courses[currentIndex]) {
        window.location.href = `dashboard.html?course=${courses[currentIndex].id}`;
    }
};