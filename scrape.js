import puppeteer from 'puppeteer';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

(async () => {
    const db = await open({ filename: 'questions.db', driver: sqlite3.Database });
    db.run("CREATE TABLE IF NOT EXISTS question (id INTEGER PRIMARY KEY, text VARCHAR(512), UNIQUE(id));");
    db.run("CREATE TABLE IF NOT EXISTS answer (id VARCHAR(32) PRIMARY KEY, text VARCHAR(512), question INTEGER, correct BOOLEAN, FOREIGN KEY(question) REFERENCES question(id), UNIQUE(id));");

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setCookie({
        "domain": ".onlinekurs-hessenfischer.de",
        "expirationDate": 1695365811,
        "hostOnly": false,
        "httpOnly": false,
        "name": "__zlcmid",
        "path": "/",
        "sameSite": "lax",
        "secure": false,
        "session": false,
        "storeId": "0",
        "value": "1BFl7MQqOpiPsPY",
        "id": 1
    },
        {
            "domain": "onlinekurs-hessenfischer.de",
            "hostOnly": true,
            "httpOnly": true,
            "name": "PHPSESSID",
            "path": "/",
            "sameSite": "unspecified",
            "secure": true,
            "session": true,
            "storeId": "0",
            "value": "b7f11b5da22b6fc897c63430bb01bc19",
            "id": 2
        },
        {
            "domain": "onlinekurs-hessenfischer.de",
            "expirationDate": 1671604979,
            "hostOnly": true,
            "httpOnly": true,
            "name": "rememberMe",
            "path": "/hessen",
            "sameSite": "unspecified",
            "secure": true,
            "session": false,
            "storeId": "0",
            "value": "MjU0OTgy",
            "id": 3
        },
        {
            "domain": "onlinekurs-hessenfischer.de",
            "expirationDate": 1671604979,
            "hostOnly": true,
            "httpOnly": true,
            "name": "rememberMeToken",
            "path": "/hessen",
            "sameSite": "unspecified",
            "secure": true,
            "session": false,
            "storeId": "0",
            "value": "8155821800819c79f19cc054f8ec05a7",
            "id": 4
        });
    await page.setDefaultTimeout(300000);
    await page.goto('https://onlinekurs-hessenfischer.de/hessen/index.php');
    await page.click('.headerButton:nth-of-type(2)');
    await page.waitForSelector('.categorySelection:last-of-type');
    await page.click('.categorySelection:last-of-type');
    await page.waitForSelector('#startQuestionsButton');
    await page.click('#startQuestionsButton');
    await page.waitForSelector('.questiontext');

    const bodyHandle = await page.$('body');

    const knownQuestions = (await db.all("SELECT id FROM question", [])).map(row => row.id);
    const questionIDs = await page.evaluate((body, knownQuestions) => {
        return Array.from(body.querySelectorAll('.questionProcess')).map(elem => ({id: Number.parseInt(elem.id.replace(/^\D+/g, '')), selector: "#"+elem.id})).filter(row => !(knownQuestions.includes(row.id)));
    }, bodyHandle, knownQuestions);

    const countTest = 1;

    console.log(`Scrape ${questionIDs.length+1} Questions`);

    for (let i = 0; i < questionIDs.length+1; i++) {
        const nextQuestion = questionIDs[i];
        const questionData = await page.evaluate((body) => {
            const qID = Number.parseInt(body.querySelector('.questionProcessSelected').id.replace(/^\D+/g, ''));
            const img = body.querySelector('#taskdiv img');
            return {
                id: qID,
                text: `${body.querySelector('.questiontext').innerHTML} ${img !== null ? `<img src='${img.src}' />` : ""}`,
                answers: [
                    { text: document.querySelector('label[for=answer1]').innerHTML, id: `${qID}-1`, correct: false },
                    { text: document.querySelector('label[for=answer2]').innerHTML, id: `${qID}-2`, correct: false },
                    { text: document.querySelector('label[for=answer3]').innerHTML, id: `${qID}-3`, correct: false },
                ]
            };
        }, bodyHandle);

        // click on "Lösen" and wait for solution
        await page.click('.ladda-button');
        await page.waitForSelector('.css-label-correct');

        const correctAnswer = await page.evaluate((body) => {
            return Number.parseInt(body.querySelector('.css-label-correct').htmlFor.replace(/^\D+/g, '') - 1);
        }, bodyHandle);

        questionData.answers[correctAnswer].correct = true;

        console.log(`save question ${i} with id ${questionData.id}`);

        db.getDatabaseInstance().serialize(async function () {

            db.getDatabaseInstance().prepare("INSERT OR IGNORE INTO question(id, text) VALUES(?, ?)").run(questionData.id, questionData.text).finalize();

            var stmt = db.getDatabaseInstance().prepare("INSERT OR IGNORE INTO answer(id, text, question, correct) VALUES(?, ?, ?, ?)");
            for (let i = 0; i < questionData.answers.length; i++) {
                stmt.run(questionData.answers[i].id, questionData.answers[i].text, questionData.id, questionData.answers[i].correct);
            }
            stmt.finalize();
        });

        // click on next page and wait until solution disappears
        // await page.click('.ladda-button');
        if(nextQuestion) await page.click(nextQuestion.selector);
        else return;
        await page.waitForFunction(() => !document.querySelector('.css-label-correct'));

    }

    await browser.close();
})();
