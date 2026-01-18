interface ScoreCircleProps {
  score: number;
  label?: string;
}

export function ScoreCircle({ score, label }: ScoreCircleProps) {
  const getScoreClass = (score: number) => {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-poor';
  };

  return (
    <div className={`score-circle ${getScoreClass(score)}`}>
      <span className="score-value">{score}</span>
      {label && <span className="score-label">{label}</span>}
    </div>
  );
}
