const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xss = require('xss-clean'); // To sanitize user inputs
const app = express();
const PORT = process.env.PORT || 8080;
//
// JWT secret key (should be changed and secured in production)
const JWT_SECRET = 'your_secret_key';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(xss()); // Use xss-clean to sanitize inputs

// Configure multer for image storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// Functions to read and write data (simple JSON-based database)
function readData() {
    const dataPath = path.join(__dirname, 'data.json');
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({ users: [], courses: [], grades: [] }, null, 2));
    }
    try {
        const data = JSON.parse(fs.readFileSync(dataPath));
        console.info('Data read successfully:');
        return data;
    } catch (error) {
        console.error('Error reading data:', error.message);
        throw error;
    }
}

function writeData(data) {
    const dataPath = path.join(__dirname, 'data.json');
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.info('Data written successfully:');
    } catch (error) {
        console.error('Error writing data:', error.message);
        throw error;
    }
}

// Middleware to verify token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer TOKEN"
    if (!token) {
        console.warn('No token provided');
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.warn('Token verification failed:', err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
}

// Middleware to log info messages to console
app.use((req, res, next) => {
    console.info(`Request: ${req.method} ${req.url}`);
    next();
});

// ----------------------
// API to register a new account
// ----------------------
app.post('/api/register', (req, res) => {
    let { username, email, password, grade } = req.body;
    username = username.trim();
    email = email.trim().toLowerCase();

    if (username.length > 16) {
        console.warn('Username too long:', username);
        return res.status(400).json({ message: 'Username must not exceed 16 characters' });
    }
    let data = readData();
    if (data.users.some(user => user.email.trim().toLowerCase() === email)) {
        console.warn('Email already in use:', email);
        return res.status(400).json({ message: 'Email is already in use' });
    }
    data.users.push({ id: Date.now(), username, email, password, grade, isAdmin: false });
    writeData(data);
    console.info('New user registered:', { username, email, grade });
    res.status(201).json({ message: 'Account created successfully' });
});

// ----------------------
// API to login (generate JWT token)
// ----------------------
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    let data = readData();
    const user = data.users.find(u => u.email === email && u.password === password);
    if (user) {
        const token = jwt.sign({ id: user.id, email: user.email, grade: user.grade, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
        console.info('User logged in:', { email, grade: user.grade });
        res.json({ message: 'Login successful', token, user });
    } else {
        console.warn('Invalid login credentials:', email);
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// ----------------------
// API to manage users (students)
// ----------------------
app.get('/api/users', authenticateToken, (req, res) => {
    let data = readData();
    console.info('Fetched users:', data.users.length);
    res.json(data.users);
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
    let data = readData();
    const userId = parseInt(req.params.id);
    data.users = data.users.filter(user => user.id !== userId);
    writeData(data);
    console.info('User deleted:', userId);
    res.json({ message: 'User deleted successfully' });
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
    let data = readData();
    const userId = parseInt(req.params.id);
    const index = data.users.findIndex(u => u.id === userId);
    if (index !== -1) {
        const { username, email, password, grade } = req.body;
        data.users[index] = { ...data.users[index], username, email, password, grade };
        writeData(data);
        console.info('User updated:', userId);
        res.json({ message: 'User updated successfully' });
    } else {
        console.warn('User not found:', userId);
        res.status(404).json({ message: 'User not found' });
    }
});

app.post('/api/users/:id/make-admin', authenticateToken, (req, res) => {
    let data = readData();
    const userId = parseInt(req.params.id);
    const user = data.users.find(user => user.id === userId);
    if (user) {
        user.isAdmin = true;
        writeData(data);
        console.info('User promoted to admin:', userId);
        res.json({ message: 'User promoted to admin' });
    } else {
        console.warn('User not found:', userId);
        res.status(404).json({ message: 'User not found' });
    }
});

app.post('/api/users/:id/remove-admin', authenticateToken, (req, res) => {
    let data = readData();
    const userId = parseInt(req.params.id);
    const user = data.users.find(user => user.id === userId);
    if (user) {
        user.isAdmin = false;
        writeData(data);
        console.info('Admin rights removed from user:', userId);
        res.json({ message: 'Admin rights removed from user' });
    } else {
        console.warn('User not found:', userId);
        res.status(404).json({ message: 'User not found' });
    }
});

// ----------------------
// API to manage courses
// ----------------------

// Endpoint for registered users, returns courses for the user's grade
app.get('/api/courses', authenticateToken, (req, res) => {
    let data = readData();
    const userGrade = req.user.grade;
    const grade = req.query.grade || userGrade;
    const filteredCourses = data.courses.filter(course => course.grade.toString() === grade.toString());
    console.info('Fetched courses for grade:', grade, filteredCourses.length);
    res.json(filteredCourses);
});

// Endpoint to return all courses without verification or filtering (for public display pages like courses.html)
app.get('/api/all-courses', (req, res) => {
    let data = readData();
    console.info('Fetched all courses:', data.courses.length);
    res.json(data.courses);
});

app.get('/api/courses/:id', (req, res) => {
    let data = readData();
    const courseId = parseInt(req.params.id);
    const course = data.courses.find(c => c.id === courseId);
    if (course) {
        console.info('Fetched course:', courseId);
        res.json(course);
    } else {
        console.warn('Course not found:', courseId);
        res.status(404).json({ message: 'Course not found' });
    }
});

app.post('/api/courses', authenticateToken, upload.single('courseImage'), (req, res) => {
    let data = readData();
    const { title, grade } = req.body;
    let videos = [];
    let activities = [];
    try {
        videos = req.body.videos ? JSON.parse(req.body.videos).map(video => ({ ...video, addedDate: new Date().toISOString() })) : [];
        activities = req.body.activities ? JSON.parse(req.body.activities) : [];
    } catch (error) {
        console.warn('Invalid format for videos or activities:', error.message);
        return res.status(400).json({ message: 'Invalid format' });
    }
    const videoURL = videos.length > 0 ? videos[0].url : '';
    const imageURL = req.file ? `/uploads/${req.file.filename}` : '';

    const newCourse = {
        id: Date.now(),
        title,
        videoURL,
        videos,
        activities,
        grade,
        imageURL
    };
    data.courses.push(newCourse);
    writeData(data);
    console.info('New course added:', newCourse);
    res.json({ message: 'Course added successfully' });
});

app.put('/api/courses/:id', authenticateToken, upload.single('courseImage'), (req, res) => {
    let data = readData();
    const courseId = parseInt(req.params.id);
    const index = data.courses.findIndex(c => c.id === courseId);
    if (index !== -1) {
        const { title, grade, existingImageURL } = req.body;
        let videos = [];
        let activities = [];
        try {
            videos = req.body.videos ? JSON.parse(req.body.videos).map(video => ({ ...video, addedDate: new Date().toISOString() })) : [];
            activities = req.body.activities ? JSON.parse(req.body.activities) : [];
        } catch (error) {
            console.warn('Invalid format for videos or activities:', error.message);
            return res.status(400).json({ message: 'Invalid format' });
        }
        const videoURL = videos.length > 0 ? videos[0].url : data.courses[index].videoURL;
        const imageURL = req.file ? `/uploads/${req.file.filename}` : existingImageURL || data.courses[index].imageURL;

        const existingActivities = data.courses[index].activities || [];
        const updatedActivities = activities.map(activity => {
            const existingActivity = existingActivities.find(a => a.title === activity.title);
            return existingActivity ? { ...existingActivity, ...activity } : activity;
        });

        data.courses[index] = {
            ...data.courses[index],
            title,
            videoURL,
            videos,
            activities: updatedActivities,
            grade,
            imageURL
        };
        writeData(data);
        console.info('Course updated:', courseId);
        res.json({ message: 'Course updated successfully' });
    } else {
        console.warn('Course not found:', courseId);
        res.status(404).json({ message: 'Course not found' });
    }
});

app.delete('/api/courses/:id', authenticateToken, (req, res) => {
    let data = readData();
    const courseId = parseInt(req.params.id);
    data.courses = data.courses.filter(course => course.id !== courseId);
    writeData(data);
    console.info('Course deleted:', courseId);
    res.json({ message: 'Course deleted successfully' });
});

app.post('/api/uploadActivity', authenticateToken, upload.single('activityFile'), (req, res) => {
    if (!req.file) {
        console.warn('No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
    }
    console.info('Activity file uploaded:', req.file.filename);
    res.json({ filePath: `/uploads/${req.file.filename}` });
});

app.get('/uploads/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public/uploads', req.params.filename);
    res.download(filePath);
    console.info('File downloaded:', req.params.filename);
});

// ----------------------
// API to manage grades
// ----------------------
app.get('/api/grades', (req, res) => {
    let data = readData();
    console.info('Fetched grades:', data.grades.length);
    res.json(data.grades || []);
});

app.post('/api/grades', authenticateToken, (req, res) => {
    let data = readData();
    const { name } = req.body;
    if (!data.grades) {
        data.grades = [];
    }
    if (data.grades.find(grade => grade.name === name)) {
        console.warn('Grade already exists:', name);
        return res.status(400).json({ message: 'Grade already exists' });
    }
    data.grades.push({ id: Date.now(), name });
    writeData(data);
    console.info('New grade added:', name);
    res.json({ message: 'Grade added successfully' });
});

app.delete('/api/grades/:id', authenticateToken, (req, res) => {
    let data = readData();
    const gradeId = parseInt(req.params.id);
    data.grades = data.grades.filter(grade => grade.id !== gradeId);
    writeData(data);
    console.info('Grade deleted:', gradeId);
    res.json({ message: 'Grade deleted successfully' });
});

// ----------------------
// API to manage exams
// ----------------------
app.post('/api/exams', authenticateToken, (req, res) => {
    let data = readData();
    const { title, grade, courseId, googleFormUrl } = req.body;
    const course = data.courses.find(c => c.id === parseInt(courseId) && c.grade.toString() === grade.toString());
    if (!course) {
        console.warn('Course not found for exam:', courseId);
        return res.status(404).json({ message: 'Course not found for this grade' });
    }
    const newExam = {
        id: Date.now(),
        title,
        googleFormUrl,
        courseId: parseInt(courseId),
        addedDate: new Date().toISOString()
    };
    if (!course.exams) {
        course.exams = [];
    }
    course.exams.push(newExam);
    writeData(data);
    console.info('New exam added:', newExam);
    res.json({ message: 'Exam added successfully' });
});

app.get('/api/exams', authenticateToken, (req, res) => {
    const { courseId, grade } = req.query;
    let data = readData();
    const course = data.courses.find(c => c.id === parseInt(courseId) && (!grade || c.grade.toString() === grade.toString()));
    if (!course) {
        console.warn('Course not found for exams:', courseId);
        return res.status(404).json({ message: 'Course not found for this grade' });
    }
    console.info('Fetched exams for course:', courseId);
    res.json({ exams: course.exams || [], course });
});

app.get('/api/all-exams', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) {
        console.warn('Unauthorized access to all exams');
        return res.sendStatus(403);
    }
    let data = readData();
    const exams = data.courses.flatMap(course =>
        (course.exams || []).map(exam => ({
            ...exam,
            courseTitle: course.title,
            grade: course.grade
        }))
    );
    console.info('Fetched all exams:', exams.length);
    res.json(exams);
});

// API to update an exam
app.put('/api/exams/:id', authenticateToken, (req, res) => {
    let data = readData();
    const examId = parseInt(req.params.id);
    const { title, grade, courseId, googleFormUrl } = req.body;
    const newCourseId = parseInt(courseId);

    // Find the new course the exam should belong to
    const newCourse = data.courses.find(c => c.id === newCourseId && c.grade.toString() === grade.toString());
    if (!newCourse) {
        console.warn('New course not found for exam:', newCourseId);
        return res.status(404).json({ message: 'Course not found for this grade' });
    }

    // Find the exam in all courses
    let examFound = false;
    let examData = null;
    data.courses.forEach(course => {
        if (course.exams && Array.isArray(course.exams)) {
            const examIndex = course.exams.findIndex(e => e.id === examId);
            if (examIndex !== -1) {
                examData = course.exams[examIndex];
                // Remove the exam from the old course
                course.exams.splice(examIndex, 1);
                examFound = true;
            }
        }
    });

    if (!examFound) {
        console.warn('Exam not found:', examId);
        return res.status(404).json({ message: 'Exam not found' });
    }

    // Update exam data
    examData.title = title;
    examData.googleFormUrl = googleFormUrl;
    examData.courseId = newCourseId;

    // Add the exam to the new course's exam list
    if (!newCourse.exams) {
        newCourse.exams = [];
    }
    newCourse.exams.push(examData);

    writeData(data);
    console.info('Exam updated:', examId);
    res.json({ message: 'Exam updated successfully' });
});

// API to delete an exam
app.delete('/api/exams/:id', authenticateToken, (req, res) => {
    let data = readData();
    const examId = parseInt(req.params.id);
    let examFound = false;
    data.courses.forEach(course => {
        if (course.exams && Array.isArray(course.exams)) {
            const examIndex = course.exams.findIndex(e => e.id === examId);
            if (examIndex !== -1) {
                course.exams.splice(examIndex, 1);
                examFound = true;
            }
        }
    });
    if (!examFound) {
        console.warn('Exam not found:', examId);
        return res.status(404).json({ message: 'Exam not found' });
    }
    writeData(data);
    console.info('Exam deleted:', examId);
    res.json({ message: 'Exam deleted successfully' });
});

// ----------------------
// API for analytics (protected)
// ----------------------
app.get('/api/analytics', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) {
        console.warn('Unauthorized access to analytics');
        return res.sendStatus(403);
    }
    let data = readData();
    const totalUsers = data.users.length;
    const totalCourses = data.courses.length;
    const totalActivities = data.courses.reduce((sum, course) => sum + (course.activities ? course.activities.length : 0), 0);
    const totalExams = data.courses.reduce((sum, course) => sum + (course.exams ? course.exams.length : 0), 0);
    console.info('Fetched analytics:', { totalUsers, totalCourses, totalActivities, totalExams });
    res.json({ totalUsers, totalCourses, totalActivities, totalExams });
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
    res.json({ message: 'Student dashboard', user: req.user });
});

app.get('/api/admin/dashboard', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    res.json({ message: 'Admin dashboard', user: req.user });
});

// Middleware to handle errors
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ message: 'Server error occurred' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
