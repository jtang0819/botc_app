// BotC team composition by player count (5-15 players)
const TEAM_COMPOSITION = {
  5:  { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  6:  { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  7:  { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  8:  { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  9:  { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
};

// Fisher-Yates shuffle — returns a new shuffled array
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a random character assignment for a game.
 *
 * @param {string[]} playerIds - Socket IDs of joined players
 * @param {{ id, name, team }[]} scriptCharacters - Characters available in the script
 * @returns {{ assignments: { playerId, character }[], error: string|null }}
 */
function buildAssignments(playerIds, scriptCharacters) {
  const playerCount = playerIds.length;
  const composition = TEAM_COMPOSITION[playerCount];

  if (!composition) {
    return { assignments: null, error: `Cannot start with ${playerCount} players. Need 5-15.` };
  }

  const pools = {
    townsfolk: shuffle(scriptCharacters.filter(c => c.team === 'townsfolk')),
    outsider:  shuffle(scriptCharacters.filter(c => c.team === 'outsider')),
    minion:    shuffle(scriptCharacters.filter(c => c.team === 'minion')),
    demon:     shuffle(scriptCharacters.filter(c => c.team === 'demon')),
  };

  for (const [team, needed] of Object.entries(composition)) {
    if (pools[team].length < needed) {
      return {
        assignments: null,
        error: `Script has ${pools[team].length} ${team}(s) but ${needed} needed for ${playerCount} players.`,
      };
    }
  }

  const selected = [
    ...pools.townsfolk.slice(0, composition.townsfolk),
    ...pools.outsider.slice(0, composition.outsider),
    ...pools.minion.slice(0, composition.minion),
    ...pools.demon.slice(0, composition.demon),
  ];

  const shuffledChars = shuffle(selected);
  const shuffledPlayerIds = shuffle(playerIds);

  const assignments = shuffledPlayerIds.map((playerId, i) => ({
    playerId,
    character: shuffledChars[i],
  }));

  return { assignments, error: null };
}

module.exports = { TEAM_COMPOSITION, shuffle, buildAssignments };
