import { Course, TeeSet } from '../types';

const API_ENDPOINT = '/api/course-search';

// Attempt to extract a JSON object from a raw string (handles markdown code fences etc.)
const cleanJsonString = (str: string): string => {
  const markdownMatch = str.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1];
  }
  const jsonStart = str.indexOf('{');
  const jsonEnd = str.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return str.substring(jsonStart, jsonEnd + 1);
  }
  return str.trim();
};

// Validates the new multi-tee response shape
const validateExtractedCourse = (data: unknown): data is { name: string; teeSets: TeeSet[] } => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.name !== 'string') return false;
  if (!Array.isArray(d.teeSets) || d.teeSets.length === 0) return false;
  // At least one tee set must have 18 holes
  return (d.teeSets as TeeSet[]).some(
    (ts) => Array.isArray(ts.holes) && ts.holes.length === 18
  );
};

// Also accept the old flat shape { name, holes[] } for backward compat (text search)
const validateFlatCourse = (data: unknown): data is Course => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.name === 'string' && Array.isArray(d.holes) && (d.holes as unknown[]).length === 18;
};

/**
 * Attempts to repair truncated JSON by trimming to the last complete tee set.
 * Claude sometimes stops mid-stream if max_tokens is hit.
 */
const repairTruncatedJson = (str: string): string | null => {
  try {
    // Find the last complete hole object closing brace inside teeSets
    // Strategy: trim back to the last "}," or "}]" at the teeSets array level
    // We look for the last ']' that closes a holes array, then close up the structure
    const lastCompleteHoles = str.lastIndexOf('"strokeIndex"');
    if (lastCompleteHoles === -1) return null;

    // Find the closing brace of that hole entry
    const afterStrokeIndex = str.indexOf('}', lastCompleteHoles);
    if (afterStrokeIndex === -1) return null;

    // Trim to just after that closing brace, then close holes[], tee{}, teeSets[], root{}
    const truncated = str.substring(0, afterStrokeIndex + 1) + '\n      ]\n    }\n  ]\n}';
    JSON.parse(truncated); // validate
    return truncated;
  } catch {
    return null;
  }
};

const parseClaudeResponse = (text: string): Course | null => {
  if (!text || text.trim().toLowerCase() === 'null') return null;
  try {
    const cleaned = cleanJsonString(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Try to recover from truncated JSON
      console.warn('JSON parse failed, attempting repair…', (parseErr as Error).message);
      const repaired = repairTruncatedJson(cleaned);
      if (!repaired) {
        console.error('Failed to parse Claude response:', parseErr, '\nRaw text:', text);
        return null;
      }
      console.info('JSON repaired successfully (truncation recovery)');
      parsed = JSON.parse(repaired);
    }

    // New shape: { name, teeSets: [...] }
    if (validateExtractedCourse(parsed)) {
      const p = parsed as { name: string; teeSets: TeeSet[] };
      // Default active tee = first valid tee set
      const firstValidTee = p.teeSets.find((ts) => ts.holes.length === 18)!;
      const course: Course = {
        name: p.name,
        teeSets: p.teeSets,
        holes: firstValidTee.holes,
        slopeRating: firstValidTee.slopeRating,
        courseRating: firstValidTee.courseRating,
      };
      return course;
    }

    // Old flat shape (text search fallback): { name, holes, slopeRating?, courseRating? }
    if (validateFlatCourse(parsed)) {
      return parsed as Course;
    }

    console.error('Parsed course data is invalid or incomplete.', parsed);
    return null;
  } catch (err) {
    console.error('Failed to parse Claude response:', err, '\nRaw text:', text);
    return null;
  }
};

/**
 * Extracts a golf course scorecard (all tee sets) from an image using Claude.
 */
export const findCourseFromImage = async (
  imageBase64: string,
  mediaType: string
): Promise<Course | null> => {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: response.statusText }))) as { error?: string; details?: string };
    throw new Error(errorData.details ? `Upstream API error: ${errorData.details}` : (errorData.error ?? 'Failed to contact course search API.'));
  }

  const data = (await response.json()) as { text: string };
  return parseClaudeResponse(data.text);
};
