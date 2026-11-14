import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './v7/App.jsx'
import ClassicApp from './ClassicApp.jsx'

// v7 by default; the previous app stays reachable at /?classic=1
const classic = new URLSearchParams(window.location.search).has('classic')
const Root = classic ? ClassicApp : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
