import React from 'react';
import { GameState, GameType } from '../types';
import { calculatePlayingHandicap } from '../services/scoringService';

interface ScorecardProps {
  gameState: GameState;
}

const Scorecard: React.FC<ScorecardProps> = ({ gameState }) => {
  const { course, players, scores } = gameState;
  const isMatchPlay = gameState.gameType === GameType.MatchPlay;
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
          {isMatchPlay && players.length === 2 && (() => {
            const [p1, p2] = players;
            const ph1 = calculatePlayingHandicap(p1.handicap, course, p1.selectedTee);
            const ph2 = calculatePlayingHandicap(p2.handicap, course, p2.selectedTee);
            const handicapDiff = Math.abs(ph1 - ph2);

            // Calculate per-hole match result and running match score
            let runningScore = 0;
            const holeResults: string[] = [];
            let matchOver = false;

            for (let i = 0; i < 18; i++) {
              if (matchOver) { holeResults.push(''); continue; }
              const s1 = scores[p1.id][i];
              const s2 = scores[p2.id][i];
              if (s1 === null || s1 === 0 || s2 === null || s2 === 0) { holeResults.push(''); continue; }

              let net1 = s1;
              let net2 = s2;
              if (ph1 > ph2) {
                const base = Math.floor(handicapDiff / 18);
                const extra = handicapDiff % 18;
                net1 -= base + (course.holes[i].strokeIndex <= extra ? 1 : 0);
              } else if (ph2 > ph1) {
                const base = Math.floor(handicapDiff / 18);
                const extra = handicapDiff % 18;
                net2 -= base + (course.holes[i].strokeIndex <= extra ? 1 : 0);
              }

              if (net1 < net2) { runningScore++; holeResults.push(p1.name.charAt(0)); }
              else if (net2 < net1) { runningScore--; holeResults.push(p2.name.charAt(0)); }
              else { holeResults.push('='); }

              const holesRemaining = 18 - (i + 1);
              if (Math.abs(runningScore) > holesRemaining) matchOver = true;
            }

            return (
              <tr className="bg-blue-900 border-t-2 border-blue-400 font-bold">
                <td className="p-2 border-r border-light-slate text-left text-blue-300">Match</td>
                {holeResults.slice(0, 9).map((r, i) => (
                  <td key={i} className={`p-2 ${r === p1.name.charAt(0) ? 'text-green-400' : r === p2.name.charAt(0) ? 'text-red-400' : r === '=' ? 'text-gray-400' : ''}`}>{r || '-'}</td>
                ))}
                <td className="p-2 bg-blue-800 text-blue-300">-</td>
                {holeResults.slice(9, 18).map((r, i) => (
                  <td key={i + 9} className={`p-2 ${r === p1.name.charAt(0) ? 'text-green-400' : r === p2.name.charAt(0) ? 'text-red-400' : r === '=' ? 'text-gray-400' : ''}`}>{r || '-'}</td>
                ))}
                <td className="p-2 bg-blue-800 text-blue-300">-</td>
                <td className="p-2 bg-blue-800 text-blue-300">
                  {runningScore > 0 ? `${p1.name.charAt(0)} ${runningScore} Up` : runningScore < 0 ? `${p2.name.charAt(0)} ${Math.abs(runningScore)} Up` : 'A/S'}
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
};

export default Scorecard;