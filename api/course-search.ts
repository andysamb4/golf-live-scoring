import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export const maxDuration = 60; // Allows up to 60 seconds execution for AI vision

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error: API key not set.' });
  }

  const { query, imageBase64, mediaType } = req.body as {
    query?: string;
    imageBase64?: string;
    mediaType?: string;
  };

  let messages: object[];

  if (imageBase64 && mediaType) {
    // Image-based search
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `You are an expert golf scorecard data extractor. Analyse this scorecard image carefully and return ONLY raw JSON — no markdown, no explanation, nothing else.

A scorecard typically contains multiple tee sets (e.g. White, Yellow, Red, Blue, Gold, etc.), each with its own slope rating, course rating, and stroke index (handicap) column per hole.

Extract the following:

1. "name": The full official name of the golf course. Look for it in a header, logo, or title of the scorecard.

2. "teeSets": An array of ALL tee sets you can see on the scorecard. For each tee set:
   - "name": The tee colour or label (e.g. "White", "Yellow", "Red", "Blue")
   - "slopeRating": WHS Slope Rating (number 55–155), often labelled "Slope" or "SR". null if not shown.
   - "courseRating": WHS Course Rating (decimal like 70.3), often labelled "CR" or "Rating". null if not shown.
   - "holes": Array of all 18 holes with:
       - "hole": Hole number (1–18)
       - "par": Par (3, 4, or 5)
       - "strokeIndex": The MEN'S handicap stroke index — unique number 1–18 (1 = hardest). Often labelled "Handicap", "HCP", "SI". Do NOT confuse with yardage.

Return exactly this JSON structure:
{
  "name": "Full Course Name",
  "teeSets": [
    {
      "name": "White",
      "slopeRating": 118,
      "courseRating": 70.3,
      "holes": [
        { "hole": 1, "par": 4, "strokeIndex": 5 },
        ... all 18 holes
      ]
    },
    {
      "name": "Yellow",
      "slopeRating": 113,
      "courseRating": 68.1,
      "holes": [ ... ]
    }
  ]
}

If you can only find one set of stroke indices (handicaps), create a single tee set called "Standard".
If you cannot read the scorecard clearly enough to extract the holes, return exactly: null`,
          },
        ],
      },
    ];
  } else if (query) {
    // Text-based search
    messages = [
      {
        role: 'user',
        content: `You are a golf course data assistant. Return the scorecard for "${query}" as raw JSON only — no markdown, no explanation, nothing else.

Extract:
1. "name": The full official course name.
2. "slopeRating": The WHS Slope Rating (55–155). Return null if unknown.
3. "courseRating": The WHS Course Rating (e.g. 70.3). Return null if unknown.
4. "holes": All 18 holes, each with:
   - "hole": Hole number (1–18)
   - "par": Par (3, 4, or 5)
   - "strokeIndex": Men's handicap index (unique 1–18, 1 = hardest). Do NOT guess this or confuse with yardage.

Return exactly this JSON structure:
{
  "name": "Full Course Name",
  "slopeRating": 113,
  "courseRating": 70.3,
  "holes": [
    { "hole": 1, "par": 4, "strokeIndex": 11 },
    ... all 18 holes
  ]
}

If you don't have reliable data for this course, return exactly: null`,
      },
    ];
  } else {
    return res.status(400).json({ error: 'Either query or imageBase64 + mediaType must be provided.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8192,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return res.status(502).json({ error: 'Upstream API error', details: errorText });
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const textContent = data.content?.find((c) => c.type === 'text');
    if (!textContent) {
      return res.status(502).json({ error: 'No text content in Claude response.' });
    }

    return res.status(200).json({ text: textContent.text });
  } catch (err) {
    console.error('Error calling Anthropic API:', err);
    return res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
}
