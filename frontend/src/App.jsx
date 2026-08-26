import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import AdminDashboard from "./adminDashbord"
import CustomerPortal from './customerPortal'
import { BrowserRouter, Routes,Route } from 'react-router-dom'
import CreateOrderPage from './createOrder'
import LoginPage from "./loginPage"
import DriverPortal from "./driverPortal"

function App() {
  const [count, setCount] = useState(0)

  return(
    <BrowserRouter>
      <Routes>
        <Route index element = {<LoginPage/>}/>
        <Route path="/" element = {<LoginPage/>}/>
        <Route path="/customer" element = {<CustomerPortal/>} />
        <Route path="/admin" element = {<AdminDashboard/>} />
        <Route path="/create" element = {<CreateOrderPage/>}/>
        <Route path="/driver" element={<DriverPortal />} />
      </Routes> 
    </BrowserRouter>
  )
}

export default App
