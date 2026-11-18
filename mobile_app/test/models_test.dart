import 'package:flutter_test/flutter_test.dart';
import 'package:diplomabondhu/features/auth/data/user.dart';
import 'package:diplomabondhu/features/exams/data/exam.dart';
import 'package:diplomabondhu/features/library/data/material.dart';
import 'package:diplomabondhu/features/planner/data/planner_models.dart';

void main() {
  group('User.fromJson', () {
    test('parses _id key from mongo lean docs', () {
      final user = User.fromJson({
        '_id': 'u1',
        'name': 'Rahim',
        'email': 'r@example.com',
        'role': 'student',
        'status': 'active',
        'prefs': {'language': 'bn', 'theme': 'dark'},
        'academic': {
          'instituteId': 'i1',
          'semesterNumber': 3,
        },
      });
      expect(user.id, 'u1');
      expect(user.isStudent, true);
      expect(user.prefs.language, 'bn');
      expect(user.academic?.semesterNumber, 3);
    });

    test('tolerates missing optional fields', () {
      final user = User.fromJson({'_id': 'u2'});
      expect(user.name, '');
      expect(user.role, 'student');
      expect(user.academic, isNull);
    });

    test('flags non-student roles', () {
      final user = User.fromJson({'_id': 'u3', 'role': 'admin'});
      expect(user.isStudent, false);
    });
  });

  group('Exam model', () {
    test('questionCount falls back to questionIds length', () {
      final exam = Exam.fromJson({
        '_id': 'e1',
        'title': 'Model Test 1',
        'questionIds': ['q1', 'q2', 'q3'],
      });
      expect(exam.questionCount, 3);
    });

    test('uses explicit questionCount when present', () {
      final exam = Exam.fromJson({
        '_id': 'e1',
        'title': 'Model Test 1',
        'questionCount': 10,
        'questionIds': ['q1'],
      });
      expect(exam.questionCount, 10);
    });
  });

  group('Material model', () {
    test('parses _id and type', () {
      final m = Material.fromJson({
        '_id': 'm1',
        'title': 'Chapter 1 PDF',
        'type': 'book',
      });
      expect(m.id, 'm1');
      expect(m.type, 'book');
      expect(m.title, 'Chapter 1 PDF');
    });
  });

  group('Task model', () {
    test('isDone reflects status', () {
      final done = Task.fromJson({'_id': 't1', 'title': 'A', 'status': 'done'});
      final todo = Task.fromJson({'_id': 't2', 'title': 'B', 'status': 'todo'});
      expect(done.isDone, true);
      expect(todo.isDone, false);
    });
  });
}
