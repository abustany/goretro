import React, { useState } from 'react';

import '../stylesheets/utils.scss'

export default function Login({onNameSet}) {
  const [name, setName] = useState("");

  return <div className="centered-col-300 center-form vmargin-20pc">
    <div>
      <input
        type="text"
        placeholder="Nickname"
        onChange={(e) => setName(e.target.value)}
        value={name}
        onKeyDown={(e) => { e.key === 'Enter' && handleSetName(onNameSet, name) }}
      />

      <button onClick={() => handleSetName(onNameSet, name)}>Let me in!</button>
    </div>
  </div>
}

function handleSetName(onNameSet, name) {
  name && onNameSet(name)
}
