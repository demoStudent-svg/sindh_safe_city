const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const recordActivity = require("../utils/recordActivity");

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

function createToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });
}

async function signup(req, res) {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ success: false, message: "An account with this email already exists." });
  }
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    role: "Operator"
  });
  await recordActivity({ user: user._id, action: "User registered", description: `${user.name} registered an account.`, entityType: "User", entityId: user._id.toString() });
  res.status(201).json({ success: true, message: "Account registered successfully.", data: { user: safeUser(user) } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }
  await recordActivity({ user: user._id, action: "User logged in", description: `${user.name} logged in.`, entityType: "User", entityId: user._id.toString() });
  res.json({ success: true, message: "Login successful.", data: { token: createToken(user), user: safeUser(user) } });
}

function me(req, res) {
  res.json({ success: true, data: { user: safeUser(req.user) } });
}

function logout(req, res) {
  res.json({ success: true, message: "Logged out. Remove the stored token on this device." });
}

module.exports = { signup, login, me, logout };
