import React, { useState, useEffect } from 'react';
import { Group, GroupMember, GroupHandicapRules } from '../types';
import { loadGroups, createGroup, updateGroup, deleteGroup, getDefaultRules } from '../services/groupService';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { TrashIcon } from './icons/TrashIcon';

interface GroupManagementScreenProps {
  onBack: () => void;
}

const GroupManagementScreen: React.FC<GroupManagementScreenProps> = ({ onBack }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await loadGroups();
      setGroups(loaded);
    } catch {
      setError('Failed to load groups. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshGroups();
  }, []);

  const handleCreateNew = () => {
    setEditingGroup({
      id: '',
      name: '',
      members: [
        { name: '', whsHandicap: 18, groupHandicap: 18 },
        { name: '', whsHandicap: 18, groupHandicap: 18 },
      ],
      rules: getDefaultRules(),
      gameHistory: [],
      createdAt: new Date().toISOString(),
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingGroup) return;
    const validMembers = editingGroup.members.filter(m => m.name.trim() !== '');
    if (!editingGroup.name.trim()) {
      alert('Please enter a group name.');
      return;
    }
    if (validMembers.length < 2) {
      alert('Please add at least 2 members.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (isCreating) {
        await createGroup(editingGroup.name.trim(), validMembers);
      } else {
        await updateGroup({ ...editingGroup, members: validMembers });
      }
      setEditingGroup(null);
      setIsCreating(false);
      await refreshGroups();
    } catch {
      setError('Failed to save group. Check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this group? This cannot be undone.')) {
      setError(null);
      try {
        await deleteGroup(id);
        await refreshGroups();
      } catch {
        setError('Failed to delete group. Check your connection.');
      }
    }
  };

  const handleMemberChange = (index: number, field: keyof GroupMember, value: string | number) => {
    if (!editingGroup) return;
    const updated = [...editingGroup.members];
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value as string };
    } else if (field === 'whsHandicap') {
      const hcp = Number(value) || 0;
      const isNewMember = isCreating || editingGroup.gameHistory.length === 0;
      updated[index] = {
        ...updated[index],
        whsHandicap: hcp,
        groupHandicap: isNewMember ? hcp : updated[index].groupHandicap,
      };
    } else if (field === 'groupHandicap') {
      updated[index] = { ...updated[index], groupHandicap: Number(value) || 0 };
    }
    setEditingGroup({ ...editingGroup, members: updated });
  };

  const handleAddMember = () => {
    if (!editingGroup) return;
    setEditingGroup({
      ...editingGroup,
      members: [...editingGroup.members, { name: '', whsHandicap: 18, groupHandicap: 18 }],
    });
  };

  const handleRemoveMember = (index: number) => {
    if (!editingGroup || editingGroup.members.length <= 2) return;
    const updated = editingGroup.members.filter((_, i) => i !== index);
    setEditingGroup({ ...editingGroup, members: updated });
  };

  const handleRuleChange = (field: keyof GroupHandicapRules, value: string) => {
    if (!editingGroup) return;
    setEditingGroup({
      ...editingGroup,
      rules: { ...editingGroup.rules, [field]: Number(value) || 0 },
    });
  };

  // --- Editor View ---
  if (editingGroup) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center text-light-green">
            {isCreating ? 'Create New Group' : `Edit: ${editingGroup.name}`}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-500 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Group Name</label>
              <input
                type="text"
                value={editingGroup.name}
                onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                placeholder="e.g. Sunday Seniors"
                className="w-full p-3 bg-dark-slate border border-gray-600 rounded-md text-off-white focus:border-light-green focus:outline-none"
              />
            </div>

            {/* Members */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Members</label>
              <div className="space-y-2">
                {editingGroup.members.map((member, i) => (
                  <div key={i} className="flex gap-2 items-center bg-dark-slate p-3 rounded-md">
                    <span className="text-gray-400 font-bold w-6 text-center">{i + 1}</span>
                    <input
                      type="text"
                      value={member.name}
                      onChange={e => handleMemberChange(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="flex-1 p-2 bg-light-slate border border-gray-600 rounded text-off-white focus:border-light-green focus:outline-none text-sm"
                    />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-500">WHS</span>
                      <input
                        type="number"
                        value={member.whsHandicap}
                        onChange={e => handleMemberChange(i, 'whsHandicap', e.target.value)}
                        step="0.1"
                        min="0"
                        max="54"
                        className="w-16 p-2 bg-light-slate border border-gray-600 rounded text-off-white text-center focus:border-light-green focus:outline-none text-sm"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-500">Group</span>
                      <input
                        type="number"
                        value={member.groupHandicap}
                        onChange={e => handleMemberChange(i, 'groupHandicap', e.target.value)}
                        step="0.5"
                        className="w-16 p-2 bg-light-slate border border-gray-600 rounded text-off-white text-center focus:border-light-green focus:outline-none text-sm"
                      />
                    </div>
                    {editingGroup.members.length > 2 && (
                      <button
                        onClick={() => handleRemoveMember(i)}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddMember}
                className="w-full mt-2 p-2 bg-light-slate hover:bg-gray-600 rounded-md text-sm"
              >
                + Add Member
              </button>
            </div>

            {/* Handicap Adjustment Rules */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Handicap Adjustments (per round)</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['first', '1st Place'],
                  ['second', '2nd Place'],
                  ['third', '3rd Place'],
                  ['fourthAndBelow', '4th & Below'],
                ] as [keyof GroupHandicapRules, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 bg-dark-slate p-2 rounded">
                    <span className="text-sm text-gray-300 flex-1">{label}</span>
                    <input
                      type="number"
                      value={editingGroup.rules[key]}
                      onChange={e => handleRuleChange(key, e.target.value)}
                      step="0.5"
                      className="w-16 p-1 bg-light-slate border border-gray-600 rounded text-off-white text-center text-sm focus:border-light-green focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Negative = handicap reduction, Positive = handicap increase</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setEditingGroup(null); setIsCreating(false); }}
              className="flex-1 p-3 bg-light-slate hover:bg-gray-500 rounded-md font-semibold"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 p-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-md disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : isCreating ? 'Create Group' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Game History */}
        {!isCreating && editingGroup.gameHistory.length > 0 && (
          <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold mb-3 text-light-green">Game History</h3>
            <div className="space-y-2">
              {[...editingGroup.gameHistory].reverse().map((record, i) => (
                <div key={i} className="bg-dark-slate p-3 rounded-md text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300 font-semibold">{record.courseName}</span>
                    <span className="text-gray-500">{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.finishingOrder.map((name, pos) => (
                      <span key={pos} className={`px-2 py-0.5 rounded text-xs ${pos === 0 ? 'bg-yellow-700 text-yellow-200' : 'bg-light-slate text-gray-300'}`}>
                        {pos + 1}. {name} ({record.adjustments[name] >= 0 ? '+' : ''}{record.adjustments[name]})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Group List View ---
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-center text-light-green flex items-center justify-center gap-2">
          <UserGroupIcon className="h-6 w-6" /> Manage Groups
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-500 rounded-md text-red-200 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-lg animate-pulse">Loading groups…</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-lg mb-2">No groups yet</p>
            <p className="text-sm">Create a group to track handicaps across regular games.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.id} className="bg-dark-slate p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold">{group.name}</h3>
                    <p className="text-sm text-gray-400">
                      {group.members.length} members &bull; {group.gameHistory.length} game{group.gameHistory.length !== 1 ? 's' : ''} played
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingGroup({ ...group }); setIsCreating(false); }}
                      className="px-3 py-1 bg-light-slate hover:bg-gray-500 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-300 rounded text-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.members.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 bg-medium-slate rounded text-xs text-gray-300">
                      {m.name} <span className="text-gray-500">({m.groupHandicap})</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleCreateNew}
          className="w-full mt-4 p-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-md"
        >
          + Create New Group
        </button>
      </div>

      <button
        onClick={onBack}
        className="w-full p-3 bg-light-slate hover:bg-gray-500 text-white font-bold rounded-lg shadow-lg"
      >
        &larr; Back to Game Setup
      </button>
    </div>
  );
};

export default GroupManagementScreen;
