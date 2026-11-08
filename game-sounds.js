// Frequencies are in Hz, durations in seconds. Keep repeating effects softer
// than one-off scoring cues so held fire doesn't drown out a hit.
export function playGameSound(tone, event, amount = 1) {
  switch (event) {
    case 'lineClear': {
      const notes = [523, 659, 784, 1047, 1319, 1568];
      notes.slice(0, 2 + amount).forEach((pitch, i) => tone(pitch, .085, i * .055));
      break;
    }
    case 'eat':
      tone(590, .045);
      tone(940, .075, .045);
      break;
    case 'wall':
      tone(370, .045, 0, 290, 'triangle', .055);
      break;
    case 'paddle':
      tone(265, .08, 0, 510, 'triangle', .07);
      break;
    case 'brick':
      tone(850, .065, 0, 510);
      break;
    case 'fire':
      tone(920, .075, 0, 225, 'triangle', .052);
      break;
    case 'hit':
      tone(325, .055, 0, 155);
      break;
    case 'explosion':
      tone(210, .14, 0, 48, 'sawtooth', .07);
      break;
    case 'damage':
      tone(310, .18, 0, 85, 'sawtooth', .06);
      break;
    case 'gameOver':
      [392, 330, 262, 165].forEach((pitch, i) =>
        tone(pitch, i === 3 ? .31 : .13, i * .13));
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((pitch, i) => tone(pitch, .17, i * .095));
      break;
  }
}
