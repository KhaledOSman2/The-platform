const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xss = require('xss-clean'); // لتنظيف مدخلات المستخدم
const app = express();
const PORT = process.env.PORT || 3000;

// سر التوقيع للتوكن (يجب تغييره وتأمينه في بيئة الإنتاج)
const JWT_SECRET = 'your_secret_key';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(xss()); // استخدام xss-clean لتنظيف المدخلات

// إعداد multer لتخزين الصور
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

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
// API لتسجيل حساب جديد
// ----------------------
app.post('/api/register', (req, res) => {
    let { username, email, password, grade } = req.body;
    username = username.trim();
    email = email.trim().toLowerCase();

    if (username.length > 16) {
        return res.status(400).json({ message: 'اسم المستخدم يجب ألا يزيد عن 16 حرفًا' });
    }
    let data = readData();
    console.log('Current data:');
    if (data.users.some(user => user.email.trim().toLowerCase() === email)) {
        return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    data.users.push({ id: Date.now(), username, email, password, grade, isAdmin: false, isBanned: false });
    writeData(data);
    console.log('Updated data:');
    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
});

// ----------------------
// API لتسجيل الدخول (توليد توكن JWT)
// ----------------------
app.post('/api/login', (req, res) => {
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
    data.users = data.users.filter(user => user.id !== userId);
    writeData(data);
    res.json({ message: 'تم حذف المستخدم' });
});

// تعديل بيانات المستخدم: بعد التحديث يتم إرسال علم لتسجيل الخروج مع رسالة
app.put('/api/users/:id', authenticateToken, (req, res) => {
    const userId = parseInt(req.params.id);
    // السماح بالتحديث إذا كان المستخدم هو نفسه أو المسؤول
    if (!req.user.isAdmin && req.user.id !== userId) return res.sendStatus(403);
    let data = readData();
    const index = data.users.findIndex(u => u.id === userId);
    if (index !== -1) {
        const { username, email, password, grade } = req.body;
        data.users[index] = { ...data.users[index], username, email, password, grade };
        writeData(data);
        res.json({ logout: true });
    } else {
        res.status(404).json({ message: 'المستخدم غير موجود' });
    }
});

app.post('/api/users/:id/make-admin', authenticateToken, (req, res) => {
    // فقط المسؤول يمكنه القيام بهذا الإجراء
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
    // فقط المسؤول يمكنه القيام بهذا الإجراء
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

// endpoint خاص بالمستخدمين المسجلين، يقوم بإرجاع الدورات الخاصة بصف المستخدم
app.get('/api/courses', authenticateToken, (req, res) => {
    let data = readData();
    const userGrade = req.user.grade;
    const grade = req.query.grade || userGrade;
    const filteredCourses = data.courses.filter(course => course.grade.toString() === grade.toString());
    res.json(filteredCourses);
});

// endpoint لإرجاع جميع الدورات بدون تحقق أو تصفية (لصفحات العرض العامة مثل courses.html)
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
    let exams = [];
    try {
        videos = req.body.videos ? JSON.parse(req.body.videos).map(video => {
            if (!video.id || video.id === "") {
                video.id = Date.now().toString();
            }
            return { ...video, addedDate: new Date().toISOString() };
        }) : [];
        activities = req.body.activities ? JSON.parse(req.body.activities) : [];
        exams = req.body.exams ? JSON.parse(req.body.exams).map(exam => {
            if (!exam.id || exam.id === "") {
                exam.id = Date.now().toString();
            }
            return { ...exam, addedDate: new Date().toISOString() };
        }) : [];
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
        exams,
        grade,
        imageURL
    };
    data.courses.push(newCourse);
    writeData(data);
    res.json({ message: 'تم إضافة الكورس بنجاح' });
});

app.put('/api/courses/:id', authenticateToken, upload.single('courseImage'), (req, res) => {
    // Only an admin is allowed to update course details
    if (!req.user.isAdmin) return res.sendStatus(403);
    let data = readData();
    const courseId = parseInt(req.params.id);
    const index = data.courses.findIndex(c => c.id === courseId);
    if (index !== -1) {
        const { title, grade, existingImageURL } = req.body;
        let videos = [];
        let activities = [];
        let exams = [];
        try {
            const oldVideos = data.courses[index].videos || [];
            videos = req.body.videos ? JSON.parse(req.body.videos).map((video, idx) => {
                let existingVideo;
                if (video.id && video.id !== "") {
                    existingVideo = oldVideos.find(v => v.id === video.id);
                } else {
                    if (oldVideos[idx]) {
                        existingVideo = oldVideos[idx];
                        video.id = oldVideos[idx].id;
                    }
                }
                if (existingVideo && existingVideo.addedDate) {
                    return { ...video, addedDate: existingVideo.addedDate };
                } else {
                    return { ...video, addedDate: new Date().toISOString() };
                }
            }) : [];
            activities = req.body.activities ? JSON.parse(req.body.activities) : [];
            const oldExams = data.courses[index].exams || [];
            exams = req.body.exams ? JSON.parse(req.body.exams).map((exam, idx) => {
                let existingExam;
                if (exam.id && exam.id !== "") {
                    existingExam = oldExams.find(e => e.id === exam.id);
                } else {
                    if (oldExams[idx]) {
                        existingExam = oldExams[idx];
                        exam.id = oldExams[idx].id;
                    }
                }
                if (existingExam && existingExam.addedDate) {
                    return { ...exam, addedDate: existingExam.addedDate };
                } else {
                    return { ...exam, addedDate: new Date().toISOString() };
                }
            }) : [];
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
            exams,
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

app.get('/uploads/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public/uploads', req.params.filename);
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
    res.json({ message: 'تم إضافة الاختبار بنجاح' });
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

// API لتحديث امتحان
app.put('/api/exams/:id', authenticateToken, (req, res) => {
    // Only an admin is allowed to update exam details
    if (!req.user.isAdmin) return res.sendStatus(403);
    let data = readData();
    const examId = parseInt(req.params.id);
    const { title, grade, courseId, googleFormUrl } = req.body;
    const newCourseId = parseInt(courseId);

    // البحث عن الكورس الجديدة التي يجب أن ينتمي إليها الامتحان
    const newCourse = data.courses.find(c => c.id === newCourseId && c.grade.toString() === grade.toString());
    if (!newCourse) {
        return res.status(404).json({ message: 'الكورس غير موجودة لهذا الصف الدراسي' });
    }

    // البحث عن الامتحان في جميع الدورات
    let examFound = false;
    let examData = null;
    data.courses.forEach(course => {
        if (course.exams && Array.isArray(course.exams)) {
            const examIndex = course.exams.findIndex(e => e.id === examId);
            if (examIndex !== -1) {
                examData = course.exams[examIndex];
                // إزالة الامتحان من الكورس القديمة
                course.exams.splice(examIndex, 1);
                examFound = true;
            }
        }
    });

    if (!examFound) {
        return res.status(404).json({ message: 'الاختبار غير موجود' });
    }

    // تحديث بيانات الامتحان
    examData.title = title;
    examData.googleFormUrl = googleFormUrl;
    examData.courseId = newCourseId;

    // إضافة الامتحان إلى قائمة الامتحانات للكورس الجديدة
    if (!newCourse.exams) {
        newCourse.exams = [];
    }
    newCourse.exams.push(examData);

    writeData(data);
    res.json({ message: 'تم تحديث الاختبار بنجاح' });
});

// API لحذف امتحان
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
        return res.status(404).json({ message: 'الاختبار غير موجود' });
    }
    writeData(data);
    res.json({ message: 'تم حذف الاختبار بنجاح' });
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
