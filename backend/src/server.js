require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { auth, role } = require("./auth");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "UP", service: "job-portal-backend" });
});

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role: userRole = "seeker" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (!["seeker", "recruiter"].includes(userRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email.toLowerCase(), hash, userRole]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// List/search jobs
app.get("/api/jobs", async (req, res) => {
  try {
    const q = req.query.q || "";

    const result = await pool.query(
      `SELECT j.*, c.company_name
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE j.title ILIKE $1
          OR j.skills ILIKE $1
          OR j.location ILIKE $1
       ORDER BY j.created_at DESC`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Recruiter posts a job
app.post("/api/jobs", auth, role("recruiter"), async (req, res) => {
  try {
    const { title, description, location, experience, salary, skills } = req.body;

    let company = await pool.query(
      "SELECT id FROM companies WHERE user_id = $1",
      [req.user.id]
    );

    if (!company.rows.length) {
      company = await pool.query(
        `INSERT INTO companies (user_id, company_name)
         VALUES ($1, $2) RETURNING id`,
        [req.user.id, `${req.user.name}'s Company`]
      );
    }

    const result = await pool.query(
      `INSERT INTO jobs
       (company_id, title, description, location, experience, salary, skills)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [company.rows[0].id, title, description, location, experience, salary, skills]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create job" });
  }
});

// Apply for a job
app.post("/api/applications/:jobId", auth, role("seeker"), async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO applications (job_id, user_id)
       VALUES ($1, $2)`,
      [req.params.jobId, req.user.id]
    );

    res.status(201).json({ message: "Application submitted" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Already applied" });
    }
    console.error(err);
    res.status(500).json({ message: "Could not apply" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});