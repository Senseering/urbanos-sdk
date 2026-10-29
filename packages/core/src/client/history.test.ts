import { expect, it } from 'vitest';
import { walkHistory, type HistoryPage } from './history';
const from = '2026-01-01T00:00:00.000000123Z',
  mid = '2026-01-01T01:00:00.000000123Z',
  until = '2026-01-01T02:00:00.000000123Z';
const path = '/v1/streams/11/observations';
const next = path + '?' + new URLSearchParams({ from: mid, until, page_duration: '1h' }).toString();
function pages(): HistoryPage[] {
  return [
    { stream_id: 11, covered_from: from, covered_until: mid, points: [], next },
    {
      stream_id: 11,
      covered_from: mid,
      covered_until: until,
      points: [{ timestamp: mid, value: 'text' }],
    },
  ];
}
it('advances over empty windows, preserves nanoseconds and never prefetches', async () => {
  let calls = 0;
  const responses = pages();
  const iterator = walkHistory('https://example.test', 11, { from, until }, () =>
    Promise.resolve(responses[calls++]!),
  );
  expect(calls).toBe(0);
  expect((await iterator.next()).value?.points).toEqual([]);
  expect(calls).toBe(1);
  expect((await iterator.next()).value?.points[0]?.timestamp).toBe(mid);
  expect(calls).toBe(2);
  expect((await iterator.next()).done).toBe(true);
});
it.each([
  'https://attacker.test' + next,
  path.replace('11', '12') +
    '?' +
    new URLSearchParams({ from: mid, until, page_duration: '1h' }).toString(),
  path + '?' + new URLSearchParams({ from, until, page_duration: '1h' }).toString(),
  next + '&api_key=bad',
])('rejects unsafe or non-advancing continuation %s', async (unsafe) => {
  let calls = 0;
  const response = pages()[0]!;
  response.next = unsafe;
  const iterator = walkHistory('https://example.test', 11, { from, until }, () => {
    calls++;
    return Promise.resolve(response);
  });
  await expect(iterator.next()).rejects.toMatchObject({ status: 502 });
  expect(calls).toBe(1);
});
it('requires full coverage and does not turn upstream failure into an empty interval', async () => {
  const response = pages()[0]!;
  delete response.next;
  await expect(
    walkHistory('https://example.test', 11, { from, until }, () =>
      Promise.resolve(response),
    ).next(),
  ).rejects.toMatchObject({ status: 502 });
  const error = new Error('upstream failed');
  await expect(
    walkHistory('https://example.test', 11, { from, until }, () => Promise.reject(error)).next(),
  ).rejects.toBe(error);
});
