import React, { useState, useEffect } from 'react';

import './Link.scss'
import ClipboardImg from '../images/clipboard.png'

interface Props {
  link: string
}
export default function({link}: Props) {
  const [clicked, setClicked] = useState(false)
  useEffect(() => {
    if (clicked) {
      const id = setTimeout(() => { setClicked(false) }, 1500)
      return () => clearTimeout(id)
    }
  }, [clicked])

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setClicked(true)
  }

  return <div>
    <h2>Invite participants!</h2>
    <div className="Link" onClick={handleCopy}>
      <div className="Link__clipboard">
        { !clicked && <img src={ClipboardImg} alt="Copy to Clipboard"></img> }
        { clicked && <span className="retro-font">Copied!</span> }
      </div>

      <span className="Link__text">{link}</span>
    </div>
  </div>
}
