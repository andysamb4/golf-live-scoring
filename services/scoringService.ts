import { GameState, Player, Hole, GameType, CalculatedScore, Course, TeeSet } from '../types';

// WHS Playing Handicap = Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
// An optional selectedTee overrides the course-level slope/rating/par (used for mixed-tee games).
export const calculatePlayingHandicap = (handicapIndex: number, course: Course, selectedTee?: TeeSet): number => {
  const slope = selectedTee?.slopeRating ?? course.slopeRating;
  const cr    = selectedTee?.courseRating ?? course.courseRating;
  const holes = selectedTee?.holes ?? course.holes;
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  if (slope && cr) {
    const ph = handicapIndex * (slope / 113) + (cr - totalPar);
    return Math.round(ph);
  }
  return Math.round(handicapIndex);
};

const calculateShotsReceived = (playerHandicap: number, strokeIndex: number, course: Course, selectedTee?: TeeSet): number => {
    const playingHcp = calculatePlayingHandicap(playerHandicap, course, selectedTee);
    if (playingHcp < 0 || playingHcp > 54) return 0;
    const baseShots = Math.floor(playingHcp / 18);
    const extraShotHoles = playingHcp % 18;
    return baseShots + (strokeIndex <= extraShotHoles ? 1 : 0);
};

export const calculateStablefordPointsForHole = (grossScore: number, hole: Hole, player: Player, course: Course): number => {
    const shotsReceived = calculateShotsReceived(player.handicap, hole.strokeIndex, course, player.selectedTee);
    const netScore = grossScore - shotsReceived;
    const scoreRelativeToPar = netScore - hole.par;

    if (scoreRelativeToPar <= -3) return 5; // Albatross or better
    if (scoreRelativeToPar === -2) return 4; // Eagle
    if (scoreRelativeToPar === -1) return 3; // Birdie
    if (scoreRelativeToPar === 0) return 2;  // Par
    if (scoreRelativeToPar === 1) return 1;  // Bogey
    return 0; // Double Bogey or worse
};

const calculateStablefordTotal = (player: Player, scores: (number | null)[], courseHoles: Hole[], course: Course): CalculatedScore => {
    let totalPoints = 0;
    let through = 0;
    scores.forEach((score, index) => {
        if (score !== null && score > 0) {
            totalPoints += calculateStablefordPointsForHole(score, courseHoles[index], player, course);
            through++;
        }
    });
    return { playerId: player.id, playerName: player.name, total: totalPoints, through };
};

const calculateMedalTotal = (player: Player, scores: (number | null)[]): CalculatedScore => {
    let totalScore = 0;
    let through = 0;
    scores.forEach(score => {
        if (score !== null && score > 0) {
            totalScore += score;
            through++;
        }
    });
    return { playerId: player.id, playerName: player.name, total: totalScore, through };
};

const calculateSkinsTotal = (gameState: GameState): CalculatedScore[] => {
    const skinsWon: { [playerId: string]: number } = {};
    gameState.players.forEach(p => skinsWon[p.id] = 0);

    let carriedSkins = 0;
    for (let i = 0; i < 18; i++) {
        const holeScores: { playerId: string, score: number }[] = [];
        
        // Check if all players have a score for this hole
        let allScoresIn = true;
        for (const player of gameState.players) {
            const score = gameState.scores[player.id][i];
            if (score === null || score === 0) {
                allScoresIn = false;
                break;
            }
            holeScores.push({ playerId: player.id, score });
        }
        
        if (!allScoresIn || holeScores.length === 0) continue;

        const minScore = Math.min(...holeScores.map(s => s.score));
        const winners = holeScores.filter(s => s.score === minScore);

        if (winners.length === 1) {
            skinsWon[winners[0].playerId] += (1 + carriedSkins);
            carriedSkins = 0;
        } else {
            carriedSkins++;
        }
    }
    
    return gameState.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        total: skinsWon[p.id],
        through: gameState.scores[p.id].filter(s => s !== null && s > 0).length,
    }));
};

const calculateMatchPlayTotal = (gameState: GameState): CalculatedScore[] => {
    const [p1, p2] = gameState.players;
    const course = gameState.course;

    // In match play, only the difference in playing handicaps matters
    const ph1 = calculatePlayingHandicap(p1.handicap, course, p1.selectedTee);
    const ph2 = calculatePlayingHandicap(p2.handicap, course, p2.selectedTee);
    const handicapDiff = Math.abs(ph1 - ph2);

    let matchScore = 0; // positive = p1 leading
    let holesPlayed = 0;
    let matchOver = false;
    let finalResult = '';

    for (let i = 0; i < 18; i++) {
        if (matchOver) break;

        const s1 = gameState.scores[p1.id][i];
        const s2 = gameState.scores[p2.id][i];
        if (s1 === null || s1 === 0 || s2 === null || s2 === 0) break;

        holesPlayed++;
        const hole = course.holes[i];

        // Allocate strokes based on stroke index using the handicap difference
        let net1 = s1;
        let net2 = s2;

        if (ph1 > ph2) {
            // p1 receives strokes
            const baseShots = Math.floor(handicapDiff / 18);
            const extraShotHoles = handicapDiff % 18;
            net1 -= baseShots + (hole.strokeIndex <= extraShotHoles ? 1 : 0);
        } else if (ph2 > ph1) {
            // p2 receives strokes
            const baseShots = Math.floor(handicapDiff / 18);
            const extraShotHoles = handicapDiff % 18;
            net2 -= baseShots + (hole.strokeIndex <= extraShotHoles ? 1 : 0);
        }

        if (net1 < net2) matchScore++;
        else if (net2 < net1) matchScore--;
        // else: halved

        const holesRemaining = 18 - holesPlayed;
        if (Math.abs(matchScore) > holesRemaining) {
            matchOver = true;
            finalResult = `${Math.abs(matchScore)}&${holesRemaining}`;
        }
    }

    const getStatus = (forP1: boolean): string => {
        const s = forP1 ? matchScore : -matchScore;
        if (matchOver) return s > 0 ? `Won ${finalResult}` : `Lost ${finalResult}`;
        if (holesPlayed === 18 && matchScore === 0) return 'Halved';
        if (s > 0) return `${s} Up`;
        if (s < 0) return `${Math.abs(s)} Down`;
        return 'All Square';
    };

    return [
        { playerId: p1.id, playerName: p1.name, total: matchScore, through: holesPlayed, matchStatus: getStatus(true) },
        { playerId: p2.id, playerName: p2.name, total: -matchScore, through: holesPlayed, matchStatus: getStatus(false) },
    ].sort((a, b) => b.total - a.total);
};

export const calculateScores = (gameState: GameState): CalculatedScore[] => {
    switch (gameState.gameType) {
        case GameType.Stableford:
            return gameState.players
                .map(p => calculateStablefordTotal(p, gameState.scores[p.id], gameState.course.holes, gameState.course))
                .sort((a, b) => b.total - a.total);
        case GameType.Medal:
            return gameState.players
                .map(p => calculateMedalTotal(p, gameState.scores[p.id]))
                .sort((a, b) => a.total - b.total);
        case GameType.Skins:
             return calculateSkinsTotal(gameState).sort((a,b) => b.total - a.total);
        case GameType.MatchPlay:
             return calculateMatchPlayTotal(gameState);
        default:
            return [];
    }
};
