// Kịch bản kiểm thử tải k6: Giả lập hiệu ứng bầy đàn (Thundering Herd) lúc mở đề & nộp bài
// Cài k6: https://k6.io  |  Chạy: k6 run tests/load/exam-thundering-herd.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 200 },   // Khởi động 200 học sinh đồng thời
    { duration: '30s', target: 1000 },  // Tăng vọt lên 1.000 học sinh cùng lúc trên 1 máy dev
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'],   // 95% request phải dưới 150ms
    http_req_failed: ['rate<0.01'],     // Tỷ lệ lỗi < 1%
  },
};

const BASE_URL = __ENV.CORE_API_URL || 'http://localhost:8080';
const EXAM_ID = 'exam-toan-12-thpt-2025';

export default function () {
  const userId = `student-${__VU}-${__ITER}`;

  // 1. Tải gói đề đã mã hóa (CDN-cacheable)
  const bundleRes = http.get(`${BASE_URL}/api/v1/exams/${EXAM_ID}/bundle`);
  check(bundleRes, { 'bundle 200': (r) => r.status === 200 });

  // 2. Bắt đầu thi & nhận khóa giải mã AES-256-GCM
  const startRes = http.post(
    `${BASE_URL}/api/v1/exams/${EXAM_ID}/start`,
    JSON.stringify({ user_id: userId, user_name: `Học sinh ${__VU}` }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(startRes, { 'start 200': (r) => r.status === 200 });
  const startData = startRes.json();
  if (!startData || !startData.attempt_id) return;

  // 3. Giả lập lưu nháp có jitter
  sleep(Math.random() * 0.5);
  http.patch(
    `${BASE_URL}/api/v1/attempts/${startData.attempt_id}/autosave`,
    JSON.stringify({ answers: { 'q-12-1': 'A', 'q-12-2': 'B' } }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  // 4. Nộp bài bất đồng bộ (202 Accepted)
  const submitRes = http.post(
    `${BASE_URL}/api/v1/attempts/${startData.attempt_id}/submit`,
    JSON.stringify({
      answers: {
        'q-12-1': 'B',
        'q-12-2': 'A',
        'q-12-3': { a: true, b: true, c: false, d: true },
        'q-12-4': '4',
      },
      cheat_flags: [],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `idem-${startData.attempt_id}`,
      },
    }
  );
  check(submitRes, { 'submit 202': (r) => r.status === 202 });
}
