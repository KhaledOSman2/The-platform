let currentVideoIndex = 0;
let videos = [];

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
}

async function loadCourseData() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        if (!courseId) {
            alert('لم يتم العثور على معرف الكورس');
            return;
        }
        const courseResponse = await fetch(`/api/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!courseResponse.ok) throw new Error('Network response was not ok');
        const course = await courseResponse.json();
        document.getElementById('courseTitle').textContent = course.title;
        document.getElementById('courseGrade').textContent = course.grade;
        document.getElementById('courseImage').src = course.imageURL;
        document.getElementById('courseVideo').src = course.videoURL;
        document.getElementById('videoTitle').textContent = course.videos[0]?.title || '';

        // New: Update lecture count dynamically
        const lectureCount = course.videoCount !== undefined ? course.videoCount : (course.videos ? course.videos.length : 0);
        document.getElementById('lectureCount').textContent = lectureCount;

        videos = course.videos || [];
        const videosList = document.getElementById('videosList');
        videosList.innerHTML = '';
        if (videos.length > 0) {
            document.getElementById('noVideoMessage').style.display = 'none';
            videos.forEach((video, index) => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-start';
                li.innerHTML = `
                            <div class="w-100">
                                <div class="d-flex justify-content-between align-items-center">
                                   <div><i class="fa-solid fa-video"></i>  <strong>المحاضرة ${index + 1}:</strong></div>
                                    <span class="badge text-bg" style="background:#e0e0e0;color:#000;">
                                        ${formatDate(video.addedDate)}
                                    </span>
                                </div>
                                <div class="mt-1 fw-bold text-primary" style="font-size: 0.95rem;">${video.title}</div>
                            </div>`;
                li.dataset.index = index;
                li.addEventListener('click', () => {
                    currentVideoIndex = index;
                    updateVideo();
                });
                videosList.appendChild(li);
            });
            updateNavButtons();
            highlightCurrentVideo();
        } else {
            document.getElementById('courseVideo').style.display = 'none';
            document.getElementById('noVideoMessage').style.display = 'block';
            videosList.innerHTML = '<li class="list-group-item">لا تتوفر محاضرات حاليا</li>';
        }

        const activitiesList = document.getElementById('activitiesList');
        activitiesList.innerHTML = '';
        if (course.activities && course.activities.length > 0) {
            course.activities.forEach((activity, index) => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-start';
                li.innerHTML = `
                            <div class="w-100">
                                <div class="d-flex justify-content-between align-items-center">
                                   <div><i class="fa-solid fa-file-pdf"></i>  <strong>المستند ${index + 1}:</strong></div>
                                    <span class="badge text-bg" style="background:#e0e0e0;color:#000;">
                                        ${formatDate(activity.addedDate)}
                                    </span>
                                </div>
                                <div class="mt-1 fw-bold text-primary" style="font-size: 0.95rem;">${activity.title}</div>
                            </div>
                        `;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    // Create an anchor element to trigger download
                    const downloadLink = document.createElement('a');
                    downloadLink.href = activity.filePath;
                    downloadLink.download = activity.title || `document-${index + 1}`;
                    downloadLink.style.display = 'none';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                });
                activitiesList.appendChild(li);
            });
        } else {
            activitiesList.innerHTML = '<li class="list-group-item">لا تتوفر مستندات حاليا</li>';
        }

        const examsList = document.getElementById('examsList');
        examsList.innerHTML = '';
        try {
            const examsResponse = await fetch(`/api/exams?courseId=${courseId}&grade=${course.grade}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!examsResponse.ok) throw new Error('Network response was not ok');
            const { exams } = await examsResponse.json();
            if (exams && exams.length > 0) {
                exams.forEach((exam, index) => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-start';
                    li.innerHTML = `
                            <div class="w-100">
                                <div class="d-flex justify-content-between align-items-center">
                                   <div><i class="fa-solid fa-file"></i>  <strong>الاختبار ${index + 1}:</strong></div>
                                    <span class="badge text-bg" style="background:#e0e0e0;color:#000;">
                                        ${formatDate(exam.addedDate)}
                                    </span>
                                </div>
                                <div class="mt-1 fw-bold text-primary" style="font-size: 0.95rem;">${exam.title}</div>
                            </div>
                        `;
                    li.style.cursor = 'pointer';
                    li.addEventListener('click', () => {
                        viewExam(exam.googleFormUrl, exam.title);
                    });
                    examsList.appendChild(li);
                });
            } else {
                examsList.innerHTML = '<li class="list-group-item">لا تتوفر اختبارات حاليا</li>';
            }
        } catch (examsError) {
            console.error('Error loading exams:', examsError);
            examsList.innerHTML = '<li class="list-group-item">لا تتوفر اختبارات حاليا</li>';
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            alert('انتهت صلاحية الجلسة الرجاء تسجيل الدخول مرة أخرى.');
        }
    } catch (error) {
        console.error('Error loading course data:', error);
        alert('حدث خطأ أثناء جلب بيانات الكورس');
    } finally {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 300);
    }
}

function updateVideo() {
    const video = videos[currentVideoIndex];
    document.getElementById('courseVideo').src = video.url;
    document.getElementById('videoTitle').textContent = video.title;
    updateNavButtons();
    highlightCurrentVideo();
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevVideoBtn');
    const nextBtn = document.getElementById('nextVideoBtn');
    prevBtn.disabled = currentVideoIndex === 0;
    nextBtn.disabled = currentVideoIndex === videos.length - 1;
}

function highlightCurrentVideo() {
    const items = document.querySelectorAll('#videosList .list-group-item');
    items.forEach(item => item.classList.remove('current'));
    items[currentVideoIndex].classList.add('current');
}

document.addEventListener('DOMContentLoaded', () => {
    loadCourseData();
    const navLinks = document.getElementById('navLinks');
    navLinks.innerHTML = `
                <li class="nav-item"><a class="nav-link" href="index.html">الرئيسية</a></li>
                <li class="nav-item"><a class="nav-link active" href="courses.html">الكورسات</a></li>
                <li class="nav-item"><a class="nav-link" href="dashboard.html">لوحة التحكم</a></li>
                <li class="nav-item"><a class="nav-link" href="#" id="logoutLink">تسجيل خروج</a></li>
            `;
    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
    document.querySelectorAll('.card-header').forEach(header => {
        header.addEventListener('click', function () {
            const cardBody = this.nextElementSibling;
            cardBody.classList.toggle('show');
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
            this.classList.toggle('collapsed');
        });
    });

    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => observer.observe(el));

    document.getElementById('prevVideoBtn').addEventListener('click', () => {
        if (currentVideoIndex > 0) {
            currentVideoIndex--;
            updateVideo();
        }
    });
    document.getElementById('nextVideoBtn').addEventListener('click', () => {
        if (currentVideoIndex < videos.length - 1) {
            currentVideoIndex++;
            updateVideo();
        }
    });

});


function viewExam(googleFormUrl, examTitle) {
    const examModal = new bootstrap.Modal(document.getElementById('examModal'));
    document.getElementById('examIframe').src = googleFormUrl;
    document.getElementById('examModalLabel').textContent = examTitle;
    examModal.show();
}


window.onscroll = function () {
    const backToTopBtn = document.getElementById("backToTopBtn");
    backToTopBtn.style.display = (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) ? "block" : "none";
};

function topFunction() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

