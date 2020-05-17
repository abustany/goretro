import React, { useState } from 'react';

import WebGLBanner from './WebGLBanner'
import './Header.scss'

interface Props {
  name?: string;
}

export default function({name}: Props) {
  const [webGLDisabled, setWebGLDisabled] = useState(false)

  let banner;
  if (name || webGLDisabled) {
    banner = <div className="Header">
      <h1 className="retro-font">Goretro</h1>
    </div>
  } else {
    banner = <WebGLBanner onNotDisplayable={() => { setWebGLDisabled(true) }}/>
  }

  return <header>{ banner }</header>
}
