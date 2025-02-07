document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const itemsPerPage = 10; // عدد العناصر في كل صفحة
    let usersPage = 1;
    let coursesPage = 1;
    let gradesPage = 1;
    let examsPage = 1;

    // تحميل المستخدمين
    function loadUsers(page = 1) {
        fetch('/api/users', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(users => {
                // تخزين المستخدمين في متغير عام للفحص لاحقًا
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
                    tr.classList.add('table-light'); // Add class for better design
                    tr.innerHTML = `
                        <td>${user.username} ${user.isAdmin ? '⭐' : ''}</td>
                        <td>${user.email}</td>
                        <td>${user.grade || 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-1" onclick='editUser(${JSON.stringify(user)})'>تعديل</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">حذف</button>
                            ${user.isBanned ? `<button class="btn btn-sm btn-success" onclick="unbanUser(${user.id})">إلغاء الحظر</button>` : `<button class="btn btn-sm btn-danger" onclick="banUser(${user.id})">حظر</button>`}
                            ${user.isAdmin ? `<button class="btn btn-sm btn-secondary" onclick="removeAdmin(${user.id})">إزالة صلاحية المسؤول</button>` : `<button class="btn btn-sm btn-primary" onclick="makeAdmin(${user.id})">ترقية إلى مسؤول</button>`}
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error(err));
    }

    // تحميل الكورسات
    function loadCourses(page = 1) {
        fetch('/api/all-courses', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(courses => {
                // تخزين الكورسات في متغير عام للفحص لاحقًا
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
                    tr.classList.add('table-light'); // Add class for better design
                    tr.innerHTML = `
                        <td>
                            <img src="${course.imageURL}" alt="${course.title}" class="img-thumbnail" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px;">
                            ${course.title}
                        </td>
                        <td>${course.grade}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-1" onclick='editCourse(${JSON.stringify(course).replace(/"/g, '&quot;')})'>تعديل</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCourse(${course.id})">حذف</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error(err));
    }

    // تحميل الإحصائيات
    function loadAnalytics() {
        fetch('/api/analytics', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById('totalUsers').textContent = data.totalUsers;
                document.getElementById('totalCourses').textContent = data.totalCourses;
                document.getElementById('totalActivities').textContent = data.totalActivities || 0;
                document.getElementById('totalExams').textContent = data.totalExams || 0;
            })
            .catch(err => console.error(err));
    }

    // تحميل قائمة الصفوف الدراسية
    function loadGrades(page = 1) {
        fetch('/api/grades', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(grades => {
                const totalPages = Math.ceil(grades.length / itemsPerPage);
                document.getElementById('gradesTotalPages').textContent = totalPages;
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedGrades = grades.slice(start, end);

                // تعبئة قائمة اختيار الصفوف في نموذج الدورة
                const gradeSelect = document.getElementById('courseGrade');
                if (gradeSelect) {
                    gradeSelect.innerHTML = '';
                    grades.forEach(grade => {
                        const option = document.createElement('option');
                        option.value = grade.name;
                        option.textContent = grade.name;
                        gradeSelect.appendChild(option);
                    });
                }

                // تعبئة جدول الصفوف الدراسية
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
                        tr.classList.add('table-light'); // Add class for better design
                        tr.innerHTML = `
                            <td>${grade.name}</td>
                            <td>${studentsCount}</td>
                            <td>${coursesCount}</td>
                            <td>${examsCount}</td>
                            <td>${activitiesCount}</td>
                             <td>${gradevideoCount}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deleteGrade(${grade.id})">حذف</button>
                            </td>
                        `;
                        gradesTableBody.appendChild(tr);
                    });
                }
            })
            .catch(err => console.error(err));
    }

    // تحميل الامتحانات
    function loadExams(page = 1) {
        fetch('/api/all-exams', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(exams => {
                const totalPages = Math.ceil(exams.length / itemsPerPage);
                document.getElementById('examsTotalPages').textContent = totalPages;
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const paginatedExams = exams.slice(start, end);

                const tbody = document.querySelector('#examsTable tbody');
                tbody.innerHTML = '';
                paginatedExams.forEach(exam => {
                    const tr = document.createElement('tr');
                    tr.classList.add('table-light'); // Add class for better design
                    tr.innerHTML = `
                        <td>${exam.title}</td>
                        <td>${exam.grade}</td>
                        <td>${exam.courseTitle}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-1" onclick='editExam(${JSON.stringify(exam)})'>تعديل</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteExam(${exam.id})">حذف</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error(err));
    }

    // بدء تحميل البيانات عند الدخول
    loadUsers();
    loadCourses();
    loadAnalytics();
    loadGrades();
    loadExams();

    // معالجة نموذج إضافة صف دراسي
    const gradeForm = document.getElementById('gradeForm');
    if (gradeForm) {
        gradeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('gradeName').value;

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

    // دالة لحذف صف دراسي
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

    // دالة لتصفية المدخلات
    function sanitizeInput(input) {
        const temp = document.createElement('div');
        temp.textContent = input;
        return temp.innerHTML;
    }

    // معالجة نموذج إضافة/تعديل دورة
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // قراءة القيم من النموذج
            const id = document.getElementById('courseId').value;
            const title = sanitizeInput(document.getElementById('courseTitle').value);
            const grade = document.getElementById('courseGrade').value;
            const courseImageInput = document.getElementById('courseImage');
            const courseImage = courseImageInput ? courseImageInput.files[0] : null;

            // قراءة بيانات الفيديوهات
            const videos = Array.from(document.querySelectorAll('.video-input')).map(input => {
                const videoTitle = sanitizeInput(input.querySelector('.video-title').value);
                const videoUrl = input.querySelector('.video-url').value;
                return { title: videoTitle, url: videoUrl };
            });

            // قراءة بيانات الأنشطة
            const activities = [];
            for (const input of document.querySelectorAll('.activity-input')) {
                const activityTitle = sanitizeInput(input.querySelector('.activity-title').value);
                const activityFile = input.querySelector('.activity-file').files[0];
                if (activityFile) {
                    const formData = new FormData();
                    formData.append('activityFile', activityFile);
                    const response = await fetch('/api/uploadActivity', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData
                    });
                    const data = await response.json();
                    activities.push({ title: activityTitle, filePath: data.filePath, addedDate: new Date().toISOString() });
                } else {
                    const existingFilePath = input.querySelector('.existing-file-path').value;
                    activities.push({ title: activityTitle, filePath: existingFilePath });
                }
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('grade', grade);
            if (courseImage) {
                formData.append('courseImage', courseImage);
            } else if (id) {
                // إذا كانت الدورة موجودة بالفعل ولم يتم تحميل صورة جديدة، احتفظ بالصورة الحالية
                formData.append('existingImageURL', document.getElementById('courseImageURL').value);
            }
            formData.append('videos', JSON.stringify(videos));
            formData.append('activities', JSON.stringify(activities));

            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/courses/${id}` : '/api/courses';

            fetch(url, {
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
                    const courseModal = bootstrap.Modal.getInstance(document.getElementById('courseModal'));
                    if (courseModal) courseModal.hide();
                })
                .catch(err => console.error(err));
        });
    }

    // إضافة فيديو جديد
    const addVideoButton = document.getElementById('addVideoButton');
    if (addVideoButton) {
        addVideoButton.addEventListener('click', function () {
            const videosContainer = document.getElementById('videosContainer');
            const videoInput = document.createElement('div');
            videoInput.className = 'video-input mb-3 d-flex align-items-center';
            videoInput.innerHTML = `
                <input type="text" class="form-control video-title mb-2 me-2" placeholder="عنوان الفيديو">
                <input type="url" class="form-control video-url me-2" placeholder="رابط الفيديو">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">حذف</button>
            `;
            videosContainer.appendChild(videoInput);
        });
    }

    // Add delete button to activity inputs
    const addActivityButton = document.getElementById('addActivityButton');
    if (addActivityButton) {
        addActivityButton.addEventListener('click', function () {
            const activitiesContainer = document.getElementById('activitiesContainer');
            const activityInput = document.createElement('div');
            activityInput.className = 'activity-input mb-3 d-flex align-items-center';
            activityInput.innerHTML = `
                <input type="text" class="form-control activity-title mb-2 me-2" placeholder="عنوان المستند" required>
                <input type="file" class="form-control activity-file me-2" accept=".pdf,video/*" required>
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">حذف</button>
            `;
            activitiesContainer.appendChild(activityInput);
        });
    }

    // معالجة نموذج تعديل المستخدم (الطالب)
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = document.getElementById('userId').value;
            const username = document.getElementById('editUsername').value;
            const email = document.getElementById('editEmail').value;
            const password = document.getElementById('editPassword').value;
            const grade = document.getElementById('editGrade').value;

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

    // دوال التعامل مع المستخدمين
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
        // تعبئة النموذج ببيانات المستخدم
        document.getElementById('userId').value = user.id;
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editPassword').value = user.password;

        // تحميل الصفوف الدراسية وتعبئة القائمة
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
                    option.value = grade.name;
                    option.textContent = grade.name;
                    if (grade.name === user.grade) {
                        option.selected = true;
                    }
                    gradeSelect.appendChild(option);
                });
            })
            .catch(err => console.error('Error loading grades:', err));

        // فتح المودال
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

    // دوال التعامل مع الدورات
    window.deleteCourse = function (courseId) {
        if (confirm('هل أنت متأكد من حذف الدورة؟')) {
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
        // تعبئة بيانات الدورة
        document.getElementById('courseId').value = course.id;
        document.getElementById('courseTitle').value = course.title;
        document.getElementById('courseGrade').value = course.grade;
        // تعيين عنوان الصورة الحالي في الحقل المخفي
        document.getElementById('courseImageURL').value = course.imageURL;

        const videosContainer = document.getElementById('videosContainer');
        videosContainer.innerHTML = '';
        (course.videos || []).forEach(video => {
            const videoInput = document.createElement('div');
            videoInput.className = 'video-input mb-3 d-flex align-items-center';
            videoInput.innerHTML = `
                <input type="text" class="form-control video-title mb-2 me-2" placeholder="عنوان الفيديو" value="${video.title.replace(/&quot;/g, '')}">
                <input type="url" class="form-control video-url me-2" placeholder="رابط الفيديو" value="${video.url}">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">حذف</button>
            `;
            videosContainer.appendChild(videoInput);
        });

        const activitiesContainer = document.getElementById('activitiesContainer');
        activitiesContainer.innerHTML = '';
        (course.activities || []).forEach(activity => {
            const activityInput = document.createElement('div');
            activityInput.className = 'activity-input mb-3 d-flex align-items-center';
            activityInput.innerHTML = `
                <input type="text" class="form-control activity-title mb-2 me-2" placeholder="عنوان المستند" value="${activity.title.replace(/&quot;/g, '')}" required>
                <input type="file" class="form-control activity-file me-2" accept=".pdf,video/*">
                <input type="hidden" class="existing-file-path" value="${activity.filePath}">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">حذف</button>
            `;
            activitiesContainer.appendChild(activityInput);
        });

        // فتح المودال
        const courseModal = new bootstrap.Modal(document.getElementById('courseModal'));
        courseModal.show();
    };

    window.makeAdmin = function (userId) {
        if (confirm('هل أنت متأكد من ترقية هذا المستخدم إلى مسؤول؟')) {
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
        if (confirm('هل أنت متأكد من إزالة صلاحية المسؤول لهذا المستخدم؟')) {
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

    // تحميل قائمة الصفوف الدراسية في نموذج إضافة اختبار جديد
    fetch('/api/grades')
        .then(response => response.json())
        .then(grades => {
            const gradeSelect = document.getElementById('examGrade');
            gradeSelect.innerHTML = '';
            grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade.name;
                option.textContent = grade.name;
                gradeSelect.appendChild(option);
            });
        })
        .catch(err => console.error('Error loading grades:', err));

    // تحميل قائمة الدورات بناءً على الصف الدراسي المحدد
    document.getElementById('examGrade').addEventListener('change', function () {
        const grade = this.value;
        fetch(`/api/courses?grade=${grade}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(courses => {
                const courseSelect = document.getElementById('examCourse');
                courseSelect.innerHTML = '';
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = course.title;
                    courseSelect.appendChild(option);
                });
            })
            .catch(err => console.error('Error loading courses:', err));
    });

    // معالجة نموذج إضافة/تعديل اختبار جديد
    const examForm = document.getElementById('examForm');
    if (examForm) {
        examForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = document.getElementById('examId').value;
            const title = sanitizeInput(document.getElementById('examTitle').value);
            const grade = document.getElementById('examGrade').value;
            const courseId = document.getElementById('examCourse').value;
            const googleFormUrl = document.getElementById('googleFormUrl').value;

            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/exams/${id}` : '/api/exams';

            fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title, grade, courseId, googleFormUrl })
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadExams(); // إعادة تحميل قائمة الامتحانات بعد الإضافة
                    examForm.reset();
                    document.getElementById('examId').value = '';
                    const examModal = bootstrap.Modal.getInstance(document.getElementById('examModal'));
                    if (examModal) examModal.hide();
                })
                .catch(err => console.error(err));
        });
    }

    // دالة لحذف امتحان
    window.deleteExam = function (examId) {
        if (confirm('هل أنت متأكد من حذف الامتحان؟')) {
            fetch(`/api/exams/${examId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(res => {
                    alert(res.message);
                    loadExams();
                })
                .catch(err => console.error(err));
        }
    };

    // دالة لتعديل امتحان
    window.editExam = function (exam) {
        document.getElementById('examId').value = exam.id;
        document.getElementById('examTitle').value = exam.title;
        document.getElementById('examGrade').value = exam.grade;
        document.getElementById('examCourse').value = exam.courseId;
        document.getElementById('googleFormUrl').value = exam.googleFormUrl;

        const examModal = new bootstrap.Modal(document.getElementById('examModal'));
        examModal.show();
    };

    document.getElementById('prevExamsPage').addEventListener('click', () => {
        if (examsPage > 1) {
            examsPage--;
            document.getElementById('examsPageNumber').value = examsPage;
            loadExams(examsPage);
        }
    });

    document.getElementById('nextExamsPage').addEventListener('click', () => {
        const totalPages = parseInt(document.getElementById('examsTotalPages').textContent);
        if (examsPage < totalPages) {
            examsPage++;
            document.getElementById('examsPageNumber').value = examsPage;
            loadExams(examsPage);
        }
    });

    document.getElementById('examsPageNumber').addEventListener('change', (e) => {
        const page = parseInt(e.target.value);
        const totalPages = parseInt(document.getElementById('examsTotalPages').textContent);
        if (page >= 1 && page <= totalPages) {
            examsPage = page;
            loadExams(examsPage);
        } else {
            e.target.value = examsPage;
        }
    });

    document.getElementById('prevExamsPage').classList.add('btn', 'btn-outline-primary', 'me-2');
    document.getElementById('nextExamsPage').classList.add('btn', 'btn-outline-primary', 'ms-2');

    // إضافة وظيفة البحث للامتحانات
    const examSearch = document.getElementById('examSearch');
    examSearch.addEventListener('input', function () {
        const searchTerm = examSearch.value.toLowerCase();
        const rows = document.querySelectorAll('#examsTable tbody tr');
        rows.forEach(row => {
            const title = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
            const grade = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const courseTitle = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
            if (title.includes(searchTerm) || grade.includes(searchTerm) || courseTitle.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // معالجة نموذج إضافة طالب جديد
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const username = sanitizeInput(document.getElementById('newUsername').value);
            const email = sanitizeInput(document.getElementById('newEmail').value);
            const password = sanitizeInput(document.getElementById('newPassword').value);
            const grade = document.getElementById('newGrade').value;

            // فحص إذا كان البريد موجود مسبقاً ضمن قائمة المستخدمين المحملة
            if (window.allUsers && window.allUsers.find(user => user.email === email)) {
                alert('البريد الإلكتروني مستخدم بالفعل');
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
                        loadUsers(); // إعادة تحميل قائمة المستخدمين بعد الإضافة
                        addStudentForm.reset();
                        const addStudentModal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
                        if (addStudentModal) addStudentModal.hide();
                    }
                })
                .catch(err => console.error(err));
        });
    }

    // Initial load (مرة أخرى لضمان تحميل البيانات)
    loadUsers();
    loadCourses();
    loadAnalytics();
    loadGrades();
    loadExams();

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
});
