const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xss = require('xss-clean');
const { check, validationResult } = require('express-validator'); // لإجراء التحقق من صحة المدخلات
const app = express();
const PORT = process.env.PORT || 3000;

// استخدام مفتاح JWT من متغيرات البيئة مع قيمة احتياطية يجب تغييرها في الإنتاج
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(xss()); // تنظيف مدخلات المستخدم

// إعداد multer لتخزين الصور مع فلتر لأنواع الملفات المقبولة
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // السماح فقط بأنواع الصور
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('نوع الملف غير مدعوم'), false);
        }
        cb(null, true);
    }
});

// دوال قراءة وحفظ البيانات (قاعدة بيانات بسيطة باستخدام JSON)
function readData() {
    const dataPath = path.join(__dirname, 'data.json');
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({ users: [], courses: [], grades: [] }, null, 2));
    }
    try {
        const data = JSON.parse(fs.readFileSync(dataPath));
        console.log('Data read successfully:');
        return data;
    } catch (error) {
        console.error('Error reading data:', error);
        throw error;
    }
}

function writeData(data) {
    const dataPath = path.join(__dirname, 'data.json');
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log('Data written successfully:');
    } catch (error) {
        console.error('Error writing data:', error);
        throw error;
    }
}

// ميدلوير للتحقق من التوكن
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // نتوقع "Bearer TOKEN"
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        let data = readData();
        const currentUser = data.users.find(u => u.id === user.id);
        if (currentUser && currentUser.isBanned) {
            return res.status(403).json({ message: 'حسابك محظور. يرجى التواصل مع الدعم الفني.' });
        }
        req.user = user;
        next();
    });
}

