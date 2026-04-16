const { TEAM_COMPOSITION, shuffle, buildAssignments } = require('../gameLogic');

// Build a fake script with the given team counts for testing
function makeScript({ townsfolk = 0, outsider = 0, minion = 0, demon = 0 } = {}) {
  const chars = [];
  for (let i = 0; i < townsfolk; i++) chars.push({ id: `tf${i}`, name: `Townsfolk${i}`, team: 'townsfolk' });
  for (let i = 0; i < outsider;  i++) chars.push({ id: `os${i}`, name: `Outsider${i}`,  team: 'outsider'  });
  for (let i = 0; i < minion;    i++) chars.push({ id: `mn${i}`, name: `Minion${i}`,    team: 'minion'    });
  for (let i = 0; i < demon;     i++) chars.push({ id: `dm${i}`, name: `Demon${i}`,     team: 'demon'     });
  return chars;
}

function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => `player_${i}`);
}

// ─── TEAM_COMPOSITION ────────────────────────────────────────────────────────

describe('TEAM_COMPOSITION', () => {
  test('covers every player count from 5 to 15', () => {
    for (let n = 5; n <= 15; n++) {
      expect(TEAM_COMPOSITION[n]).toBeDefined();
    }
  });

  test('each entry totals the correct player count', () => {
    for (const [count, comp] of Object.entries(TEAM_COMPOSITION)) {
      const total = Object.values(comp).reduce((a, b) => a + b, 0);
      expect(total).toBe(Number(count));
    }
  });

  test('always has exactly 1 demon', () => {
    for (const comp of Object.values(TEAM_COMPOSITION)) {
      expect(comp.demon).toBe(1);
    }
  });

  test('has no entry outside 5-15', () => {
    expect(TEAM_COMPOSITION[4]).toBeUndefined();
    expect(TEAM_COMPOSITION[16]).toBeUndefined();
  });
});

// ─── shuffle ─────────────────────────────────────────────────────────────────

describe('shuffle', () => {
  test('returns array of same length', () => {
    expect(shuffle([1, 2, 3, 4, 5])).toHaveLength(5);
  });

  test('contains the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    expect(shuffle(input).sort()).toEqual([...input].sort());
  });

  test('does not mutate the original array', () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });
});

// ─── buildAssignments ────────────────────────────────────────────────────────

describe('buildAssignments — valid player counts', () => {
  // Test every supported player count with a script large enough to satisfy requirements
  const cases = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  test.each(cases)('%d players: assigns correct team composition', (n) => {
    const comp = TEAM_COMPOSITION[n];
    const script = makeScript({
      townsfolk: comp.townsfolk + 3,
      outsider:  comp.outsider  + 2,
      minion:    comp.minion    + 2,
      demon:     comp.demon     + 1,
    });
    const players = makePlayers(n);

    const { assignments, error } = buildAssignments(players, script);

    expect(error).toBeNull();
    expect(assignments).toHaveLength(n);

    // Count by team
    const teams = {};
    assignments.forEach(({ character }) => {
      teams[character.team] = (teams[character.team] || 0) + 1;
    });

    expect(teams.townsfolk || 0).toBe(comp.townsfolk);
    expect(teams.outsider  || 0).toBe(comp.outsider);
    expect(teams.minion    || 0).toBe(comp.minion);
    expect(teams.demon     || 0).toBe(comp.demon);
  });

  test('each player receives a unique character', () => {
    const comp = TEAM_COMPOSITION[7];
    const script = makeScript({ townsfolk: 10, outsider: 3, minion: 3, demon: 2 });
    const players = makePlayers(7);

    const { assignments } = buildAssignments(players, script);
    const ids = assignments.map(a => a.character.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every player ID appears exactly once in assignments', () => {
    const script = makeScript({ townsfolk: 10, minion: 3, demon: 2 });
    const players = makePlayers(7);

    const { assignments } = buildAssignments(players, script);
    const assignedIds = assignments.map(a => a.playerId);
    expect(new Set(assignedIds).size).toBe(players.length);
    players.forEach(pid => expect(assignedIds).toContain(pid));
  });
});

describe('buildAssignments — error cases', () => {
  test('returns error for 0 players', () => {
    const { error } = buildAssignments([], makeScript({ townsfolk: 5, minion: 1, demon: 1 }));
    expect(error).toMatch(/need 5-15/i);
  });

  test('returns error for 4 players', () => {
    const { error } = buildAssignments(makePlayers(4), makeScript({ townsfolk: 5, minion: 1, demon: 1 }));
    expect(error).toMatch(/need 5-15/i);
  });

  test('returns error for 16 players', () => {
    const { error } = buildAssignments(makePlayers(16), makeScript({ townsfolk: 20, minion: 5, demon: 2 }));
    expect(error).toMatch(/need 5-15/i);
  });

  test('returns error when script lacks enough townsfolk', () => {
    // 7 players needs 5 townsfolk; provide only 3
    const script = makeScript({ townsfolk: 3, outsider: 0, minion: 2, demon: 2 });
    const { error } = buildAssignments(makePlayers(7), script);
    expect(error).toMatch(/townsfolk/i);
  });

  test('returns error when script lacks a demon', () => {
    const script = makeScript({ townsfolk: 10, outsider: 3, minion: 3, demon: 0 });
    const { error } = buildAssignments(makePlayers(7), script);
    expect(error).toMatch(/demon/i);
  });

  test('returns null assignments on error', () => {
    const { assignments } = buildAssignments(makePlayers(4), makeScript());
    expect(assignments).toBeNull();
  });
});

describe('buildAssignments — with Contempt script', () => {
  // Use the actual Contempt.json script to verify real-world usage
  const rolesData = require('../../client/src/roles.json');
  const contemptRaw = require('../../Contempt.json');

  const contemptScript = contemptRaw
    .filter(item => item.id !== '_meta')
    .map(item => {
      const role = rolesData.find(r => r.id === item.id);
      return role ? { id: role.id, name: role.name, team: role.team } : null;
    })
    .filter(Boolean);

  test('Contempt script can support 7 players', () => {
    const { assignments, error } = buildAssignments(makePlayers(7), contemptScript);
    expect(error).toBeNull();
    expect(assignments).toHaveLength(7);
  });

  test('Contempt script gives 7p the correct 5T/0O/1M/1D distribution', () => {
    const { assignments } = buildAssignments(makePlayers(7), contemptScript);
    const teams = {};
    assignments.forEach(({ character }) => {
      teams[character.team] = (teams[character.team] || 0) + 1;
    });
    expect(teams).toMatchObject({ townsfolk: 5, minion: 1, demon: 1 });
    expect(teams.outsider).toBeUndefined();
  });
});
