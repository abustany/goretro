import React, { useState } from 'react';

import './Login.scss'

const nameLocalStorageKey: string = "nickname"

interface LoginProps {
  onNameSet: (name: string) => void;
}

export default function Login({onNameSet}: LoginProps) {
  const [name, setName] = useState(
    localStorage.getItem(nameLocalStorageKey) || ""
  );

  const handleSetName = () => {
    if (name) {
      localStorage.setItem(nameLocalStorageKey, name)
      onNameSet(name);
    }
  }

  return <div className="Login">
    <input
      type="text"
      placeholder="Nickname"
      onChange={(e) => setName(e.target.value)}
      value={name}
      onKeyDown={(e) => { e.key === 'Enter' && handleSetName() }}
      data-test-id="login-nickname"
    />

    <button data-test-id="login-submit" onClick={handleSetName}>Let me in!</button>
  </div>
}
