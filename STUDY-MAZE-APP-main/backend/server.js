require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const quizRoutes = require('./routes/quiz');
const uploadRoutes = require('./routes/upload');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, service: 'study-maze-backend' }));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/quiz', quizRoutes);
app.use('/upload', uploadRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Study Maze backend running on http://localhost:${PORT}`));
