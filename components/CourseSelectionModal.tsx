import React, { useState, useCallback, useRef } from 'react';
import { Course, TeeSet, GameState, Player, GameType } from '../types';
import { findCourseFromImage } from '../services/claudeService';
import { searchCoursesFromDb, saveCourseToDb } from '../services/firebaseService';
import { SearchIcon } from './icons/SearchIcon';
import { XIcon } from './icons/XIcon';
import Scorecard from './Scorecard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseSelect: (course: Course) => void;
}

type Tab = 'search' | 'photo' | 'manual';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'merged' | 'duplicate';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const getDummyGameState = (course: Course): GameState => {
  const dummyPlayer: Player = { id: 'preview', name: 'Player', handicap: 0 };
  return {
    id: 'preview-game',
    players: [dummyPlayer],
    course,
    gameType: GameType.Medal,
    scores: { preview: Array(18).fill(null) },
    currentHole: 0,
    status: 'playing',
  };
};

const buildEmptyManualHoles = () =>
  Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, par: 4, strokeIndex: i + 1 }));

/** Returns a CSS colour for a named tee.
 *  Handles simple names ("White") and compound names ("Men Black", "Ladies Red").
 *  Strategy: try matching each word in the name (last word first). */
const TEE_COLOURS: Record<string, string> = {
  white: '#FFFFFF', yellow: '#FACC15', red: '#EF4444',
  blue: '#3B82F6', black: '#374151', gold: '#F59E0B',
  green: '#22C55E', silver: '#9CA3AF', standard: '#6B7280',
};
const teeColour = (name: string): string => {
  const words = name.toLowerCase().split(/\s+/).reverse(); // last word first
  for (const word of words) {
    if (TEE_COLOURS[word]) return TEE_COLOURS[word];
  }
  return '#6B7280';
};

/**
 * Given a course with teeSets, apply the selected tee index to produce
 * a flat Course ready for the game.
 */
const applyTee = (course: Course, teeIdx: number): Course => {
  const teeSets = course.teeSets ?? [];
  if (teeSets.length === 0) return course;
  const tee = teeSets[teeIdx] ?? teeSets[0];
  return {
    ...course,
    holes: tee.holes,
    slopeRating: tee.slopeRating,
    courseRating: tee.courseRating,
  };
};

// ─── Shared sub-components ────────────────────────────────────────────────────

const Spinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-green mx-auto" />
    <p className="mt-4 text-lg text-gray-300">{label}</p>
  </div>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <p className="text-center text-red-400 bg-red-900/50 p-4 rounded-md">{message}</p>
);

const CoursePreview: React.FC<{ course: Course }> = ({ course }) => (
  <div className="space-y-4">
    <h3 className="text-2xl font-bold text-center text-light-green">{course.name}</h3>
    {(course.slopeRating || course.courseRating) && (
      <div className="flex justify-center gap-4 text-sm">
        {course.slopeRating && (
          <span className="bg-forest-green/30 border border-forest-green/50 text-green-300 px-3 py-1 rounded-full">
            Slope: {course.slopeRating}
          </span>
        )}
        {course.courseRating && (
          <span className="bg-forest-green/30 border border-forest-green/50 text-green-300 px-3 py-1 rounded-full">
            Rating: {course.courseRating}
          </span>
        )}
      </div>
    )}
    {course.holes?.length === 18 && <Scorecard gameState={getDummyGameState(course)} />}
  </div>
);

