import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/esm/Container';


export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const nameRef = useRef();

    const handleLogin = () => {
        if(nameRef.current.value === "") return;
        login(nameRef.current.value).then(() => {
            setTimeout(()=>navigate("/home"), 300);
        });
    };

    return (
        <Container style={{textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)"}}>
            <h1>Fishing Queen</h1>
            <Form.Control type="text" placeholder="Name" ref={nameRef} style={{maxWidth: "300px"}} />
            <Button style={{maxWidth: "300px", width:"100%"}} onClick={handleLogin}>Log in</Button>
        </Container>
    );
}