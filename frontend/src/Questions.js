import React, { useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/esm/Button';
import Container from 'react-bootstrap/esm/Container';
import Form from 'react-bootstrap/Form';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Image from 'react-bootstrap/Image';


export default function Questions() {
    const { authed } = useAuth();
    const params = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [quiz, setQuiz] = useState(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [s, setS] = useState(0);
    const [c, setC] = useState(false);
    const [highlighted, setHighlighted] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const correct = useRef();

    const handleSolve = () => {
        let cc = false;
        if (correct.current.querySelector("input").checked) {
            //richtig
            setC(true);
            if (!quiz.questions[questionIndex].answered.correct) setCorrectCount(correctCount + 1);
            cc = true;
        }
        fetch("https://backend.fishingqueen.lukasschreiber.com/user/" + authed + "/quiz/" + params.id + "/answer", {
            method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                "target": quiz.questions[questionIndex].id,
                "correct": cc
            })
        }).then(body => body.json()).then(json => console.log(json));
        correct.current.querySelector("input").checked = true;
        correct.current.classList.add("correct");
        quiz.questions[questionIndex].answered.correct = cc ? 1 : 0;
        localStorage.setItem(quiz.id, JSON.stringify(quiz));
        setS(1);
        reload(authed, params, true);
    };

    const handleHighlight = () => {
        fetch("https://backend.fishingqueen.lukasschreiber.com/user/" + authed + "/quiz/" + params.id + "/highlight", {
            method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                "target": quiz.questions[questionIndex].id,
                "highlight": !quiz.questions[questionIndex].highlighted
            })
        }).then(body => body.json()).then(json => {
            setHighlighted(!quiz.questions[questionIndex].highlighted);
        });
    };

    const nextQuestion = () => {
        cleanup();
        navigate(location.pathname.split("/").slice(0, -1).join("/") + "/" + (Number.parseInt(questionIndex) + 1), {state:{quiz: quiz.id}});
        // setQuestionIndex(questionIndex+1);
    };

    const cleanup = () => {
        correct.current.classList.remove("correct");
        correct.current.querySelector("input").checked = false;
        setS(0);
        setC(0);
    };

    const reload = (authed, params, keepOrder = false) => {
        if(localStorage.getItem(params.id) && location.state && Number.parseInt(location.state.quiz) === Number.parseInt(params.id)){
            const json = JSON.parse(localStorage.getItem(params.id));
            setQuiz(json);
            setCorrectCount(json.questions.filter(question => question.answered.correct).length);
            setHighlighted(json.questions[Number.parseInt(params.question)].highlighted);
        }else{
            fetch("https://backend.fishingqueen.lukasschreiber.com/user/" + authed + "/quiz/" + params.id).then(body => body.json()).then(json => {
                if (!keepOrder) json.questions.forEach(q => q.answers = q.answers.sort((a, b) => 0.5 - Math.random()).sort((a, b) => 0.5 - Math.random()).sort((a, b) => 0.5 - Math.random()));
                else json.questions.forEach((q, i) => q.answers = quiz.questions[i].answers);
                setQuiz(json);
                setCorrectCount(json.questions.filter(question => question.answered.correct).length);
                setHighlighted(json.questions[Number.parseInt(params.question)].highlighted);
            });
        }
    };

    useEffect(() => {
        setQuestionIndex(Number.parseInt(params.question));
        reload(authed, params);
    }, [authed, params]);

    useEffect(() => {
        if(quiz) localStorage.setItem(quiz.id, JSON.stringify(quiz));
    }, [quiz]);

    return (
        <>{quiz &&
            <Container>
                <h1 style={{ textAlign: 'center' }}><Link to="/home" style={{ color: "gray", textDecoration: "none" }}>Home | </Link> {quiz.title}</h1>
                <h3>Frage #{quiz.questions[questionIndex].id}</h3>
                <h6>{quiz.questions[questionIndex].text.replace("&nbsp;", " ").split("<img")[0]}</h6>
                {quiz.questions[questionIndex].text.includes("<img") ? <Image fluid alt="Fisch" onLoad={() => console.log("load")} src={(quiz.questions[questionIndex].text.split("src='")[1]).split("'")[0]} style={{ maxWidth: "500px", marginBottom: "20px", width: "100%", borderRadius: "10px" }} /> : ""}
                <Form>
                    <div key={`default-radio`} className="mb-3" style={{ minHeight: "100px" }}>
                        {quiz.questions[questionIndex].answers.map(answer => <div ref={answer.correct ? correct : null}><Form.Check
                            type={"radio"}
                            id={answer.id}
                            name={quiz.questions[questionIndex].id}
                            label={answer.text}
                        /></div>)}
                    </div>
                    <Button variant="primary" onClick={handleSolve} style={{ display: s ? "none" : "block" }}>Lösen</Button>
                    <Button variant={c ? "primary" : "danger"} onClick={nextQuestion} style={{ display: !s ? "none" : "block" }} disabled={quiz.length === questionIndex + 1}>Nächste Frage</Button>
                    <Button variant={highlighted ? "warning" : "secondary"} onClick={handleHighlight} >Merken</Button>
                    <Link onClick={cleanup} to={questionIndex === 0 ? "#" : location.pathname.split("/").slice(0, -1).join("/") + "/" + (Number.parseInt(questionIndex) - 1)} state={{quiz: quiz.id}}><Button disabled={questionIndex === 0} variant={"secondary"}>Prev</Button></Link>
                    <Link onClick={cleanup} to={quiz.length === questionIndex + 1 ? "#" : location.pathname.split("/").slice(0, -1).join("/") + "/" + (Number.parseInt(questionIndex) + 1)} state={{quiz: quiz.id}}><Button variant={"secondary"} disabled={quiz.length === questionIndex + 1}>Next</Button></Link>


                    <div>{correctCount} richtig von {quiz.length} ({(correctCount / quiz.length * 100).toFixed(2)}%)</div>
                </Form>
                <div className='pw'>

                    {quiz.questions.map((question, index) => <OverlayTrigger
                        placement="bottom"
                        delay={{ show: 250, hide: 400 }}
                        overlay={<div style={{ borderRadius: "5px", border: "1px solid black", background: "white", fontSize: "10px", padding: "2px 5px" }}>{"#" + question.id}</div>}
                    >
                        <Link onClick={cleanup} to={location.pathname.split("/").slice(0, -1).join("/") + "/" + index} state={{quiz: quiz.id}}>
                            <div className={`p ${index === questionIndex ? "selected" : ""} ${question.answered.correct === 1 ? "correct" : question.answered.correct === 0 ? "wrong" : ""}`}>
                            </div>
                        </Link>
                    </OverlayTrigger>)}
                </div>

            </Container>
        }</>
    );
}