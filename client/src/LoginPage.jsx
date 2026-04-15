import {useState} from "react";
import {Link} from "react-router-dom"

function LoginPage(){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(){
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }

  return (
    <form onSubmit = {e => {
        e.preventDefault(); // Stop browser from reloading the page
        handleSubmit();
    }}>
      <h2>Login</h2>
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
      <button type = "submit">Login</button>
      <p>Don't have an account? <Link to = "/register">Register</Link></p>
    </form>
  )
}

export default LoginPage;