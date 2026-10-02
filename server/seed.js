import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Course, Enrollment } from './models.js';

const lessonText = (t) => `This lesson covers ${t.toLowerCase()}. Read through the explanation, try the examples on your own machine, and then mark the lesson as complete.`;
const modules = (spec) => spec.map(([title, lessons]) => ({ title, lessons: lessons.map((t, i) => ({ title: t, content: lessonText(t), minutes: 8 + i * 4 })) }));
const q = (text, options, answer) => ({ text, options, answer });
const img = (s) => `https://picsum.photos/seed/${s}/600/340`;

await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([User.deleteMany({}), Course.deleteMany({}), Enrollment.deleteMany({})]);

const password = await bcrypt.hash('demo1234', 10);
const [aarav, neha, rohan, isha, kabir] = await User.insertMany([
  { name: 'Aarav Mehta', email: 'aarav@learnhub.test', role: 'instructor', password },
  { name: 'Neha Kapoor', email: 'neha@learnhub.test', role: 'instructor', password },
  { name: 'Rohan Singh', email: 'rohan@learnhub.test', role: 'student', password },
  { name: 'Isha Verma', email: 'isha@learnhub.test', role: 'student', password },
  { name: 'Kabir Nair', email: 'kabir@learnhub.test', role: 'student', password }
]);

const [web, py, dsa, sql, git] = await Course.insertMany([
  {
    title: 'Complete Web Development Basics', category: 'Web Development', level: 'Beginner', instructor: aarav._id, thumbnail: img('webdev'),
    description: 'Build your first websites from scratch with HTML, CSS, JavaScript and a first look at React.',
    modules: modules([['HTML Fundamentals', ['Document structure', 'Text and links', 'Forms and inputs']], ['CSS Fundamentals', ['Selectors and the box model', 'Flexbox layouts', 'Responsive design']], ['JavaScript Basics', ['Variables and functions', 'Working with the DOM', 'Fetching data']], ['Introduction to React', ['Components and props', 'State and events']]]),
    quiz: [
      q('Which HTML tag is used for the largest heading?', ['<h6>', '<h1>', '<head>', '<title>'], 1),
      q('Which CSS property changes the text colour?', ['font-style', 'text-color', 'color', 'background'], 2),
      q('Which keyword declares a block-scoped variable in JavaScript?', ['var', 'let', 'define', 'int'], 1),
      q('What does React use to pass data into a component?', ['Props', 'Cookies', 'Selectors', 'Tags'], 0)
    ]
  },
  {
    title: 'Python for Beginners', category: 'Programming', level: 'Beginner', instructor: neha._id, thumbnail: img('python'),
    description: 'Learn core Python syntax, data structures and small programs that you can run right away.',
    modules: modules([['Getting Started', ['Installing Python', 'Variables and types']], ['Control Flow', ['Conditions', 'Loops', 'Functions']], ['Data Structures', ['Lists and tuples', 'Dictionaries and sets']]]),
    quiz: [
      q('Which function prints output in Python?', ['echo()', 'print()', 'console()', 'write()'], 1),
      q('Which of these is a mutable type?', ['tuple', 'str', 'list', 'int'], 2),
      q('How do you start a for loop over a range of 5?', ['for i in range(5):', 'for (i=0;i<5;i++)', 'loop 5', 'foreach 5'], 0)
    ]
  },
  {
    title: 'Data Structures in JavaScript', category: 'Programming', level: 'Intermediate', instructor: aarav._id, thumbnail: img('dsa'),
    description: 'Arrays, stacks, queues, linked lists and hash maps implemented in plain JavaScript.',
    modules: modules([['Linear Structures', ['Arrays in depth', 'Stacks and queues', 'Linked lists']], ['Hashing and Trees', ['Hash maps', 'Binary trees']], ['Complexity', ['Big-O basics', 'Choosing a data structure']]])
  },
  {
    title: 'SQL and Databases Essentials', category: 'Databases', level: 'Beginner', instructor: neha._id, thumbnail: img('sql'),
    description: 'Design tables, write queries and understand joins, indexes and normalisation.',
    modules: modules([['Querying Data', ['SELECT and WHERE', 'Sorting and grouping']], ['Relational Design', ['Primary and foreign keys', 'Joins', 'Normalisation']]])
  },
  {
    title: 'Git and GitHub Workflow', category: 'Tools', level: 'Beginner', instructor: aarav._id, thumbnail: img('git'),
    description: 'Version control for everyday work: commits, branches, pull requests and resolving conflicts.',
    modules: modules([['Git Basics', ['Init, add and commit', 'Branching and merging']], ['Working With GitHub', ['Remotes and pushing', 'Pull requests', 'Resolving conflicts']]])
  }
]);

const ids = (c) => c.modules.flatMap((m) => m.lessons.map((l) => l._id));
const enroll = (student, course, done, attempt) => ({
  student: student._id, course: course._id, completed: ids(course).slice(0, done), attempts: attempt ? [{ score: attempt, total: course.quiz.length }] : []
});
await Enrollment.insertMany([
  enroll(rohan, web, 5, 3), enroll(rohan, py, 7),
  enroll(isha, web, 12), enroll(isha, dsa, 2),
  enroll(kabir, py, 3, 2), enroll(kabir, sql, 5), enroll(kabir, git, 1)
]);

console.log('Seed complete');
await mongoose.disconnect();
