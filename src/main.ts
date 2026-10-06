import { Game } from './game/Game';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Failed to locate #webgl-canvas element');
    return;
  }

  try {
    const game = new Game(canvas);
    game.start();
  } catch (err) {
    console.error('Error initializing 3D Pac-Man Game:', err);
  }
});

