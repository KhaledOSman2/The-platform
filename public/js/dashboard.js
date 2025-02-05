document.addEventListener('DOMContentLoaded', function () {
    // تحميل قائمة الكورسات
    fetch('/api/courses?grade=الصف الأول الثانوي')
        .then(response => response.json())
        .then(courses => {
            const coursesList = document.getElementById('coursesList');
            coursesList.innerHTML = '';
            courses.forEach(course => {
                const li = document.createElement('li');
                li.classList.add('list-group-item');
                li.innerHTML = `<a href="#" data-id="${sanitizeInput(course.id)}">${sanitizeInput(course.title)}</a>`;
                li.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadCourse(course.id);
                });
                coursesList.appendChild(li);
            });
        })
        .catch(err => console.error(err));

    // تحميل تفاصيل دورة معينة
    function loadCourse(courseId) {
        fetch(`/api/courses/${sanitizeInput(courseId)}`)
            .then(response => response.json())
            .then(course => {
                document.getElementById('courseTitle').textContent = sanitizeInput(course.title);
                document.getElementById('courseVideo').src = sanitizeInput(course.videoURL);
                // تعبئة قائمة الفيديوهات (في هذا المثال نفترض أن course.videos مصفوفة)
                const videosList = document.getElementById('videosList');
                videosList.innerHTML = '';
                if (course.videos && course.videos.length) {
                    course.videos.forEach((video, index) => {
                        const li = document.createElement('li');
                        li.classList.add('list-group-item');
                        li.innerHTML = `<a href="#" data-video="${sanitizeInput(video.url)}">الفيديو ${index + 1}: ${sanitizeInput(video.title)}</a>`;
                        li.addEventListener('click', (e) => {
                            e.preventDefault();
                            document.getElementById('courseVideo').src = sanitizeInput(video.url);
                        });
                        videosList.appendChild(li);
                    });
                } else {
                    videosList.innerHTML = '<li class="list-group-item">لا توجد فيديوهات متاحة</li>';
                }
            })
            .catch(err => console.error(err));
    }
});

// دالة لتصفية المدخلات
function sanitizeInput(input) {
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
}
