import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Course, Enrollment } from './models.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.param('id', (req, res, next, id) => (mongoose.isValidObjectId(id) ? next() : fail(res, 400, 'Invalid id')));
app.param('lessonId', (req, res, next, id) => (mongoose.isValidObjectId(id) ? next() : fail(res, 400, 'Invalid id')));

const fail = (res, code, message) => res.status(code).json({ message });
const wrap = (f) => (req, res, next) => f(req, res).catch(next);
const token = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const safe = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const auth = (...roles) => async (req, res, next) => {
  try {
    const { id } = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    const user = await User.findById(id).select('-password');
    if (!user) return fail(res, 401, 'Unauthorized');
    if (roles.length && !roles.includes(user.role)) return fail(res, 403, 'Access denied for your role');
    req.user = user;
    next();
  } catch {
    fail(res, 401, 'Please log in');
  }
};

const minutes = (c) => c.modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.minutes, 0), 0);
const lessonIds = (c) => c.modules.flatMap((m) => m.lessons.map((l) => String(l._id)));
const percent = (c, e) => {
  const ids = new Set(lessonIds(c));
  return ids.size ? Math.round((e.completed.filter((i) => ids.has(String(i))).length * 100) / ids.size) : 0;
};
const counts = async (ids) => {
  const rows = await Enrollment.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: '$course', n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
};
const publicCourse = (c, n) => {
  const o = c.toObject();
  o.quiz = o.quiz.map(({ answer, ...q }) => q);
  o.enrolled = n[String(c._id)] || 0;
  o.minutes = minutes(c);
  return o;
};
const invalid = (b) =>
  !b.title || !b.description
    ? 'Title and description are required'
    : (b.quiz || []).some((q) => !q.text || q.options?.length !== 4 || q.options.some((o) => !o) || ![0, 1, 2, 3].includes(q.answer))
      ? 'Each question needs text, 4 options and a correct answer'
      : null;
const pick = (b) => ({ title: b.title, description: b.description, category: b.category, level: b.level, thumbnail: b.thumbnail || undefined, modules: b.modules || [], quiz: b.quiz || [] });
const owned = async (req, res) => {
  const c = await Course.findById(req.params.id);
  if (!c) return void fail(res, 404, 'Course not found');
  if (String(c.instructor) !== String(req.user._id)) return void fail(res, 403, 'You can only modify your own courses');
  return c;
};

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password || password.length < 6) {
    return fail(res, 400, 'Name, email and a password of 6+ characters are required');
  }

  if (await User.findOne({ email: email.toLowerCase() })) {
    return fail(res, 409, 'Email already registered');
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role: 'student'
  });

  res.status(201).json({ token: token(user), user: safe(user) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 400, 'Email and password are required');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.password))) return fail(res, 401, 'Invalid email or password');
  res.json({ token: token(user), user: safe(user) });
}));

app.get('/api/auth/me', auth(), (req, res) => res.json(safe(req.user)));

app.get('/api/courses', wrap(async (req, res) => {
  const { search, category, level } = req.query;
  const q = {};
  if (search) q.title = new RegExp(esc(String(search)), 'i');
  if (category) q.category = String(category);
  if (level) q.level = String(level);
  const courses = await Course.find(q).populate('instructor', 'name').sort('-createdAt');
  const n = await counts(courses.map((c) => c._id));
  res.json(courses.map((c) => publicCourse(c, n)));
}));

app.get('/api/courses/:id', wrap(async (req, res) => {
  const c = await Course.findById(req.params.id).populate('instructor', 'name');
  if (!c) return fail(res, 404, 'Course not found');
  res.json(publicCourse(c, await counts([c._id])));
}));

app.get('/api/courses/:id/manage', auth('instructor'), wrap(async (req, res) => {
  const c = await owned(req, res);
  if (c) res.json(c);
}));

app.post('/api/courses', auth('instructor'), wrap(async (req, res) => {
  const msg = invalid(req.body);
  if (msg) return fail(res, 400, msg);
  res.status(201).json(await Course.create({ ...pick(req.body), instructor: req.user._id }));
}));

app.put('/api/courses/:id', auth('instructor'), wrap(async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  const msg = invalid(req.body);
  if (msg) return fail(res, 400, msg);
  Object.assign(c, pick(req.body));
  res.json(await c.save());
}));

