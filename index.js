import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { themes } from "./themes.js";

const db = await open({ filename: 'questions.db', driver: sqlite3.Database });
db.run("CREATE TABLE IF NOT EXISTS question (id INTEGER PRIMARY KEY, text VARCHAR(512), UNIQUE(id));");
db.run("CREATE TABLE IF NOT EXISTS answer (id VARCHAR(32) PRIMARY KEY, text VARCHAR(512), question INTEGER, correct BOOLEAN, FOREIGN KEY(question) REFERENCES question(id), UNIQUE(id));");
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(512), allQuestions INTEGER, highlightedQuestions INTEGER, UNIQUE(id, name));");
db.run("CREATE TABLE IF NOT EXISTS quizzes (id INTEGER PRIMARY KEY AUTOINCREMENT, owner INTEGER, title VARCHAR(255), FOREIGN KEY(owner) REFERENCES users(id))");
db.run("CREATE TABLE IF NOT EXISTS questions (quiz INTEGER, question INTEGER, highlighted BOOLEAN, FOREIGN KEY(quiz) REFERENCES quizzes(id), FOREIGN KEY(question) REFERENCES questions(id), PRIMARY KEY (quiz, question))");
db.run("CREATE TABLE IF NOT EXISTS answeredQuestions (quiz INTEGER, question INTEGER, user INTEGER, correct BOOLEAN, FOREIGN KEY(quiz) REFERENCES quizzes(id), FOREIGN KEY(question) REFERENCES questions(id), FOREIGN KEY(user) REFERENCES users(id), PRIMARY KEY (quiz, question, user))");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/login', async (req, res) => {
    const user = req.body.username;
    const userId = await (await db.prepare("SELECT id FROM users WHERE name = ?")).get(user);
    if (userId || !user) {
        return res.send({
            ...(await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user)),
            error: false
        });
    } else {
        const newUser = await (await db.prepare("INSERT INTO users (name) VALUES (?)")).run(user);
        const uID = newUser.lastID;
        const allQuiz = await (await db.prepare("INSERT INTO quizzes (owner, title) VALUES (?, ?)")).run(uID, "Alle Fragen");
        const quizId = allQuiz.lastID;

        const quizQuestions = await db.all("SELECT id FROM question");
        db.getDatabaseInstance().serialize(function () {

            var stmt = db.getDatabaseInstance().prepare("INSERT INTO questions(quiz, question, highlighted) VALUES(?, ?, false)");
            for (let i = 0; i < quizQuestions.length; i++) {
                stmt.run(quizId, quizQuestions[i].id);
            }
            stmt.finalize();
        });

        const hQuiz = await (await db.prepare("INSERT INTO quizzes (owner, title) VALUES (?, ?)")).run(uID, "Markierte Fragen");
        const highlightedQuizId = hQuiz.lastID;

        await ((await db.prepare("UPDATE users SET allQuestions = ?, highlightedQuestions = ? WHERE id = ?")).run(quizId, highlightedQuizId, uID));

        res.send({
            ...(await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user)),
            error: false
        });
    }
});

app.get('/user/:name', async (req, res) => {
    const user = req.params.name;
    const userId = await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user);
    if (userId) {
        return res.send({
            ...userId,
            error: false
        });
    } else {
        res.send({
            error: true,
            message: "Der Benutzer existiert noch nicht"
        });
    }
});

app.delete('/user/:name/quiz/:id', async (req, res) => {
    const user = req.params.name;
    const quizId = req.params.id;

    const userId = await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user);
    if (userId) {
        if (quizId === userId.allQuestions || quizId === userId.highlightedQuestions) {
            return res.send({
                error: true,
                message: "Das Quiz kann nicht gelöscht werden"
            });
        }
        const quiz = await (await db.prepare("SELECT * FROM quizzes WHERE id = ? AND owner = ?")).get(quizId, userId.id);
        if (!quiz) return res.send({
            error: true,
            message: "Das Quiz existiert noch nicht"
        });

        await (await db.prepare("DELETE FROM quizzes WHERE id = ?")).run(quizId);
        await (await db.prepare("DELETE FROM questions WHERE quiz = ?")).run(quizId);
        await (await db.prepare("DELETE FROM answeredQuestions WHERE quiz = ?")).run(quizId);

        res.send({ error: false });

    } else {
        res.send({
            error: true,
            message: "Der Benutzer existiert noch nicht"
        });
    }
});

