import React, { useState } from 'react';

import './Login.scss'

interface LoginProps {
  onNameSet: (name: string) => void;
  initialName?: string
}

export default function({initialName, onNameSet}: LoginProps) {
  const [name, setName] = useState(initialName || "");

  return <div className="Login">
    <input
      type="text"
      placeholder="Nickname"
      onChange={(e) => setName(e.target.value)}
      value={name}
      onKeyDown={(e) => { e.key === 'Enter' && onNameSet(name) }}
      data-test-id="login-nickname"
    />

    <button data-test-id="login-submit" onClick={() => { onNameSet(name) }}>Let me in!</button>
  </div>
}
