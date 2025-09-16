import React from 'react'
import TreeEditor from './components/TreeEditor'

export default function App(){
  return (
    <div className="app">
      <header>
        <h1>Family Trees</h1>
        <p>Simple tree editor (local only)</p>
      </header>
      <main>
        <TreeEditor />
      </main>
    </div>
  )
}
