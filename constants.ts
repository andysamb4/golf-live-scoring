// Fix: Created the missing constants.ts file to provide a sample course.
import { Course } from './types';

export const SAMPLE_COURSE: Course = {
  name: 'Sample Country Club',
  holes: [
    { hole: 1, par: 4, strokeIndex: 11 },
    { hole: 2, par: 4, strokeIndex: 7 },
    { hole: 3, par: 3, strokeIndex: 17 },
    { hole: 4, par: 5, strokeIndex: 1 },
    { hole: 5, par: 4, strokeIndex: 13 },
    { hole: 6, par: 3, strokeIndex: 15 },
    { hole: 7, par: 4, strokeIndex: 5 },
    { hole: 8, par: 5, strokeIndex: 3 },
    { hole: 9, par: 4, strokeIndex: 9 },
    { hole: 10, par: 4, strokeIndex: 12 },
    { hole: 11, par: 5, strokeIndex: 2 },
    { hole: 12, par: 3, strokeIndex: 16 },
    { hole: 13, par: 4, strokeIndex: 6 },
    { hole: 14, par: 4, strokeIndex: 4 },
    { hole: 15, par: 4, strokeIndex: 14 },
    { hole: 16, par: 3, strokeIndex: 18 },
    { hole: 17, par: 5, strokeIndex: 8 },
    { hole: 18, par: 4, strokeIndex: 10 },
  ],
};
