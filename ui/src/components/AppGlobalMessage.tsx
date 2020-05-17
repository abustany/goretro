import React from 'react';

import './AppGlobalMessage.scss'

interface Props {
  title: string
}

export default function({title, children}: React.PropsWithChildren<Props>) {
  return <div className="AppGlobalMessage">
    <h2>{ title }</h2>
    { children }
  </div>
}