app.post('/user/:name/quiz/:id/highlight', async (req, res) => {
    const user = req.params.name;
    const quizId = req.params.id;
    const target = req.body.target;
    const highlight = req.body.highlight;

    const userId = await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user);
    if (userId) {
        const quiz = await (await db.prepare("SELECT * FROM quizzes WHERE id = ? AND owner = ?")).get(quizId, userId.id);
        if (!quiz) return res.send({
            error: true,
            message: "Das Quiz existiert noch nicht"
        });

        await (await db.prepare("UPDATE questions SET highlighted = ? WHERE quiz = ? AND question = ?")).run(highlight, quizId, target);
        if (highlight) {
            await (await db.prepare("INSERT OR IGNORE INTO questions(quiz, question, highlighted) VALUES(?, ?, true)")).run(userId.highlightedQuestions, target);
        } else {
            await (await db.prepare("DELETE FROM questions WHERE quiz = ? AND question = ?")).run(userId.highlightedQuestions, target);
            await (await db.prepare("DELETE FROM answeredQuestions WHERE quiz = ? AND question = ?")).run(userId.highlightedQuestions, target);
        }

        res.send({ error: false });

    } else {
        res.send({
            error: true,
            message: "Der Benutzer existiert noch nicht"
        });
    }
});

app.post('/user/:name/quiz/:id/answer', async (req, res) => {
    const user = req.params.name;
    const quizId = req.params.id;
    const target = req.body.target;
    const correct = req.body.correct;

    const userId = await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user);
    if (userId) {
        const quiz = await (await db.prepare("SELECT * FROM quizzes WHERE id = ? AND owner = ?")).get(quizId, userId.id);
        if (!quiz) return res.send({
            error: true,
            message: "Das Quiz existiert noch nicht"
        });

        //answeredQuestions
        await (await db.prepare("INSERT OR REPLACE INTO answeredQuestions(quiz, question, user, correct) VALUES (?,?,?,?)")).run(quizId, target, userId.id, correct);

        res.send({ error: false });

    } else {
        res.send({
            error: true,
            message: "Der Benutzer existiert noch nicht"
        });
    }
});




app.get('/user/:name/quiz/:id', async (req, res) => {
    const user = req.params.name;
    const quizId = req.params.id;

    const userId = await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user);
    if (userId) {
        const quiz = await (await db.prepare("SELECT * FROM quizzes WHERE id = ? AND owner = ?")).get(quizId, userId.id);
        if (!quiz) return res.send({
            error: true,
            message: "Das Quiz existiert noch nicht"
        });
        const questions = await (await db.prepare("SELECT id, highlighted, text FROM questions JOIN question ON questions.question = question.id WHERE quiz = ?")).all(quizId);
        const highlightedQuestions = await (await db.prepare("SELECT question, highlighted FROM questions JOIN quizzes ON questions.quiz = quizzes.id WHERE owner = ? AND highlighted = true")).all(userId.id);
        for (let i = 0; i < questions.length; i++) {
            questions[i].answers = await (await db.prepare("SELECT id, text, correct FROM answer WHERE question = ?")).all(questions[i].id);
            questions[i].answered = (await (await db.prepare("SELECT correct FROM answeredQuestions WHERE question = ? AND quiz = ? AND user = ?")).get(questions[i].id, quizId, userId.id)) || { correct: null };
            questions[i].highlighted = highlightedQuestions.find(q => q.question === questions[i].id);
        }

        res.send(
            {
                ...quiz,
                length: questions.length,
                questions
            }
        );
    } else {
        res.send({
            error: true,
            message: "Der Benutzer existiert noch nicht"
        });
    }
});

