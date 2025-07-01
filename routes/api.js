// routes/api.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/users - Get all users
router.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/:id - Get user by ID
router.get("/users/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/users - Insert a new Google user
router.post("/users", async (req, res) => {
  const { name, email, photo, oauth_user_id } = req.body;

  try {
    // Get or insert Google as provider
    let result = await pool.query(
      "SELECT id FROM oauth_providers WHERE provider_name = $1",
      ["google"]
    );
    let providerId = result.rows[0]?.id;

    if (!providerId) {
      result = await pool.query(
        "INSERT INTO oauth_providers (provider_name) VALUES ($1) RETURNING id",
        ["google"]
      );
      providerId = result.rows[0].id;
    }

    // Insert into users
    const userRes = await pool.query(
      `INSERT INTO users (name, email, profile_picture_url)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, email, photo]
    );

    const user = userRes.rows[0];

    // Link OAuth account
    await pool.query(
      `INSERT INTO user_oauth_accounts (user_id, provider_id, oauth_user_id)
       VALUES ($1, $2, $3)`,
      [user.id, providerId, oauth_user_id]
    );

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

module.exports = router;
