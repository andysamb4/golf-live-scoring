import { Group, GroupMember, GroupHandicapRules, GroupGameRecord } from '../types';
import {
  loadGroupsFromDb,
  saveGroupToDb,
  deleteGroupFromDb,
  getGroupFromDb,
} from './firebaseService';

const DEFAULT_RULES: GroupHandicapRules = {
  first: -1,
  second: 0,
  third: 0.5,
  fourthAndBelow: 1,
};

export const getDefaultRules = (): GroupHandicapRules => ({ ...DEFAULT_RULES });

/** Load all groups from Firestore */
export const loadGroups = (): Promise<Group[]> => loadGroupsFromDb();

/** Get a single group by ID from Firestore */
export const getGroup = (id: string): Promise<Group | undefined> => getGroupFromDb(id);

/** Create a new group and save it to Firestore */
export const createGroup = async (name: string, members: GroupMember[]): Promise<Group> => {
  const group: Group = {
    id: `GRP-${Date.now()}`,
    name,
    members,
    rules: getDefaultRules(),
    gameHistory: [],
    createdAt: new Date().toISOString(),
  };
  await saveGroupToDb(group);
  return group;
};

/** Update an existing group in Firestore */
export const updateGroup = async (updated: Group): Promise<void> => {
  await saveGroupToDb(updated);
};

/** Delete a group by ID from Firestore */
export const deleteGroup = async (id: string): Promise<void> => {
  await deleteGroupFromDb(id);
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
export const applyGroupGameResult = async (
  groupId: string,
  courseName: string,
  finishingOrder: string[],
): Promise<Group | undefined> => {
  const group = await getGroup(groupId);
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

  await updateGroup(group);
  return group;
};
