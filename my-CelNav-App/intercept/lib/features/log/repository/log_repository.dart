// Placeholder repository; wire to sqflite in later step.
import '../models/sight.dart';

abstract class LogRepository {
  Future<void> save(SightRecord record);
  Future<List<SightRecord>> list();
}

class InMemoryLogRepository implements LogRepository {
  final _items = <SightRecord>[];
  @override
  Future<void> save(SightRecord record) async {
    _items.add(record);
  }

  @override
  Future<List<SightRecord>> list() async => List.unmodifiable(_items);
}

