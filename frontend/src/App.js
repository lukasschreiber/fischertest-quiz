import './App.css';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import Home from './Home';
import Login from './Login';
import { RequireAuth } from './RequireAuth';
import 'bootstrap/dist/css/bootstrap.min.css';
import Questions from './Questions';

// import Login from './Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/quiz/:id/:question" element={<RequireAuth><Questions/></RequireAuth>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
