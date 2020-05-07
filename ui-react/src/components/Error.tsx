import React from 'react';

import '../stylesheets/utils.scss'

export default function Error({message}) {
  return <div className="center-form vmargin-20pc">
    <h2 className="retro-font">Error :(</h2>
    <p>{ message }</p>
  </div>
}
