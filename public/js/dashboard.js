        document.addEventListener('DOMContentLoaded', function () {
            // التحقق من وجود التوكن في localStorage
            const token = localStorage.getItem('token');
            const isLoggedIn = !!token;
            const navLinks = document.getElementById('navLinks');

            if (isLoggedIn) {
                navLinks.innerHTML = `
                        <li class="nav-item"><a class="nav-link" href="index.html">الرئيسية</a></li>
                        <li class="nav-item"><a class="nav-link" href="courses.html">الكورسات</a></li>
                        <li class="nav-item"><a class="nav-link active" href="dashboard.html">لوحة التحكم</a></li>
                        <li class="nav-item"><a class="nav-link" href="#" id="profileLink">الإعدادات</a></li>
                        <li class="nav-item"><a class="nav-link" href="#" id="logoutLink">تسجيل خروج</a></li>
                    `;

                document.getElementById('logoutLink').addEventListener('click', function (e) {
                    e.preventDefault();
                    localStorage.removeItem('token');
                    localStorage.removeItem('grade');
                    window.location.href = 'login.html';
                });
            } else {
                // إذا لم يكن المستخدم مسجّل الدخول يتم إعادة التوجيه إلى صفحة تسجيل الدخول
                window.location.href = 'login.html';
            }

            // Open Profile Modal on link click
            document.getElementById('profileLink').addEventListener('click', function (e) {
                e.preventDefault();
                const modal = new bootstrap.Modal(document.getElementById('profileModal'));
                modal.show();
            });

            // Fetch profile info from /api/dashboard and pre-fill form
            let currentUserId = null;
            fetch('/api/dashboard', { headers: { 'Authorization': 'Bearer ' + token } })
                .then(response => response.json())
                .then(data => {
                    const user = data.user;
                    currentUserId = user.id;
                    document.getElementById('username').value = user.username || '';
                    document.getElementById('email').value = user.email || '';
                    // Pre-fill password with existing password
                    document.getElementById('password').value = user.password || '';
                    document.getElementById('displayUsername').textContent = user.username || '';
                    // Fetch available grades and set dropdown options
                    fetch('/api/grades')
                        .then(response => response.json())
                        .then(grades => {
                            const gradeSelect = document.getElementById('grade');
                            grades.forEach(g => {
                                const option = document.createElement('option');
                                option.value = g.name;
                                option.textContent = g.name;
                                if (g.name === user.grade) option.selected = true;
                                gradeSelect.appendChild(option);
                            });
                        })
                        .catch(error => console.error('Error fetching grades:', error));
                })
                .catch(error => console.error('Error fetching profile:', error));

            // تعديل: تحديث badge الإشعارات عند تحميل الصفحة
            async function fetchNotificationsCount() {
                const token = localStorage.getItem('token');
                try {
                    const response = await fetch('/api/notifications', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    const notifications = await response.json();
                    document.getElementById('notificationCountBadge').textContent = notifications.length;
                } catch (error) {
                    console.error('Error fetching notifications count:', error);
                }
            }
            fetchNotificationsCount();

            // إضافة مستمع لزر الإشعارات لتحديث القائمة عند النقر
            const notificationsButton = document.getElementById('notificationsButton');
            if (notificationsButton) {
                notificationsButton.addEventListener('click', async function () {
                    const notificationsDropdown = document.getElementById('notificationsDropdown');
                    notificationsDropdown.innerHTML = '';
                    try {
                        const response = await fetch('/api/notifications', {
                            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
                        });
                        let notifications = await response.json();
                        // تعديل: عكس ترتيب الإشعارات لجعل الأحدث أولاً
                        notifications = notifications.reverse();
                        document.getElementById('notificationCountBadge').textContent = notifications.length;

                        if (notifications.length === 0) {
                            const li = document.createElement('li');
                            li.className = 'dropdown-item';
                            li.textContent = 'لا توجد إشعارات';
                            notificationsDropdown.appendChild(li);
                        } else {
                            notifications.forEach((notification, index) => {
                                const li = document.createElement('li');
                                li.className = 'dropdown-item';
                                if (index === 0) {
                                    // Added two non-breaking spaces and increased margin-left for extra spacing
                                    li.innerHTML = `${notification.title}&nbsp;&nbsp;&nbsp;<span class="badge bg-success" style="margin-left: 1.5rem;">جديد</span>`;
                                } else {
                                    li.textContent = notification.title;
                                }
                                li.addEventListener('click', function () {
                                    document.getElementById('notificationDetailsModalLabel').textContent = notification.title;
                                    document.getElementById('notificationDetailsContent').textContent = notification.content;
                                    const notificationModal = new bootstrap.Modal(document.getElementById('notificationDetailsModal'));
                                    notificationModal.show();
                                });
                                notificationsDropdown.appendChild(li);
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching notifications:', error);
                    }
                });
            }

            // جلب الدورات مع إرسال التوكن في الهيدر
            fetchCourses();

            // إضافة مستمع لحدث البحث
            document.getElementById('courseSearch').addEventListener('input', function (e) {
                const searchTerm = e.target.value.toLowerCase();
                filterCourses(searchTerm);
            });

            // Profile form submission
            document.getElementById('profileForm').addEventListener('submit', async function (e) {
                e.preventDefault();
                const updatedData = {
                    username: document.getElementById('username').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    password: document.getElementById('password').value.trim(),
                    grade: document.getElementById('grade').value.trim()
                };
                try {
                    const response = await fetch(`/api/users/${currentUserId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatedData)
                    });
                    const result = await response.json();
                    alert(result.message);
                    // إذا تم إرسال علم logout، نقوم بتسجيل الخروج وإعادة التوجيه
                    if (result.logout) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('grade');
                        window.location.href = 'login.html';
                        alert('تم تحديث البيانات بنجاح. الرجاء تسجيل الدخول مرة أخرى.');
                        return;
                    }
                    document.getElementById('password').value = '';
                } catch (error) {
                    console.error('Error updating profile:', error);
                }
            });
        });

        async function fetchCourses() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/courses', {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });

                // إذا كان الرد غير مخول يتم إعادة التوجيه لصفحة تسجيل الدخول
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('grade');
                    window.location.href = 'login.html';
                    alert('انتهت صلاحية الجلسة الرجاء تسجيل الدخول مرة أخرى.');
                    return;
                }

                const courses = await response.json();
                displayCourses(courses);
            } catch (error) {
                console.error('حدث خطأ أثناء جلب الكورسات:', error);
            }
        }

        function displayCourses(courses) {
            const coursesGrid = document.getElementById('coursesGrid');
            const noCoursesMessage = document.getElementById('noCoursesMessage');
            coursesGrid.innerHTML = '';

            if (courses.length === 0) {
                noCoursesMessage.style.display = 'block';
            } else {
                noCoursesMessage.style.display = 'none';
                // Reverse courses array so newest shows first
                courses = courses.reverse();
                courses.forEach((course, index) => {
                    // Add "جديد" badge to the first (newest) course
                    const badge = (index === 0)
                        ? `<div class="position-absolute top-0 start-0 m-3">
                     <span class="badge bg-danger fw-bold px-3 py-2">جديد</span></div>`
                        : '';

                    const courseCard = document.createElement('div');
                    courseCard.className = 'col-md-4 course-card';
                    courseCard.innerHTML = `
                            <div class="course-card card border-0 rounded-4 overflow-hidden shadow">
                                <div class="position-relative">
                                    <img src="${course.imageURL || 'images/course-placeholder.jpg'}" class="card-img-top img-fluid" alt="${course.title}" style="height: 220px; object-fit: cover;">
                                    
                                    <div class="position-absolute top-0 start-0 m-3">
                                    ${badge}
                                        </div>
                                </div>
                                <div class="card-body p-4 bg-white">
                                    <h5 class="card-title text-dark fw-bold">${course.title}</h5>
                                    <p class="card-text text-muted small">${course.grade}</p>
                                    <div class="d-flex justify-content-between align-items-center mt-3">
                                        <button class="btn btn-primary" onclick="window.location.href='course.html?id=${course.id}'">مشاهدة</button>
 <span class="badge fw-bold px-3 py-2" style="background:#e0e0e0;color:#000;">
                                <span class="course-duration">عدد المحاضرات : ${course.videoCount !== undefined ? course.videoCount : (course.videos ? course.videos.length : 0)}</span></span>
                            </span>
                            <span><i class="fas fa-star" style="color:#f7a619;"></i> <span style="color: #555">4.5<span/></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    coursesGrid.appendChild(courseCard);
                });
            }
        }

        function filterCourses(searchTerm) {
            const courses = document.querySelectorAll('.course-card');
            courses.forEach(course => {
                const title = course.querySelector('.card-title').textContent.toLowerCase();
                course.style.display = title.includes(searchTerm) ? 'block' : 'none';
            });
        }
