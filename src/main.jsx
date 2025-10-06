import React from 'react'
import { createRoot } from 'react-dom/client'
import WorkflowFlowchart from './WorkflowFlowchart.jsx'
import 'reactflow/dist/style.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WorkflowFlowchart />
  </React.StrictMode>
)
