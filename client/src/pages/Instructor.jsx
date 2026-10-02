import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { CATEGORIES, LEVELS, Progress, Status, useAuth, useFetch } from '../common.jsx';

export function InstructorDashboard() {
  const { notify } = useAuth();
  const [n, setN] = useState(0);
  const { data, loading, error } = useFetch('/instructor/courses', n);
  const remove = async (c) => {
    if (!confirm(`Delete "${c.title}" and all its enrollments?`)) return;
    try {
      await api(`/courses/${c._id}`, { method: 'DELETE' });
      notify('Course deleted');
      setN(n + 1);
    } catch (e) {
      notify(e.message, 'err');
    }
  };
  const students = data?.reduce((a, c) => a + c.enrolled, 0);
  return (
    <>
      <h1>Instructor dashboard</h1>
      <Status loading={loading} error={error} />
      {data && (
        <>
          <div className="stats">
            <div className="card pad"><b>{data.length}</b><span>Courses</span></div>
            <div className="card pad"><b>{students}</b><span>Total enrollments</span></div>
            <div className="card pad"><b>{data.length ? (students / data.length).toFixed(1) : 0}</b><span>Avg per course</span></div>
          </div>
          <h2>My courses</h2>
          {!data.length && <p className="empty">You have not created a course yet. <Link to="/instructor/courses/new">Create one</Link></p>}
          {data.length > 0 && (
            <div className="card table-wrap">
              <table>
                <thead><tr><th>Course</th><th>Lessons</th><th>Students</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c._id}>
                      <td>{c.title}</td><td>{c.lessons}</td><td>{c.enrolled}</td><td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="actions"><Link to={`/instructor/courses/${c._id}/edit`}>Edit</Link><Link to={`/instructor/courses/${c._id}/students`}>Students</Link><button className="link danger" onClick={() => remove(c)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

const blank = { title: '', description: '', category: CATEGORIES[0], level: LEVELS[0], thumbnail: 'https://picsum.photos/seed/newcourse/600/340', modules: [], quiz: [] };

export function Editor() {
  const { id } = useParams();
  const { notify } = useAuth();
  const navigate = useNavigate();
  const [c, setC] = useState(blank);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return setC(blank);
    setLoading(true);
    api(`/courses/${id}/manage`).then(setC).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const edit = (fn) => setC((p) => { const n = structuredClone(p); fn(n); return n; });
  const text = (fn) => (e) => edit((n) => fn(n, e.target.value));

  const save = async (e) => {
    e.preventDefault();
    try {
      await api(id ? `/courses/${id}` : '/courses', { method: id ? 'PUT' : 'POST', body: c });
      notify(id ? 'Course updated' : 'Course created');
      navigate('/instructor');
    } catch (err) {
      notify(err.message, 'err');
    }
  };

  if (loading || error) return <Status loading={loading} error={error} />;
  return (
    <form onSubmit={save}>
      <h1>{id ? 'Edit course' : 'Create course'}</h1>
      <div className="card pad form">
        <input placeholder="Title" value={c.title} onChange={text((n, v) => { n.title = v; })} required />
        <textarea placeholder="Description" rows={3} value={c.description} onChange={text((n, v) => { n.description = v; })} required />
        <select value={c.category} onChange={text((n, v) => { n.category = v; })}>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={c.level} onChange={text((n, v) => { n.level = v; })}>{LEVELS.map((x) => <option key={x}>{x}</option>)}</select>
        <input placeholder="Thumbnail image URL" value={c.thumbnail} onChange={text((n, v) => { n.thumbnail = v; })} />
      </div>

      <h2>Modules and lessons</h2>
      {c.modules.map((m, mi) => (
        <div className="card pad form" key={m._id || mi}>
          <div className="row">
            <input className="grow" placeholder="Module title" value={m.title} onChange={text((n, v) => { n.modules[mi].title = v; })} required />
            <button type="button" className="link danger" onClick={() => edit((n) => { n.modules.splice(mi, 1); })}>Remove module</button>
          </div>
          {m.lessons.map((l, li) => (
            <div className="sub" key={l._id || li}>
              <div className="row">
                <input className="grow" placeholder="Lesson title" value={l.title} onChange={text((n, v) => { n.modules[mi].lessons[li].title = v; })} required />
                <input type="number" min="1" className="short" value={l.minutes} onChange={text((n, v) => { n.modules[mi].lessons[li].minutes = Number(v) || 1; })} />
                <button type="button" className="link danger" onClick={() => edit((n) => { n.modules[mi].lessons.splice(li, 1); })}>Remove</button>
              </div>
              <textarea placeholder="Lesson content" rows={3} value={l.content} onChange={text((n, v) => { n.modules[mi].lessons[li].content = v; })} />
            </div>
          ))}
          <button type="button" className="btn ghost" onClick={() => edit((n) => { n.modules[mi].lessons.push({ title: '', content: '', minutes: 10 }); })}>Add lesson</button>
        </div>
      ))}
      <button type="button" className="btn ghost" onClick={() => edit((n) => { n.modules.push({ title: '', lessons: [] }); })}>Add module</button>

      <h2>Quiz</h2>
      {c.quiz.map((q, qi) => (
        <div className="card pad form" key={q._id || qi}>
          <div className="row">
            <input className="grow" placeholder="Question" value={q.text} onChange={text((n, v) => { n.quiz[qi].text = v; })} required />
            <button type="button" className="link danger" onClick={() => edit((n) => { n.quiz.splice(qi, 1); })}>Remove</button>
          </div>
          {q.options.map((o, oi) => (
            <label className="row" key={oi}>
              <input type="radio" name={`correct${qi}`} checked={q.answer === oi} onChange={() => edit((n) => { n.quiz[qi].answer = oi; })} />
              <input className="grow" placeholder={`Option ${oi + 1}`} value={o} onChange={text((n, v) => { n.quiz[qi].options[oi] = v; })} required />
            </label>
          ))}
          <p className="muted">Select the radio button next to the correct option.</p>
        </div>
      ))}
      <button type="button" className="btn ghost" onClick={() => edit((n) => { n.quiz.push({ text: '', options: ['', '', '', ''], answer: 0 }); })}>Add question</button>
      <p><button className="btn">{id ? 'Save changes' : 'Create course'}</button></p>
    </form>
  );
}

export function Students() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(`/instructor/courses/${id}/students`);
  return (
    <>
      <Link to="/instructor">← Back to dashboard</Link>
      <Status loading={loading} error={error} />
      {data && (
        <>
          <h1>{data.title}</h1>
          <p className="muted">{data.students.length} enrolled students</p>
          {!data.students.length && <p className="empty">No students have enrolled yet.</p>}
          {data.students.length > 0 && (
            <div className="card table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Progress</th><th>Best quiz</th><th>Enrolled</th></tr></thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td><td>{s.email}</td>
                      <td><Progress value={s.progress} /> {s.progress}%</td>
                      <td>{s.best === null ? '—' : `${s.best}/${data.total}`}</td>
                      <td>{new Date(s.enrolledAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
