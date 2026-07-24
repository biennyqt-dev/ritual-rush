export class RitualMusic {
  private audio: HTMLAudioElement | null = null;
  private musicEnabled = true;
  private unlocked = false;
  private visible = true;

  configure(musicEnabled: boolean) {
    this.musicEnabled = musicEnabled;
    this.syncPlayback();
  }

  unlock() {
    if (typeof window === "undefined") return;
    this.unlocked = true;
    this.audio ??= this.createAudio();
    this.syncPlayback();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.syncPlayback();
  }

  private createAudio() {
    const audio = new Audio("/ritual-rush-music.mp3");
    audio.loop = true;
    audio.preload = "metadata";
    audio.volume = 0.42;
    return audio;
  }

  private syncPlayback() {
    if (!this.audio || !this.unlocked) return;
    if (this.musicEnabled && this.visible) {
      void this.audio.play().catch(() => {
        // Playback will be retried on the next user interaction.
      });
    } else {
      this.audio.pause();
    }
  }
}

export const ritualAudio = new RitualMusic();
