import React, { useState } from 'react';

import '../stylesheets/utils.scss'

interface LoginProps {
  onNameSet: (name: string) => void;
}

export default function Login({onNameSet}: LoginProps) {
  const [name, setName] = useState("");

  const handleSetName = () => {
    if (name) onNameSet(name);
  }

  return <div className="centered-col-300 center-form vmargin-20pc">
    <div>
      <input
        type="text"
        placeholder="Nickname"
        onChange={(e) => setName(e.target.value)}
        value={name}
        onKeyDown={(e) => { e.key === 'Enter' && handleSetName() }}
      />

      <button onClick={handleSetName}>Let me in!</button>
    </div>
  </div>
}
