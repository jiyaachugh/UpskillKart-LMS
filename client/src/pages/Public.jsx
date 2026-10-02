import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { CATEGORIES, LEVELS, Status, useAuth, useFetch } from '../common.jsx';

const CourseCard = ({ c }) => (
  <Link to={`/courses/${c._id}`} className="card course">
    <img src={c.thumbnail} alt="" />
    <div className="pad">
      <span className="tag">{c.category} · {c.level}</span>
      <h3>{c.title}</h3>
      <p className="muted">
        {c.instructor?.name} · {c.enrolled} enrolled
      </p>
    </div>
  </Link>
);

export function Home() {
  const { data, loading, error } = useFetch('/courses');

  // API may return an array or an object containing courses
  const courses = Array.isArray(data)
    ? data
    : Array.isArray(data?.courses)
      ? data.courses
      : [];

  return (
    <>
      <section className="hero">
        <h1>Learn something useful today</h1>
        <p>
          LearnHub is where instructors publish courses and students track
          their progress.
        </p>
        <Link className="btn" to="/courses">
          Browse courses
        </Link>
      </section>

      <h2>Latest courses</h2>

      <Status loading={loading} error={error} />

      {!loading && !error && courses.length === 0 && (
        <p className="empty">No courses available yet.</p>
      )}

      {courses.length > 0 && (
        <div className="grid">
          {courses.slice(0, 3).map((c) => (
            <CourseCard key={c._id} c={c} />
          ))}
        </div>
      )}
    </>
  );
}

export function Courses() {
  const [f, setF] = useState({
    search: '',
    category: '',
    level: ''
  });

  const [applied, setApplied] = useState(f);

  const qs = new URLSearchParams(
    Object.entries(applied).filter(([, v]) => v)
  ).toString();

  const { data, loading, error } = useFetch('/courses?' + qs);

  // Normalize API response
  const courses = Array.isArray(data)
    ? data
    : Array.isArray(data?.courses)
      ? data.courses
      : [];

  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h1>Courses</h1>

      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(f);
        }}
      >
        <input
          placeholder="Search by title"
          value={f.search}
          onChange={set('search')}
        />

        <select value={f.category} onChange={set('category')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select value={f.level} onChange={set('level')}>
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>

        <button className="btn">Search</button>
      </form>

      <Status loading={loading} error={error} />

      {!loading && !error && courses.length === 0 && (
        <p className="empty">No courses match your search.</p>
      )}

      {courses.length > 0 && (
        <div className="grid">
          {courses.map((c) => (
            <CourseCard key={c._id} c={c} />
          ))}
        </div>
      )}
    </>
  );
}

export function CourseDetail() {
  const { id } = useParams();
  const { user, notify } = useAuth();
  const navigate = useNavigate();

  const course = useFetch(`/courses/${id}`);

  const enr = useFetch(
    user?.role === 'student'
      ? `/courses/${id}/enrollment`
      : null
  );

  const c = course.data;

  const enroll = async () => {
    try {
      await api(`/courses/${id}/enroll`, {
        method: 'POST'
      });

      notify('Enrolled successfully');
      navigate(`/learn/${id}`);
    } catch (e) {
      notify(e.message, 'err');
    }
  };

  return (
    <>
      <Status
        loading={course.loading}
        error={course.error}
      />

      {c && (
        <div className="detail">
          <img
            className="banner"
            src={c.thumbnail}
            alt=""
          />

          <span className="tag">
            {c.category} · {c.level}
          </span>

          <h1>{c.title}</h1>

          <p className="muted">
            By {c.instructor?.name} · {c.minutes} min ·{' '}
            {c.enrolled} enrolled · Added{' '}
            {new Date(c.createdAt).toLocaleDateString()}
          </p>

          <p>{c.description}</p>

          {!user && (
            <Link className="btn" to="/login">
              Log in to enroll
            </Link>
          )}

          {user?.role === 'student' &&
            !enr.loading &&
            (
              enr.data ? (
                <Link
                  className="btn"
                  to={`/learn/${id}`}
                >
                  Continue learning
                </Link>
              ) : (
                <button
                  className="btn"
                  onClick={enroll}
                >
                  Enroll now
                </button>
              )
            )}

          <h2>Course content</h2>

          {c.modules?.map((m, i) => (
            <div
              className="card pad"
              key={m._id}
            >
              <strong>
                Module {i + 1}: {m.title}
              </strong>

              <ul>
                {m.lessons?.map((l) => (
                  <li key={l._id}>
                    {l.title}{' '}
                    <span className="muted">
                      · {l.minutes} min
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {c.quiz?.length > 0 && (
            <p className="muted">
              Includes a quiz with {c.quiz.length} questions.
            </p>
          )}
        </div>
      )}
    </>
  );
}

export function Login() {
  const { login, notify } = useAuth();
  const navigate = useNavigate();

  const [f, setF] = useState({
    email: '',
    password: ''
  });

  const submit = async (e) => {
    e.preventDefault();

    try {
      const u = await login('/auth/login', f);

      navigate(
        u.role === 'instructor'
          ? '/instructor'
          : '/student'
      );
    } catch (err) {
      notify(err.message, 'err');
    }
  };

  return (
    <form
      className="card pad form"
      onSubmit={submit}
    >
      <h1>Log in</h1>

      <input
        type="email"
        placeholder="Email"
        value={f.email}
        onChange={(e) =>
          setF({
            ...f,
            email: e.target.value
          })
        }
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={f.password}
        onChange={(e) =>
          setF({
            ...f,
            password: e.target.value
          })
        }
        required
      />

      <button className="btn">
        Log in
      </button>

      <p className="muted">
        New here?{' '}
        <Link to="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function Register() {
  const { login, notify } = useAuth();
  const navigate = useNavigate();

  const [f, setF] = useState({
    name: '',
    email: '',
    password: ''
  });

  const set = (k) => (e) =>
    setF({
      ...f,
      [k]: e.target.value
    });

  const submit = async (e) => {
    e.preventDefault();

    try {
      const u = await login(
        '/auth/register',
        f
      );

      navigate(
        u.role === 'instructor'
          ? '/instructor'
          : '/student'
      );
    } catch (err) {
      notify(err.message, 'err');
    }
  };

  return (
    <form
      className="card pad form"
      onSubmit={submit}
    >
      <h1>Create account</h1>

      <input
        placeholder="Full name"
        value={f.name}
        onChange={set('name')}
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={f.email}
        onChange={set('email')}
        required
      />

      <input
        type="password"
        placeholder="Password (min 6 characters)"
        value={f.password}
        onChange={set('password')}
        minLength={6}
        required
      />

      <button className="btn">
        Register
      </button>
    </form>
  );
}