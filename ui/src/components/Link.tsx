import React from 'react';

import './Link.scss'

interface Props {
  link: string
}
export default function({link}: Props) {
  return <div>
    <h2 className="section-topmargin">Invite participants!</h2>
    <div className="Link" onClick={() => {navigator.clipboard.writeText(link)}}>
      <span className="Link__text">{link}</span>
      <span className="Link__icon" role="img" aria-labelledby="Copy to clipboard">📋</span>
    </div>
  </div>
}
