import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';


import Quiz from './Quiz';

export default function Home() {
    const { authed, logout } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [show, setShow] = useState(false);
    const title = useRef();
    const interval = useRef();
    const theme = useRef();
    const img = useRef();
    const test = useRef();


    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const handleCreateQuiz = () => {
        const body = {
            title: title.current.value,
            filter: {
                img: img.current.checked,
                test: test.current.checked,
                indices: interval.current.value || null,
                theme: theme.current.value === "Thema egal" ? null : theme.current.value,
            }
        };
        if (body.title) {
            fetch("https://backend.fishingqueenlukasschreiber.com/user/" + authed + "/quiz", { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                .then(body => body.json())
                .then(json => {
                    fetch("https://backend.fishingqueenlukasschreiber.com/user/" + authed + "/quiz").then(body => body.json()).then(json => {
                        setQuizzes(json.quizzes);
                    });
                });
        }
        handleClose();
    };

    useEffect(() => {
        console.log("test" + authed);
        fetch("https://backend.fishingqueenlukasschreiber.com/user/" + authed + "/quiz").then(body => body.json()).then(json => {
            setQuizzes(json.quizzes);
        });
    }, [authed]);

    return (
        <>
            <Container>
                <Row><h1 style={{ textAlign: "center" }}>Deine Quizzes</h1></Row>
                <Row>{quizzes ? quizzes.map(quiz => <Col><Quiz key={quiz.id} id={quiz.id} title={quiz.title} count={quiz.count} onDelete={(id) => setQuizzes(quizzes.filter(quiz => quiz.id !== id))} correct={quiz.correct} deletable={!quiz.highlighted && !quiz.all} wrong={quiz.wrong} /></Col>) : ""}</Row>
                <Row><Button style={{ marginTop: "10px", maxWidth: "200px", marginLeft: "10px" }} variant="primary" onClick={handleShow}>Neues Quiz</Button>
                    {authed && <Button style={{ marginTop: "10px", maxWidth: "200px", marginLeft: "10px" }} onClick={handleLogout} >Logout</Button>}</Row>
            </Container>
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Neues Quiz</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3" controlId="formTitle">
                            <Form.Label>Titel</Form.Label>
                            <Form.Control type="text" placeholder="Titel" ref={title} />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formInterval">
                            <Form.Label>Interval</Form.Label>
                            <Form.Control type="text" placeholder="Interval" ref={interval} />
                            <Form.Text className="text-muted">
                                Bsp.: 800-1000,700,760-762 Wird nur berücksichtigt wenn kein Thema gewählt wurde.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formTheme">
                            <Form.Select aria-label="Default select example" ref={theme}>
                                <option>Thema egal</option>
                                <option value="Fischkunde">Fischkunde</option>
                                <option value="Gewässerkunde">Gewässerkunde</option>
                                <option value="Rechtskunde">Rechtskunde</option>
                                <option value="Gerätekunde">Gerätekunde</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formImage">
                            <Form.Check type="checkbox" label="Nur Fischerkennung mit Bildern" ref={img} />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formTest">
                            <Form.Check type="checkbox" label="Prüfung (ignoriert alle anderen Einstellungen)" ref={test} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Abbrechen
                    </Button>
                    <Button variant="primary" onClick={handleCreateQuiz}>
                        Speichern
                    </Button>
                </Modal.Footer>
            </Modal></>
    );
}