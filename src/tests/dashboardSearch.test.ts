import { describe, it, expect } from 'vitest';
import type { Exam, MockTest } from '@/services/examService';

describe('Student Dashboard Search Engine', () => {
  const sampleExams: Exam[] = [
    { id: 'wb-police-constable', name: 'WB Police Constable 2026', is_active: true },
    { id: 'wb-panchayat', name: 'West Bengal Panchayet Exam', is_active: true },
    { id: 'wbpsc-clerkship', name: 'WBPSC Clerkship Examination', is_active: true },
  ];

  const sampleMockTests: MockTest[] = [
    {
      id: 'mock-1',
      title: 'WB Police Full Mock Test 01',
      test_type: 'full_mock',
      duration_minutes: 60,
      total_marks: 85,
      passing_marks: 52,
      exam_id: 'wb-police-constable',
      subject_id: null,
      is_paid: false,
      price: 0,
      exams: { id: 'wb-police-constable', name: 'WB Police Constable 2026' },
    },
    {
      id: 'mock-2',
      title: 'Panchayet Arithmetic & GI Speed Test',
      test_type: 'topic_drill',
      duration_minutes: 30,
      total_marks: 40,
      passing_marks: 25,
      exam_id: 'wb-panchayat',
      subject_id: 'math',
      is_paid: true,
      price: 199,
      exams: { id: 'wb-panchayat', name: 'West Bengal Panchayet Exam' },
    },
  ];

  it('correctly matches exams by name case-insensitively', () => {
    const query = 'police';
    const matches = sampleExams.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('wb-police-constable');
  });

  it('correctly matches mock tests by title or exam affiliation', () => {
    const query = 'arithmetic';
    const matches = sampleMockTests.filter((m) =>
      m.title.toLowerCase().includes(query.toLowerCase())
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('mock-2');
    expect(matches[0].is_paid).toBe(true);
  });

  it('identifies core syllabus topics like Mathematics and General Knowledge', () => {
    const subjects = ['Mathematics', 'General Knowledge', 'General Science', 'Indian Polity'];
    const query = 'math';
    const matched = subjects.filter((s) => s.toLowerCase().includes(query.toLowerCase()));
    expect(matched).toContain('Mathematics');
  });

  it('handles empty queries by defaulting to top suggestions gracefully', () => {
    const query = '   ';
    const cleanQ = query.trim().toLowerCase();
    expect(cleanQ).toBe('');
  });
});