/** Coloured tee pill selector — used in both Search and Photo tabs */
const TeeSelector: React.FC<{
  teeSets: TeeSet[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
}> = ({ teeSets, selectedIdx, onSelect }) => (
  <div className="bg-dark-slate border border-light-slate rounded-lg p-4 space-y-3">
    <p className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
      🏌️ Select Tee — {teeSets.length} available
    </p>
    <div className="flex gap-2 flex-wrap">
      {teeSets.map((ts, i) => {
        const col = teeColour(ts.name);
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              borderColor: col,
              color: selectedIdx === i ? '#000' : col,
              background: selectedIdx === i ? col : 'transparent',
            }}
            className="px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all"
          >
            {ts.name}
            {(ts.slopeRating || ts.courseRating) && (
              <span className="ml-1 opacity-70 text-xs font-normal">
                {ts.courseRating ? `CR ${ts.courseRating}` : `S ${ts.slopeRating}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Tab: Search ──────────────────────────────────────────────────────────────

const SearchTab: React.FC<{ onCourseFound: (course: Course) => void }> = ({ onCourseFound }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Course[] | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeeIdx, setSelectedTeeIdx] = useState(0);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    setSelectedCourse(null);
    try {
      const results = await searchCoursesFromDb(query.trim());
      if (results.length > 0) {
        setSearchResults(results);
      } else {
        setError('Course not found in the community database. You can add it via the Photo or Manual tabs!');
      }
    } catch (err) {
      setError('An error occurred connecting to the database. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handlePickCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTeeIdx(0);
  };

  const reset = () => {
    setSelectedCourse(null);
    setSearchResults(null);
    setError(null);
  };

  // ── Course detail + tee selection ─────────────────────────────────────────
  if (selectedCourse) {
    const teeSets = selectedCourse.teeSets ?? [];
    const previewCourse = teeSets.length > 0
      ? applyTee(selectedCourse, selectedTeeIdx)
      : selectedCourse;

    return (
      <>
        <main className="p-6 overflow-y-auto flex-grow space-y-4">
          {teeSets.length > 0 && (
            <TeeSelector
              teeSets={teeSets}
              selectedIdx={selectedTeeIdx}
              onSelect={setSelectedTeeIdx}
            />
          )}
          <CoursePreview course={previewCourse} />
        </main>
        <footer className="p-6 border-t border-light-slate flex-shrink-0 flex gap-3 justify-end">
          <button
            onClick={reset}
            className="p-3 bg-light-slate hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
          >
            ← Back to Results
          </button>
          <button
            onClick={() => onCourseFound(previewCourse)}
            className="p-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-colors"
          >
            ⛳ Use This Course
          </button>
        </footer>
      </>
    );
  }

  // ── Search form + results ─────────────────────────────────────────────────
  return (
    <>
      <div className="p-6 space-y-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., St Andrews Old Course"
            className="flex-grow p-3 bg-dark-slate border border-light-slate rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none text-lg"
            disabled={isLoading}
            aria-label="Course search query"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="p-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SearchIcon className="w-5 h-5" />
            <span>{isLoading ? 'Searching…' : 'Search'}</span>
          </button>
        </div>
      </div>
      <main className="p-6 overflow-y-auto flex-grow">
        {isLoading && <Spinner label="Searching community database…" />}
        {error && <ErrorMessage message={error} />}
        {searchResults && searchResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-light-green">Select a match:</h3>
            {searchResults.map((course) => (
              <button
                key={course.id || course.name}
                onClick={() => handlePickCourse(course)}
                className="w-full p-4 bg-dark-slate hover:bg-forest-green/20 border border-light-slate rounded-lg text-left transition-colors flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-lg text-white block">{course.name}</span>
                  {course.teeSets && course.teeSets.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {course.teeSets.map((ts, i) => {
                        const col = teeColour(ts.name);
                        return (
                          <span
                            key={i}
                            style={{ borderColor: col, color: col }}
                            className="text-xs border px-2 py-0.5 rounded-full"
                          >
                            {ts.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-gray-400 text-sm ml-4 flex-shrink-0">Select →</span>
              </button>
            ))}
          </div>
        )}
        {!isLoading && !error && !searchResults && (
          <div className="text-center space-y-2 mt-8">
            <p className="text-gray-400">Search our verified crowdsourced database.</p>
            <p className="text-sm text-forest-green">
              If your course isn't found, add it via the Photo or Manual tabs!
            </p>
          </div>
        )}
      </main>
    </>
  );
};

// ─── Tab: Photo ───────────────────────────────────────────────────────────────

const PhotoTab: React.FC<{ onCourseFound: (course: Course) => void }> = ({ onCourseFound }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundCourse, setFoundCourse] = useState<Course | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState('');
  const [teeEdits, setTeeEdits] = useState<Record<number, { slope: number | ''; rating: number | '' }>>({});
  const [selectedTeeIdx, setSelectedTeeIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [dbCourse, setDbCourse] = useState<Course | null>(null);

  const updateTeeEdit = (idx: number, field: 'slope' | 'rating', val: number | '') =>
    setTeeEdits((prev) => ({ ...prev, [idx]: { ...prev[idx], [field]: val } }));

  const handleCourseExtracted = (course: Course) => {
    setFoundCourse(course);
    setEditName(course.name ?? '');
    setSelectedTeeIdx(0);
    const edits: Record<number, { slope: number | ''; rating: number | '' }> = {};
    (course.teeSets ?? []).forEach((ts: TeeSet, i: number) => {
      edits[i] = { slope: ts.slopeRating ?? '', rating: ts.courseRating ?? '' };
    });
    setTeeEdits(edits);
    setSaveStatus('idle');
    setDbCourse(null);
  };

  const buildFinalCourse = (): Course => {
    if (!foundCourse) throw new Error('No course loaded');
    const teeSets: TeeSet[] = (foundCourse.teeSets ?? []).map((ts: TeeSet, i: number) => ({
      ...ts,
      slopeRating: teeEdits[i]?.slope !== '' ? Number(teeEdits[i]?.slope) : ts.slopeRating,
      courseRating: teeEdits[i]?.rating !== '' ? Number(teeEdits[i]?.rating) : ts.courseRating,
    }));
    const activeTee = teeSets[selectedTeeIdx] ?? teeSets[0];
    return {
      ...foundCourse,
      name: editName.trim() || foundCourse.name || 'Unknown Course',
      teeSets,
      holes: activeTee?.holes ?? foundCourse.holes,
      slopeRating: activeTee?.slopeRating,
      courseRating: activeTee?.courseRating,
    };
  };

  /** Save all tee sets to DB, then pass the selected tee to the game */
  const handleSaveAndUse = async () => {
    const finalCourse = buildFinalCourse();
    setSaveStatus('saving');
    try {
      const result = await saveCourseToDb(finalCourse);
      if (result.status === 'duplicate') {
        setSaveStatus('duplicate');
        setDbCourse(result.existingCourse);
        // Don't close — let user choose DB vs extracted version
      } else {
        // 'saved' or 'merged' — hand off to game and close
        setSaveStatus(result.status === 'merged' ? 'merged' : 'saved');
        onCourseFound(finalCourse);
      }
    } catch {
      // DB save failed — still let the user continue with extracted data
      onCourseFound(finalCourse);
    }
  };

  const reset = () => {
    setFoundCourse(null);
    setError(null);
    setPreview(null);
    setSaveStatus('idle');
    setDbCourse(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setIsLoading(true);
    setError(null);
    setFoundCourse(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const [meta, base64] = (reader.result as string).split(',');
        const mediaType = meta.replace('data:', '').replace(';base64', '');
        const course = await findCourseFromImage(base64, mediaType);
        if (course) {
          handleCourseExtracted(course);
        } else {
          setError('Could not extract a valid scorecard. Make sure the card is clearly visible and try again.');
        }
        setIsLoading(false);
      };
      reader.onerror = () => { setError('Failed to read the image file.'); setIsLoading(false); };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
      setIsLoading(false);
    }
  }, []);

  // ── Duplicate resolution ──────────────────────────────────────────────────
  if (saveStatus === 'duplicate' && dbCourse) {
    const dbTeeSets = dbCourse.teeSets ?? [];
    return (
      <main className="p-6 overflow-y-auto flex-grow space-y-4">
        <div className="bg-amber-900/40 border border-amber-500 rounded-lg p-4 space-y-3">
          <p className="text-amber-300 font-semibold text-lg">⚠️ Course already in database</p>
          <p className="text-gray-300 text-sm">
            <strong>{dbCourse.name}</strong> is already saved. Use the stored verified version, or
            overwrite with your freshly-extracted data?
          </p>
          {dbTeeSets.length > 0 && (
            <p className="text-gray-400 text-xs">
              Stored tees: {dbTeeSets.map((ts: TeeSet) => ts.name).join(', ')}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onCourseFound(applyTee(dbCourse, 0))}
            className="flex-1 p-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            ✅ Use Stored Version
          </button>
          <button
            onClick={() => onCourseFound(buildFinalCourse())}
            className="flex-1 p-3 bg-light-slate hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
          >
            🔄 Use My Extraction
          </button>
        </div>
        <button onClick={reset} className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors pt-1">
          ← Start Over
        </button>
      </main>
    );
  }

  // ── Review + tee selection after extraction ───────────────────────────────
  if (foundCourse) {
    const teeSets: TeeSet[] = foundCourse.teeSets ?? [];
    const activeTeeEdit = teeEdits[selectedTeeIdx] ?? { slope: '', rating: '' };
    const activeTee = teeSets[selectedTeeIdx];
    const previewCourse: Course = activeTee
      ? {
          ...foundCourse,
          name: editName || 'Unknown Course',
          holes: activeTee.holes,
          slopeRating: activeTeeEdit.slope !== '' ? Number(activeTeeEdit.slope) : activeTee.slopeRating,
          courseRating: activeTeeEdit.rating !== '' ? Number(activeTeeEdit.rating) : activeTee.courseRating,
        }
      : { ...foundCourse, name: editName || 'Unknown Course' };

    return (
      <>
        <main className="p-6 overflow-y-auto flex-grow space-y-5">
          {/* Course name */}
          <div className="bg-dark-slate border border-light-slate rounded-lg p-4">
            <label htmlFor="photo-name" className="block text-sm text-gray-400 mb-1">
              Course Name{' '}
              {!editName.trim() && (
                <span className="text-amber-400 font-semibold">⚠ not found — please enter</span>
              )}
            </label>
            <input
              id="photo-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Delapre Golf Centre"
              className={`w-full p-3 bg-medium-slate border rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none ${
                !editName.trim() ? 'border-amber-500' : 'border-light-slate'
              }`}
            />
          </div>

          {/* Tee selector + per-tee slope/rating */}
          {teeSets.length > 0 && (
            <div className="bg-dark-slate border border-light-slate rounded-lg p-4 space-y-4">
              <TeeSelector
                teeSets={teeSets}
                selectedIdx={selectedTeeIdx}
                onSelect={setSelectedTeeIdx}
              />
              {activeTee && (
                <div className="flex gap-4 pt-1">
                  <div className="flex-1">
                    <label htmlFor={`slope-${selectedTeeIdx}`} className="block text-xs text-gray-400 mb-1">
                      Slope Rating <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      id={`slope-${selectedTeeIdx}`}
                      type="number" min={55} max={155}
                      value={activeTeeEdit.slope}
                      onChange={(e) => updateTeeEdit(selectedTeeIdx, 'slope', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 113"
                      className="w-full p-2 bg-medium-slate border border-light-slate rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor={`rating-${selectedTeeIdx}`} className="block text-xs text-gray-400 mb-1">
                      Course Rating <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      id={`rating-${selectedTeeIdx}`}
                      type="number" step={0.1} min={55} max={80}
                      value={activeTeeEdit.rating}
                      onChange={(e) => updateTeeEdit(selectedTeeIdx, 'rating', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 70.3"
                      className="w-full p-2 bg-medium-slate border border-light-slate rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <CoursePreview course={previewCourse} />
        </main>

        <footer className="p-6 border-t border-light-slate flex-shrink-0 flex gap-3 justify-end items-center">
          <button onClick={reset} className="p-3 bg-light-slate hover:bg-gray-500 text-white font-bold rounded-lg transition-colors">
            ← Try Another Photo
          </button>
          <button
            onClick={handleSaveAndUse}
            disabled={saveStatus === 'saving' || !editName.trim()}
            className="p-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saveStatus === 'saving' ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Saving…
              </>
            ) : (
              '💾 Save to DB & Use This Tee'
            )}
          </button>
        </footer>
      </>
    );
  }

  // ── Upload prompt ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-6 flex-shrink-0">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-light-slate rounded-lg cursor-pointer hover:border-forest-green hover:bg-dark-green/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-forest-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-200 font-bold text-lg">Snap & Extract via AI</p>
          <p className="text-sm text-gray-500 text-center">
            Claude Sonnet 4.5 extracts all tee sets automatically.<br />
            All tees are saved to the shared community database!
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
          aria-label="Upload scorecard image"
        />
      </div>
      <main className="p-6 overflow-y-auto flex-grow">
        {isLoading && (
          <div className="space-y-4">
            {preview && <img src={preview} alt="Scorecard preview" className="max-h-48 mx-auto rounded-md object-contain opacity-50" />}
            <Spinner label="Extracting all tee sets from scorecard…" />
          </div>
        )}
        {error && <ErrorMessage message={error} />}
      </main>
    </>
  );
};

// ─── Tab: Manual ─────────────────────────────────────────────────────────────

const ManualTab: React.FC<{ onCourseFound: (course: Course) => void }> = ({ onCourseFound }) => {
  const [courseName, setCourseName] = useState('');
  const [slopeRating, setSlopeRating] = useState<number | ''>('');
  const [courseRating, setCourseRating] = useState<number | ''>('');
  const [holes, setHoles] = useState(buildEmptyManualHoles);
  const [nameError, setNameError] = useState('');

  const updateHole = (index: number, field: 'par' | 'strokeIndex', value: number) =>
    setHoles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

  const handleSubmit = () => {
    if (!courseName.trim()) { setNameError('Please enter a course name.'); return; }
    setNameError('');
    onCourseFound({
      name: courseName.trim(),
      holes: holes.map(({ hole, par, strokeIndex }) => ({ hole, par, strokeIndex })),
      ...(slopeRating !== '' ? { slopeRating: Number(slopeRating) } : {}),
      ...(courseRating !== '' ? { courseRating: Number(courseRating) } : {}),
    });
  };

  return (
    <>
      <div className="p-6 flex-shrink-0 border-b border-light-slate space-y-4">
        <div>
          <label htmlFor="manual-course-name" className="block text-sm font-semibold text-gray-300 mb-1">Course Name</label>
          <input
            id="manual-course-name"
            type="text"
            value={courseName}
            onChange={(e) => { setCourseName(e.target.value); setNameError(''); }}
            placeholder="e.g., My Home Club"
            className="w-full p-3 bg-dark-slate border border-light-slate rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none"
          />
          {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
          <p className="text-xs text-forest-green mt-2">Adding this manually helps other golfers find it in the Search tab!</p>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="manual-slope" className="block text-sm font-semibold text-gray-300 mb-1">
              Slope Rating <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="manual-slope"
              type="number" min={55} max={155}
              value={slopeRating}
              onChange={(e) => setSlopeRating(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 113"
              className="w-full p-3 bg-dark-slate border border-light-slate rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="manual-rating" className="block text-sm font-semibold text-gray-300 mb-1">
              Course Rating <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="manual-rating"
              type="number" step={0.1} min={55} max={80}
              value={courseRating}
              onChange={(e) => setCourseRating(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 70.3"
              className="w-full p-3 bg-dark-slate border border-light-slate rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none"
            />
          </div>
        </div>
      </div>
      <main className="p-6 overflow-y-auto flex-grow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-light-slate">
                <th className="py-2 px-3 text-left">Hole</th>
                <th className="py-2 px-3 text-center">Par</th>
                <th className="py-2 px-3 text-center">Stroke Index</th>
              </tr>
            </thead>
            <tbody>
              {holes.map((h, i) => (
                <tr key={h.hole} className={`border-b border-light-slate/30 ${i % 2 === 0 ? 'bg-dark-slate/30' : ''}`}>
                  <td className="py-1 px-3 font-semibold text-gray-300">{h.hole}</td>
                  <td className="py-1 px-3">
                    <input type="number" min={3} max={5} value={h.par}
                      onChange={(e) => updateHole(i, 'par', Math.min(5, Math.max(3, Number(e.target.value))))}
                      className="w-16 mx-auto block text-center p-1 bg-dark-slate border border-light-slate rounded focus:ring-1 focus:ring-forest-green focus:outline-none"
                      aria-label={`Hole ${h.hole} par`} />
                  </td>
                  <td className="py-1 px-3">
                    <input type="number" min={1} max={18} value={h.strokeIndex}
                      onChange={(e) => updateHole(i, 'strokeIndex', Math.min(18, Math.max(1, Number(e.target.value))))}
                      className="w-16 mx-auto block text-center p-1 bg-dark-slate border border-light-slate rounded focus:ring-1 focus:ring-forest-green focus:outline-none"
                      aria-label={`Hole ${h.hole} stroke index`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <footer className="p-6 border-t border-light-slate flex-shrink-0 flex justify-end">
        <button
          onClick={handleSubmit}
          className="p-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-colors"
        >
          Save & Use Course
        </button>
      </footer>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CourseSelectionModal: React.FC<CourseSelectionModalProps> = ({ isOpen, onClose, onCourseSelect }) => {
  const [activeTab, setActiveTab] = useState<Tab>('search');

  /**
   * Three separate handlers so we never double-save:
   *  - Search: course is already in DB
   *  - Photo:  PhotoTab saves internally before calling this
   *  - Manual: needs a background save
   */
  const handleFromSearch = (course: Course) => { onCourseSelect(course); onClose(); };
  const handleFromPhoto  = (course: Course) => { onCourseSelect(course); onClose(); };
  const handleFromManual = async (course: Course) => {
    onCourseSelect(course);
    onClose();
    try { await saveCourseToDb(course); }
    catch (e) { console.warn('Failed to save manual course to DB:', e); }
  };

  const tabClass = (tab: Tab) =>
    `flex-1 py-3 text-sm font-semibold transition-colors ${
      activeTab === tab
        ? 'bg-forest-green text-white'
        : 'bg-dark-slate text-gray-400 hover:text-white hover:bg-light-slate'
    }`;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Course selection"
    >
      <div className="bg-medium-slate w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-light-slate flex-shrink-0">
          <h2 className="text-2xl font-bold text-light-green">Find a Golf Course</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex border-b border-light-slate flex-shrink-0 overflow-hidden">
          <button className={`${tabClass('search')} rounded-tl-none`} onClick={() => setActiveTab('search')}>🔍 Search DB</button>
          <button className={`${tabClass('photo')} border-x border-light-slate`} onClick={() => setActiveTab('photo')}>📷 Photo Upload</button>
          <button className={`${tabClass('manual')} rounded-tr-none`} onClick={() => setActiveTab('manual')}>✏️ Manual</button>
        </div>

        {activeTab === 'search' && <SearchTab onCourseFound={handleFromSearch} />}
        {activeTab === 'photo'  && <PhotoTab  onCourseFound={handleFromPhoto}  />}
        {activeTab === 'manual' && <ManualTab onCourseFound={handleFromManual} />}
      </div>
    </div>
  );
};

export default CourseSelectionModal;