app.delete('/api/courses/:id', auth('instructor'), wrap(async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  await c.deleteOne();
  await Enrollment.deleteMany({ course: c._id });
  res.json({ message: 'Course deleted' });
}));

app.post('/api/courses/:id/enroll', auth('student'), wrap(async (req, res) => {
  if (!(await Course.exists({ _id: req.params.id }))) return fail(res, 404, 'Course not found');
  if (await Enrollment.exists({ student: req.user._id, course: req.params.id })) return fail(res, 409, 'Already enrolled');
  res.status(201).json(await Enrollment.create({ student: req.user._id, course: req.params.id }));
}));

app.get('/api/courses/:id/enrollment', auth('student'), wrap(async (req, res) => {
  res.json(await Enrollment.findOne({ student: req.user._id, course: req.params.id }));
}));

app.post('/api/courses/:id/lessons/:lessonId/complete', auth('student'), wrap(async (req, res) => {
  const e = await Enrollment.findOne({ student: req.user._id, course: req.params.id });
  if (!e) return fail(res, 403, 'You are not enrolled in this course');
  const c = await Course.findById(req.params.id);
  if (!c || !lessonIds(c).includes(req.params.lessonId)) return fail(res, 404, 'Lesson not found');
  await Enrollment.updateOne({ _id: e._id }, { $addToSet: { completed: req.params.lessonId } });
  const updated = await Enrollment.findById(e._id);
  res.json({ completed: updated.completed, progress: percent(c, updated) });
}));

app.post('/api/courses/:id/quiz/submit', auth('student'), wrap(async (req, res) => {
  const e = await Enrollment.findOne({ student: req.user._id, course: req.params.id });
  if (!e) return fail(res, 403, 'You are not enrolled in this course');
  const c = await Course.findById(req.params.id);
  const { answers } = req.body;
  if (!c || !c.quiz.length) return fail(res, 404, 'This course has no quiz');
  if (!Array.isArray(answers) || answers.length !== c.quiz.length || answers.some((a) => ![0, 1, 2, 3].includes(a))) return fail(res, 400, 'Answer every question before submitting');
  const score = c.quiz.filter((q, i) => q.answer === answers[i]).length;
  e.attempts.push({ score, total: c.quiz.length });
  await e.save();
  res.json({ score, total: c.quiz.length, review: c.quiz.map((q, i) => ({ text: q.text, options: q.options, chosen: answers[i], answer: q.answer })) });
}));

app.get('/api/student/courses', auth('student'), wrap(async (req, res) => {
  const list = await Enrollment.find({ student: req.user._id }).populate({ path: 'course', populate: { path: 'instructor', select: 'name' } }).sort('-createdAt');
  res.json(list.filter((e) => e.course).map((e) => ({
    _id: e.course._id, title: e.course.title, thumbnail: e.course.thumbnail, category: e.course.category,
    instructor: e.course.instructor?.name, hasQuiz: e.course.quiz.length > 0, progress: percent(e.course, e),
    best: e.attempts.length ? Math.max(...e.attempts.map((a) => a.score)) : null, total: e.course.quiz.length
  })));
}));

app.get('/api/instructor/courses', auth('instructor'), wrap(async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id }).sort('-createdAt');
  const n = await counts(courses.map((c) => c._id));
  res.json(courses.map((c) => ({ _id: c._id, title: c.title, category: c.category, createdAt: c.createdAt, lessons: lessonIds(c).length, enrolled: n[String(c._id)] || 0 })));
}));

app.get('/api/instructor/courses/:id/students', auth('instructor'), wrap(async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  const list = await Enrollment.find({ course: c._id }).populate('student', 'name email');
  res.json({ title: c.title, total: c.quiz.length, students: list.filter((e) => e.student).map((e) => ({
    _id: e._id, name: e.student.name, email: e.student.email, progress: percent(c, e), enrolledAt: e.createdAt,
    best: e.attempts.length ? Math.max(...e.attempts.map((a) => a.score)) : null
  })) });
}));

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') return fail(res, 400, err.message);
  console.error(err);
  fail(res, 500, 'Something went wrong on the server');
});

mongoose.connect(process.env.MONGODB_URI).then(() => {
  app.listen(process.env.PORT || 5000, () => console.log('LearnHub API running'));
}).catch((e) => {
  console.error('MongoDB connection failed:', e.message);
  process.exit(1);
});
