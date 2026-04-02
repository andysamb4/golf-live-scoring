import React from 'react';
import { GameState } from '../types';

interface ScorecardProps {
  gameState: GameState;
}

const Scorecard: React.FC<ScorecardProps> = ({ gameState }) => {
  const { course, players, scores } = gameState;
  const frontNineHoles = course.holes.slice(0, 9);
  const backNineHoles = course.holes.slice(9, 18);

  const calculateTotal = (playerScores: (number|null)[], holes: number[]) => {
    return holes.reduce((acc, holeIndex) => acc + (playerScores[holeIndex] || 0), 0);
  };

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg">
      <table className="min-w-full text-sm text-center text-off-white">
        <thead className="bg-dark-green font-bold">
          <tr>
            <th className="p-2 border-r border-light-slate text-left">Hole</th>
            {frontNineHoles.map(h => <th key={h.hole} className="p-2">{h.hole}</th>)}
            <th className="p-2 bg-forest-green">OUT</th>
            {backNineHoles.map(h => <th key={h.hole} className="p-2">{h.hole}</th>)}
            <th className="p-2 bg-forest-green">IN</th>
            <th className="p-2 bg-forest-green">TOT</th>
          </tr>
          <tr className="bg-medium-slate text-gray-300">
            <th className="p-2 border-r border-light-slate text-left">Par</th>
            {frontNineHoles.map(h => <th key={h.hole} className="p-2 font-normal">{h.par}</th>)}
            <th className="p-2 bg-light-slate font-bold text-white">{frontNineHoles.reduce((a, b) => a + b.par, 0)}</th>
            {backNineHoles.map(h => <th key={h.hole} className="p-2 font-normal">{h.par}</th>)}
            <th className="p-2 bg-light-slate font-bold text-white">{backNineHoles.reduce((a, b) => a + b.par, 0)}</th>
            <th className="p-2 bg-light-slate font-bold text-white">{course.holes.reduce((a, b) => a + b.par, 0)}</th>
          </tr>
          <tr className="bg-medium-slate text-gray-300">
            <th className="p-2 border-r border-light-slate text-left">S.I.</th>
            {frontNineHoles.map(h => <th key={h.hole} className="p-2 font-normal">{h.strokeIndex}</th>)}
            <th className="p-2 bg-light-slate font-bold text-white">-</th>
            {backNineHoles.map(h => <th key={h.hole} className="p-2 font-normal">{h.strokeIndex}</th>)}
            <th className="p-2 bg-light-slate font-bold text-white">-</th>
            <th className="p-2 bg-light-slate font-bold text-white">-</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => {
            const playerScores = scores[player.id];
            const outTotal = calculateTotal(playerScores, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
            const inTotal = calculateTotal(playerScores, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
            return (
              <tr key={player.id} className={`${index % 2 === 0 ? 'bg-medium-slate' : 'bg-dark-slate'} border-t border-light-slate`}>
                <td className="p-2 font-semibold border-r border-light-slate truncate max-w-32 text-left">
                  {player.name}
                  <span className="block text-xs font-normal text-gray-400">PH: {player.playingHandicap ?? player.handicap}</span>
                </td>
                {playerScores.slice(0, 9).map((score, i) => <td key={i} className="p-2">{score || '-'}</td>)}
                <td className="p-2 bg-light-slate font-bold text-white">{outTotal || '-'}</td>
                {playerScores.slice(9, 18).map((score, i) => <td key={i + 9} className="p-2">{score || '-'}</td>)}
                <td className="p-2 bg-light-slate font-bold text-white">{inTotal || '-'}</td>
                <td className="p-2 bg-light-slate font-bold text-white">{outTotal > 0 || inTotal > 0 ? outTotal + inTotal : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Scorecard;