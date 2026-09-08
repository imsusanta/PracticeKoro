import { describe, it, expect } from 'vitest';
import {
  evaluateReAttempt,
  computeMistakesAnalytics,
  filterMistakes,
} from '../services/mistakesService';
import type { MistakeItem } from '../types/mistakes';

describe('Mistakes Engine & Analytics', () => {
  const sampleMistakes: MistakeItem[] = [
    {
      id: 'm-1',
      question_id: 'q-1',
      selected_answer: 'A',
      correct_answer: 'B',
      is_mastered: false,
      retry_count: 1,
      streak: 0,
      error_type: 'conceptual',
      student_notes: 'Must remember article 32 is soul of constitution',
      created_at: '2026-09-08T10:00:00Z',
      questions: {
        id: 'q-1',
        question_text: 'ভারতের সংবিধানের হৃদয় ও আত্মা কাকে বলা হয়?',
        option_a: 'অনুচ্ছেদ ১৯',
        option_b: 'অনুচ্ছেদ ৩২',
        option_c: 'অনুচ্ছেদ ২১',
        option_d: 'অনুচ্ছেদ ১৪',
        correct_answer: 'B',
        explanation: 'ড. বি. আর. আম্বেদকর অনুচ্ছেদ ৩২ কে সংবিধানের হৃদয় ও আত্মা বলেছেন।',
        subject: 'Indian Polity',
        topic: 'Fundamental Rights',
      },
    },
    {
      id: 'm-2',
      question_id: 'q-2',
      selected_answer: 'C',
      correct_answer: 'A',
      is_mastered: true,
      retry_count: 3,
      streak: 2,
      error_type: 'careless',
      student_notes: 'Read question too fast, missed district question',
      created_at: '2026-09-08T09:00:00Z',
      questions: {
        id: 'q-2',
        question_text: 'পশ্চিমবঙ্গের সবচেয়ে বড় জেলা কোনটি?',
        option_a: 'দক্ষিণ ২৪ পরগনা',
        option_b: 'উত্তর ২৪ পরগনা',
        option_c: 'পশ্চিম মেদিনীপুর',
        option_d: 'মুর্শিদাবাদ',
        correct_answer: 'A',
        explanation: 'দক্ষিণ ২৪ পরগনা পশ্চিমবঙ্গের বৃহত্তম জেলা।',
        subject: 'West Bengal GK',
        topic: 'Geography',
      },
    },
    {
      id: 'm-3',
      question_id: 'q-3',
      selected_answer: 'D',
      correct_answer: 'B',
      is_mastered: false,
      retry_count: 2,
      streak: 0,
      error_type: 'time_pressure',
      student_notes: null,
      created_at: '2026-09-08T08:00:00Z',
      questions: {
        id: 'q-3',
        question_text: 'ভারতের জাতীয় গান কোনটি?',
        option_a: 'জন গণ মন',
        option_b: 'বন্দে মাতরম্',
        option_c: 'সারে জাহাঁ সে আচ্ছা',
        option_d: 'আমার সোনার বাংলা',
        correct_answer: 'B',
        explanation: 'ভারতের জাতীয় গান হলো বঙ্কিমচন্দ্র চট্টোপাধ্যায়ের বন্দে মাতরম্।',
        subject: 'General Knowledge',
        topic: 'National Symbols',
      },
    },
    {
      id: 'm-4',
      question_id: 'q-4',
      selected_answer: 'B',
      correct_answer: 'C',
      is_mastered: false,
      retry_count: 1,
      streak: 0,
      error_type: 'conceptual',
      student_notes: null,
      created_at: '2026-09-08T07:00:00Z',
      questions: {
        id: 'q-4',
        question_text: 'ভারতীয় সংবিধানের কত নং ধারায় জরুরি অবস্থা বর্ণিত?',
        option_a: 'অনুচ্ছেদ ৩৫০',
        option_b: 'অনুচ্ছেদ ৩৫১',
        option_c: 'অনুচ্ছেদ ৩৫২',
        option_d: 'অনুচ্ছেদ ৩৬০',
        correct_answer: 'C',
        explanation: 'অনুচ্ছেদ ৩৫২ জাতীয় জরুরি অবস্থা নির্দেশ করে।',
        subject: 'Indian Polity',
        topic: 'Emergency Provisions',
      },
    },
  ];

  it('evaluates correct re-attempt: increments streak and marks as mastered', () => {
    const mistake = sampleMistakes[0]; // correct_answer is 'B'
    const result = evaluateReAttempt(mistake, 'B');

    expect(result.isCorrect).toBe(true);
    expect(result.newStreak).toBe(1);
    expect(result.isMastered).toBe(true);
    expect(result.retryCount).toBe(2);
  });

  it('evaluates incorrect re-attempt: resets streak and retains unmastered status', () => {
    const mistake = sampleMistakes[0]; // correct_answer is 'B'
    const result = evaluateReAttempt(mistake, 'C');

    expect(result.isCorrect).toBe(false);
    expect(result.newStreak).toBe(0);
    expect(result.isMastered).toBe(false);
    expect(result.retryCount).toBe(2);
  });

  it('computes analytics correctly including mastery rate, error distribution, and weakest subject', () => {
    const analytics = computeMistakesAnalytics(sampleMistakes);

    expect(analytics.totalMistakes).toBe(4);
    expect(analytics.masteredMistakes).toBe(1);
    expect(analytics.activeMistakes).toBe(3);
    expect(analytics.masteryRate).toBe(25); // 1 / 4 = 25%

    // Error type distribution: 2 conceptual, 1 careless, 1 time_pressure
    expect(analytics.errorTypeBreakdown.conceptual.count).toBe(2);
    expect(analytics.errorTypeBreakdown.conceptual.percentage).toBe(50);
    expect(analytics.errorTypeBreakdown.careless.count).toBe(1);
    expect(analytics.errorTypeBreakdown.time_pressure.count).toBe(1);

    // Weakest subject among active mistakes is Indian Polity (2 active mistakes)
    expect(analytics.weakestSubject).toBe('Indian Polity');
  });

  it('filters mistakes by error type', () => {
    const conceptualOnly = filterMistakes(sampleMistakes, { errorType: 'conceptual' });
    expect(conceptualOnly.length).toBe(2);
    expect(conceptualOnly.every((m) => m.error_type === 'conceptual')).toBe(true);

    const carelessOnly = filterMistakes(sampleMistakes, { errorType: 'careless' });
    expect(carelessOnly.length).toBe(1);
    expect(carelessOnly[0].id).toBe('m-2');
  });

  it('filters mistakes by status and search query across questions and notes', () => {
    const activeOnly = filterMistakes(sampleMistakes, { status: 'active' });
    expect(activeOnly.length).toBe(3);

    const searchResult = filterMistakes(sampleMistakes, { searchQuery: 'soul of constitution' });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].id).toBe('m-1');
  });
});
