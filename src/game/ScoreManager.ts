export class ScoreManager {
  public score: number = 0;
  public highScore: number = 0;
  public level: number = 1;
  public lives: number = 3;
  public pelletsRemaining: number = 0;
  public ghostStreak: number = 0;

  private onScoreChange?: (score: number, highScore: number) => void;
  private onLivesChange?: (lives: number) => void;
  private onLevelChange?: (level: number) => void;

  constructor() {
    this.loadHighScore();
  }

  public setCallbacks(
    onScoreChange: (score: number, highScore: number) => void,
    onLivesChange: (lives: number) => void,
    onLevelChange: (level: number) => void
  ): void {
    this.onScoreChange = onScoreChange;
    this.onLivesChange = onLivesChange;
    this.onLevelChange = onLevelChange;

    this.notifyScore();
    this.notifyLives();
    this.notifyLevel();
  }

  public resetGame(): void {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.ghostStreak = 0;
    this.notifyScore();
    this.notifyLives();
    this.notifyLevel();
  }

  public nextLevel(): void {
    this.level++;
    this.ghostStreak = 0;
    this.notifyLevel();
  }

  public addScore(points: number): void {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
    this.notifyScore();
  }

  public resetGhostStreak(): void {
    this.ghostStreak = 0;
  }

  public eatGhost(): number {
    const points = Math.min(1600, 200 * Math.pow(2, this.ghostStreak));
    this.ghostStreak++;
    this.addScore(points);
    return points;
  }

  public loseLife(): number {
    this.lives = Math.max(0, this.lives - 1);
    this.notifyLives();
    return this.lives;
  }

  private notifyScore(): void {
    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.highScore);
    }
  }

  private notifyLives(): void {
    if (this.onLivesChange) {
      this.onLivesChange(this.lives);
    }
  }

  private notifyLevel(): void {
    if (this.onLevelChange) {
      this.onLevelChange(this.level);
    }
  }

  private loadHighScore(): void {
    try {
      const saved = localStorage.getItem('pacman3d_highscore');
      if (saved) {
        this.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      this.highScore = 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem('pacman3d_highscore', this.highScore.toString());
    } catch {
      // Storage unavailable or disabled
    }
  }
}

