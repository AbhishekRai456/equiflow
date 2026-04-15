import {Routes, Route} from "react-router-dom";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import DashboardPage from "./DashboardPage";

function App(){
  return (
    <Routes>
      <Route path = "/login" element = {<LoginPage />} />
      <Route path = "/register" element = {<RegisterPage />} />
      <Route path = "/dashboard" element = {<DashboardPage />} />
      <Route path = "/" element = {<LoginPage />} />
    </Routes>
  );
}

export default App;