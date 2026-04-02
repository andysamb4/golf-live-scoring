import { Group, GroupMember, GroupHandicapRules, GroupGameRecord } from '../types';

const STORAGE_KEY = 'golf_groups';

const DEFAULT_RULES: GroupHandicapRules = {
  first: -1,
  second: 0,
  third: 0.5,
  fourthAndBelow: 1,
};

export const getDefaultRules = (): GroupHandicapRules => ({ ...DEFAULT_RULES });

/** Load all groups from localStorage */
export const loadGroups = (): Group[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Save all groups to localStorage */
const saveGroups = (groups: Group[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
};

/** Get a single group by ID */
export const getGroup = (id: string): Group | undefined => {
  return loadGroups().find(g => g.id === id);
};

/** Create a new group */
export const createGroup = (name: string, members: GroupMember[]): Group => {
  const groups = loadGroups();
  const group: Group = {
    id: `GRP-${Date.now()}`,
    name,
    members,
    rules: getDefaultRules(),
    gameHistory: [],
    createdAt: new Date().toISOString(),
  };
  groups.push(group);
  saveGroups(groups);
  return group;
};

/** Update an existing group */
export const updateGroup = (updated: Group): void => {
  const groups = loadGroups();
  const idx = groups.findIndex(g => g.id === updated.id);
  if (idx >= 0) {
    groups[idx] = updated;
    saveGroups(groups);
  }
};

/** Delete a group by ID */
export const deleteGroup = (id: string): void => {
  const groups = loadGroups().filter(g => g.id !== id);
  saveGroups(groups);
};

/**
 * Calculate the handicap adjustment for a given finishing position (1-based).
 */
export const getAdjustment = (position: number, rules: GroupHandicapRules): number => {
  if (position === 1) return rules.first;
  if (position === 2) return rules.second;
  if (position === 3) return rules.third;
  return rules.fourthAndBelow;
};

/**
 * Apply handicap adjustments after a group game.
 * `finishingOrder` is an array of member names from 1st place to last.
 * Returns the updated group.
 */
export const applyGroupGameResult = (
  groupId: string,
  courseName: string,
  finishingOrder: string[],
): Group | undefined => {
  const group = getGroup(groupId);
  if (!group) return undefined;

  const adjustments: { [name: string]: number } = {};

  finishingOrder.forEach((name, index) => {
    const position = index + 1;
    const adj = getAdjustment(position, group.rules);
    adjustments[name] = adj;

    const member = group.members.find(m => m.name === name);
    if (member) {
      member.groupHandicap = Math.round((member.groupHandicap + adj) * 2) / 2; // round to nearest 0.5
    }
  });

  const record: GroupGameRecord = {
    date: new Date().toISOString(),
    courseName,
    finishingOrder,
    adjustments,
  };
  group.gameHistory.push(record);

  updateGroup(group);
  return group;
};
