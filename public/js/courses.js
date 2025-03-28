 document.addEventListener('DOMContentLoaded', async function () {
            try {
                // Fetch all grades from the API
                const gradesResponse = await fetch('/api/grades');
                const grades = await gradesResponse.json();
                const gradeOrder = grades.map(grade => grade.name);

                // Fetch all courses from the API
                const coursesResponse = await fetch('/api/all-courses');
                const courses = await coursesResponse.json();

                // Show noCoursesMessage if no courses are available
                const noCoursesMessage = document.getElementById('noCoursesMessage');
                if (courses.length === 0) {
                    noCoursesMessage.style.display = 'block';
                } else {
                    noCoursesMessage.style.display = 'none';
                }

                const coursesByGrade = {};
                // Categorize courses by grade
                courses.forEach(course => {
                    if (!coursesByGrade[course.grade]) {
                        coursesByGrade[course.grade] = [];
                    }
                    coursesByGrade[course.grade].push(course);
                });

                const coursesByGradeContainer = document.getElementById('coursesByGrade');
                const gradeFilterDropdown = document.getElementById('gradeFilter');

                // Add options to the dropdown (besides "all" option)
                gradeOrder.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade;
                    option.textContent = grade;
                    gradeFilterDropdown.appendChild(option);
                });

                // Function to render courses based on selected grade
                function renderCourses(filterGrade) {
                    coursesByGradeContainer.innerHTML = ''; // Clear previous content

                    if (filterGrade === 'all') {
                        let hasCourses = false;
                        gradeOrder.forEach(grade => {
                            if (coursesByGrade[grade] && coursesByGrade[grade].length > 0) {
                                createGradeSection(grade, coursesByGrade[grade]);
                                hasCourses = true;
                            }
                        });
                        // Show noCoursesMessage if no courses found in any grade
                        noCoursesMessage.style.display = hasCourses ? 'none' : 'block';
                    } else {
                        if (coursesByGrade[filterGrade] && coursesByGrade[filterGrade].length > 0) {
                            createGradeSection(filterGrade, coursesByGrade[filterGrade]);
                            noCoursesMessage.style.display = 'none';
                        } else {
                            coursesByGradeContainer.innerHTML = '';
                            noCoursesMessage.style.display = 'block';
                        }
                    }
                }

                // Modified function: sort courses descending and add a new badge to the newest course.
                function createGradeSection(grade, coursesArray) {
                    coursesArray = coursesArray.slice().reverse();
                    const gradeSection = document.createElement('div');
                    gradeSection.className = 'mb-5';
                    gradeSection.innerHTML = `
                            <div class="grade-title">${grade}</div>
                            <div class="row g-4">
                                ${coursesArray.map((course, index) => {
                        const badge = (index === 0)
                            ? `<div class="position-absolute top-0 start-0 m-3">
                    <span class="badge bg-danger fw-bold px-3 py-2">جديد</span>
                                        </div>`
                            : '';
                        return `
                                        <div class="col-md-4">
                                            <div class="course-card card border-0 rounded-4 overflow-hidden shadow position-relative">
                                                <div class="position-relative">
                                                    <img src="${course.imageURL || 'images/course-placeholder.jpg'}" class="card-img-top img-fluid" alt="${course.title}" style="height: 220px; object-fit: cover;">
                                                    ${badge}
                                                </div>
                                                <div class="card-body p-4 bg-white">
                                                    <h5 class="card-title text-dark fw-bold">${course.title}</h5>
                                                    <p class="card-text text-muted small">${course.grade}</p>
                                                    <div class="d-flex justify-content-between align-items-center mt-3">
                                                        <button class="btn btn-primary" onclick="window.location.href='course.html?id=${course.id}'">مشاهدة</button>
                                                <span class="badge fw-bold px-3 py-2" style="background:#e0e0e0;color:#000;">
                                <span class="course-duration">عدد المحاضرات : ${course.videoCount !== undefined ? course.videoCount : (course.videos ? course.videos.length : 0)}</span></span></span>
                                                <div class="rating text-warning">
                                                            <span><i class="fas fa-star" style="color:#f7a619;"></i> <span style="color: #555">4.5<span/></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                    }).join('')}
                            </div>
                        `;
                    document.getElementById('coursesByGrade').appendChild(gradeSection);
                }

                // Render all courses by default
                renderCourses('all');

                // Listen for changes in the dropdown to filter courses
                gradeFilterDropdown.addEventListener('change', function () {
                    renderCourses(this.value);
                });
            } catch (error) {
                console.error('حدث خطأ أثناء جلب الكورسات:', error);
            }

            // Update nav links based on login status
            const isLoggedIn = !!localStorage.getItem('token');
            const navLinks = document.getElementById('navLinks');

            if (isLoggedIn) {
                navLinks.innerHTML = `
                    <li class="nav-item"><a class="nav-link" href="index.html">الرئيسية</a></li>
                    <li class="nav-item"><a class="nav-link active" href="courses.html">الكورسات</a></li>
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
