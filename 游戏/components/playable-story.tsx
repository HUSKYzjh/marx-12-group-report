'use client';
import { useState } from 'react';
import FactoryStory from './factory-story';
import TrustStory from './trust-story';

export default function PlayableStory() {
  const [legacyVisible, setLegacyVisible] = useState(false);
  const [legacyStarted, setLegacyStarted] = useState(false);
  return <>
    <div hidden={legacyVisible}><TrustStory active={!legacyVisible} onLegacy={() => { setLegacyStarted(true); setLegacyVisible(true); window.scrollTo(0, 0); }} /></div>
    {legacyStarted && <div hidden={!legacyVisible}>
      <div className="pg-legacy-banner"><span>旧版小工厂 · 独立的完整实验</span><button onClick={() => { setLegacyVisible(false); window.scrollTo(0, 0); }}>← 回到原版引擎改编</button></div>
      <FactoryStory />
    </div>}
  </>;
}
