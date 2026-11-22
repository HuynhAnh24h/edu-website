import { JwtClaims } from "./crypto";
import { pushRealtimeEvent } from "./realtime";

type JsonFn = (data: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;

export interface MonetizationEnv {
  DB: D1Database;
  REALTIME_HUB?: DurableObjectNamespace;
  BANK_WEBHOOK_SECRET?: string;
}

export interface PlanDefinition {
  id: string;
  name: string;
  tagline: string;
  price_vnd: number;
  original_price_vnd: number;
  duration_days: number;
  billing_cycle: "free" | "monthly" | "yearly";
  badge: string;
  highlight: boolean;
  features: string[];
}

export const SUBSCRIPTION_PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Owlie Miễn Phí",
    tagline: "Khởi đầu vững chắc cho mọi học sinh & phụ huynh",
    price_vnd: 0,
    original_price_vnd: 0,
    duration_days: 0,
    billing_cycle: "free",
    badge: "Mãi mãi 0đ",
    highlight: false,
    features: [
      "Truy cập 157+ bài giảng chuẩn GDPT 2018 (Lớp 1–12)",
      "Luyện bài tập cơ bản & Thi thử cộng đồng",
      "Học bạ Số & Góc Phụ huynh Đồng hành miễn phí",
      "Học viện Lập trình 6 Cụm (Bài nền tảng)",
      "Tham gia Mạng Xã Hội Giáo Viên & Học sinh",
    ],
  },
  {
    id: "pro_monthly",
    name: "Owlie Pro Tháng",
    tagline: "Tăng tốc điểm số & Chinh phục kỳ thi 2025+",
    price_vnd: 99000,
    original_price_vnd: 149000,
    duration_days: 30,
    billing_cycle: "monthly",
    badge: "Phổ biến nhất",
    highlight: true,
    features: [
      "AI Gia sư Socratic không giới hạn lượt hỏi 24/7",
      "Mở khóa toàn bộ Đề thi chuyên sâu & Phân tích điểm yếu chi tiết",
      "Mở khóa 100% dự án thực chiến 6 Cụm Fullstack (React, Next, NestJS)",
      "Cấp Chứng chỉ PDF + Mã QR xác thực ưu tiên ngay lập tức",
      "Hỏi bài ưu tiên 1-1 với đội ngũ Giáo viên Tích xanh",
    ],
  },
  {
    id: "pro_yearly",
    name: "Owlie Pro 1 Năm",
    tagline: "Tiết kiệm 33% — Đồng hành trọn vẹn cả năm học",
    price_vnd: 799000,
    original_price_vnd: 1188000,
    duration_days: 365,
    billing_cycle: "yearly",
    badge: "Tiết kiệm 33%",
    highlight: false,
    features: [
      "Toàn bộ đặc quyền Owlie Pro trong 12 tháng liên tục",
      "Chỉ ~66.000đ/tháng — tặng kèm bộ Đề ôn thi Học kỳ & THPT",
      "Huy hiệu Hội viên Pro nổi bật trên Học bạ Số & Cộng đồng",
      "Báo cáo năng lực & gợi ý lộ trình cá nhân hóa hàng tháng",
      "Ưu tiên tham gia các lớp Live luyện đề đặc biệt",
    ],
  },
  {
    id: "family_monthly",
    name: "Gói Gia Đình / Nhóm 4",
    tagline: "Cho 4 thành viên học chung siêu tiết kiệm",
    price_vnd: 199000,
    original_price_vnd: 396000,
    duration_days: 30,
    billing_cycle: "monthly",
    badge: "Chỉ 49k/người",
    highlight: false,
    features: [
      "Toàn bộ quyền lợi Owlie Pro cho tối đa 4 tài khoản học sinh",
      "Phụ huynh nhận báo cáo điểm thi & chuyên cần qua Email",
      "Phù hợp gia đình có nhiều con hoặc nhóm bạn cùng ôn thi",
      "Hỗ trợ kích hoạt & chuyển đổi thành viên linh hoạt",
      "Giảm thêm 20% khi gia hạn theo năm học",
    ],
  },
];