// ----------------------
// API لتسجيل حساب جديد مع التحقق من صحة المدخلات
// ----------------------
app.post('/api/register', [
    check('username').trim().isLength({ max: 16 }).withMessage('اسم المستخدم يجب ألا يزيد عن 16 حرفًا'),
    check('email').trim().isEmail().withMessage('بريد إلكتروني غير صالح').normalizeEmail(),
    check('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
    check('grade').notEmpty().withMessage('الصف الدراسي مطلوب')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    let { username, email, password, grade } = req.body;
    username = username.trim();
    email = email.trim().toLowerCase();

    let data = readData();
    if (data.users.some(user => user.email.trim().toLowerCase() === email)) {
        return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    data.users.push({ id: Date.now(), username, email, password, grade, isAdmin: false, isBanned: false });
    writeData(data);
    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
});

// ----------------------
// API لتسجيل الدخول مع التحقق من صحة المدخلات
// ----------------------
app.post('/api/login', [
    check('email').trim().isEmail().withMessage('بريد إلكتروني غير صالح').normalizeEmail(),
    check('password').notEmpty().withMessage('كلمة المرور مطلوبة')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    let data = readData();
    const user = data.users.find(u => u.email === email.trim().toLowerCase());
    if (!user) {
        return res.status(401).json({ message: 'البريد الإلكتروني خطأ' });
    }
    if (user.password !== password) {
        return res.status(401).json({ message: 'كلمة المرور خطأ' });
    }
    if (user.isBanned) {
        return res.status(403).json({ message: 'حسابك محظور. يرجى التواصل مع الدعم الفني.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, grade: user.grade, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'تم تسجيل الدخول بنجاح', token, user });
});

// ----------------------
// API لإدارة المستخدمين (المستخدمين/الطلاب)
// ----------------------
app.get('/api/users', authenticateToken, (req, res) => {
    let data = readData();
    res.json(data.users);
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
    let data = readData();
    const userId = parseInt(req.params.id);
    // التأكد من أن المستخدم هو المسؤول أو هو صاحب الحساب نفسه
    if (!req.user.isAdmin && req.user.id !== userId) return res.sendStatus(403);
    data.users = data.users.filter(user => user.id !== userId);
    writeData(data);
    res.json({ message: 'تم حذف المستخدم' });
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
    const userId = parseInt(req.params.id);
    // السماح بالتحديث فقط إذا كان المستخدم مسؤولاً أو هو صاحب الحساب نفسه
    if (!req.user.isAdmin && req.user.id !== userId) return res.sendStatus(403);
    let data = readData();
    const index = data.users.findIndex(u => u.id === userId);
    if (index !== -1) {
        const { username, email, password, grade } = req.body;
        data.users[index] = { ...data.users[index], username, email, password, grade };
        writeData(data);
        res.json({ message: 'تم تحديث بيانات المستخدم بنجاح' });
    } else {
        res.status(404).json({ message: 'المستخدم غير موجود' });
    }
});

app.post('/api/users/:id/make-admin', authenticateToken, (req, res) => {
    // السماح فقط للمسؤولين
    if (!req.user.isAdmin) return res.sendStatus(403);
    let data = readData();
    const userId = parseInt(req.params.id);
    const user = data.users.find(user => user.id === userId);
    if (user) {
        user.isAdmin = true;
        writeData(data);
        res.json({ message: 'تم ترقية المستخدم إلى مسؤول' });
    } else {
        res.status(404).json({ message: 'المستخدم غير موجود' });
    }
});

app.post('/api/users/:id/remove-admin', authenticateToken, (req, res) => {
    // السماح فقط للمسؤولين
    if (!req.user.isAdmin) return res.sendStatus(403);
    let data = readData();
    const userId = parseInt(req.params.id);
    const user = data.users.find(user => user.id === userId);
    if (user) {
        user.isAdmin = false;
        writeData(data);
        res.json({ message: 'تم إزالة صلاحية المسؤول من المستخدم' });
    } else {
        res.status(404).json({ message: 'المستخدم غير موجود' });
    }
});

app.post('/api/users/:id/ban', authenticateToken, (req, res) => {
    let data = readData();
    const userId = parseInt(req.params.id);
    const user = data.users.find(user => user.id === userId);
    if (user) {
        user.isBanned = true;
        writeData(data);
        res.json({ message: 'تم حظر المستخدم' });
    } else {
        res.status(404).json({ message: 'المستخدم غير موجود' });
    }
});

app.post('/api/users/:id/unban', authenticateToken, (req, res) => {
    let data = readData();
    const userId = parseInt(req.params.id);
    const user = data.users.find(user => user.id === userId);
    if (user) {
        user.isBanned = false;
        writeData(data);
        res.json({ message: 'تم إلغاء حظر المستخدم' });
    } else {
        res.status(404).json({ message: 'المستخدم غير موجود' });
    }
});

// ----------------------
// API لإدارة الكورسات
// ----------------------
app.get('/api/courses', authenticateToken, (req, res) => {
    let data = readData();
    const userGrade = req.user.grade;
    const grade = req.query.grade || userGrade;
    const filteredCourses = data.courses.filter(course => course.grade.toString() === grade.toString());
    res.json(filteredCourses);
});

app.get('/api/all-courses', (req, res) => {
    let data = readData();
    res.json(data.courses);
});

app.get('/api/courses/:id', (req, res) => {
    let data = readData();
    const courseId = parseInt(req.params.id);
    const course = data.courses.find(c => c.id === courseId);
    if (course) {
        res.json(course);
    } else {
        res.status(404).json({ message: 'الكورس غير موجودة' });
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
    res.json({ message: 'تم إضافة الكورس بنجاح' });
});

app.put('/api/courses/:id', authenticateToken, upload.single('courseImage'), (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
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
        res.json({ message: 'تم تحديث الكورس بنجاح' });
    } else {
        res.status(404).json({ message: 'الكورس غير موجودة' });
    }
});

app.delete('/api/courses/:id', authenticateToken, (req, res) => {
    let data = readData();
    const courseId = parseInt(req.params.id);
    data.courses = data.courses.filter(course => course.id !== courseId);
    writeData(data);
    res.json({ message: 'تم حذف الكورس' });
});

app.post('/api/uploadActivity', authenticateToken, upload.single('activityFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'لم يتم تحميل الملف' });
    }
    res.json({ filePath: `/uploads/${req.file.filename}` });
});

// نقطة النهاية المعدلة لمنع ثغرات التصفح عبر الدليل
app.get('/uploads/:filename', (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'public/uploads', safeFilename);
    res.download(filePath);
});

// ----------------------
// API لإدارة الصفوف الدراسية
// ----------------------
app.get('/api/grades', (req, res) => {
    let data = readData();
    res.json(data.grades || []);
});

app.post('/api/grades', authenticateToken, (req, res) => {
    let data = readData();
    const { name } = req.body;
    if (!data.grades) {
        data.grades = [];
    }
    if (data.grades.find(grade => grade.name === name)) {
        return res.status(400).json({ message: 'الصف الدراسي موجود بالفعل' });
    }
    data.grades.push({ id: Date.now(), name });
    writeData(data);
    res.json({ message: 'تم إضافة الصف الدراسي بنجاح' });
});

app.delete('/api/grades/:id', authenticateToken, (req, res) => {
    let data = readData();
    const gradeId = parseInt(req.params.id);
    data.grades = data.grades.filter(grade => grade.id !== gradeId);
    writeData(data);
    res.json({ message: 'تم حذف الصف الدراسي' });
});

// ----------------------
// API لإدارة الامتحانات
// ----------------------
app.post('/api/exams', authenticateToken, (req, res) => {
    let data = readData();
    const { title, grade, courseId, googleFormUrl } = req.body;
    const course = data.courses.find(c => c.id === parseInt(courseId) && c.grade.toString() === grade.toString());
    if (!course) {
        return res.status(404).json({ message: 'الكورس غير موجودة لهذا الصف الدراسي' });
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
    res.json({ message: 'تم إضافة الامتحان بنجاح' });
});

app.get('/api/exams', authenticateToken, (req, res) => {
    const { courseId, grade } = req.query;
    let data = readData();
    const course = data.courses.find(c => c.id === parseInt(courseId) && (!grade || c.grade.toString() === grade.toString()));
    if (!course) {
        return res.status(404).json({ message: 'الكورس غير موجودة لهذا الصف الدراسي' });
    }
    res.json({ exams: course.exams || [], course });
});

app.get('/api/all-exams', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    let data = readData();
    const exams = data.courses.flatMap(course =>
        (course.exams || []).map(exam => ({
            ...exam,
            courseTitle: course.title,
            grade: course.grade
        }))
    );
    res.json(exams);
});

app.put('/api/exams/:id', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    let data = readData();
    const examId = parseInt(req.params.id);
    const { title, grade, courseId, googleFormUrl } = req.body;
    const newCourseId = parseInt(courseId);

    const newCourse = data.courses.find(c => c.id === newCourseId && c.grade.toString() === grade.toString());
    if (!newCourse) {
        return res.status(404).json({ message: 'الكورس غير موجودة لهذا الصف الدراسي' });
    }

    let examFound = false;
    let examData = null;
    data.courses.forEach(course => {
        if (course.exams && Array.isArray(course.exams)) {
            const examIndex = course.exams.findIndex(e => e.id === examId);
            if (examIndex !== -1) {
                examData = course.exams[examIndex];
                course.exams.splice(examIndex, 1);
                examFound = true;
            }
        }
    });

    if (!examFound) {
        return res.status(404).json({ message: 'الامتحان غير موجود' });
    }

    examData.title = title;
    examData.googleFormUrl = googleFormUrl;
    examData.courseId = newCourseId;

    if (!newCourse.exams) {
        newCourse.exams = [];
    }
    newCourse.exams.push(examData);

    writeData(data);
    res.json({ message: 'تم تحديث الامتحان بنجاح' });
});

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
        return res.status(404).json({ message: 'الامتحان غير موجود' });
    }
    writeData(data);
    res.json({ message: 'تم حذف الامتحان بنجاح' });
});

