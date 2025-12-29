// ==========================================
// 1. CONFIGURATION
// ==========================================
let courses = [];
let currentIndex = 0;

const bgContainer = document.getElementById('bg-container');
const cardTrack = document.getElementById('card-track');
const textContent = document.getElementById('text-content');

// ✅ FIX 1: Use Relative Path (Points to YOUR current site automatically)
const IMG_BASE_URL = "/uploads/";

// ==========================================
// 2. DATA FETCHING & PROCESSING
// ==========================================
async function fetchCourses() {
    try {
        // ✅ FIX 2: Use Relative Path for API
        const response = await fetch('/api/admin/courses');

        if (!response.ok) throw new Error("Failed to fetch courses");

        const dbCourses = await response.json();

        // Transform Database Data -> Frontend Format
        courses = dbCourses.map(c => {

            // --- IMAGE LOGIC ---
            let imgPart = c.image || '';
            let finalUrl;

            // CASE A: Cloudinary / External Link
            if (imgPart.startsWith('http')) {
                // Force HTTPS
                finalUrl = imgPart.replace('http://', 'https://');
            }
            // CASE B: Local File (Render)
            else {
                // Clean the path
                if (imgPart.startsWith('uploads/') || imgPart.startsWith('uploads\\')) {
                    imgPart = imgPart.substring(8);
                }
                if (imgPart.startsWith('/')) imgPart = imgPart.substring(1);

                // Combine with Base URL
                finalUrl = imgPart ? `${IMG_BASE_URL}${imgPart}` : 'https://via.placeholder.com/280x350?text=No+Image';
            }

            // Debugging: Check the Console to see what URL is being used!
            console.log(`Course: ${c.title}, Final URL: ${finalUrl}`);

            const color = c.themeColor || '#3b82f6';
            const darkerColor = adjustBrightness(color, -50);

            return {
                id: c.id,
                title: c.title,
                desc: c.description,
                color: color,
                // Apply Style
                cardStyle: `background-color: ${color}; background-image: url('${finalUrl}'), linear-gradient(135deg, ${darkerColor} 80%, ${color} 100%);`,
                bgStyle: `background-color: #000; background-image: url('${finalUrl}'), linear-gradient(to right, #000 0%, ${color} 100%);`
            };
        });

        if (courses.length > 0) {
            currentIndex = 0;
            updateCarousel();
        } else {
            if(cardTrack) cardTrack.innerHTML = '<div style="color:white; text-align:center;">No courses available.</div>';
        }

    } catch (error) {
        console.error("Error loading courses:", error);
    }
}

// ==========================================
// 3. CAROUSEL LOGIC
// ==========================================
function updateCarousel() {
    if (!cardTrack) return;
    cardTrack.innerHTML = '';

    const data = courses[currentIndex];

    // 1. Update Background
    const bg = document.createElement('div');
    bg.className = 'bg-slide active';
    bg.style = data.bgStyle;

    if(bgContainer) {
        bgContainer.innerHTML = '';
        bgContainer.appendChild(bg);
    }

    // 2. Render Cards
    courses.forEach((course, index) => {
        let positionClass = 'hidden-card';
        if (index === currentIndex) positionClass = 'active';
        else if (index === (currentIndex - 1 + courses.length) % courses.length) positionClass = 'prev';
        else if (index === (currentIndex + 1) % courses.length) positionClass = 'next';

        const card = document.createElement('div');
        card.className = `course-card ${positionClass}`;
        card.style = course.cardStyle;

        // Logo Icon
        const logoDiv = document.createElement('div');
        logoDiv.className = 'card-logo';
        logoDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="white" width="40" height="40"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>';

        card.appendChild(logoDiv);
        cardTrack.appendChild(card);

        if (index === currentIndex) {
            setTimeout(() => card.classList.add('active'), 10);
        }
    });

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

// ==========================================
// 4. EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', fetchCourses);

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const viewLessonBtn = document.getElementById('viewLessonBtn');

if (prevBtn) prevBtn.onclick = () => {
    currentIndex = (currentIndex - 1 + courses.length) % courses.length;
    updateCarousel();
};

if (nextBtn) nextBtn.onclick = () => {
    currentIndex = (currentIndex + 1) % courses.length;
    updateCarousel();
};

if (viewLessonBtn) viewLessonBtn.onclick = () => {
    if (courses[currentIndex]) {
        window.location.href = `dashboard.html?course=${courses[currentIndex].id}`;
    }
};