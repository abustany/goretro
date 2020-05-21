import React, { useState } from 'react';

import './Login.scss'

const nameLocalStorageKey: string = "nickname"

interface LoginProps {
  onNameSet: (name: string) => void;
}

export default function({onNameSet}: LoginProps) {
  const [name, setName] = useState(
    localStorage.getItem(nameLocalStorageKey) || ""
  );

  const handleSetName = () => {
    if (name) {
      const trimmedName = name.trim()
      localStorage.setItem(nameLocalStorageKey, trimmedName)
      onNameSet(trimmedName);
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
