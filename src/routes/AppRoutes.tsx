import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Arcade from "../pages/Arcade";
import Puzzle from "../pages/Puzzle";
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/arcade" element={<Arcade />} />
        <Route path="/puzzle" element={<Puzzle />} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;