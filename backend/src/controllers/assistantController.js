const { answerQuestion } = require("../services/assistantService");

async function query(req, res) {
  const result = await answerQuestion(req.body.question);
  res.json({ success: true, data: result });
}

module.exports = { query };
