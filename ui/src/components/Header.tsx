import React, { useState } from 'react';

import WebGLBanner from './WebGLBanner'
import './Header.scss'

interface Props {
  name?: string;
}

export default function Header({name}: Props) {
  const [webGLDisabled, setWebGLDisabled] = useState(false)

  let banner;
  if (name || webGLDisabled) {
    banner = <div className="Header">

      <h1 className="retro-font">Goretro</h1>

      { name ? <span>with <strong>{name}</strong></span> : <span>Here comes a new challenger!</span> }

    </div>
  } else {
    banner = <WebGLBanner onNotDisplayable={() => { setWebGLDisabled(true) }}/>
  }

  return <header>{ banner }</header>
}
