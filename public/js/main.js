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
                localStorage.removeItem('token'); // حذف التوكن إذا كان غير صالح
                window.location.href = 'login.html';
                return;
            }

        } catch (error) {
            console.error('حدث خطأ أثناء التحقق من الهوية:', error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }


    // Add event listeners for headers to toggle visibility of content sections
    const videosHeader = document.querySelector('.videos-header');
    const activitiesHeader = document.querySelector('.activities-header');
    const examsHeader = document.querySelector('.exams-header');

    if (videosHeader) {
        videosHeader.addEventListener('click', function () {
            const cardBody = document.getElementById('videosList');
            cardBody.classList.toggle('show');
            this.classList.toggle('collapsed');
        });
    }

    if (activitiesHeader) {
        activitiesHeader.addEventListener('click', function () {
            const cardBody = document.getElementById('activitiesList');
            cardBody.classList.toggle('show');
            this.classList.toggle('collapsed');
        });
    }

    if (examsHeader) {
        examsHeader.addEventListener('click', function () {
            const cardBody = document.getElementById('examsList');
            cardBody.classList.toggle('show');
            this.classList.toggle('collapsed');
        });
    }

}); // نهاية event listener لـ DOMContentLoaded

// الدوال الإضافية خارج الحدث

function viewCourseDetails(courseId) {
    window.location.href = `course.html?id=${courseId}`;
}

function viewExam(googleFormUrl) {
    const examModal = new bootstrap.Modal(document.getElementById('examModal'));
    document.getElementById('examIframe').src = googleFormUrl;
    examModal.show();
}

function sanitizeInput(input) {
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
}
