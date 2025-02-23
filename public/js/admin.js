document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const itemsPerPage = 5;
    let usersPage = 1;
    let coursesPage = 1;
    let gradesPage = 1;
    let notificationsPage = 1;

    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        const temp = document.createElement('div');
        temp.textContent = input;
        return temp.innerHTML.replace(/[<>&"']/g, '');
    }

    function loadUsers(page = 1) {
        fetch('/api/users', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(users => {
                if (!Array.isArray(users)) return;
                window.allUsers = users;

                const totalPages = Math.ceil(users.length / itemsPerPage);
                document.getElementById('usersTotalPages').textContent = totalPages;
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedUsers = users.slice(start, end);

                const tbody = document.querySelector('#usersTable tbody');
                tbody.innerHTML = '';
                paginatedUsers.forEach(user => {
                    const tr = document.createElement('tr');
                    tr.classList.add('table-light');

                    const td1 = document.createElement('td');
                    td1.innerHTML = `${sanitizeInput(user.username)} ${user.isAdmin ? '<span class="badge bg-success fw-bold py-2">ادمن</span> ' : ''}${user.isBanned ? '<span class="badge bg-danger fw-bold py-2">محظور</span> ' : ''}`;

                    const td2 = document.createElement('td');
                    td2.textContent = sanitizeInput(user.email);

                    const td3 = document.createElement('td');
                    td3.textContent = sanitizeInput(user.grade || 'N/A');

                    const td4 = document.createElement('td');
                    td4.innerHTML = `
                        <button class="btn btn-sm btn-warning me-1" onclick='editUser(${JSON.stringify({
                        id: user.id,
                        username: sanitizeInput(user.username),
                        email: sanitizeInput(user.email),
                        password: sanitizeInput(user.password),
                        grade: sanitizeInput(user.grade),
                        isAdmin: user.isAdmin,
                        isBanned: user.isBanned
                    })})'>تعديل</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
                    `;

                    const td5 = document.createElement('td');
                    td5.innerHTML = `
                        ${user.isBanned ? `<button class="btn btn-sm btn-success" onclick="unbanUser(${user.id})">إلغاء الحظر</button>` : `<button class="btn btn-sm btn-danger" onclick="banUser(${user.id})">حظر</button>`}
                        ${user.isAdmin ? `<button class="btn btn-sm btn-secondary" onclick="removeAdmin(${user.id})">إزالة صلاحية الادمن</button>` : `<button class="btn btn-sm btn-primary" onclick="makeAdmin(${user.id})">ترقية إلى ادمن</button>`}
                    `;

                    tr.appendChild(td1);
                    tr.appendChild(td2);
                    tr.appendChild(td3);
                    tr.appendChild(td4);
                    tr.appendChild(td5);
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error(err));
    }

    function loadCourses(page = 1) {
        fetch('/api/all-courses', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(courses => {
                if (!Array.isArray(courses)) return;
                window.allCourses = courses;

                const totalPages = Math.ceil(courses.length / itemsPerPage);
                document.getElementById('coursesTotalPages').textContent = totalPages;
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedCourses = courses.slice(start, end);

                const tbody = document.querySelector('#coursesTable tbody');
                tbody.innerHTML = '';
                paginatedCourses.forEach(course => {
                    const tr = document.createElement('tr');
                    tr.classList.add('table-light');
                    tr.innerHTML = `
                        <td>
                            <img src="${sanitizeInput(course.imageURL || '')}" class="img-thumbnail" style="width: 60px; height: 60px; object-fit: cover; margin-left: 10px;">
                            ${sanitizeInput(course.title || '')}
                        </td>
                        <td>${sanitizeInput(course.grade || '')}</td>
                        <td>${course.videos ? course.videos.length : 0}</td>
                        <td>${course.activities ? course.activities.length : 0}</td>
                        <td>${course.exams ? course.exams.length : 0}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-1" onclick='editCourse(${JSON.stringify(course)})'>تعديل</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCourse(${course.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error(err));
    }

    function loadAnalytics() {
        fetch('/api/analytics', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(data => {
                if (!data || typeof data !== 'object') return;
                const videosCount = parseInt(data.totalVideos, 10);
                document.getElementById('totalVideos').textContent = videosCount || 0;
                document.getElementById('totalUsers').textContent = data.totalUsers || 0;
                document.getElementById('totalCourses').textContent = data.totalCourses || 0;
                document.getElementById('totalExams').textContent = data.totalExams || 0;
            })
            .catch(err => console.error(err));
    }

    function loadGrades(page = 1) {
        fetch('/api/grades', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(grades => {
                if (!Array.isArray(grades)) return;
                const totalPages = Math.ceil(grades.length / itemsPerPage);
                document.getElementById('gradesTotalPages').textContent = totalPages;
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedGrades = grades.slice(start, end);

                const gradeSelect = document.getElementById('courseGrade');
                if (gradeSelect) {
                    gradeSelect.innerHTML = '';
                    grades.forEach(grade => {
                        const option = document.createElement('option');
                        option.value = sanitizeInput(grade.name || '');
                        option.textContent = sanitizeInput(grade.name || '');
                        gradeSelect.appendChild(option);
                    });
                }

                const gradesTableBody = document.querySelector('#gradesTable tbody');
                if (gradesTableBody) {
                    gradesTableBody.innerHTML = '';
                    paginatedGrades.forEach(grade => {
                        const studentsCount = window.allUsers.filter(user => user.grade === grade.name).length;
                        const coursesCount = window.allCourses.filter(course => course.grade === grade.name).length;
                        const examsCount = window.allCourses.reduce((count, course) => {
                            return course.grade === grade.name ? count + (course.exams ? course.exams.length : 0) : count;
                        }, 0);
                        const activitiesCount = window.allCourses.reduce((count, course) => {
                            return course.grade === grade.name ? count + (course.activities ? course.activities.length : 0) : count;
                        }, 0);
                        const gradevideoCount = window.allCourses.reduce((count, course) => {
                            return course.grade === grade.name ? count + (course.videos ? course.videos.length : 0) : count;
                        }, 0);

                        const tr = document.createElement('tr');
                        tr.classList.add('table-light');

                        const td1 = document.createElement('td');
                        td1.textContent = sanitizeInput(grade.name || '');

                        const td2 = document.createElement('td');
                        td2.textContent = studentsCount;

                        const td3 = document.createElement('td');
                        td3.textContent = coursesCount;

                        const td4 = document.createElement('td');
                        td4.textContent = gradevideoCount;

                        const td5 = document.createElement('td');
                        td5.textContent = activitiesCount;

                        const td6 = document.createElement('td');
                        td6.textContent = examsCount;

                        const td7 = document.createElement('td');
                        td7.innerHTML = `
                            <button class="btn btn-sm btn-danger" onclick="deleteGrade(${grade.id})"><i class="fas fa-trash"></i></button>
                        `;

                        tr.appendChild(td1);
                        tr.appendChild(td2);
                        tr.appendChild(td3);
                        tr.appendChild(td4);
                        tr.appendChild(td5);
                        tr.appendChild(td6);
                        tr.appendChild(td7);
                        gradesTableBody.appendChild(tr);
                    });
                }
            })
            .catch(err => console.error(err));
    }

    function loadNotifications(page = 1) {
        fetch('/api/notifications', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(notifications => {
                if (!Array.isArray(notifications)) return;
                const totalPages = Math.ceil(notifications.length / itemsPerPage);
                document.getElementById('notificationsTotalPages').textContent = totalPages;
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedNotifications = notifications.slice(start, end);

                const tbody = document.querySelector('#notificationsTable tbody');
                tbody.innerHTML = '';
                paginatedNotifications.forEach(notification => {
                    const tr = document.createElement('tr');
                    tr.classList.add('table-light');

                    const td1 = document.createElement('td');
                    td1.textContent = sanitizeInput(notification.title || '');

                    const td2 = document.createElement('td');
                    td2.textContent = sanitizeInput(notification.content || '');

                    const td3 = document.createElement('td');
                    td3.innerHTML = `
                        <button class="btn btn-sm btn-warning me-1" onclick='editNotification(${JSON.stringify(notification)})'>تعديل</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteNotification(${notification.id})"><i class="fas fa-trash"></i></button>
                    `;

                    tr.appendChild(td1);
                    tr.appendChild(td2);
                    tr.appendChild(td3);
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error(err));
    }

    loadUsers();
    loadCourses();
    loadAnalytics();
    loadGrades();
    loadNotifications();

    const gradeForm = document.getElementById('gradeForm');
    if (gradeForm) {
        gradeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = sanitizeInput(document.getElementById('gradeName').value);

            fetch('/api/grades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name })
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadGrades();
                    gradeForm.reset();
                    const gradeModal = bootstrap.Modal.getInstance(document.getElementById('gradeModal'));
                    if (gradeModal) gradeModal.hide();
                })
                .catch(err => console.error(err));
        });
    }

    window.deleteGrade = function (gradeId) {
        if (confirm('هل أنت متأكد من حذف الصف الدراسي؟')) {
            fetch(`/api/grades/${gradeId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadGrades();
                })
                .catch(err => console.error(err));
        }
    };

    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const id = document.getElementById('courseId').value;
            const title = sanitizeInput(document.getElementById('courseTitle').value);
            const grade = sanitizeInput(document.getElementById('courseGrade').value);
            const courseImageInput = document.getElementById('courseImage');
            const courseImage = courseImageInput ? courseImageInput.files[0] : null;

            const videos = Array.from(document.querySelectorAll('.video-input')).map(input => {
                const videoTitle = sanitizeInput(input.querySelector('.video-title').value);
                const videoUrl = sanitizeInput(input.querySelector('.video-url').value);
                const videoId = input.querySelector('.video-id') ? sanitizeInput(input.querySelector('.video-id').value) : '';
                return { id: videoId, title: videoTitle, url: videoUrl };
            });

            const activities = [];
            for (const input of document.querySelectorAll('.activity-input')) {
                const activityTitle = sanitizeInput(input.querySelector('.activity-title').value);
                const activityFile = input.querySelector('.activity-file').files[0];
                const activityId = input.querySelector('.activity-id') ? sanitizeInput(input.querySelector('.activity-id').value) : '';
                if (activityFile) {
                    const formDataActivity = new FormData();
                    formDataActivity.append('activityFile', activityFile);
                    const response = await fetch('/api/uploadActivity', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formDataActivity
                    });
                    const data = await response.json();
                    activities.push({ id: activityId, title: activityTitle, filePath: data.filePath, addedDate: new Date().toISOString() });
                } else {
                    const existingFilePath = sanitizeInput(input.querySelector('.existing-file-path').value);
                    if (existingFilePath) activities.push({ id: activityId, title: activityTitle, filePath: existingFilePath });
                }
            }

            const examInputs = document.querySelectorAll('.exam-input');
            const exams = Array.from(examInputs).map(input => {
                const titleEl = input.querySelector('.exam-title');
                const urlEl = input.querySelector('.exam-url');
                const idEl = input.querySelector('.exam-id');
                if (!titleEl || !urlEl) return null;
                const examTitle = sanitizeInput(titleEl.value.trim());
                const examUrl = sanitizeInput(urlEl.value.trim());
                const examId = idEl ? sanitizeInput(idEl.value) : '';
                return {
                    id: examId || '',
                    title: examTitle,
                    googleFormUrl: examUrl,
                    courseId: id || '',
                    grade: grade
                };
            }).filter(exam => exam !== null && exam.title && exam.googleFormUrl);

            const formData = new FormData();
            formData.append('title', title);
            formData.append('grade', grade);
            if (courseImage) {
                formData.append('courseImage', courseImage);
            } else if (id) {
                formData.append('existingImageURL', sanitizeInput(document.getElementById('courseImageURL').value));
            }
            formData.append('videos', JSON.stringify(videos));
            formData.append('activities', JSON.stringify(activities));
            formData.append('exams', JSON.stringify(exams));

            const method = id ? 'PUT' : 'POST';
            const urlEndpoint = id ? `/api/courses/${id}` : '/api/courses';

            fetch(urlEndpoint, {
                method,
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadCourses();
                    courseForm.reset();
                    document.getElementById('courseId').value = '';
                    const videosContainer = document.getElementById('videosContainer');
                    if (videosContainer) videosContainer.innerHTML = '';
                    const activitiesContainer = document.getElementById('activitiesContainer');
                    if (activitiesContainer) activitiesContainer.innerHTML = '';
                    const examsContainer = document.getElementById('examsContainer');
                    if (examsContainer) examsContainer.innerHTML = '';
                    const courseModal = bootstrap.Modal.getInstance(document.getElementById('courseModal'));
                    if (courseModal) courseModal.hide();
                })
                .catch(err => console.error(err));
        });
    }

    const addVideoButton = document.getElementById('addVideoButton');
    if (addVideoButton) {
        addVideoButton.addEventListener('click', function () {
            const videosContainer = document.getElementById('videosContainer');
            const videoInput = document.createElement('div');
            videoInput.className = 'video-input';
            videoInput.innerHTML = `
                <div class="input-group">
                    <input type="text" class="form-control video-title" placeholder="عنوان الفيديو">
                </div>
                <div class="input-group">
                    <input type="url" class="form-control video-url" placeholder="رابط الفيديو">
                </div>
                <button type="button" class="btn btn-danger" onclick="deleteCourseVideo(this, '')"><i class="fas fa-trash"></i></button>
            `;
            videosContainer.appendChild(videoInput);
        });
    }

    window.deleteCourseVideo = function (btn, videoId) {
        if (videoId && confirm('هل أنت متأكد من حذف الفيديو؟')) {
            fetch(`/api/videos/${videoId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    btn.parentElement.remove();
                    loadCourses();
                })
                .catch(err => console.error(err));
        } else if (confirm('هل أنت متأكد من حذف الفيديو؟')) {
            btn.parentElement.remove();
        }
    };

    const addActivityButton = document.getElementById('addActivityButton');
    if (addActivityButton) {
        addActivityButton.addEventListener('click', function () {
            const activitiesContainer = document.getElementById('activitiesContainer');
            const activityInput = document.createElement('div');
            activityInput.className = 'activity-input';
            activityInput.innerHTML = `
                <div class="input-group">
                    <input type="text" class="form-control activity-title" placeholder="عنوان المستند" required>
                </div>
                <div class="input-group">
                    <input type="file" class="form-control activity-file" accept=".pdf,video/*" required>
                </div>
                <button type="button" class="btn btn-danger" onclick="deleteCourseActivity(this, '')"><i class="fas fa-trash"></i></button>
            `;
            activitiesContainer.appendChild(activityInput);
        });
    }

    window.deleteCourseActivity = function (btn, activityId) {
        if (activityId && confirm('هل أنت متأكد من حذف المستند؟')) {
            fetch(`/api/activities/${activityId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    btn.parentElement.remove();
                    loadCourses();
                })
                .catch(err => console.error(err));
        } else if (confirm('هل أنت متأكد من حذف المستند؟')) {
            btn.parentElement.remove();
        }
    };

    const addExamButton = document.getElementById('addExamButton');
    if (addExamButton) {
        addExamButton.addEventListener('click', function () {
            const examsContainer = document.getElementById('examsContainer');
            const examInput = document.createElement('div');
            examInput.className = 'exam-input';
            examInput.innerHTML = `
                <div class="input-group">
                    <input type="text" class="form-control exam-title" placeholder="عنوان الاختبار" required>
                </div>
                <div class="input-group">
                    <input type="url" class="form-control exam-url" placeholder="رابط استبيان جوجل" required>
                </div>
                <button type="button" class="btn btn-danger" onclick="deleteCourseExam(this, '')"><i class="fas fa-trash"></i></button>
            `;
            examsContainer.appendChild(examInput);
        });
    }

    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = document.getElementById('userId').value;
            const username = sanitizeInput(document.getElementById('editUsername').value);
            const email = sanitizeInput(document.getElementById('editEmail').value);
            const password = sanitizeInput(document.getElementById('editPassword').value);
            const grade = sanitizeInput(document.getElementById('editGrade').value);

            const payload = { username, email, password, grade };

            fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadUsers();
                    userForm.reset();
                    const userModal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
                    if (userModal) userModal.hide();
                })
                .catch(err => console.error(err));
        });
    }

    window.deleteUser = function (userId) {
        if (confirm('هل أنت متأكد من حذف المستخدم؟')) {
            fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    location.reload();
                })
                .catch(err => console.error(err));
        }
    };

    window.editUser = function (user) {
        document.getElementById('userId').value = user.id;
        document.getElementById('editUsername').value = sanitizeInput(user.username);
        document.getElementById('editEmail').value = sanitizeInput(user.email);
        document.getElementById('editPassword').value = sanitizeInput(user.password);

        fetch('/api/grades', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(grades => {
                const gradeSelect = document.getElementById('editGrade');
                gradeSelect.innerHTML = '';
                grades.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = sanitizeInput(grade.name);
                    option.textContent = sanitizeInput(grade.name);
                    if (grade.name === user.grade) {
                        option.selected = true;
                    }
                    gradeSelect.appendChild(option);
                });
            })
            .catch(err => console.error('Error loading grades:', err));

        const userModal = new bootstrap.Modal(document.getElementById('userModal'));
        userModal.show();
    };

    window.banUser = function (userId) {
        if (confirm('هل أنت متأكد من حظر هذا المستخدم؟')) {
            fetch(`/api/users/${userId}/ban`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadUsers();
                })
                .catch(err => console.error(err));
        }
    };

    window.unbanUser = function (userId) {
        if (confirm('هل أنت متأكد من إلغاء حظر هذا المستخدم؟')) {
            fetch(`/api/users/${userId}/unban`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadUsers();
                })
                .catch(err => console.error(err));
        }
    };

    window.deleteCourse = function (courseId) {
        if (confirm('هل أنت متأكد من حذف الكورس؟')) {
            fetch(`/api/courses/${courseId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    location.reload();
                })
                .catch(err => console.error(err));
        }
    };

    window.editCourse = function (course) {
        document.getElementById('courseId').value = course.id;
        document.getElementById('courseTitle').value = sanitizeInput(course.title);
        document.getElementById('courseGrade').value = sanitizeInput(course.grade);
        document.getElementById('courseImageURL').value = sanitizeInput(course.imageURL);

        const videosContainer = document.getElementById('videosContainer');
        videosContainer.innerHTML = '';
        (course.videos || []).forEach(video => {
            const videoInput = document.createElement('div');
            videoInput.className = 'video-input';
            videoInput.innerHTML = `
                <input type="hidden" class="video-id" value="${sanitizeInput(video.id || '')}">
                <div class="input-group">
                    <input type="text" class="form-control video-title" placeholder="عنوان الفيديو" value="${sanitizeInput(video.title)}">
                </div>
                <div class="input-group">
                    <input type="url" class="form-control video-url" placeholder="رابط الفيديو" value="${sanitizeInput(video.url)}">
                </div>
                <button type="button" class="btn btn-danger" onclick="deleteCourseVideo(this, '${sanitizeInput(video.id || '')}')"><i class="fas fa-trash"></i></button>
            `;
            videosContainer.appendChild(videoInput);
        });

        const activitiesContainer = document.getElementById('activitiesContainer');
        activitiesContainer.innerHTML = '';
        (course.activities || []).forEach(activity => {
            const activityInput = document.createElement('div');
            activityInput.className = 'activity-input';
            activityInput.innerHTML = `
                <input type="hidden" class="activity-id" value="${sanitizeInput(activity.id || '')}">
                <div class="input-group">
                    <input type="text" class="form-control activity-title" placeholder="عنوان المستند" value="${sanitizeInput(activity.title)}" required>
                </div>
                <div class="input-group">
                    <input type="file" class="form-control activity-file" accept=".pdf,video/*">
                </div>
                <input type="hidden" class="existing-file-path" value="${sanitizeInput(activity.filePath)}">
                <button type="button" class="btn btn-danger" onclick="deleteCourseActivity(this, '${sanitizeInput(activity.id || '')}')"><i class="fas fa-trash"></i></button>
            `;
            activitiesContainer.appendChild(activityInput);
        });

        const examsContainer = document.getElementById('examsContainer');
        examsContainer.innerHTML = '';
        (course.exams || []).forEach(exam => {
            const examInput = document.createElement('div');
            examInput.className = 'exam-input';
            examInput.innerHTML = `
                <input type="hidden" class="exam-id" value="${sanitizeInput(exam.id || '')}">
                <div class="input-group">
                    <input type="text" class="form-control exam-title" placeholder="عنوان الاختبار" value="${sanitizeInput(exam.title)}" required>
                </div>
                <div class="input-group">
                    <input type="url" class="form-control exam-url" placeholder="رابط استبيان جوجل" value="${sanitizeInput(exam.googleFormUrl)}" required>
                </div>
                <button type="button" class="btn btn-danger" onclick="deleteCourseExam(this, '${sanitizeInput(exam.id || '')}')"><i class="fas fa-trash"></i></button>
            `;
            examsContainer.appendChild(examInput);
        });

        const courseModal = new bootstrap.Modal(document.getElementById('courseModal'));
        courseModal.show();
    };

    window.makeAdmin = function (userId) {
        if (confirm('هل أنت متأكد من ترقية هذا المستخدم إلى ادمن؟')) {
            fetch(`/api/users/${userId}/make-admin`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadUsers();
                })
                .catch(err => console.error(err));
        }
    };

    window.removeAdmin = function (userId) {
        if (confirm('هل أنت متأكد من إزالة صلاحية الادمن لهذا المستخدم؟')) {
            fetch(`/api/users/${userId}/remove-admin`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadUsers();
                })
                .catch(err => console.error(err));
        }
    };

    document.getElementById('prevUsersPage').addEventListener('click', () => {
        if (usersPage > 1) {
            usersPage--;
            document.getElementById('usersPageNumber').value = usersPage;
            loadUsers(usersPage);
        }
    });

    document.getElementById('nextUsersPage').addEventListener('click', () => {
        const totalPages = parseInt(document.getElementById('usersTotalPages').textContent);
        if (usersPage < totalPages) {
            usersPage++;
            document.getElementById('usersPageNumber').value = usersPage;
            loadUsers(usersPage);
        }
    });

    document.getElementById('usersPageNumber').addEventListener('change', (e) => {
        const page = parseInt(e.target.value);
        const totalPages = parseInt(document.getElementById('usersTotalPages').textContent);
        if (page >= 1 && page <= totalPages) {
            usersPage = page;
            loadUsers(usersPage);
        } else {
            e.target.value = usersPage;
        }
    });

    document.getElementById('prevUsersPage').classList.add('btn', 'btn-outline-primary', 'me-2');
    document.getElementById('nextUsersPage').classList.add('btn', 'btn-outline-primary', 'ms-2');

    document.getElementById('prevCoursesPage').addEventListener('click', () => {
        if (coursesPage > 1) {
            coursesPage--;
            document.getElementById('coursesPageNumber').value = coursesPage;
            loadCourses(coursesPage);
        }
    });

    document.getElementById('nextCoursesPage').addEventListener('click', () => {
        const totalPages = parseInt(document.getElementById('coursesTotalPages').textContent);
        if (coursesPage < totalPages) {
            coursesPage++;
            document.getElementById('coursesPageNumber').value = coursesPage;
            loadCourses(coursesPage);
        }
    });

    document.getElementById('coursesPageNumber').addEventListener('change', (e) => {
        const page = parseInt(e.target.value);
        const totalPages = parseInt(document.getElementById('coursesTotalPages').textContent);
        if (page >= 1 && page <= totalPages) {
            coursesPage = page;
            loadCourses(coursesPage);
        } else {
            e.target.value = coursesPage;
        }
    });

    document.getElementById('prevCoursesPage').classList.add('btn', 'btn-outline-primary', 'me-2');
    document.getElementById('nextCoursesPage').classList.add('btn', 'btn-outline-primary', 'ms-2');

    document.getElementById('prevGradesPage').addEventListener('click', () => {
        if (gradesPage > 1) {
            gradesPage--;
            document.getElementById('gradesPageNumber').value = gradesPage;
            loadGrades(gradesPage);
        }
    });

    document.getElementById('nextGradesPage').addEventListener('click', () => {
        const totalPages = parseInt(document.getElementById('gradesTotalPages').textContent);
        if (gradesPage < totalPages) {
            gradesPage++;
            document.getElementById('gradesPageNumber').value = gradesPage;
            loadGrades(gradesPage);
        }
    });

    document.getElementById('gradesPageNumber').addEventListener('change', (e) => {
        const page = parseInt(e.target.value);
        const totalPages = parseInt(document.getElementById('gradesTotalPages').textContent);
        if (page >= 1 && page <= totalPages) {
            gradesPage = page;
            loadGrades(gradesPage);
        } else {
            e.target.value = gradesPage;
        }
    });

    document.getElementById('prevGradesPage').classList.add('btn', 'btn-outline-primary', 'me-2');
    document.getElementById('nextGradesPage').classList.add('btn', 'btn-outline-primary', 'ms-2');

    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const username = sanitizeInput(document.getElementById('newUsername').value);
            const email = sanitizeInput(document.getElementById('newEmail').value);
            const password = sanitizeInput(document.getElementById('newPassword').value);
            const grade = sanitizeInput(document.getElementById('newGrade').value);

            if (window.allUsers && window.allUsers.find(user => user.email === email)) {
                alert('البريد الإلكتروني موجود مسبقًا');
                return;
            }

            fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, grade })
            })
                .then(response => response.json().then(data => ({ status: response.status, body: data })))
                .then(res => {
                    alert(res.body.message);
                    if (res.status === 200) {
                        loadUsers();
                        addStudentForm.reset();
                        const addStudentModal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
                        if (addStudentModal) addStudentModal.hide();
                    }
                })
                .catch(err => console.error(err));
        });
    }

    const notificationForm = document.getElementById('notificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = document.getElementById('notificationId').value;
            const title = sanitizeInput(document.getElementById('notificationTitle').value);
            const content = sanitizeInput(document.getElementById('notificationContent').value);
            const payload = { title, content };

            const method = id ? 'PUT' : 'POST';
            const urlEndpoint = id ? `/api/notifications/${id}` : '/api/notifications';

            fetch(urlEndpoint, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadNotifications();
                    notificationForm.reset();
                    document.getElementById('notificationId').value = '';
                    const notificationModal = bootstrap.Modal.getInstance(document.getElementById('notificationModal'));
                    if (notificationModal) notificationModal.hide();
                })
                .catch(err => console.error(err));
        });
    }

    window.deleteNotification = function (notificationId) {
        if (confirm('هل أنت متأكد من حذف الإشعار؟')) {
            fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadNotifications();
                })
                .catch(err => console.error(err));
        }
    };

    window.editNotification = function (notification) {
        document.getElementById('notificationId').value = notification.id;
        document.getElementById('notificationTitle').value = sanitizeInput(notification.title);
        document.getElementById('notificationContent').value = sanitizeInput(notification.content);

        const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
        notificationModal.show();
    };

    document.getElementById('prevNotificationsPage').addEventListener('click', () => {
        if (notificationsPage > 1) {
            notificationsPage--;
            document.getElementById('notificationsPageNumber').value = notificationsPage;
            loadNotifications(notificationsPage);
        }
    });

    document.getElementById('nextNotificationsPage').addEventListener('click', () => {
        const totalPages = parseInt(document.getElementById('notificationsTotalPages').textContent);
        if (notificationsPage < totalPages) {
            notificationsPage++;
            document.getElementById('notificationsPageNumber').value = notificationsPage;
            loadNotifications(notificationsPage);
        }
    });

    document.getElementById('notificationsPageNumber').addEventListener('change', (e) => {
        const page = parseInt(e.target.value);
        const totalPages = parseInt(document.getElementById('notificationsTotalPages').textContent);
        if (page >= 1 && page <= totalPages) {
            notificationsPage = page;
            loadNotifications(notificationsPage);
        } else {
            e.target.value = notificationsPage;
        }
    });

    const sidebarToggle = document.getElementById("sidebarToggle");
    sidebarToggle.addEventListener("click", function () {
        const wrapper = document.getElementById("wrapper");
        wrapper.classList.toggle("toggled");
        const pageContentWrapper = document.getElementById("page-content-wrapper");
        pageContentWrapper.classList.toggle("toggled");

        if (window.innerWidth <= 768) {
            if (wrapper.classList.contains("toggled")) {
                wrapper.style.transform = "translateY(0)";
                pageContentWrapper.style.display = "block";
            } else {
                wrapper.style.transform = "translateY(0)";
                pageContentWrapper.style.display = "block";
            }
        }
    });

    window.deleteCourseExam = function (btn, examId) {
        if (examId && confirm('هل أنت متأكد من حذف الاختبار؟')) {
            fetch(`/api/exams/${examId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    btn.parentElement.remove();
                    loadCourses();
                })
                .catch(err => console.error(err));
        } else if (confirm('هل أنت متأكد من حذف الاختبار؟')) {
            btn.parentElement.remove();
        }
    };
});
