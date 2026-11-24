const crypto = require("node:crypto");

function generateId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

module.exports = generateId;
