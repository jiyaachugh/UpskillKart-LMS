import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const lesson = new Schema({ title: { type: String, required: true }, content: { type: String, default: '' }, minutes: { type: Number, default: 10 } });
const module_ = new Schema({ title: { type: String, required: true }, lessons: [lesson] });
const question = new Schema({ text: String, options: [String], answer: Number });

export const User = model('User', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'instructor'], default: 'student' }
}, { timestamps: true }));

export const Course = model('Course', new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'Web Development' },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  thumbnail: { type: String, default: 'https://picsum.photos/seed/learnhub/600/340' },
  instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  modules: [module_],
  quiz: [question]
}, { timestamps: true }));

const enrollment = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  completed: [Schema.Types.ObjectId],
  attempts: [{ score: Number, total: Number, at: { type: Date, default: Date.now } }]
}, { timestamps: true });
enrollment.index({ student: 1, course: 1 }, { unique: true });
export const Enrollment = model('Enrollment', enrollment);