let monetizationInitialized = false;

export async function ensureMonetizationTables(db: D1Database) {
  if (monetizationInitialized) return;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS monetization_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS discount_coupons (
        code TEXT PRIMARY KEY,
        discount_pct INTEGER NOT NULL DEFAULT 10,
        max_uses INTEGER NOT NULL DEFAULT 200,
        used_count INTEGER NOT NULL DEFAULT 0,
        description TEXT DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id TEXT PRIMARY KEY,
        order_code TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_email TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'subscription',
        item_id TEXT DEFAULT '',
        base_amount_vnd INTEGER NOT NULL,
        discount_vnd INTEGER NOT NULL DEFAULT 0,
        final_amount_vnd INTEGER NOT NULL,
        coupon_code TEXT DEFAULT '',
        referral_code TEXT DEFAULT '',
        referrer_user_id TEXT DEFAULT '',
        commission_vnd INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT NOT NULL DEFAULT 'vietqr',
        note TEXT DEFAULT '',
        paid_at TEXT,
        approved_by TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        user_id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        expires_at TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS affiliate_wallets (
        user_id TEXT PRIMARY KEY,
        referral_code TEXT UNIQUE NOT NULL,
        total_referrals INTEGER NOT NULL DEFAULT 0,
        total_earned_vnd INTEGER NOT NULL DEFAULT 0,
        paid_out_vnd INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id, created_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status, created_at DESC)`),
  ]);

  // Seed default bank settings (only if missing)
  const defaults: [string, string][] = [
    ["bank_code", "MB"],
    ["bank_name", "MB Bank (Ngân hàng Quân đội)"],
    ["account_no", ""],
    ["account_name", "OWLIE EDU"],
    ["transfer_prefix", "OWLIE"],
    ["affiliate_rate_pct", "20"],
    ["teacher_share_pct", "85"],
    ["support_zalo", ""],
  ];
  await db.batch(
    defaults.map(([k, v]) =>
      db.prepare("INSERT OR IGNORE INTO monetization_settings (key, value) VALUES (?, ?)").bind(k, v)
    )
  );

  // Seed starter promo coupons that match Email Marketing templates
  await db.batch([
    db
      .prepare(
        "INSERT OR IGNORE INTO discount_coupons (code, discount_pct, max_uses, description, is_active) VALUES (?, ?, ?, ?, 1)"
      )
      .bind("OWLIE50", 50, 200, "Ưu đãi Học bổng Mùa thi — Giảm 50% gói Owlie Pro"),
    db
      .prepare(
        "INSERT OR IGNORE INTO discount_coupons (code, discount_pct, max_uses, description, is_active) VALUES (?, ?, ?, ?, 1)"
      )
      .bind("KHAIGIANG20", 20, 500, "Chào mừng Khai giảng Khóa học mới — Giảm 20%"),
  ]);

  monetizationInitialized = true;
}

async function getSettingsMap(db: D1Database): Promise<Record<string, string>> {
  const { results } = await db.prepare("SELECT key, value FROM monetization_settings").all<{ key: string; value: string }>();
  const out: Record<string, string> = {};
  for (const r of results || []) out[r.key] = r.value;
  return out;
}

async function ensureAffiliateWallet(db: D1Database, userId: string, fullName: string) {
  const existing = await db
    .prepare("SELECT * FROM affiliate_wallets WHERE user_id = ?")
    .bind(userId)
    .first<{
      user_id: string;
      referral_code: string;
      total_referrals: number;
      total_earned_vnd: number;
      paid_out_vnd: number;
    }>();
  if (existing) return existing;

  const cleanPrefix = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4) || "OWL";
  const suffix = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-4) || String(Math.floor(1000 + Math.random() * 9000));
  const code = `REF${cleanPrefix}${suffix}`;

  await db
    .prepare("INSERT OR IGNORE INTO affiliate_wallets (user_id, referral_code) VALUES (?, ?)")
    .bind(userId, code)
    .run();

  return (
    (await db
      .prepare("SELECT * FROM affiliate_wallets WHERE user_id = ?")
      .bind(userId)
      .first<{
        user_id: string;
        referral_code: string;
        total_referrals: number;
        total_earned_vnd: number;
        paid_out_vnd: number;
      }>()) || {
      user_id: userId,
      referral_code: code,
      total_referrals: 0,
      total_earned_vnd: 0,
      paid_out_vnd: 0,
    }
  );
}

function buildVietQrUrl(settings: Record<string, string>, amountVnd: number, orderCode: string): string {
  const bankCode = (settings.bank_code || "MB").trim();
  const accountNo = (settings.account_no || "").trim();
  if (!bankCode || !accountNo) return "";
  const accountName = encodeURIComponent((settings.account_name || "OWLIE EDU").trim());
  const addInfo = encodeURIComponent(orderCode);
  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNo)}-compact2.png?amount=${Math.max(0, Math.round(amountVnd))}&addInfo=${addInfo}&accountName=${accountName}`;
}

async function activateOrderInternal(
  env: MonetizationEnv,
  orderId: string,
  approvedBy: string
): Promise<{ ok: boolean; error?: string; order?: Record<string, unknown> }> {
  const order = await env.DB.prepare("SELECT * FROM payment_orders WHERE id = ?")
    .bind(orderId)
    .first<{
      id: string;
      order_code: string;
      user_id: string;
      user_name: string;
      plan_id: string;
      plan_name: string;
      coupon_code: string;
      referrer_user_id: string;
      commission_vnd: number;
      final_amount_vnd: number;
      status: string;
    }>();

  if (!order) return { ok: false, error: "Không tìm thấy đơn hàng" };
  if (order.status === "paid") return { ok: true, order };

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === order.plan_id);
  const days = plan?.duration_days || 30;
  const now = new Date();

  const existingSub = await env.DB.prepare("SELECT expires_at FROM user_subscriptions WHERE user_id = ?")
    .bind(order.user_id)
    .first<{ expires_at: string }>();

  const baseDate =
    existingSub && new Date(existingSub.expires_at).getTime() > now.getTime()
      ? new Date(existingSub.expires_at)
      : now;
  const newExpires = new Date(baseDate.getTime() + days * 86400000).toISOString();
  const paidAt = now.toISOString();

  const stmts: D1PreparedStatement[] = [
    env.DB.prepare("UPDATE payment_orders SET status = 'paid', paid_at = ?, approved_by = ? WHERE id = ?").bind(
      paidAt,
      approvedBy,
      order.id
    ),
    env.DB.prepare(
      `INSERT INTO user_subscriptions (user_id, plan_id, plan_name, status, expires_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         plan_id = excluded.plan_id,
         plan_name = excluded.plan_name,
         status = 'active',
         expires_at = excluded.expires_at,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(order.user_id, order.plan_id, order.plan_name, newExpires),
  ];

  if (order.coupon_code) {
    stmts.push(
      env.DB.prepare("UPDATE discount_coupons SET used_count = used_count + 1 WHERE code = ?").bind(order.coupon_code)
    );
  }

  if (order.referrer_user_id && order.commission_vnd > 0) {
    stmts.push(
      env.DB.prepare(
        `UPDATE affiliate_wallets
         SET total_referrals = total_referrals + 1,
             total_earned_vnd = total_earned_vnd + ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      ).bind(order.commission_vnd, order.referrer_user_id)
    );
  }

  // Send in-app notification to buyer
  stmts.push(
    env.DB.prepare(
      "INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, 'system', ?, ?, '/bang-gia')"
    ).bind(
      `ntf-pro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order.user_id,
      `Đã kích hoạt ${order.plan_name} thành công!`,
      `Đơn hàng ${order.order_code} (${order.final_amount_vnd.toLocaleString("vi-VN")}đ) đã được xác nhận. Tài khoản của bạn được kích hoạt quyền lợi Pro đến ${new Date(newExpires).toLocaleDateString("vi-VN")}.`
    )
  );

  await env.DB.batch(stmts);

  // Realtime toast push to buyer
  await pushRealtimeEvent(env.REALTIME_HUB, `user:${order.user_id}`, {
    type: "notification",
    title: `Đã kích hoạt ${order.plan_name}!`,
    message: `Đơn ${order.order_code} đã được duyệt. Chúc bạn học tập bứt phá cùng Owlie Pro!`,
    link: "/bang-gia",
  });

  // Notify referrer if affiliate earned commission
  if (order.referrer_user_id && order.commission_vnd > 0) {
    await pushRealtimeEvent(env.REALTIME_HUB, `user:${order.referrer_user_id}`, {
      type: "notification",
      title: `Bạn nhận +${order.commission_vnd.toLocaleString("vi-VN")}đ hoa hồng giới thiệu!`,
      message: `Người bạn giới thiệu vừa nâng cấp gói ${order.plan_name} thành công.`,
      link: "/bang-gia",
    });
  }

  return { ok: true, order: { ...order, status: "paid", paid_at: paidAt, expires_at: newExpires } };
}

export async function handleMonetizationRoutes(
  request: Request,
  env: MonetizationEnv,
  path: string,
  method: string,
  claims: JwtClaims | null,
  jsonRes: JsonFn
): Promise<Response | null> {
  await ensureMonetizationTables(env.DB);
  const isAdmin = claims?.role === "super_admin" || claims?.role === "content_admin";

  // 1. Public + Auth: Get pricing plans, bank config & current user subscription/affiliate
  if (path === "/api/v1/monetization/plans" && method === "GET") {
    const settings = await getSettingsMap(env.DB);
    const bankConfigured = Boolean((settings.account_no || "").trim());

    let mySubscription: Record<string, unknown> | null = null;
    let myOrders: unknown[] = [];
    let myAffiliate: Record<string, unknown> | null = null;

    if (claims) {
      const sub = await env.DB.prepare("SELECT * FROM user_subscriptions WHERE user_id = ?")
        .bind(claims.uid)
        .first<{ plan_id: string; plan_name: string; status: string; expires_at: string }>();
      if (sub && new Date(sub.expires_at).getTime() > Date.now()) {
        mySubscription = sub;
      }

      const { results: orders } = await env.DB.prepare(
        "SELECT id, order_code, plan_id, plan_name, base_amount_vnd, discount_vnd, final_amount_vnd, coupon_code, status, created_at, paid_at FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10"
      )
        .bind(claims.uid)
        .all();
      myOrders = (orders || []).map((o: Record<string, unknown>) => ({
        ...o,
        vietqr_url:
          o.status === "pending"
            ? buildVietQrUrl(settings, Number(o.final_amount_vnd || 0), String(o.order_code || ""))
            : "",
      }));

      const wallet = await ensureAffiliateWallet(env.DB, claims.uid, claims.name || "Owlie");
      myAffiliate = {
        ...wallet,
        rate_pct: Number(settings.affiliate_rate_pct || 20),
        referral_url: `https://owlie.eduk12-scale.workers.dev/bang-gia/?ref=${wallet.referral_code}`,
      };
    }

    return jsonRes({
      plans: SUBSCRIPTION_PLANS,
      bank_info: {
        configured: bankConfigured,
        bank_code: settings.bank_code || "MB",
        bank_name: settings.bank_name || "MB Bank",
        account_no: settings.account_no || "",
        account_name: settings.account_name || "OWLIE EDU",
        support_zalo: settings.support_zalo || "",
      },
      affiliate_rate_pct: Number(settings.affiliate_rate_pct || 20),
      teacher_share_pct: Number(settings.teacher_share_pct || 85),
      my_subscription: mySubscription,
      my_orders: myOrders,
      my_affiliate: myAffiliate,
    });
  }

  // 2. Validate discount coupon
  if (path === "/api/v1/monetization/coupon/validate" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { code?: string; plan_id?: string };
    const code = (body.code || "").trim().toUpperCase();
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === body.plan_id);
    if (!plan || plan.price_vnd <= 0) {
      return jsonRes({ error: "Vui lòng chọn gói trả phí hợp lệ" }, 400);
    }
    if (!code) return jsonRes({ error: "Vui lòng nhập mã giảm giá" }, 400);

    const coupon = await env.DB.prepare("SELECT * FROM discount_coupons WHERE code = ? AND is_active = 1")
      .bind(code)
      .first<{ code: string; discount_pct: number; max_uses: number; used_count: number; description: string }>();

    if (!coupon) return jsonRes({ error: "Mã giảm giá không tồn tại hoặc đã hết hạn" }, 404);
    if (coupon.used_count >= coupon.max_uses) {
      return jsonRes({ error: "Mã giảm giá đã hết lượt sử dụng" }, 400);
    }

    const discountVnd = Math.round((plan.price_vnd * coupon.discount_pct) / 100);
    const finalVnd = Math.max(0, plan.price_vnd - discountVnd);

    return jsonRes({
      valid: true,
      code: coupon.code,
      discount_pct: coupon.discount_pct,
      description: coupon.description,
      base_amount_vnd: plan.price_vnd,
      discount_vnd: discountVnd,
      final_amount_vnd: finalVnd,
    });
  }

  // 3. Create Payment Order + VietQR
  if (path === "/api/v1/monetization/orders" && method === "POST") {
    if (!claims) return jsonRes({ error: "Vui lòng đăng nhập trước khi tạo đơn nâng cấp" }, 401);

    const body = (await request.json().catch(() => ({}))) as {
      plan_id?: string;
      coupon_code?: string;
      referral_code?: string;
      note?: string;
    };

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === body.plan_id);
    if (!plan || plan.price_vnd <= 0) {
      return jsonRes({ error: "Gói đăng ký không hợp lệ" }, 400);
    }

    const settings = await getSettingsMap(env.DB);
    let discountVnd = 0;
    let appliedCoupon = "";

    const rawCoupon = (body.coupon_code || "").trim().toUpperCase();
    if (rawCoupon) {
      const coupon = await env.DB.prepare("SELECT * FROM discount_coupons WHERE code = ? AND is_active = 1")
        .bind(rawCoupon)
        .first<{ code: string; discount_pct: number; max_uses: number; used_count: number }>();
      if (coupon && coupon.used_count < coupon.max_uses) {
        discountVnd = Math.round((plan.price_vnd * coupon.discount_pct) / 100);
        appliedCoupon = coupon.code;
      }
    }

    const finalAmount = Math.max(0, plan.price_vnd - discountVnd);

    // Resolve affiliate referrer (prevent self-referral)
    let referrerUserId = "";
    let refCodeClean = (body.referral_code || "").trim().toUpperCase();
    let commissionVnd = 0;
    if (refCodeClean) {
      const refWallet = await env.DB.prepare("SELECT user_id FROM affiliate_wallets WHERE referral_code = ?")
        .bind(refCodeClean)
        .first<{ user_id: string }>();
      if (refWallet && refWallet.user_id !== claims.uid) {
        referrerUserId = refWallet.user_id;
        const rate = Math.max(0, Math.min(50, Number(settings.affiliate_rate_pct || 20)));
        commissionVnd = Math.round((finalAmount * rate) / 100);
      } else {
        refCodeClean = "";
      }
    }

    const prefix = (settings.transfer_prefix || "OWLIE").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6) || "OWLIE";
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const orderCode = `${prefix}${rand}`;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await env.DB.prepare(
      `INSERT INTO payment_orders (
        id, order_code, user_id, user_name, user_email, plan_id, plan_name,
        base_amount_vnd, discount_vnd, final_amount_vnd, coupon_code,
        referral_code, referrer_user_id, commission_vnd, status, payment_method, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'vietqr', ?)`
    )
      .bind(
        orderId,
        orderCode,
        claims.uid,
        claims.name || "Thành viên Owlie",
        claims.email || "",
        plan.id,
        plan.name,
        plan.price_vnd,
        discountVnd,
        finalAmount,
        appliedCoupon,
        refCodeClean,
        referrerUserId,
        commissionVnd,
        (body.note || "").trim().slice(0, 200)
      )
      .run();

    // Auto-approve immediately if 100% free via coupon
    if (finalAmount === 0) {
      const act = await activateOrderInternal(env, orderId, "Hệ thống (Mã giảm 100%)");
      return jsonRes({
        ok: true,
        auto_activated: true,
        order: act.order,
      });
    }

    const vietqrUrl = buildVietQrUrl(settings, finalAmount, orderCode);

    return jsonRes({
      ok: true,
      order: {
        id: orderId,
        order_code: orderCode,
        plan_id: plan.id,
        plan_name: plan.name,
        base_amount_vnd: plan.price_vnd,
        discount_vnd: discountVnd,
        final_amount_vnd: finalAmount,
        coupon_code: appliedCoupon,
        status: "pending",
        vietqr_url: vietqrUrl,
      },
      bank_info: {
        configured: Boolean((settings.account_no || "").trim()),
        bank_code: settings.bank_code || "MB",
        bank_name: settings.bank_name || "MB Bank",
        account_no: settings.account_no || "",
        account_name: settings.account_name || "OWLIE EDU",
        support_zalo: settings.support_zalo || "",
      },
    });
  }

  // 4. Automated Bank Transfer Webhook (SePay / Casso compatible)
  if (path === "/api/v1/monetization/webhook/bank" && method === "POST") {
    const expectedSecret = (env.BANK_WEBHOOK_SECRET || "").trim();
    if (expectedSecret) {
      const authH = request.headers.get("Authorization") || "";
      const customH = request.headers.get("x-webhook-secret") || "";
      const provided = authH.replace(/^Apikey\s+/i, "").replace(/^Bearer\s+/i, "").trim() || customH.trim();
      if (provided !== expectedSecret) {
        return jsonRes({ error: "Webhook secret không hợp lệ" }, 401);
      }
    }

    const body = (await request.json().catch(() => ({}))) as {
      content?: string;
      description?: string;
      transferAmount?: number;
      amount?: number;
    };

    const text = String(body.content || body.description || "").toUpperCase();
    const amount = Number(body.transferAmount ?? body.amount ?? 0);

    const { results: pending } = await env.DB.prepare(
      "SELECT id, order_code, final_amount_vnd FROM payment_orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100"
    ).all<{ id: string; order_code: string; final_amount_vnd: number }>();

    const matched = (pending || []).find((o) => text.includes(o.order_code.toUpperCase()) && amount >= o.final_amount_vnd);
    if (!matched) {
      return jsonRes({ ok: true, matched: false, message: "Chưa khớp đơn chờ nào với nội dung chuyển khoản này" });
    }

    const res = await activateOrderInternal(env, matched.id, "Webhook Ngân hàng Tự động");
    return jsonRes({ ok: true, matched: true, order_code: matched.order_code, activated: res.ok });
  }

  // 5. ADMIN: Revenue & Monetization Overview
  if (path === "/api/v1/monetization/admin/overview" && method === "GET") {
    if (!isAdmin) return jsonRes({ error: "Chỉ Quản trị viên mới được xem Doanh thu" }, 403);

    const [settings, kpiRow, subCountRow, affSumRow, couponsRes, ordersRes] = await Promise.all([
      getSettingsMap(env.DB),
      env.DB.prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'paid' THEN final_amount_vnd ELSE 0 END), 0) AS paid_revenue_vnd,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN final_amount_vnd ELSE 0 END), 0) AS pending_revenue_vnd,
           SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_orders
         FROM payment_orders`
      ).first<{
        paid_revenue_vnd: number;
        pending_revenue_vnd: number;
        paid_orders: number;
        pending_orders: number;
      }>(),
      env.DB.prepare("SELECT COUNT(*) AS cnt FROM user_subscriptions WHERE status = 'active' AND expires_at > datetime('now')").first<{
        cnt: number;
      }>(),
      env.DB.prepare("SELECT COALESCE(SUM(total_earned_vnd), 0) AS total_comm FROM affiliate_wallets").first<{ total_comm: number }>(),
      env.DB.prepare("SELECT * FROM discount_coupons ORDER BY created_at DESC").all(),
      env.DB.prepare("SELECT * FROM payment_orders ORDER BY created_at DESC LIMIT 50").all(),
    ]);

    return jsonRes({
      kpis: {
        paid_revenue_vnd: Number(kpiRow?.paid_revenue_vnd || 0),
        pending_revenue_vnd: Number(kpiRow?.pending_revenue_vnd || 0),
        paid_orders: Number(kpiRow?.paid_orders || 0),
        pending_orders: Number(kpiRow?.pending_orders || 0),
        active_pro_users: Number(subCountRow?.cnt || 0),
        total_affiliate_commission_vnd: Number(affSumRow?.total_comm || 0),
      },
      settings,
      webhook_url: "https://owlie.eduk12-scale.workers.dev/api/v1/monetization/webhook/bank",
      coupons: couponsRes.results || [],
      orders: ordersRes.results || [],
    });
  }

  // 6. ADMIN: Update Bank & Monetization Settings
  if (path === "/api/v1/monetization/admin/settings" && method === "PUT") {
    if (!isAdmin) return jsonRes({ error: "Chỉ Quản trị viên mới có quyền cấu hình thanh toán" }, 403);
    const body = (await request.json().catch(() => ({}))) as Record<string, string | number>;
    const allowed = [
      "bank_code",
      "bank_name",
      "account_no",
      "account_name",
      "transfer_prefix",
      "affiliate_rate_pct",
      "teacher_share_pct",
      "support_zalo",
    ];
    const stmts: D1PreparedStatement[] = [];
    for (const k of allowed) {
      if (body[k] !== undefined) {
        const val = String(body[k]).trim();
        stmts.push(
          env.DB.prepare(
            "INSERT INTO monetization_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
          ).bind(k, val)
        );
      }
    }
    if (stmts.length) await env.DB.batch(stmts);
    return jsonRes({ ok: true, settings: await getSettingsMap(env.DB) });
  }

  // 7. ADMIN: Approve or Cancel Order
  const approveMatch = path.match(/^\/api\/v1\/monetization\/admin\/orders\/([^/]+)\/approve$/);
  if (approveMatch && method === "POST") {
    if (!isAdmin) return jsonRes({ error: "Chỉ Quản trị viên mới có quyền duyệt đơn" }, 403);
    const res = await activateOrderInternal(env, decodeURIComponent(approveMatch[1]), claims?.name || "Admin");
    if (!res.ok) return jsonRes({ error: res.error }, 404);
    return jsonRes({ ok: true, order: res.order });
  }

  const cancelMatch = path.match(/^\/api\/v1\/monetization\/admin\/orders\/([^/]+)\/cancel$/);
  if (cancelMatch && method === "POST") {
    if (!isAdmin) return jsonRes({ error: "Chỉ Quản trị viên mới có quyền hủy đơn" }, 403);
    await env.DB.prepare("UPDATE payment_orders SET status = 'cancelled', approved_by = ? WHERE id = ? AND status = 'pending'")
      .bind(claims?.name || "Admin", decodeURIComponent(cancelMatch[1]))
      .run();
    return jsonRes({ ok: true });
  }

  // 8. ADMIN: Create or toggle Discount Coupon
  if (path === "/api/v1/monetization/admin/coupons" && method === "POST") {
    if (!isAdmin) return jsonRes({ error: "Chỉ Quản trị viên mới có quyền tạo mã giảm giá" }, 403);
    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
      discount_pct?: number;
      max_uses?: number;
      description?: string;
      is_active?: boolean;
    };
    const code = (body.code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!code || code.length < 3) return jsonRes({ error: "Mã giảm giá cần ít nhất 3 ký tự chữ/số" }, 400);
    const pct = Math.max(5, Math.min(100, Number(body.discount_pct || 20)));
    const maxUses = Math.max(1, Number(body.max_uses || 200));
    const active = body.is_active === false ? 0 : 1;

    await env.DB.prepare(
      `INSERT INTO discount_coupons (code, discount_pct, max_uses, description, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         discount_pct = excluded.discount_pct,
         max_uses = excluded.max_uses,
         description = excluded.description,
         is_active = excluded.is_active`
    )
      .bind(code, pct, maxUses, (body.description || "").trim(), active)
      .run();

    return jsonRes({ ok: true, code });
  }

  return null;
}
