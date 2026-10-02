import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Progress, Status, useAuth, useFetch } from '../common.jsx';

const Row = ({ c }) => (
  <div className="card pad row">
    <img src={c.thumbnail} alt="" />
    <div className="grow">
      <strong>{c.title}</strong>
      <p className="muted">{c.instructor} · {c.progress}% complete{c.best !== null && ` · Best quiz: ${c.best}/${c.total}`}</p>
      <Progress value={c.progress} />
    </div>
    <div className="actions">
      <Link className="btn" to={`/learn/${c._id}`}>{c.progress ? 'Continue' : 'Start'}</Link>
      {c.hasQuiz && <Link className="btn ghost" to={`/quiz/${c._id}`}>Quiz</Link>}
    </div>
  </div>
);

export function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/student/courses');
  const done = data?.filter((c) => c.progress === 100).length;
  const active = data?.filter((c) => c.progress > 0 && c.progress < 100).length;
  const overall = data?.length ? Math.round(data.reduce((a, c) => a + c.progress, 0) / data.length) : 0;
  const next = data?.find((c) => c.progress < 100);
  return (
    <>
      <h1>Welcome back, {user.name.split(' ')[0]}</h1>
      <Status loading={loading} error={error} />
      {data && (
        <>
          <div className="stats">
            <div className="card pad"><b>{data.length}</b><span>Enrolled</span></div>
            <div className="card pad"><b>{active}</b><span>In progress</span></div>
            <div className="card pad"><b>{done}</b><span>Completed</span></div>
            <div className="card pad"><b>{overall}%</b><span>Overall progress</span></div>
          </div>
          {next && <><h2>Continue learning</h2><Row c={next} /></>}
          <h2>Recent courses</h2>
          {!data.length && <p className="empty">You have not enrolled in any course yet. <Link to="/courses">Browse courses</Link></p>}
          {data.slice(0, 3).map((c) => <Row key={c._id} c={c} />)}
        </>
      )}
    </>
  );
}

export function MyCourses() {
  const { data, loading, error } = useFetch('/student/courses');
  return (
    <>
      <h1>My courses</h1>
      <Status loading={loading} error={error} />
      {data && !data.length && <p className="empty">Nothing here yet. <Link to="/courses">Find a course</Link></p>}
      {data?.map((c) => <Row key={c._id} c={c} />)}
    </>
  );
}

export function Learn() {
  const { id } = useParams();
  const { notify } = useAuth();
  const course = useFetch(`/courses/${id}`);
  const enr = useFetch(`/courses/${id}/enrollment`);
  const [done, setDone] = useState(null);
  const [sel, setSel] = useState(null);
  const lessons = course.data?.modules.flatMap((m) => m.lessons) || [];

  useEffect(() => {
    if (!course.data || !enr.data) return;
    setDone(enr.data.completed);
    setSel((lessons.find((l) => !enr.data.completed.includes(l._id)) || lessons[0])?._id);
  }, [course.data, enr.data]);

  if (!enr.loading && !enr.error && !enr.data) return <Navigate to={`/courses/${id}`} />;
  if (course.loading || enr.loading || !done) return <Status loading={course.loading || enr.loading} error={course.error || enr.error} />;

  const lesson = lessons.find((l) => l._id === sel);
  const count = lessons.filter((l) => done.includes(l._id)).length;
  const pct = lessons.length ? Math.round((count * 100) / lessons.length) : 0;

  const complete = async () => {
    try {
      const r = await api(`/courses/${id}/lessons/${sel}/complete`, { method: 'POST' });
      setDone(r.completed);
      notify('Lesson marked as complete');
    } catch (e) {
      notify(e.message, 'err');
    }
  };

  return (
    <div className="learn">
      <aside className="card pad side">
        <h3>{course.data.title}</h3>
        <Progress value={pct} />
        <p className="muted">{pct}% complete</p>
        {course.data.modules.map((m) => (
          <div key={m._id}>
            <strong>{m.title}</strong>
            {m.lessons.map((l) => (
              <button key={l._id} className={`lesson ${l._id === sel ? 'active' : ''}`} onClick={() => setSel(l._id)}>
                {done.includes(l._id) ? '✓ ' : '○ '}{l.title}
              </button>
            ))}
          </div>
        ))}
        {course.data.quiz.length > 0 && <Link className="btn ghost" to={`/quiz/${id}`}>Take the quiz</Link>}
      </aside>
      <section className="card pad">
        {lesson ? (
          <>
            <h1>{lesson.title}</h1>
            <p className="muted">{lesson.minutes} min</p>
            <p className="content">{lesson.content}</p>
            {done.includes(lesson._id) ? <p className="ok">Completed</p> : <button className="btn" onClick={complete}>Mark as complete</button>}
          </>
        ) : <p className="empty">This course has no lessons yet.</p>}
      </section>
    </div>
  );
}

export function Quiz() {
  const { id } = useParams();
  const { notify } = useAuth();
  const course = useFetch(`/courses/${id}`);
  const enr = useFetch(`/courses/${id}/enrollment`);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  if (!enr.loading && !enr.error && !enr.data) return <Navigate to={`/courses/${id}`} />;
  if (course.loading || enr.loading || course.error) return <Status loading={course.loading || enr.loading} error={course.error} />;
  const qs = course.data.quiz;
  if (!qs.length) return <p className="empty">This course has no quiz.</p>;

  const submit = async () => {
    if (Object.keys(answers).length < qs.length) return notify('Answer every question first', 'err');
    try {
      setResult(await api(`/courses/${id}/quiz/submit`, { method: 'POST', body: { answers: qs.map((_, i) => answers[i]) } }));
    } catch (e) {
      notify(e.message, 'err');
    }
  };

  if (result) {
    return (
      <>
        <h1>Quiz result</h1>
        <div className="card pad"><h2>You scored {result.score} / {result.total}</h2></div>
        {result.review.map((r, i) => (
          <div className="card pad" key={i}>
            <strong>{i + 1}. {r.text}</strong>
            {r.options.map((o, j) => <p key={j} className={j === r.answer ? 'ok' : j === r.chosen ? 'error' : ''}>{o}{j === r.answer && ' ✓'}{j === r.chosen && j !== r.answer && ' ✗'}</p>)}
          </div>
        ))}
        <button className="btn" onClick={() => { setResult(null); setAnswers({}); }}>Retake quiz</button>{' '}
        <Link className="btn ghost" to={`/learn/${id}`}>Back to course</Link>
      </>
    );
  }

  return (
    <>
      <h1>{course.data.title} — Quiz</h1>
      {qs.map((q, i) => (
        <div className="card pad" key={q._id}>
          <strong>{i + 1}. {q.text}</strong>
          {q.options.map((o, j) => (
            <label key={j} className="opt"><input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers({ ...answers, [i]: j })} /> {o}</label>
          ))}
        </div>
      ))}
      <button className="btn" onClick={submit}>Submit quiz</button>
    </>
  );
}

export function Profile() {
  const { user } = useAuth();
  return (
    <div className="card pad form">
      <h1>Profile</h1>
      <p><b>Name:</b> {user.name}</p>
      <p><b>Email:</b> {user.email}</p>
      <p><b>Role:</b> {user.role}</p>
    </div>
  );
}
