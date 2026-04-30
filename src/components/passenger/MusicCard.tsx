import React from 'react';
import { AudioExperienceCard } from './AudioExperienceCard';

export function MusicCard() {
  return (
    <AudioExperienceCard
      icon="🎵"
      title="Trilha KAVIAR"
      subtitle="Enquanto sua corrida acontece, conheça o som da nossa marca."
      audioSource={require('../../../assets/audio/kaviar.mp4')}
      category="Música"
    />
  );
}
