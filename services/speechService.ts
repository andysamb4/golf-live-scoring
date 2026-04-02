import { Hole } from '../types';

// Type definition for the SpeechRecognition API which may not be on the default window type
interface CustomWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
declare let window: CustomWindow;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition: any | null = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
}

export const isSpeechRecognitionSupported = (): boolean => {
    return !!SpeechRecognition;
};

export const parseSpokenScore = (spokenText: string, hole: Hole): number | null => {
    const text = spokenText.toLowerCase().trim();
    
    // Direct number matching
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
        const num = parseInt(numberMatch[0], 10);
        if (num >= 1 && num <= 20) return num;
    }

    // Word to number mapping
    const wordToNumber: { [key: string]: number } = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        won: 1, to: 2, tree: 3, for: 4,
    };
    if (wordToNumber[text]) return wordToNumber[text];
    
    // Golf term mapping
    const termsToScore: { [key: string]: number } = {
        "ace": 1,
        "hole in one": 1,
        "albatross": hole.par - 3,
        "double eagle": hole.par - 3,
        "eagle": hole.par - 2,
        "birdie": hole.par - 1,
        "par": hole.par,
        "bogey": hole.par + 1,
        "double bogey": hole.par + 2,
        "triple bogey": hole.par + 3,
    };

    if (termsToScore[text] !== undefined) {
        const score = termsToScore[text];
        return score > 0 ? score : null; // Ensure we don't return 0 or negative scores for this logic
    }

    return null;
}

export const startListening = (
    onResult: (transcript: string) => void, 
    onError: (error: string) => void,
    onEnd: () => void
): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!recognition) {
            const errorMsg = "Speech recognition is not supported in this browser.";
            onError(errorMsg);
            return reject(errorMsg);
        }

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
        };

        recognition.onerror = (event: any) => {
            let errorMsg = 'An unknown error occurred.';
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                errorMsg = "Microphone access denied. Please enable it in your browser settings.";
            } else if (event.error === 'no-speech') {
                errorMsg = "No speech was detected.";
            }
            onError(errorMsg);
            reject(errorMsg);
        };
        
        recognition.onend = () => {
            onEnd();
        };

        recognition.start();
        resolve();
    });
};

export const stopListening = () => {
    if (recognition) {
        recognition.stop();
    }
};
