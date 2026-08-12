import { useEffect, useState } from "react";
import { Link, Routes, Route, useNavigate } from "react-router-dom";
import api from "./api";

function Home() {
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");

  const search = async () => {
    const { data } = await api.get("/jobs", { params: { q } });
    setJobs(data);
  };

  useEffect(() => { search(); }, []);

  const apply = async (jobId) => {
    try {
      await api.post(`/applications/${jobId}`);
      alert("Application submitted");
    } catch (e) {
      alert(e.response?.data?.message || "Please login as a job seeker");
    }
  };

  return (
    <main>
      <h1>Find your next job</h1>
      <div className="search">
        <input
          placeholder="Search job title or skill"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={search}>Search</button>
      </div>

      {jobs.map((job) => (
        <article className="card" key={job.id}>
          <h2>{job.title}</h2>
          <p><b>{job.company_name}</b> · {job.location}</p>
          <p>{job.description}</p>
          <p>Experience: {job.experience || "Not specified"} · Salary: {job.salary || "Not specified"}</p>
          <button onClick={() => apply(job.id)}>Apply</button>
        </article>
      ))}
    </main>
  );
}

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (e) {
      alert(e.response?.data?.message || "Login failed");
    }
  };

  return <Form title="Login" form={form} setForm={setForm} submit={submit} />;
}

function Register() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "seeker"
  });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", form);
      alert("Registered. Now login.");
      window.location.href = "/login";
    } catch (e) {
      alert(e.response?.data?.message || "Registration failed");
    }
  };

  return <Form title="Create account" form={form} setForm={setForm} submit={submit} register />;
}

function Form({ title, form, setForm, submit, register }) {
  return (
    <form className="form" onSubmit={submit}>
      <h1>{title}</h1>
      {register && (
        <input placeholder="Name" required value={form.name}
          onChange={e => setForm({...form, name: e.target.value})} />
      )}
      <input type="email" placeholder="Email" required value={form.email}
        onChange={e => setForm({...form, email: e.target.value})} />
      <input type="password" placeholder="Password" required value={form.password}
        onChange={e => setForm({...form, password: e.target.value})} />
      {register && (
        <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
          <option value="seeker">Job Seeker</option>
          <option value="recruiter">Recruiter</option>
        </select>
      )}
      <button type="submit">{title}</button>
    </form>
  );
}

function Recruiter() {
  const [form, setForm] = useState({
    title: "", description: "", location: "", experience: "", salary: "", skills: ""
  });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/jobs", form);
      alert("Job posted");
      setForm({title:"",description:"",location:"",experience:"",salary:"",skills:""});
    } catch (e) {
      alert(e.response?.data?.message || "Only recruiters can post jobs");
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <h1>Post a Job</h1>
      {Object.keys(form).map(key => (
        key === "description" ? (
          <textarea key={key} placeholder={key} required value={form[key]}
            onChange={e => setForm({...form, [key]: e.target.value})} />
        ) : (
          <input key={key} placeholder={key} required value={form[key]}
            onChange={e => setForm({...form, [key]: e.target.value})} />
        )
      ))}
      <button>Post Job</button>
    </form>
  );
}

export default function App() {
  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <>
      <nav>
        <Link to="/">Jobs</Link>
        <Link to="/register">Register</Link>
        <Link to="/login">Login</Link>
        <Link to="/recruiter">Post Job</Link>
        <button onClick={logout}>Logout</button>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recruiter" element={<Recruiter />} />
      </Routes>
    </>
  );
}