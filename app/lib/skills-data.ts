// Initial seed data for Skill Modules
import type { SkillModule } from './types'

export const DEFAULT_SKILL_MODULES: SkillModule[] = [
  {
    id: 'skill-1',
    title: 'Taking Notes from Textbooks',
    description: 'Learn structured note-taking strategies (Cornell, outline, mapping) to capture key concepts from readings.',
    objectives: [
      'Identify main ideas and supporting details',
      'Use Cornell method to summarize sections',
      'Create quick review questions from headings',
    ],
    media: [
      { type: 'video', url: 'https://www.youtube.com/watch?v=AfQx2Xv9mJQ', title: 'Cornell Notes in 5 minutes' },
      { type: 'article', url: 'https://www.opencolleges.edu.au/informed/study-tips/note-taking-methods', title: 'Note-taking methods overview' },
    ],
    duration: '15–25 min',
    difficulty: 'beginner',
    topic: 'note-taking',
  },
  {
    id: 'skill-2',
    title: 'Test Preparation Planner',
    description: 'Build a backwards study plan with spaced practice and active recall before tests.',
    objectives: [
      'Break topics into daily goals',
      'Apply spaced repetition across the week',
      'Use active recall and mini-quizzes',
    ],
    media: [
      { type: 'exercise', url: 'https://forms.gle/example-quiz', title: 'Self-check quiz' },
      { type: 'article', url: 'https://www.citl.mun.ca/learningstrategies/spacedpractice.php', title: 'Spaced practice' },
    ],
    duration: '20–30 min',
    difficulty: 'intermediate',
    topic: 'test-prep',
  },
  {
    id: 'skill-3',
    title: 'Time Management: Pomodoro Basics',
    description: 'Use focused 25-minute sessions with short breaks to stay on task and reduce procrastination.',
    objectives: [
      'Set a clear sprint goal',
      'Minimize distractions for 25 minutes',
      'Reflect and adjust after each cycle',
    ],
    media: [
      { type: 'video', url: 'https://www.youtube.com/watch?v=mNBmG24djoY', title: 'Pomodoro Technique explained' },
    ],
    duration: '10–20 min',
    difficulty: 'beginner',
    topic: 'time-management',
  },
]

