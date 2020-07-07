import React, { useState, useRef, useEffect } from 'react';

import './Login.scss'

interface LoginProps {
  onNameSet: (name: string) => void;
  initialName?: string
  label?: string
}

export default function({initialName, onNameSet, label}: LoginProps) {
  const [name, setName] = useState(initialName || "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => ref.current?.focus(), [ref])

  return <div className="Login">
    <input
      type="text"
      placeholder="Nickname"
      onChange={(e) => setName(e.target.value)}
      value={name}
      onKeyDown={(e) => { e.key === 'Enter' && onNameSet(name) }}
      data-test-id="login-nickname"
      ref={ref}
    />

    {label && <button data-test-id="login-submit" onClick={() => { onNameSet(name) }}>{ label }</button>}
  </div>
}
