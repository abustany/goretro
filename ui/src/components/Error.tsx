import React from 'react';

import '../stylesheets/utils.scss'

interface ErrorProps {
  message: string;
}

export default function Error({message}: ErrorProps) {
  return <div className="center-form vmargin-20pc">
    <h2 className="retro-font">Error :(</h2>
    <p>{ message }</p>
  </div>
}
