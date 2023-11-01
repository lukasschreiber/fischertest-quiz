import React from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProgressBar from 'react-bootstrap/ProgressBar';

export default function Quiz(props) {
    const { authed } = useAuth();

    const handleDelete = () => {
        if (window.confirm('Möchtest du das Quiz wirklich löschen?')) {
            fetch("https://backend.fishingqueen.lukasschreiber.com/user/" + authed + "/quiz/" + props.id, { method: "DELETE", headers: { 'Content-Type': 'application/json' } })
                .then(body => body.json())
                .then(json => props.onDelete(props.id));
        }
    };

    return (
        <Card style={{ minWidth: '18rem' }}>
            <Card.Body>
                <Card.Title style={{ display: "flex", justifyContent: "space-between" }}>{props.title} {props.deletable ? <img onClick={handleDelete} className="trash" style={{ cursor: "pointer" }} src="/trash.svg" alt="trash" width="20px" /> : ""}</Card.Title>
                <Card.Text>
                    <div style={{fontSize: "12px", color: "gray"}}>
                    {props.count} Fragen<br />
                    {props.correct} richtig<br />
                    {props.wrong} falsch<br />
                    {props.count - props.wrong - props.correct} unbeantwortet</div>
                </Card.Text>
                <ProgressBar now={props.correct/props.count * 100} />
                <br/>
                <Link to={`/quiz/${props.id}/0`}><Button variant="primary">{props.count - props.wrong - props.correct === props.count ? "Jetzt Abfragen" : "Jetzt weitermachen"}</Button></Link>
            </Card.Body>
        </Card>
    );
}