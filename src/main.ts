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

    // Register Service Worker for PWA offline play
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.debug('Service Worker registration skipped or failed:', err);
        });
      });
    }
  } catch (err) {
    console.error('Error initializing 3D Pac-Man Game:', err);
  }
});