app.get('/user/:name/quiz', async (req, res) => {
    const user = req.params.name;

    const userId = await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user);
    if (userId) {
        const quiz = await (await db.prepare("SELECT * FROM quizzes WHERE owner = ?")).all(userId.id);
        for (let i = 0; i < quiz.length; i++) {
            quiz[i].count = (await (await db.prepare("SELECT count(id) AS c FROM questions JOIN question ON questions.question = question.id WHERE quiz = ?")).get(quiz[i].id)).c;
            quiz[i].unanswered = quiz[i].count - (await (await db.prepare("SELECT count(correct) AS c FROM answeredQuestions WHERE quiz = ? AND user = ?")).get(quiz[i].id, userId.id)).c;
            quiz[i].wrong = (await (await db.prepare("SELECT count(correct) AS c FROM answeredQuestions WHERE quiz = ? AND user = ? AND correct = false")).get(quiz[i].id, userId.id)).c;
            quiz[i].correct = (await (await db.prepare("SELECT count(correct) AS c FROM answeredQuestions WHERE quiz = ? AND user = ? AND correct = true")).get(quiz[i].id, userId.id)).c;
            quiz[i].all = quiz[i].id === userId.allQuestions;
            quiz[i].highlighted = quiz[i].id === userId.highlightedQuestions;
        }

        res.send(
            {
                quizzes: [
                    ...quiz
                ]
            }
        );
    } else {
        res.send({
            error: true,
            message: "Der Benutzer existiert noch nicht"
        });
    }
});

const getRandom = (arr, n) => {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
};

app.post('/user/:name/quiz', async (req, res) => {
    const user = req.params.name;
    const quiz = { title: req.body.title };
    const filter = req.body.filter;
    const userId = await (await db.prepare("SELECT * FROM users WHERE name = ?")).get(user);
    if (userId) {
        const newQuiz = await (await db.prepare("INSERT INTO quizzes (owner, title) VALUES (?, ?)")).run(userId.id, quiz.title);
        const quizId = newQuiz.lastID;

        var quizQuestions = [];

        if (filter.test) {
            const allQuestions = await db.all("SELECT id, text FROM question");
            const fish = getRandom(allQuestions.filter(question => themes["Fischkunde"].includes(question.id)), 24);
            const water = getRandom(allQuestions.filter(question => themes["Gewässerkunde"].includes(question.id)), 12);
            const right = getRandom(allQuestions.filter(question => themes["Rechtskunde"].includes(question.id)), 12);
            const tool = getRandom(allQuestions.filter(question => themes["Gerätekunde"].includes(question.id)), 12);

            quizQuestions.push(...fish);
            quizQuestions.push(...water);
            quizQuestions.push(...right);
            quizQuestions.push(...tool);

        } else {

            if (filter.theme) {
                if (!themes[filter.theme]) {
                    return res.send({
                        error: true,
                        message: "Das Theme existiert nicht"
                    });
                } else {
                    const allQuestions = await db.all("SELECT id, text FROM question");
                    quizQuestions.push(...allQuestions.filter(question => themes[filter.theme].includes(question.id)));
                }
            } else if (filter.indices) {
                const intervals = filter.indices.split(",");
                const allowedIndices = [];
                intervals.forEach(index => {
                    if (index.includes("-")) {
                        let interval = index.split("-");
                        for (let i = Number.parseInt(interval[0]); i <= Number.parseInt(interval[1]); i++) {
                            allowedIndices.push(i);
                        }
                    } else {
                        allowedIndices.push(Number.parseInt(index));
                    }
                });

                const allQuestions = await db.all("SELECT id, text FROM question");
                quizQuestions.push(...allQuestions.filter(question => allowedIndices.includes(question.id)));
            } else {
                const allQuestions = await db.all("SELECT id, text FROM question");
                quizQuestions.push(...allQuestions);
            }

            if (filter.onlywrong) {
                // only wrong
            }

            if (filter.img) {
                quizQuestions = quizQuestions.filter(question => question.text.includes("<img"));
            }
        }

        db.getDatabaseInstance().serialize(async function () {

            var stmt = db.getDatabaseInstance().prepare("INSERT INTO questions(quiz, question, highlighted) VALUES(?, ?, false)");
            for (let i = 0; i < quizQuestions.length; i++) {
                stmt.run(quizId, quizQuestions[i].id);
            }
            stmt.finalize();
        });

        return res.send({
            id: quizId,
            count: quizQuestions.length,
            title: quiz.title,
            error: false
        });
    } else {
        res.send({
            error: true,
            message: "Der Benutzer existiert noch nicht"
        });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
