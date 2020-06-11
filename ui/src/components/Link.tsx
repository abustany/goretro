import React from 'react';

import './Link.scss'

interface Props {
  link: string
}
export default function({link}: Props) {
  return <div>
    <h2>Invite participants!</h2>
    <div className="Link" onClick={() => {navigator.clipboard.writeText(link)}}>
      <i className="fas fa-clipboard Link__icon"></i>
      <span className="Link__text">{link}</span>
    </div>
  </div>
}
