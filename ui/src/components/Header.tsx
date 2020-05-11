import React, { useState } from 'react';

import WebGLBanner from './WebGLBanner'
import './Header.scss'
import '../stylesheets/utils.scss'

interface Props {
  name?: string;
}

export default function Header({name}: Props) {
  const [webGLDisabled, setWebGLDisabled] = useState(false)

  let banner;
  if (name || webGLDisabled) {
    banner = <div className="Header">
      <div className="Header__left Header__side"></div>

      <div className="Header__title">
        <h1 className="retro-font">Goretro</h1>
      </div>

      <div className="Header__name Header__side">
        {name}
      </div>
    </div>
  } else {
    banner = <WebGLBanner onNotDisplayable={() => { setWebGLDisabled(true) }}/>
  }

  return <header>{ banner }</header>
}
