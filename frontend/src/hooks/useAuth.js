import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';

export function useAuth() {
    const navigate = useNavigate();
    const [authed, setAuthed] = useState(() => {
        // getting stored value
        const saved = localStorage.getItem("authed");
        const initialValue = JSON.parse(saved);
        return initialValue || "";
    });

    useEffect(() => {
        if (authed !== "") {
            fetch("https://fqb.lukasschreiber.com/login", { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authed }) })
                .then(body => body.json())
                .then(json => {
                    if (json.error === false) {
                        localStorage.setItem('authed', JSON.stringify(authed));
                    } else {
                        alert(json.message);
                    }
                });
        }else{
            localStorage.setItem('authed', JSON.stringify(""));

        }
    }, [authed]);

    return {
        authed,
        login(user) {
            return new Promise((res) => {
                setAuthed(user);
                res();
            });
        },
        logout() {
            return new Promise((res) => {
                localStorage.setItem('authed', JSON.stringify(""));
                setAuthed("");
                res();
            });
        },
    };
}