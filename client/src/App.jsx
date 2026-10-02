import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Guard, useAuth } from './common.jsx';
import { Courses, CourseDetail, Home, Login, Register } from './pages/Public.jsx';
import { Dashboard, Learn, MyCourses, Profile, Quiz } from './pages/Student.jsx';
import { Editor, InstructorDashboard, Students } from './pages/Instructor.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="nav">
      <Link to="/" className="brand">LearnHub</Link>
      <nav>
        <NavLink to="/courses">Courses</NavLink>
        {user?.role === 'student' && <><NavLink to="/student">Dashboard</NavLink><NavLink to="/student/courses">My Courses</NavLink><NavLink to="/profile">Profile</NavLink></>}
        {user?.role === 'instructor' && <><NavLink to="/instructor">Dashboard</NavLink><NavLink to="/instructor/courses/new">New Course</NavLink></>}
        {user ? <button className="link" onClick={() => { logout(); navigate('/'); }}>Logout</button> : <><NavLink to="/login">Login</NavLink><NavLink to="/register">Register</NavLink></>}
      </nav>
    </header>
  );
}

export default function App() {
  const s = (el) => <Guard role="student">{el}</Guard>;
  const i = (el) => <Guard role="instructor">{el}</Guard>;
  return (
    <>
      <Nav />
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/student" element={s(<Dashboard />)} />
          <Route path="/student/courses" element={s(<MyCourses />)} />
          <Route path="/learn/:id" element={s(<Learn />)} />
          <Route path="/quiz/:id" element={s(<Quiz />)} />
          <Route path="/profile" element={s(<Profile />)} />
          <Route path="/instructor" element={i(<InstructorDashboard />)} />
          <Route path="/instructor/courses/new" element={i(<Editor />)} />
          <Route path="/instructor/courses/:id/edit" element={i(<Editor />)} />
          <Route path="/instructor/courses/:id/students" element={i(<Students />)} />
          <Route path="*" element={<p className="center">Page not found</p>} />
        </Routes>
      </main>
    </>
  );
}
