import React from 'react';

function Login({setName}) {
  return <>
    <input/>
    <button onClick={ () => setName("Carlito") }>Name</button>
  </>
}

export default Login
