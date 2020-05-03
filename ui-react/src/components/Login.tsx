import React, { useState } from 'react';

export default function Login({onNameSet}) {
  const [name, setName] = useState("");

  return <>
    <input type="text" onChange={(e) => setName(e.target.value)} value={name} onKeyDown={(e) => { e.key === 'Enter' && handleSetName(onNameSet, name) }}/>
    <button onClick={() => handleSetName(onNameSet, name)}>Here I am!</button>
  </>
}

function handleSetName(onNameSet, name) {
  name && onNameSet(name)
}
