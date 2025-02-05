document.addEventListener('DOMContentLoaded', async function () {
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;

    // Load grade list in registration form
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

    // Check protected pages (dashboard.html, admin.html, course.html)
    if (currentPath.endsWith('dashboard.html') || currentPath.endsWith('admin.html') || currentPath.endsWith('course.html')) {
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Determine the endpoint for authentication
            const endpoint = currentPath.endsWith('admin.html') ? '/api/admin/dashboard' : '/api/dashboard';
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                localStorage.removeItem('token'); // Remove token if invalid
                window.location.href = 'login.html';
                return;
            }

            const data = await response.json();

            // If the page is for admin but the user is not an admin
            if (currentPath.endsWith('admin.html') && !data.user.isAdmin) {
                window.location.href = 'login.html';
                return;
            }

            // Fetch and display courses in the dashboard
            if (currentPath.endsWith('dashboard.html')) {
                const grade = data.user.grade;
                const coursesResponse = await fetch(`/api/courses?grade=${grade}`);
                const courses = await coursesResponse.json();
                const coursesList = document.getElementById('coursesGrid');
                coursesList.innerHTML = '';
                courses.forEach(course => {
                    const card = document.createElement('div');
                    card.className = 'col-md-4';
                    card.innerHTML = `
                        <div class="card">
                            <img src="${course.imageURL}" class="card-img-top" alt="${course.title}">
                            <div class="card-body">
                                <h5 class="card-title">${course.title}</h5>
                                <p class="card-text">${course.grade}</p>
                                <button class="btn btn-primary" onclick="viewCourseDetails(${course.id})">View Course Details</button>
                            </div>
                        </div>
                    `;
                    coursesList.appendChild(card);
                });

                fetchCourses();

                // Add event listener to the search input
                document.getElementById('courseSearch').addEventListener('input', function (e) {
                    const searchTerm = e.target.value.toLowerCase();
                    filterCourses(searchTerm);
                });
            }

            // Fetch and display course details in course.html
            if (currentPath.endsWith('course.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                const courseId = urlParams.get('id');

                if (courseId) {
                    try {
                        // If the course page requires a token to fetch its data, you can add it as well
                        const courseResponse = await fetch(`/api/courses/${courseId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (!courseResponse.ok) {
                            throw new Error('Network response was not ok');
                        }
                        const course = await courseResponse.json();
                        document.getElementById('courseTitle').textContent = course.title;
                        document.getElementById('courseImage').src = course.imageURL;
                        document.getElementById('courseVideo').src = course.videoURL;

                        // (Optional) Display the grade value in the console for verification
                        console.log('Grade value in course data:', course.grade);

                        // Populate the video list
                        const videosList = document.getElementById('videosList');
                        videosList.innerHTML = '';
                        if (course.videos && course.videos.length) {
                            course.videos.forEach((video, index) => {
                                const li = document.createElement('li');
                                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                                const addedDate = new Date(video.addedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
                                li.innerHTML = `<div>
                                    <strong>Lecture ${index + 1}:</strong> ${video.title}
                                </div>
                                <div class="video-duration">${addedDate}</div>`;
                                li.addEventListener('click', function () {
                                    document.getElementById('courseVideo').src = video.url;
                                });
                                videosList.appendChild(li);
                            });
                        } else {
                            videosList.innerHTML = '<li class="list-group-item">No videos available</li>';
                        }

                        // Add event listener for videos header
                        const videosHeader = document.querySelector('.videos-header');
                        if (videosHeader) {
                            videosHeader.addEventListener('click', function () {
                                videosList.classList.toggle('d-none');
                            });
                        }

                        // Populate the activities and assignments list
                        const activitiesList = document.getElementById('activitiesList');
                        activitiesList.innerHTML = '';
                        if (course.activities && course.activities.length) {
                            course.activities.forEach((activity, index) => {
                                const li = document.createElement('li');
                                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                                const addedDate = new Date(activity.addedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
                                li.innerHTML = `<div>
                                    <strong>Document ${index + 1}:</strong> ${activity.title}
                                </div>
                                <a href="${activity.filePath}" class="btn btn-primary" download>Download</a>`;
                                activitiesList.appendChild(li);
                            });
                        } else {
                            activitiesList.innerHTML = '<li class="list-group-item">No activities or assignments available</li>';
                        }

                        // Add event listener for activities header
                        const activitiesHeader = document.querySelector('.activities-header');
                        if (activitiesHeader) {
                            activitiesHeader.addEventListener('click', function () {
                                activitiesList.classList.toggle('d-none');
                            });
                        }

                        // Populate the exams list with Authorization header
                        const examsList = document.getElementById('examsList');
                        examsList.innerHTML = '';
                        const examURL = course.grade
                            ? `/api/exams?courseId=${courseId}&grade=${course.grade}`
                            : `/api/exams?courseId=${courseId}`;
                        const examsResponse = await fetch(examURL, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (!examsResponse.ok) {
                            throw new Error(`Network response was not ok: ${examsResponse.statusText}`);
                        }
                        const { exams } = await examsResponse.json();
                        if (exams && exams.length) {
                            exams.forEach((exam, index) => {
                                const li = document.createElement('li');
                                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                                const addedDate = new Date(exam.addedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
                                li.innerHTML = `<div>
                                    <strong>Exam ${index + 1}:</strong> ${exam.title}
                                </div>
                                <button class="btn btn-primary" onclick="viewExam('${exam.googleFormUrl}')">View</button>`;
                                examsList.appendChild(li);
                            });
                        } else {
                            examsList.innerHTML = '<li class="list-group-item">No exams available</li>';
                        }
                    } catch (err) {
                        console.error('Error fetching exam data:', err);
                        alert(`Error fetching exam data: ${err.message}`);
                    }
                } else {
                    alert('Course ID not found');
                }
            }
        } catch (error) {
            console.error('Error during authentication:', error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }

    // Update navigation links based on login status
    const navLinks = document.getElementById('navLinks');
    if (token) {
        navLinks.innerHTML = `
            <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="dashboard.html">Dashboard</a></li>
            <li class="nav-item"><a class="nav-link" href="#" id="logoutLink">Logout</a></li>
        `;
        document.getElementById('logoutLink').addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
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

    async function fetchCourses() {
        try {
            const response = await fetch('/api/courses');
            const courses = await response.json();
            displayCourses(courses);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    }

    function displayCourses(courses) {
        const coursesGrid = document.getElementById('coursesGrid');
        coursesGrid.innerHTML = '';

        courses.forEach(course => {
            const courseImage = course.imageURL || 'images/course-placeholder.jpg';
            const courseCard = document.createElement('div');
            courseCard.className = 'col-md-4 course-card';
            courseCard.innerHTML = `
                <div class="card shadow-sm">
                    <img src="${courseImage}" class="card-img-top" alt="${course.title}">
                    <div class="card-body">
                        <h5 class="card-title">${course.title}</h5>
                        <p class="card-text">${course.grade}</p>
                        <a href="course.html?id=${course.id}" class="btn btn-primary">View Details</a>
                    </div>
                </div>
            `;
            coursesGrid.appendChild(courseCard);
        });
    }

    function filterCourses(searchTerm) {
        const courses = document.querySelectorAll('.course-card');
        courses.forEach(course => {
            const title = course.querySelector('.card-title').textContent.toLowerCase();
            if (title.includes(searchTerm)) {
                course.style.display = 'block';
            } else {
                course.style.display = 'none';
            }
        });
    }
}); // End of DOMContentLoaded event listener

// Additional functions outside the event

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

// Handle login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = sanitizeInput(document.getElementById('email').value);
        const password = sanitizeInput(document.getElementById('password').value);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                if (data.user.isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error('Error during login:', err);
            alert('An error occurred during login. Please try again.');
        }
    });
}

// Handle registration form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = sanitizeInput(document.getElementById('username').value);
        if (username.length > 16) {
            alert('Username must not exceed 16 characters');
            return;
        }
        const email = sanitizeInput(document.getElementById('email').value);
        const password = sanitizeInput(document.getElementById('password').value);
        const grade = document.getElementById('grade').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, grade })
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                window.location.href = 'login.html';
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error('Error during registration:', err);
            alert('An error occurred during registration. Please try again.');
        }
    });
}

// Handle logout from other pages
const logoutLink = document.querySelector('a[href="/logout"]');
if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
};
