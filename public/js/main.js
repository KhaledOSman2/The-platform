document.addEventListener('DOMContentLoaded', async function () {
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;

    // تحميل قائمة الصفوف الدراسية في نموذج التسجيل
    if (currentPath.endsWith('register.html')) {
        const gradeSelect = document.getElementById('grade');
        try {
            const gradesResponse = await fetch('/api/grades');
            const grades = await gradesResponse.json();
            grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade.name;
                option.textContent = grade.name;
                gradeSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Error fetching grades:', err);
        }
    }

    // تحقق من الصفحات المحمية (dashboard.html, admin.html, course.html)
    if (currentPath.endsWith('dashboard.html') || currentPath.endsWith('admin.html') || currentPath.endsWith('course.html')) {
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // تحديد endpoint التحقق من الهوية
            const endpoint = currentPath.endsWith('admin.html') ? '/api/admin/dashboard' : '/api/dashboard';
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }

        } catch (error) {
            console.error('حدث خطأ أثناء التحقق من الهوية:', error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }
});


AOS.init({
    duration: 1000
});

document.addEventListener('DOMContentLoaded', async function () {
    try {
        const response = await fetch('/api/all-courses');
        const courses = await response.json();
        const latestCoursesGrid = document.getElementById('latestCoursesGrid');

        courses.slice(-3).reverse().forEach(course => {
            const courseImage = course.imageURL || 'images/course-placeholder.jpg';
            const courseCard = document.createElement('div');
            courseCard.className = 'col-lg-4 col-md-6';
            courseCard.innerHTML = `
                <div class="course-card card border-0 rounded-4 overflow-hidden shadow">
                    <div class="position-relative">
                        <img src="${course.imageURL || 'images/course-placeholder.jpg'}" class="card-img-top img-fluid" alt="${course.title}" style="height: 220px; object-fit: cover;">
                        <div class="position-absolute top-0 start-0 m-3">
                            <span class="badge bg-danger fw-bold px-3 py-2">جديد</span>
                        </div>
                    </div>
                    <div class="card-body p-4 bg-white">
                        <h5 class="card-title text-dark fw-bold">${course.title}</h5>
                        <p class="card-text text-muted small">${course.grade}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <button class="btn btn-primary" onclick="window.location.href='course.html?id=${course.id}'">مشاهدة</button>
                            <span class="badge fw-bold px-3 py-2" style="background:#e0e0e0;color:#000;">
                                <span class="course-duration">عدد المحاضرات : ${course.videoCount !== undefined ? course.videoCount : (course.videos ? course.videos.length : 0)}</span>
                            </span>
                            <span><i class="fas fa-star" style="color:#f7a619;"></i> <span style="color: #555">4.5</span></span>
                        </div>
                    </div>
                </div>
            `;
            latestCoursesGrid.appendChild(courseCard);
        });
    } catch (error) {
        console.error('حدث خطأ أثناء جلب الكورسات:', error);
    }

    const isLoggedIn = !!localStorage.getItem('token');
    const navLinks = document.getElementById('navLinks');

    if (isLoggedIn) {
        navLinks.innerHTML = `
            <li class="nav-item"><a class="nav-link active" href="index.html">الرئيسية</a></li>
            <li class="nav-item"><a class="nav-link" href="courses.html">الكورسات</a></li>
            <li class="nav-item"><a class="nav-link" href="dashboard.html">لوحة التحكم</a></li>
            <li class="nav-item"><a class="nav-link" href="#" id="logoutLink">تسجيل خروج</a></li>
        `;
        document.getElementById('logoutLink').addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }
});