// ----------------------
// API لإدارة الإشعارات
// ----------------------
app.get('/api/notifications', authenticateToken, (req, res) => {
    let data = readData();
    res.json(data.notifications || []);
});

app.post('/api/notifications', authenticateToken, (req, res) => {
    let data = readData();
    const { title, content } = req.body;
    if (!data.notifications) {
        data.notifications = [];
    }
    data.notifications.push({ id: Date.now(), title, content });
    writeData(data);
    res.json({ message: 'تم إضافة الإشعار بنجاح' });
});

app.put('/api/notifications/:id', authenticateToken, (req, res) => {
    let data = readData();
    const notificationId = parseInt(req.params.id);
    const index = data.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
        const { title, content } = req.body;
        data.notifications[index] = { ...data.notifications[index], title, content };
        writeData(data);
        res.json({ message: 'تم تحديث الإشعار بنجاح' });
    } else {
        res.status(404).json({ message: 'الإشعار غير موجود' });
    }
});

app.delete('/api/notifications/:id', authenticateToken, (req, res) => {
    let data = readData();
    const notificationId = parseInt(req.params.id);
    data.notifications = data.notifications.filter(notification => notification.id !== notificationId);
    writeData(data);
    res.json({ message: 'تم حذف الإشعار' });
});

// ----------------------
// API للإحصائيات (محمية)
// ----------------------
app.get('/api/analytics', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    let data = readData();
    const totalUsers = data.users.length;
    const totalCourses = data.courses.length;
    const totalActivities = data.courses.reduce((sum, course) => sum + (course.activities ? course.activities.length : 0), 0);
    const totalVideos = data.courses.reduce((sum, course) => sum + (course.videos ? course.videos.length : 0), 0);
    const totalExams = data.courses.reduce((sum, course) => sum + (course.exams ? course.exams.length : 0), 0);
    res.json({ totalUsers, totalCourses, totalActivities, totalVideos, totalExams });
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
    let data = readData();
    const currentUser = data.users.find(u => u.id === req.user.id);
    res.json({ message: 'لوحة تحكم الطالب', user: currentUser });
});

app.get('/api/admin/dashboard', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    res.json({ message: 'لوحة تحكم الأدمن', user: req.user });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});