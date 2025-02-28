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
                alert('انتهت صلاحية الجلسة الرجاء تسجيل الدخول مرة أخرى.');
                return;
            }

        } catch (error) {
            console.error('حدث خطأ أثناء التحقق من الهوية:', error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            alert('انتهت صلاحية الجلسة الرجاء تسجيل الدخول مرة أخرى.');
        }
    }
});

