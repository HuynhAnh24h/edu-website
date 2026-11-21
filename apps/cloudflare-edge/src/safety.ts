import { JwtClaims } from "./crypto";

type JsonFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

export type SafetyCategory =
  | "sexual_harassment"
  | "violence"
  | "impersonation"
  | "low_quality_lesson";

export interface SafetyScanResult {
  flagged: boolean;
  blockImmediately: boolean;
  category: SafetyCategory | null;
  severity: "critical" | "high" | "medium" | "low";
  matchedKeywords: string[];
  reason: string;
}

function normalizeVietnamese(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

const SEXUAL_HARASSMENT_PATTERNS = [
  "gui anh nong",
  "anh nong",
  "anh khoa than",
  "coi do",
  "quan he tinh duc",
  "lam tinh",
  "quay roi tinh duc",
  "dam o",
  "hiep dam",
  "xam hai",
  "ga gam",
  "chat sex",
  "show hang",
  "khoe than",
  "clip nong",
  "video 18+",
  "web 18+",
  "link 18+",
  "ngu voi thay",
  "di khach san voi thay",
  "di nha nghi",
  "so mo",
  "cham vung nhay cam",
  "nude",
  "send nudes",
  "porn",
  "sex chat",
];

const VIOLENCE_PATTERNS = [
  "giet may",
  "giet chet",
  "chem chet",
  "dam chet",
  "danh chet",
  "mang dao",
  "mang sung",
  "danh hoi dong",
  "chan danh",
  "xu dep",
  "bao luc hoc duong",
  "tu sat di",
  "tu tu di",
  "cat tay",
  "dot truong",
  "dat bom",
  "khung bo",
  "doa giet",
  "kill you",
  "murder",
];

const IMPERSONATION_PATTERNS = [
  "chuyen khoan hoc phi rieng",
  "chuyen tien vao stk ca nhan",
  "toi la hieu truong",
  "ban de thi that",
  "mua diem thi",
  "lo de thi quoc gia",
  "chuyen khoan gap de nhan bang",
];

const OUTDATED_LESSON_PATTERNS = [
  "chuong trinh cu 2006",
  "sgk cu 2006",
  "giao an cu nam 2010",
  "copy paste",
  "tai lieu rac",
  "test linh tinh",
  "asdfgh",
  "qwerty",
];

export function scanContentWithSafetyBot(
  rawText: string,
  options?: { isLesson?: boolean }
): SafetyScanResult {
  const norm = normalizeVietnamese(rawText);

  const sexHits = SEXUAL_HARASSMENT_PATTERNS.filter((p) => norm.includes(p));
  if (sexHits.length > 0) {
    return {
      flagged: true,
      blockImmediately: true,
      category: "sexual_harassment",
      severity: "critical",
      matchedKeywords: sexHits,
      reason:
        "BOT Quét An toàn phát hiện dấu hiệu quấy rối tình dục / gạ gẫm / nội dung nhạy cảm nghiêm trọng.",
    };
  }

  const vioHits = VIOLENCE_PATTERNS.filter((p) => norm.includes(p));
  if (vioHits.length > 0) {
    return {
      flagged: true,
      blockImmediately: true,
      category: "violence",
      severity: "critical",
      matchedKeywords: vioHits,
      reason:
        "BOT Quét An toàn phát hiện nội dung bạo lực, đe dọa tính mạng hoặc bắt nạt nghiêm trọng.",
    };
  }

  const impHits = IMPERSONATION_PATTERNS.filter((p) => norm.includes(p));
  if (impHits.length > 0) {
    return {
      flagged: true,
      blockImmediately: false,
      category: "impersonation",
      severity: "high",
      matchedKeywords: impHits,
      reason:
        "BOT phát hiện dấu hiệu mạo danh giáo viên / lừa đảo thu tiền học phí hoặc mua bán đề thi trái phép.",
    };
  }

  if (options?.isLesson) {
    const oldHits = OUTDATED_LESSON_PATTERNS.filter((p) => norm.includes(p));
    if (oldHits.length > 0 || norm.length < 24) {
      return {
        flagged: true,
        blockImmediately: false,
        category: "low_quality_lesson",
        severity: "medium",
        matchedKeywords: oldHits.length > 0 ? oldHits : ["noi_dung_qua_so_sai"],
        reason:
          "BOT kiểm định chất lượng phát hiện giáo án quá sơ sài hoặc sử dụng nội dung/chương trình cũ lạc hậu.",
      };
    }
  }

  return {
    flagged: false,
    blockImmediately: false,
    category: null,
    severity: "low",
    matchedKeywords: [],
    reason: "",
  };
}

function isAdminRole(role?: string): boolean {
  return role === "super_admin" || role === "content_admin";
}

function isTeacherOrAdmin(role?: string): boolean {
  return role === "teacher" || role === "content_admin" || role === "super_admin";
}

export async function notifyAdmins(
  db: D1Database,
  title: string,
  message: string,
  link = "/quan-tri"
): Promise<void> {
  const admins = await db
    .prepare("SELECT id FROM users WHERE role IN ('super_admin', 'content_admin') AND is_active = 1")
    .all<{ id: string }>();

  const stmts = admins.results.map((a) =>
    db
      .prepare(
        "INSERT INTO user_notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'safety_alert', ?, ?, ?)"
      )
      .bind(
        `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        a.id,
        title,
        message,
        link
      )
  );
  if (stmts.length > 0) await db.batch(stmts);
}

export async function notifyUser(
  db: D1Database,
  userId: string,
  type: string,
  title: string,
  message: string,
  link = ""
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO user_notifications (id, user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(
      `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type,
      title,
      message,
      link
    )
    .run();
}

export async function createSafetyIncident(
  db: D1Database,
  params: {
    category: SafetyCategory;
    severity: "critical" | "high" | "medium" | "low";
    source_type: string;
    source_id?: string;
    suspect_user_id: string;
    suspect_name: string;
    suspect_email?: string;
    suspect_role?: string;
    reporter_id?: string;
    reporter_name?: string;
    matched_keywords?: string[];
    content_snapshot: string;
    context?: Record<string, unknown>;
  }
): Promise<{ id: string; incident_code: string }> {
  const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const code = `EDU-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  let email = params.suspect_email || "";
  let role = params.suspect_role || "student";
  if (!email && params.suspect_user_id) {
    const u = await db
      .prepare("SELECT email, role FROM users WHERE id = ?")
      .bind(params.suspect_user_id)
      .first<{ email: string; role: string }>();
    if (u) {
      email = u.email;
      role = u.role;
    }
  }

  await db
    .prepare(
      `INSERT INTO safety_incidents (id, incident_code, category, severity, status, source_type, source_id, suspect_user_id, suspect_name, suspect_email, suspect_role, reporter_id, reporter_name, matched_keywords, content_snapshot, context_json)
       VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      code,
      params.category,
      params.severity,
      params.source_type,
      params.source_id || "",
      params.suspect_user_id,
      params.suspect_name,
      email,
      role,
      params.reporter_id || "safety_bot",
      params.reporter_name || "BOT Quét An toàn EduK12",
      (params.matched_keywords || []).join(", "),
      params.content_snapshot.slice(0, 4000),
      JSON.stringify(params.context || {})
    )
    .run();

  const catLabel: Record<SafetyCategory, string> = {
    sexual_harassment: "QUẤY RỐI TÌNH DỤC / XÂM HẠI (KHẨN CẤP)",
    violence: "BẠO LỰC / ĐE DỌA (KHẨN CẤP)",
    impersonation: "MẠO DANH GIÁO VIÊN / LỪA ĐẢO",
    low_quality_lesson: "GIÁO ÁN CŨ / KÉM CHẤT LƯỢNG",
  };

  await notifyAdmins(
    db,
    `[CẢNH BÁO ${code}] ${catLabel[params.category]}`,
    `Đối tượng: ${params.suspect_name} (${email || params.suspect_user_id}). Nguồn: ${params.source_type}. Vui lòng vào Trung tâm An toàn để gửi thông báo khóa tài khoản và xuất hồ sơ bằng chứng.`,
    "/quan-tri"
  );

  return { id, incident_code: code };
}

function makeRoomKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

function buildEvidenceReportText(
  inc: Record<string, unknown>,
  recentMessages: Record<string, unknown>[]
): string {
  const vnNow = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const lines = [
    "======================================================================",
    "HỒ SƠ BẰNG CHỨNG VI PHẠM AN TOÀN MẠNG & BẢO VỆ HỌC SINH — EDUK12 OPEN",
    "======================================================================",
    `Mã hồ sơ vụ việc   : ${inc.incident_code}`,
    `Thời điểm xuất     : ${vnNow} (UTC: ${new Date().toISOString()})`,
    `Thời điểm ghi nhận : ${inc.created_at}`,
    `Loại vi phạm       : ${inc.category}`,
    `Mức độ nghiêm trọng: ${String(inc.severity).toUpperCase()}`,
    `Nguồn phát hiện    : ${inc.source_type} (ID nguồn: ${inc.source_id || "N/A"})`,
    `Đơn vị phát hiện   : ${inc.reporter_name} (${inc.reporter_id})`,
    "",
    "--- 1. THÔNG TIN ĐỊNH DANH TÀI KHOẢN VI PHẠM ---",
    `User ID            : ${inc.suspect_user_id}`,
    `Họ và tên          : ${inc.suspect_name}`,
    `Email đăng ký      : ${inc.suspect_email || "Không rõ"}`,
    `Vai trò tài khoản  : ${inc.suspect_role}`,
    `Từ khóa BOT bắt    : ${inc.matched_keywords || "Báo cáo trực tiếp từ người dùng"}`,
    "",
    "--- 2. NGUYÊN VĂN NỘI DUNG VI PHẠM (BẰNG CHỨNG BẤT BIẾN) ---",
    String(inc.content_snapshot || ""),
    "",
    "--- 3. NGỮ CẢNH & LỊCH SỬ TRÒ CHUYỆN LIÊN QUAN ---",
  ];

  if (recentMessages.length === 0) {
    lines.push("(Không có tin nhắn chat bổ sung)");
  } else {
    for (const m of recentMessages) {
      lines.push(
        `[${m.created_at}] ${m.sender_name} (${m.sender_role}) -> ${m.receiver_name}: ${m.content}${
          Number(m.is_flagged) === 1 ? " [ĐÃ BỊ BOT ĐÁNH DẤU]" : ""
        }`
      );
    }
  }

  lines.push(
    "",
    "--- 4. BIỆN PHÁP XỬ LÝ CỦA QUẢN TRỊ VIÊN HỆ THỐNG ---",
    `Hành động đã áp dụng: ${inc.penalty_action || "Đã gửi thông báo khóa tài khoản & khóa truy cập"}`,
    `Ghi chú Quản trị viên: ${inc.admin_note || "Chuyển hồ sơ bằng chứng cho Cơ quan Công an xác minh xử lý theo quy định pháp luật."}`,
    "======================================================================",
    "Lưu ý: Biên bản này được trích xuất nguyên trạng từ cơ sở dữ liệu hệ thống EduK12 Open."
  );

  return lines.join("\n");
}

export async function handleSafetyAndChatRoutes(
  request: Request,
  db: D1Database,
  path: string,
  method: string,
  url: URL,
  claims: JwtClaims | null,
  jsonRes: JsonFn
): Promise<Response | null> {
  // Kiểm tra tài khoản đã bị khóa giữa chừng hay chưa cho các hành động ghi
  const verifyActiveUser = async (uid: string) => {
    const u = await db
      .prepare("SELECT id, email, full_name, role, current_grade, school_name, is_active FROM users WHERE id = ?")
      .bind(uid)
      .first<{
        id: string;
        email: string;
        full_name: string;
        role: string;
        current_grade: number | null;
        school_name: string;
        is_active: number;
      }>();
    return u;
  };

  // =========================================================================
  // A. CHAT TRỰC TUYẾN 1-1 HỌC SINH <-> GIÁO VIÊN (CÓ BOT QUÉT REAL-TIME)
  // =========================================================================
  if (path === "/api/v1/chat/contacts" && method === "GET") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để sử dụng Chat trực tuyến" }, 401);

    const peers = await db
      .prepare(
        `SELECT id, full_name, email, role, school_name, current_grade
         FROM users
         WHERE id != ? AND is_active = 1
         ORDER BY CASE
           WHEN role = 'teacher' THEN 0
           WHEN role IN ('super_admin', 'content_admin') THEN 1
           ELSE 2
         END, full_name ASC
         LIMIT 50`
      )
      .bind(claims.uid)
      .all<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        school_name: string;
        current_grade: number | null;
      }>();

    const myMessages = await db
      .prepare(
        `SELECT sender_id, receiver_id, content, created_at
         FROM direct_messages
         WHERE sender_id = ? OR receiver_id = ?
         ORDER BY created_at DESC
         LIMIT 200`
      )
      .bind(claims.uid, claims.uid)
      .all<{ sender_id: string; receiver_id: string; content: string; created_at: string }>();

    const lastMsgMap = new Map<string, { content: string; created_at: string }>();
    for (const m of myMessages.results) {
      const peerId = m.sender_id === claims.uid ? m.receiver_id : m.sender_id;
      if (!lastMsgMap.has(peerId)) {
        lastMsgMap.set(peerId, { content: m.content, created_at: m.created_at });
      }
    }

    const contacts = peers.results
      .map((p) => ({
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        school_name: p.school_name || "",
        current_grade: p.current_grade,
        last_message: lastMsgMap.get(p.id)?.content || "",
        last_at: lastMsgMap.get(p.id)?.created_at || "",
      }))
      .sort((a, b) => {
        if (a.last_at && !b.last_at) return -1;
        if (!a.last_at && b.last_at) return 1;
        if (a.last_at && b.last_at) return b.last_at.localeCompare(a.last_at);
        return 0;
      });

    return jsonRes({ contacts });
  }

  if (path === "/api/v1/chat/messages" && method === "GET") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const peerId = (url.searchParams.get("peer_id") || "").trim();
    if (!peerId) return jsonRes({ messages: [] });

    const roomKey = makeRoomKey(claims.uid, peerId);
    const rows = await db
      .prepare(
        `SELECT id, sender_id, sender_name, sender_role, receiver_id, receiver_name, content, is_flagged, is_blocked, created_at
         FROM direct_messages
         WHERE room_key = ?
         ORDER BY created_at ASC
         LIMIT 120`
      )
      .bind(roomKey)
      .all();

    return jsonRes({ messages: rows.results });
  }

  if (path === "/api/v1/chat/messages" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để nhắn tin" }, 401);
    const me = await verifyActiveUser(claims.uid);
    if (!me || Number(me.is_active) === 0) {
      return jsonRes({ error: "Tài khoản của bạn đang bị tạm khóa do vi phạm quy định an toàn." }, 403);
    }

    const body = (await request.json().catch(() => ({}))) as { receiver_id?: string; content?: string };
    const receiverId = (body.receiver_id || "").trim();
    const content = (body.content || "").trim();
    if (!receiverId || !content) {
      return jsonRes({ error: "Vui lòng chọn người nhận và nhập nội dung tin nhắn." }, 400);
    }

    const peer = await db
      .prepare("SELECT id, full_name, role FROM users WHERE id = ?")
      .bind(receiverId)
      .first<{ id: string; full_name: string; role: string }>();
    if (!peer) return jsonRes({ error: "Không tìm thấy người nhận." }, 404);

    const roomKey = makeRoomKey(me.id, peer.id);
    const msgId = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // === BOT QUÉT AN TOÀN TỰ ĐỘNG TRÊN MỌI TIN NHẮN CHAT ===
    const scan = scanContentWithSafetyBot(content);
    if (scan.flagged && scan.category) {
      const inc = await createSafetyIncident(db, {
        category: scan.category,
        severity: scan.severity,
        source_type: "direct_chat",
        source_id: msgId,
        suspect_user_id: me.id,
        suspect_name: me.full_name,
        suspect_email: me.email,
        suspect_role: me.role,
        matched_keywords: scan.matchedKeywords,
        content_snapshot: content,
        context: {
          room_key: roomKey,
          receiver_id: peer.id,
          receiver_name: peer.full_name,
          receiver_role: peer.role,
        },
      });

      const displayedContent = scan.blockImmediately
        ? "[BOT An toàn EduK12 đã chặn tin nhắn chứa dấu hiệu bạo lực/quấy rối và tự động gửi hồ sơ cảnh báo về Quản trị viên]"
        : content.slice(0, 2000);

      await db
        .prepare(
          `INSERT INTO direct_messages (id, room_key, sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content, is_flagged, flag_reason, is_blocked)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        )
        .bind(
          msgId,
          roomKey,
          me.id,
          me.full_name,
          me.role,
          peer.id,
          peer.full_name,
          peer.role,
          displayedContent,
          scan.reason,
          scan.blockImmediately ? 1 : 0
        )
        .run();

      return jsonRes(
        {
          blocked: scan.blockImmediately,
          flagged: true,
          incident_code: inc.incident_code,
          warning: `${scan.reason} Mã hồ sơ cảnh báo ${inc.incident_code} đã được chuyển tới Quản trị viên hệ thống!`,
          message: {
            id: msgId,
            sender_id: me.id,
            sender_name: me.full_name,
            sender_role: me.role,
            receiver_id: peer.id,
            receiver_name: peer.full_name,
            content: displayedContent,
            is_flagged: 1,
            is_blocked: scan.blockImmediately ? 1 : 0,
            created_at: new Date().toISOString(),
          },
        },
        201
      );
    }

    await db
      .prepare(
        `INSERT INTO direct_messages (id, room_key, sender_id, sender_name, sender_role, receiver_id, receiver_name, receiver_role, content)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(msgId, roomKey, me.id, me.full_name, me.role, peer.id, peer.full_name, peer.role, content.slice(0, 2000))
      .run();

    return jsonRes(
      {
        blocked: false,
        flagged: false,
        message: {
          id: msgId,
          sender_id: me.id,
          sender_name: me.full_name,
          sender_role: me.role,
          receiver_id: peer.id,
          receiver_name: peer.full_name,
          content: content.slice(0, 2000),
          is_flagged: 0,
          is_blocked: 0,
          created_at: new Date().toISOString(),
        },
      },
      201
    );
  }

  // =========================================================================
  // B. SẢN PHẨM PHẦN MỀM & BÀI VIẾT HỌC SINH + GIÁO VIÊN ĐÁNH GIÁ CHẤM ĐIỂM
  // =========================================================================
  if (path === "/api/v1/showcase" && method === "GET") {
    const typeFilter = url.searchParams.get("type") || "all";
    const where = ["status = 'published'"];
    const params: unknown[] = [];
    if (typeFilter === "software_project" || typeFilter === "student_article") {
      where.push("submission_type = ?");
      params.push(typeFilter);
    }

    const [subs, revs] = await Promise.all([
      db
        .prepare(`SELECT * FROM student_submissions WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT 50`)
        .bind(...params)
        .all<Record<string, unknown>>(),
      db
        .prepare("SELECT * FROM student_submission_reviews ORDER BY created_at DESC")
        .all<Record<string, unknown>>(),
    ]);

    const revBySub = new Map<string, Record<string, unknown>[]>();
    for (const r of revs.results) {
      const sid = String(r.submission_id);
      const list = revBySub.get(sid) || [];
      list.push(r);
      revBySub.set(sid, list);
    }

    const submissions = subs.results.map((s) => {
      const id = String(s.id);
      const reviews = revBySub.get(id) || [];
      const avgScore =
        reviews.length > 0
          ? Math.round((reviews.reduce((acc, r) => acc + Number(r.score || 0), 0) / reviews.length) * 10) / 10
          : null;
      return {
        ...s,
        reviews,
        review_count: reviews.length,
        avg_score: avgScore,
      };
    });

    return jsonRes({ submissions });
  }

  if (path === "/api/v1/showcase" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để đăng bài viết hoặc sản phẩm phần mềm." }, 401);
    const me = await verifyActiveUser(claims.uid);
    if (!me || Number(me.is_active) === 0) {
      return jsonRes({ error: "Tài khoản đang bị tạm khóa." }, 403);
    }

    const body = (await request.json().catch(() => ({}))) as {
      submission_type?: "software_project" | "student_article";
      subject_name?: string;
      title?: string;
      description?: string;
      demo_url?: string;
      repo_url?: string;
      tech_stack?: string;
    };

    const title = (body.title || "").trim();
    const description = (body.description || "").trim();
    if (title.length < 4 || description.length < 10) {
      return jsonRes({ error: "Vui lòng nhập đầy đủ tiêu đề và mô tả sản phẩm / bài viết." }, 400);
    }

    const scan = scanContentWithSafetyBot(`${title}\n${description}`);
    if (scan.blockImmediately && scan.category) {
      const inc = await createSafetyIncident(db, {
        category: scan.category,
        severity: scan.severity,
        source_type: "student_showcase",
        suspect_user_id: me.id,
        suspect_name: me.full_name,
        suspect_email: me.email,
        suspect_role: me.role,
        matched_keywords: scan.matchedKeywords,
        content_snapshot: `${title}\n\n${description}`,
      });
      return jsonRes(
        {
          error: `${scan.reason} Bài đăng đã bị chặn và gửi cảnh báo (${inc.incident_code}) cho Quản trị viên.`,
        },
        400
      );
    }

    const cleanUrl = (u?: string) => {
      const s = (u || "").trim().slice(0, 300);
      return s.startsWith("/") || /^https?:\/\//i.test(s) ? s : "";
    };

    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const subType = body.submission_type === "student_article" ? "student_article" : "software_project";

    await db
      .prepare(
        `INSERT INTO student_submissions (id, student_id, student_name, student_grade, student_school, submission_type, subject_name, title, description, demo_url, repo_url, tech_stack, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
      )
      .bind(
        id,
        me.id,
        me.full_name,
        me.current_grade || 12,
        me.school_name || "",
        subType,
        (body.subject_name || (subType === "software_project" ? "Tin học / Lập trình" : "Học thuật")).slice(0, 80),
        title.slice(0, 180),
        description.slice(0, 4000),
        cleanUrl(body.demo_url),
        cleanUrl(body.repo_url),
        (body.tech_stack || "").trim().slice(0, 140)
      )
      .run();

    return jsonRes({ id, message: "Đã đăng bài viết / sản phẩm thành công! Thầy cô đã có thể vào xem và đánh giá." }, 201);
  }

  const revMatch = path.match(/^\/api\/v1\/showcase\/([^/]+)\/reviews$/);
  if (revMatch && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    if (!isTeacherOrAdmin(claims.role)) {
      return jsonRes({ error: "Chỉ Giáo viên & Quản trị viên mới được gửi Đánh giá & Chấm điểm sản phẩm học sinh." }, 403);
    }
    const subId = decodeURIComponent(revMatch[1]);
    const sub = await db
      .prepare("SELECT id, student_id, title FROM student_submissions WHERE id = ?")
      .bind(subId)
      .first<{ id: string; student_id: string; title: string }>();
    if (!sub) return jsonRes({ error: "Không tìm thấy bài viết / sản phẩm" }, 404);

    const body = (await request.json().catch(() => ({}))) as {
      score?: number;
      badge?: string;
      feedback?: string;
    };
    const score = Math.min(10, Math.max(1, Number(body.score || 9)));
    const badge = (body.badge || "Tốt").trim().slice(0, 40);
    const feedback = (body.feedback || "").trim();
    if (feedback.length < 5) {
      return jsonRes({ error: "Vui lòng viết nhận xét góp ý chi tiết cho học sinh." }, 400);
    }

    const teacher = await verifyActiveUser(claims.uid);
    const revId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db
      .prepare(
        `INSERT INTO student_submission_reviews (id, submission_id, teacher_id, teacher_name, score, badge, feedback)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(revId, subId, claims.uid, teacher?.full_name || claims.name, score, badge, feedback.slice(0, 2000))
      .run();

    // Thông báo ngay cho học sinh khi thầy cô chấm điểm!
    await notifyUser(
      db,
      sub.student_id,
      "review",
      `Thầy/Cô vừa đánh giá sản phẩm của em (${score}/10 — ${badge})`,
      `${teacher?.full_name || "Giáo viên"} đã nhận xét bài "${sub.title}": ${feedback.slice(0, 140)}`,
      "/cong-dong"
    );

    return jsonRes({ id: revId, message: "Đã gửi đánh giá & thông báo tới học sinh!" }, 201);
  }

  const subDelMatch = path.match(/^\/api\/v1\/showcase\/([^/]+)$/);
  if (subDelMatch && method === "DELETE") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập" }, 401);
    const subId = decodeURIComponent(subDelMatch[1]);
    const sub = await db
      .prepare("SELECT student_id FROM student_submissions WHERE id = ?")
      .bind(subId)
      .first<{ student_id: string }>();
    if (!sub) return jsonRes({ error: "Không tìm thấy sản phẩm" }, 404);
    if (sub.student_id !== claims.uid && !isAdminRole(claims.role)) {
      return jsonRes({ error: "Bạn không có quyền xóa mục này" }, 403);
    }
    await db.batch([
      db.prepare("DELETE FROM student_submission_reviews WHERE submission_id = ?").bind(subId),
      db.prepare("DELETE FROM student_submissions WHERE id = ?").bind(subId),
    ]);
    return jsonRes({ ok: true });
  }

  // =========================================================================
  // C. BÁO CÁO VI PHẠM (MẠO DANH GIÁO VIÊN / GIÁO ÁN KÉM / BẠO LỰC / QUẤY RỐI)
  // =========================================================================
  if (path === "/api/v1/safety/report" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập để gửi báo cáo vi phạm" }, 401);
    const body = (await request.json().catch(() => ({}))) as {
      category?: SafetyCategory;
      source_type?: string;
      source_id?: string;
      suspect_user_id?: string;
      suspect_name?: string;
      content_snapshot?: string;
      reason?: string;
    };

    const allowed: SafetyCategory[] = [
      "sexual_harassment",
      "violence",
      "impersonation",
      "low_quality_lesson",
    ];
    const category: SafetyCategory = allowed.includes(body.category as SafetyCategory)
      ? (body.category as SafetyCategory)
      : "impersonation";

    const severity: "critical" | "high" | "medium" =
      category === "sexual_harassment" || category === "violence"
        ? "critical"
        : category === "impersonation"
          ? "high"
          : "medium";

    const reporter = await verifyActiveUser(claims.uid);
    const inc = await createSafetyIncident(db, {
      category,
      severity,
      source_type: body.source_type || "user_report",
      source_id: body.source_id || "",
      suspect_user_id: body.suspect_user_id || "unknown",
      suspect_name: body.suspect_name || "Tài khoản bị báo cáo",
      reporter_id: claims.uid,
      reporter_name: reporter?.full_name || claims.name || "Thành viên báo cáo",
      matched_keywords: [category],
      content_snapshot: `[Lý do báo cáo]: ${(body.reason || "Vi phạm quy định cộng đồng").trim()}\n\n[Nội dung bằng chứng]:\n${(
        body.content_snapshot || ""
      ).trim()}`,
    });

    return jsonRes(
      {
        ok: true,
        incident_code: inc.incident_code,
        message: `Đã gửi báo cáo khẩn (${inc.incident_code}) tới Quản trị viên để xác minh và xử lý!`,
      },
      201
    );
  }

  // =========================================================================
  // D. TRUNG TÂM AN TOÀN & HÌNH PHẠT ADMIN (KHÓA ACC + XUẤT HỒ SƠ CÔNG AN)
  // =========================================================================
  if (path === "/api/v1/admin/safety/incidents" && method === "GET") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới được truy cập Trung tâm An toàn" }, 403);
    }

    const rows = await db
      .prepare(
        `SELECT s.*, u.is_active as suspect_is_active, u.role as suspect_current_role
         FROM safety_incidents s
         LEFT JOIN users u ON u.id = s.suspect_user_id
         ORDER BY
           CASE WHEN s.status = 'open' THEN 0 WHEN s.status = 'warned' THEN 1 ELSE 2 END,
           CASE WHEN s.severity = 'critical' THEN 0 WHEN s.severity = 'high' THEN 1 ELSE 2 END,
           s.created_at DESC
         LIMIT 100`
      )
      .all<Record<string, unknown>>();

    const incidents: Record<string, unknown>[] = rows.results.map((r) => ({
      ...r,
      suspect_is_active: Number(r.suspect_is_active ?? 1) === 1,
    }));

    const summary = {
      total: incidents.length,
      open_count: incidents.filter((i) => i.status === "open").length,
      critical_count: incidents.filter((i) => i.severity === "critical" && i.status === "open").length,
      locked_count: incidents.filter((i) => i.status === "locked" || i.status === "escalated_police").length,
      escalated_count: incidents.filter((i) => i.status === "escalated_police").length,
    };

    return jsonRes({ incidents, summary });
  }

  const actionMatch = path.match(/^\/api\/v1\/admin\/safety\/incidents\/([^/]+)\/action$/);
  if (actionMatch && method === "POST") {
    if (!claims || !isAdminRole(claims.role)) {
      return jsonRes({ error: "Chỉ Quản trị viên mới có quyền áp dụng hình phạt" }, 403);
    }
    const incId = decodeURIComponent(actionMatch[1]);
    const inc = await db
      .prepare("SELECT * FROM safety_incidents WHERE id = ?")
      .bind(incId)
      .first<Record<string, unknown>>();
    if (!inc) return jsonRes({ error: "Không tìm thấy hồ sơ vi phạm" }, 404);

    const body = (await request.json().catch(() => ({}))) as {
      action?: "warn" | "remove_lesson" | "revoke_impersonator" | "notify_and_lock" | "escalate_police" | "dismiss";
      admin_note?: string;
    };
    const action = body.action || "warn";
    const suspectId = String(inc.suspect_user_id || "");
    const incidentCode = String(inc.incident_code || "");
    const adminNote = (body.admin_note || "").trim();

    if (action === "warn") {
      await notifyUser(
        db,
        suspectId,
        "warning",
        `Cảnh cáo vi phạm quy định cộng đồng (${incidentCode})`,
        adminNote ||
          "Tài khoản của bạn bị ghi nhận nội dung không phù hợp chuẩn mực giáo dục. Nếu tái phạm, hệ thống sẽ khóa tài khoản vĩnh viễn.",
        "/cong-dong"
      );
      await db
        .prepare("UPDATE safety_incidents SET status = 'warned', penalty_action = 'Đã gửi thông báo cảnh cáo', admin_note = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(adminNote, incId)
        .run();
      return jsonRes({ ok: true, message: "Đã gửi thông báo cảnh cáo tới tài khoản vi phạm." });
    }

    if (action === "remove_lesson") {
      const srcId = String(inc.source_id || "");
      if (srcId) {
        await db.prepare("UPDATE teacher_posts SET status = 'hidden' WHERE id = ?").bind(srcId).run();
      }
      await notifyUser(
        db,
        suspectId,
        "penalty",
        `Đã gỡ giáo án kém chất lượng / lạc hậu (${incidentCode})`,
        adminNote ||
          "Bài chia sẻ/giáo án của bạn đã bị gỡ khỏi Mạng xã hội Giáo viên do không đạt chuẩn chất lượng GDPT 2018 hoặc quá sơ sài. Vui lòng rà soát lại nội dung trước khi đăng mới.",
        "/cong-dong"
      );
      await db
        .prepare("UPDATE safety_incidents SET status = 'resolved', penalty_action = 'Đã gỡ giáo án kém chất lượng & cảnh cáo', admin_note = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(adminNote, incId)
        .run();
      return jsonRes({ ok: true, message: "Đã ẩn/gỡ giáo án kém chất lượng và gửi thông báo nhắc nhở." });
    }

    if (action === "revoke_impersonator") {
      // Hình phạt nghiêm khắc kẻ mạo danh giáo viên: Thu hồi quyền Giáo viên + Gửi thông báo + Khóa acc!
      await notifyUser(
        db,
        suspectId,
        "account_locked",
        `THÔNG BÁO KHÓA TÀI KHOẢN — MẠO DANH GIÁO VIÊN (${incidentCode})`,
        adminNote ||
          "Hệ thống xác định tài khoản có hành vi mạo danh giáo viên. Quyền giáo viên đã bị thu hồi và tài khoản bị KHÓA VĨNH VIỄN. Toàn bộ dữ liệu liên quan được lưu giữ phục vụ cơ quan chức năng.",
        ""
      );
      await db
        .prepare("UPDATE users SET role = 'student', is_active = 0 WHERE id = ? AND role != 'super_admin'")
        .bind(suspectId)
        .run();
      const srcId = String(inc.source_id || "");
      if (srcId) {
        await db.prepare("UPDATE teacher_posts SET status = 'hidden' WHERE id = ?").bind(srcId).run();
      }
      await db
        .prepare("UPDATE safety_incidents SET status = 'locked', penalty_action = 'Thu hồi quyền Giáo viên (Mạo danh) + Gửi thông báo + Khóa tài khoản', admin_note = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(adminNote, incId)
        .run();
      return jsonRes({ ok: true, message: "Đã thu hồi quyền mạo danh, gửi thông báo và KHÓA tài khoản ngay lập tức!" });
    }

    if (action === "notify_and_lock") {
      await notifyUser(
        db,
        suspectId,
        "account_locked",
        `THÔNG BÁO KHÓA TÀI KHOẢN KHẨN CẤP (${incidentCode})`,
        adminNote ||
          "Tài khoản của bạn đã bị KHÓA do vi phạm nghiêm trọng chính sách bảo vệ học sinh (bạo lực / quấy rối / mạo danh). Hồ sơ bằng chứng đã được niêm phong trên hệ thống.",
        ""
      );
      await db
        .prepare("UPDATE users SET is_active = 0 WHERE id = ? AND role != 'super_admin'")
        .bind(suspectId)
        .run();
      await db
        .prepare("UPDATE safety_incidents SET status = 'locked', penalty_action = 'Đã gửi thông báo khóa acc & khóa tài khoản ngay', admin_note = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(adminNote, incId)
        .run();
      return jsonRes({ ok: true, message: "Đã gửi thông báo khóa tài khoản và KHÓA quyền đăng nhập ngay lập tức!" });
    }

    if (action === "escalate_police") {
      // Đảm bảo đã gửi thông báo khóa acc & khóa tài khoản trước khi xuất hồ sơ công an
      await notifyUser(
        db,
        suspectId,
        "account_locked",
        `THÔNG BÁO KHÓA TÀI KHOẢN & CHUYỂN HỒ SƠ CƠ QUAN CÔNG AN (${incidentCode})`,
        adminNote ||
          "Tài khoản của bạn đã bị khóa vĩnh viễn do hành vi bạo lực/quấy rối/xâm hại nghiêm trọng. Toàn bộ hồ sơ bằng chứng điện tử đã được trích xuất bàn giao cơ quan Công an.",
        ""
      );
      await db
        .prepare("UPDATE users SET is_active = 0 WHERE id = ? AND role != 'super_admin'")
        .bind(suspectId)
        .run();

      const updatedAction = "Đã thông báo khóa tài khoản + Khóa acc + Xuất Hồ sơ Bằng chứng chuyển Cơ quan Công an";
      await db
        .prepare("UPDATE safety_incidents SET status = 'escalated_police', penalty_action = ?, admin_note = ?, escalated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
        .bind(updatedAction, adminNote, incId)
        .run();

      const recentMsgs = await db
        .prepare(
          `SELECT sender_name, sender_role, receiver_name, content, is_flagged, created_at
           FROM direct_messages
           WHERE sender_id = ? OR receiver_id = ?
           ORDER BY created_at DESC
           LIMIT 30`
        )
        .bind(suspectId, suspectId)
        .all<Record<string, unknown>>();

      const refreshed = { ...inc, penalty_action: updatedAction, admin_note: adminNote };
      const reportText = buildEvidenceReportText(refreshed, recentMsgs.results.reverse());

      return jsonRes({
        ok: true,
        message: `Đã khóa tài khoản và xuất Hồ sơ Bằng chứng (${incidentCode}) sẵn sàng bàn giao Cơ quan Công an!`,
        evidence_filename: `HoSo_BangChung_${incidentCode}.txt`,
        evidence_text: reportText,
      });
    }

    // dismiss
    await db
      .prepare("UPDATE safety_incidents SET status = 'dismissed', penalty_action = 'Đã xác minh không vi phạm', admin_note = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(adminNote, incId)
      .run();
    return jsonRes({ ok: true, message: "Đã đóng hồ sơ cảnh báo." });
  }

  // =========================================================================
  // E. HỘP THÔNG BÁO NGƯỜI DÙNG (CẢNH BÁO AN TOÀN / ĐÁNH GIÁ SẢN PHẨM / KHÓA ACC)
  // =========================================================================
  if (path === "/api/v1/notifications" && method === "GET") {
    if (!claims) return jsonRes({ notifications: [], unread_count: 0 });
    const rows = await db
      .prepare("SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 25")
      .bind(claims.uid)
      .all<Record<string, unknown>>();
    const unread = rows.results.filter((r) => Number(r.is_read || 0) === 0).length;
    return jsonRes({ notifications: rows.results, unread_count: unread });
  }

  if (path === "/api/v1/notifications/read" && method === "POST") {
    if (!claims) return jsonRes({ ok: true });
    await db.prepare("UPDATE user_notifications SET is_read = 1 WHERE user_id = ?").bind(claims.uid).run();
    return jsonRes({ ok: true });
  }

  return null;
}
