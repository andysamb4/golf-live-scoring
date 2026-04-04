import React, { useState } from 'react';
import { Player } from '../types';

interface PlayerBulkUploadProps {
  onPlayersAdded: (players: Player[]) => void;
  maxPlayers?: number;
  currentCount?: number;
}

export const PlayerBulkUpload: React.FC<PlayerBulkUploadProps> = ({ 
  onPlayersAdded, 
  maxPlayers = 80,
  currentCount = 0 
}) => {
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const processText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const newPlayers: Player[] = [];
    const errors: string[] = [];

    // Skip the first line if it looks like a header (e.g., contains 'name' and 'handicap' regardless of case)
    if (lines.length > 0) {
       const firstLineLower = lines[0].toLowerCase();
       if (firstLineLower.includes('name') && (firstLineLower.includes('handicap') || firstLineLower.includes('whs'))) {
         lines.shift();
       }
    }

    lines.forEach((line, index) => {
      // Split by comma or tab
      const parts = line.split(/[,\t]+/).map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const handicapStr = parts[1];
        const handicap = parseFloat(handicapStr);

        if (name && !isNaN(handicap)) {
          newPlayers.push({
            id: crypto.randomUUID(),
            name,
            handicap,
          });
        } else {
          errors.push(`Row ${index + 1}: Invalid data format ("${line}")`);
        }
      } else if (parts.length === 1 && parts[0]) {
        // Assume default handicap of 0 if only name is provided? Better to throw error as WHS is required.
        errors.push(`Row ${index + 1}: Missing handicap ("${line}")`);
      }
    });

    if (newPlayers.length === 0 && errors.length === 0) {
      setError("No valid player data found.");
      return;
    }

    if (currentCount + newPlayers.length > maxPlayers) {
      setError(`Cannot add ${newPlayers.length} players. Maximum limit of ${maxPlayers} would be exceeded.`);
      return;
    }

    if (errors.length > 0) {
      setError(`Processed with some errors:\n${errors.join('\n')}`);
    } else {
      setError(null);
    }

    if (newPlayers.length > 0) {
      onPlayersAdded(newPlayers);
      setPasteText(''); // Clear on success
    }
  };

  const handlePasteSubmit = () => {
    processText(pasteText);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        processText(result);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700">
      <h3 className="text-xl font-semibold mb-4 text-light-green">Bulk Upload Players</h3>
      
      {error && (
        <div className="bg-red-900 border-l-4 border-red-400 text-red-100 p-3 mb-4 rounded text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Option 1: Upload CSV File
        </label>
        <p className="text-xs text-gray-400 mb-2">Format: Name, Handicap (e.g. John Doe, 12.4)</p>
        <input 
          type="file" 
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-light-green file:text-dark-slate
            hover:file:bg-green-400 cursor-pointer"
        />
      </div>

      <div className="relative flex py-2 items-center mb-4">
        <div className="flex-grow border-t border-slate-600"></div>
        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
        <div className="flex-grow border-t border-slate-600"></div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Option 2: Paste List
        </label>
        <textarea
          className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:ring-2 focus:ring-light-green text-white placeholder-gray-500 font-mono text-sm"
          rows={5}
          placeholder="John Doe, 12.4&#10;Jane Smith, 8.2"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div className="mt-2 text-right">
          <button
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim()}
            className="px-4 py-2 bg-light-green text-dark-slate font-semibold rounded hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Process Pasted Text
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-700 text-sm text-gray-400">
        Current total: {currentCount} / {maxPlayers} players
      </div>
    </div>
  );
};

export default PlayerBulkUpload;
