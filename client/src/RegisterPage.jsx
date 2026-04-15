import {useState} from "react";
import {Link} from "react-router-dom"

function RegisterPage(){
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    function handleSubmit(){
        console.log(`Name: ${name}`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
    }

    return (
        <form onSubmit = {e => {
            e.preventDefault();
            handleSubmit();
        }}>
            <h2>Register</h2>
            <input
                type = "text"
                placeholder = "Name"
                value = {name}
                onChange = {e => setName(e.target.value)}
            />
            <input
                type = "email"
                placeholder = "Email"
                value = {email}
                onChange = {e => setEmail(e.target.value)}
            />
            <input
                type = "password"
                placeholder = "Password"
                value = {password}
                onChange = {e => setPassword(e.target.value)}
            />
            <button type = "submit">Register</button>
            <p>Already have an account? <Link to = "/login">Login</Link></p>
        </form>
    );
}

export default RegisterPage;