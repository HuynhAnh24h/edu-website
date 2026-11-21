import { CORE_API_URL } from "./api";
import { CodingLesson } from "./codingCurriculum";

export interface TestCaseResult {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface RunResult {
  allPassed: boolean;
  consoleOutput: string;
  error?: string;
  tests: TestCaseResult[];
  resultRows?: Record<string, unknown>[];
}

// ================= TYPESCRIPT -> JAVASCRIPT LIGHTWEIGHT STRIPPER =================
function stripTypeScript(tsCode: string): string {
  let code = tsCode;
  // Remove interface / type blocks
  code = code.replace(/\binterface\s+\w+(?:<[^>]+>)?\s*\{[\s\S]*?\}/g, "");
  code = code.replace(/\btype\s+\w+(?:<[^>]+>)?\s*=\s*[^;]+;/g, "");
  // Remove generic type params on functions: function foo<T>(...)
  code = code.replace(/(function\s+\w+)\s*<[^>]+>/g, "$1");
  // Remove return type annotations: ): Type { or ): Type | null {
  code = code.replace(/\)\s*:\s*[A-Za-z0-9_<>\[\]\|\s&?]+(?=\s*\{)/g, ")");
  // Remove parameter type annotations inside (...)
  code = code.replace(/(\b[A-Za-z_$][\w$]*)\??\s*:\s*[A-Za-z0-9_<>\[\]\|\s&]+(?=[,)])/g, "$1");
  // Remove variable type annotations: const x: number = ...
  code = code.replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[A-Za-z0-9_<>\[\]\|\s&]+(?=\s*=)/g, "$1 $2");
  return code;
}

// ================= 1. HTML RUNNER =================
function runHtml(lesson: CodingLesson, code: string): RunResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(code, "text/html");
  const tests: TestCaseResult[] = lesson.tests.map((t) => {
    const els = t.domSelector ? Array.from(doc.querySelectorAll(t.domSelector)) : [];
    let passed = true;
    let detail = "";

    if (t.domMinCount !== undefined && els.length < t.domMinCount) {
      passed = false;
      detail = `Tìm thấy ${els.length} phần tử <${t.domSelector}>, cần ít nhất ${t.domMinCount}`;
    } else if (t.domTextIncludes) {
      const combined = els.map((e) => e.textContent || "").join(" ");
      if (!combined.toLowerCase().includes(t.domTextIncludes.toLowerCase())) {
        passed = false;
        detail = `Nội dung trong <${t.domSelector}> chưa chứa "${t.domTextIncludes}"`;
      }
    }
    return { id: t.id, label: t.label, passed, detail };
  });

  return {
    allPassed: tests.every((t) => t.passed),
    consoleOutput: "Đã biên dịch và hiển thị HTML trực tiếp trên khung Xem trước.",
    tests,
  };
}

// ================= 2. CSS RUNNER =================
function runCss(lesson: CodingLesson, code: string): RunResult {
  const clean = code.replace(/\/\*[\s\S]*?\*\//g, "").toLowerCase();
  const tests: TestCaseResult[] = lesson.tests.map((t) => {
    const reqs = t.cssMustContain || [];
    const missing = reqs.filter((r) => !clean.includes(r.toLowerCase()));
    return {
      id: t.id,
      label: t.label,
      passed: missing.length === 0,
      detail: missing.length ? `Chưa thấy quy tắc CSS: ${missing.join(", ")}` : undefined,
    };
  });

  return {
    allPassed: tests.every((t) => t.passed),
    consoleOutput: "Đã áp dụng CSS lên khung Xem trước.",
    tests,
  };
}

// ================= 3. JAVASCRIPT & TYPESCRIPT RUNNER =================
function runJsOrTs(lesson: CodingLesson, rawCode: string, isTs: boolean): RunResult {
  const logs: string[] = [];

  if (isTs && lesson.requiredTsPatterns) {
    for (const req of lesson.requiredTsPatterns) {
      if (!new RegExp(req.regex).test(rawCode)) {
        return {
          allPassed: false,
          consoleOutput: "",
          error: `Kiểm tra kiểu TypeScript: ${req.message}`,
          tests: lesson.tests.map((t) => ({
            id: t.id,
            label: t.label,
            passed: false,
            detail: req.message,
          })),
        };
      }
    }
  }

  const executableCode = isTs ? stripTypeScript(rawCode) : rawCode;
  const testRunners = lesson.tests
    .map(
      (t) =>
        `{ id: ${JSON.stringify(t.id)}, label: ${JSON.stringify(t.label)}, passed: Boolean((() => { try { return (${t.jsCheck}); } catch (e) { __errMap[${JSON.stringify(
          t.id
        )}] = String(e.message || e); return false; } })()) }`
    )
    .join(",\n");

  const wrapped = `
    "use strict";
    const __errMap = {};
    const console = {
      log: (...args) => __log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      warn: (...args) => __log(args.join(' ')),
      error: (...args) => __log("ERROR: " + args.join(' ')),
    };
    ${executableCode}
    const __results = [
      ${testRunners}
    ];
    return { results: __results, errMap: __errMap };
  `;

  try {
    const fn = new Function("__log", wrapped);
    const out = fn((line: string) => logs.push(line)) as {
      results: Array<{ id: string; label: string; passed: boolean }>;
      errMap: Record<string, string>;
    };
    const tests: TestCaseResult[] = out.results.map((r) => ({
      ...r,
      detail: out.errMap[r.id] || (r.passed ? undefined : "Giá trị trả về chưa khớp kỳ vọng"),
    }));
    return {
      allPassed: tests.every((t) => t.passed),
      consoleOutput: logs.join("\n"),
      tests,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      allPassed: false,
      consoleOutput: logs.join("\n"),
      error: `Lỗi cú pháp / thực thi: ${msg}`,
      tests: lesson.tests.map((t) => ({ id: t.id, label: t.label, passed: false, detail: msg })),
    };
  }
}

// ================= 4. PYTHON RUNNER (REAL PYODIDE WEBASSEMBLY) =================
interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout?: (opts: { batched: (msg: string) => void }) => void;
}

let pyodidePromise: Promise<PyodideInstance> | null = null;

async function getPyodide(): Promise<PyodideInstance> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise<PyodideInstance>((resolve, reject) => {
    const w = window as unknown as {
      loadPyodide?: (cfg: { indexURL: string }) => Promise<PyodideInstance>;
    };
    const init = () => {
      if (!w.loadPyodide) {
        reject(new Error("Không thể khởi tạo Python WebAssembly"));
        return;
      }
      w.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" })
        .then(resolve)
        .catch(reject);
    };
    if (w.loadPyodide) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
    script.async = true;
    script.onload = init;
    script.onerror = () => reject(new Error("Không thể tải Pyodide CDN (kiểm tra kết nối mạng)"));
    document.head.appendChild(script);
  });
  return pyodidePromise;
}

async function runPython(lesson: CodingLesson, code: string): Promise<RunResult> {
  try {
    const py = await getPyodide();
    const checksPy = lesson.tests
      .map(
        (t) => `
try:
    ${t.pyCheck}
    __results.append({"id": ${JSON.stringify(t.id)}, "label": ${JSON.stringify(t.label)}, "passed": True, "detail": ""})
except Exception as __e:
    __results.append({"id": ${JSON.stringify(t.id)}, "label": ${JSON.stringify(t.label)}, "passed": False, "detail": str(__e) or "Assertion failed"})
`
      )
      .join("\n");

    const script = `
import io, sys, json
__buf = io.StringIO()
__old_out = sys.stdout
sys.stdout = __buf
__err = ""
__results = []
try:
    exec(${JSON.stringify(code)}, globals())
${checksPy
  .split("\n")
  .map((l) => "    " + l)
  .join("\n")}
except Exception as __main_e:
    __err = f"{type(__main_e).__name__}: {__main_e}"
finally:
    sys.stdout = __old_out
json.dumps({"stdout": __buf.getvalue(), "error": __err, "tests": __results})
`;

    const raw = String(await py.runPythonAsync(script));
    const parsed = JSON.parse(raw) as {
      stdout: string;
      error: string;
      tests: TestCaseResult[];
    };

    const tests =
      parsed.tests.length > 0
        ? parsed.tests
        : lesson.tests.map((t) => ({
            id: t.id,
            label: t.label,
            passed: false,
            detail: parsed.error || "Lỗi chạy Python",
          }));

    return {
      allPassed: !parsed.error && tests.every((t) => t.passed),
      consoleOutput: parsed.stdout,
      error: parsed.error || undefined,
      tests,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      allPassed: false,
      consoleOutput: "",
      error: msg,
      tests: lesson.tests.map((t) => ({ id: t.id, label: t.label, passed: false, detail: msg })),
    };
  }
}

// ================= 5. GOLANG RUNNER (REAL GO COMPILER VIA CLOUDFLARE WORKER) =================
async function runGolang(lesson: CodingLesson, code: string): Promise<RunResult> {
  // Strip any accidental `package main` if user pasted it
  const cleanedUserCode = code.replace(/^\s*package\s+\w+\s*/m, "");
  const imports = lesson.goTestImports?.length ? lesson.goTestImports : ["fmt"];
  const importBlock = `import (\n${imports.map((i) => `\t"${i}"`).join("\n")}\n)`;
  const checksGo = lesson.tests.map((t) => `\t${t.goCheck || ""}`).join("\n");

  const fullProgram = `package main

${importBlock}

${cleanedUserCode}

func main() {
${checksGo}
}
`;

  const res = await fetch(`${CORE_API_URL}/api/v1/coding/run-go`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: fullProgram }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    errors?: string;
    output?: string;
    error?: string;
  };

  if (!res.ok || data.errors || data.error) {
    const errMsg = data.errors || data.error || "Lỗi biên dịch Go";
    return {
      allPassed: false,
      consoleOutput: data.output || "",
      error: errMsg,
      tests: lesson.tests.map((t) => ({
        id: t.id,
        label: t.label,
        passed: false,
        detail: "Lỗi biên dịch Go",
      })),
    };
  }

  const lines = (data.output || "").split(/\r?\n/).filter(Boolean);
  const passSet = new Set<string>();
  const failMap: Record<string, string> = {};
  const userOut: string[] = [];

  for (const line of lines) {
    if (line.startsWith("PASS:")) {
      passSet.add(line.slice(5).trim());
    } else if (line.startsWith("FAIL:")) {
      const rest = line.slice(5);
      const colonIdx = rest.indexOf(":");
      if (colonIdx > 0) {
        failMap[rest.slice(0, colonIdx).trim()] = rest.slice(colonIdx + 1).trim();
      }
    } else {
      userOut.push(line);
    }
  }

  const tests: TestCaseResult[] = lesson.tests.map((t) => ({
    id: t.id,
    label: t.label,
    passed: passSet.has(t.id),
    detail: failMap[t.id] || (passSet.has(t.id) ? undefined : "Kết quả trả về chưa đúng"),
  }));

  return {
    allPassed: tests.every((t) => t.passed),
    consoleOutput: userOut.join("\n") || "Biên dịch & chạy Go thành công.",
    tests,
  };
}

// ================= 6. MONGODB IN-BROWSER QUERY & AGGREGATION ENGINE =================
function matchesMongoFilter(doc: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  for (const [key, cond] of Object.entries(filter || {})) {
    const val = doc[key];
    if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
      const ops = cond as Record<string, unknown>;
      for (const [op, target] of Object.entries(ops)) {
        if (op === "$eq" && val !== target) return false;
        if (op === "$ne" && val === target) return false;
        if (op === "$gt" && !(Number(val) > Number(target))) return false;
        if (op === "$gte" && !(Number(val) >= Number(target))) return false;
        if (op === "$lt" && !(Number(val) < Number(target))) return false;
        if (op === "$lte" && !(Number(val) <= Number(target))) return false;
        if (op === "$in" && (!Array.isArray(target) || !target.includes(val))) return false;
        if (op === "$regex" && !new RegExp(String(target), "i").test(String(val ?? ""))) return false;
      }
    } else if (val !== cond) {
      return false;
    }
  }
  return true;
}

function runMongoDb(lesson: CodingLesson, code: string): RunResult {
  const collections: Record<string, Record<string, unknown>[]> = JSON.parse(
    JSON.stringify(lesson.mongoCollections || {})
  );

  // Build sandboxed `db` object
  const dbProxy: Record<string, unknown> = {};
  for (const [colName, docs] of Object.entries(collections)) {
    dbProxy[colName] = {
      find(filter: Record<string, unknown> = {}) {
        let rows = docs.filter((d) => matchesMongoFilter(d, filter));
        const cursor = {
          sort(spec: Record<string, number>) {
            const entries = Object.entries(spec || {});
            rows = [...rows].sort((a, b) => {
              for (const [k, dir] of entries) {
                const av = a[k] as number | string;
                const bv = b[k] as number | string;
                if (av < bv) return dir < 0 ? 1 : -1;
                if (av > bv) return dir < 0 ? -1 : 1;
              }
              return 0;
            });
            return cursor;
          },
          limit(n: number) {
            rows = rows.slice(0, n);
            return cursor;
          },
          toArray() {
            return rows;
          },
          __rows() {
            return rows;
          },
        };
        return cursor;
      },
      aggregate(pipeline: Array<Record<string, unknown>>) {
        let rows = [...docs];
        for (const stage of pipeline || []) {
          if (stage.$match) {
            rows = rows.filter((d) => matchesMongoFilter(d, stage.$match as Record<string, unknown>));
          } else if (stage.$group) {
            const gSpec = stage.$group as Record<string, unknown>;
            const idExpr = String(gSpec._id || "");
            const idField = idExpr.startsWith("$") ? idExpr.slice(1) : "";
            const groups = new Map<unknown, Record<string, unknown>[]>();
            for (const r of rows) {
              const key = idField ? r[idField] : idExpr;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(r);
            }
            const out: Record<string, unknown>[] = [];
            for (const [gk, items] of groups.entries()) {
              const obj: Record<string, unknown> = { _id: gk };
              for (const [field, acc] of Object.entries(gSpec)) {
                if (field === "_id") continue;
                const accObj = acc as Record<string, unknown>;
                if (accObj.$sum !== undefined) {
                  if (accObj.$sum === 1) {
                    obj[field] = items.length;
                  } else {
                    const f = String(accObj.$sum).replace(/^\$/, "");
                    obj[field] = items.reduce((s, it) => s + Number(it[f] || 0), 0);
                  }
                } else if (accObj.$avg !== undefined) {
                  const f = String(accObj.$avg).replace(/^\$/, "");
                  obj[field] =
                    items.reduce((s, it) => s + Number(it[f] || 0), 0) / (items.length || 1);
                }
              }
              out.push(obj);
            }
            rows = out;
          } else if (stage.$sort) {
            const entries = Object.entries(stage.$sort as Record<string, number>);
            rows = [...rows].sort((a, b) => {
              for (const [k, dir] of entries) {
                const av = a[k] as number | string;
                const bv = b[k] as number | string;
                if (av < bv) return dir < 0 ? 1 : -1;
                if (av > bv) return dir < 0 ? -1 : 1;
              }
              return 0;
            });
          } else if (stage.$limit) {
            rows = rows.slice(0, Number(stage.$limit));
          }
        }
        return rows;
      },
    };
  }

  try {
    const clean = code
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n")
      .trim()
      .replace(/;$/, "");
    const fn = new Function("db", `"use strict"; return (${clean});`);
    const rawResult = fn(dbProxy);
    const rows: Record<string, unknown>[] = Array.isArray(rawResult)
      ? rawResult
      : rawResult && typeof rawResult.__rows === "function"
        ? rawResult.__rows()
        : [];

    return gradeQueryRows(lesson, rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      allPassed: false,
      consoleOutput: "",
      error: `Lỗi cú pháp MongoDB: ${msg}`,
      tests: lesson.tests.map((t) => ({ id: t.id, label: t.label, passed: false, detail: msg })),
    };
  }
}

// ================= 7. POSTGRESQL IN-BROWSER SQL ENGINE =================
function evalSqlCondition(row: Record<string, unknown>, whereClause: string): boolean {
  const orParts = whereClause.split(/\s+OR\s+/i);
  return orParts.some((orPart) => {
    const andParts = orPart.split(/\s+AND\s+/i);
    return andParts.every((cond) => {
      const c = cond.trim();
      const m = c.match(/^([a-zA-Z0-9_.]+)\s*(=|!=|<>|>=|<=|>|<|ILIKE|LIKE)\s*(.+)$/i);
      if (!m) return true;
      const col = m[1].includes(".") ? m[1].split(".").pop()! : m[1];
      const op = m[2].toUpperCase();
      let rhsRaw = m[3].trim();
      let rhs: unknown = rhsRaw;
      if (/^['"].*['"]$/.test(rhsRaw)) {
        rhs = rhsRaw.slice(1, -1);
      } else if (!Number.isNaN(Number(rhsRaw))) {
        rhs = Number(rhsRaw);
      }
      const lhs = row[col] !== undefined ? row[col] : row[m[1]];
      if (op === "=") return lhs == rhs;
      if (op === "!=" || op === "<>") return lhs != rhs;
      if (op === ">") return Number(lhs) > Number(rhs);
      if (op === ">=") return Number(lhs) >= Number(rhs);
      if (op === "<") return Number(lhs) < Number(rhs);
      if (op === "<=") return Number(lhs) <= Number(rhs);
      if (op === "LIKE" || op === "ILIKE") {
        const pattern = String(rhs).replace(/%/g, ".*").replace(/_/g, ".");
        return new RegExp(`^${pattern}$`, op === "ILIKE" ? "i" : "").test(String(lhs ?? ""));
      }
      return false;
    });
  });
}

function runPostgreSql(lesson: CodingLesson, code: string): RunResult {
  try {
    const cleanSql = code
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("--"))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/;$/, "");

    const selectMatch = cleanSql.match(
      /^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+(?:INNER\s+)?JOIN\s+([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+))?(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+([a-zA-Z0-9_.,\s]+?))?(?:\s+ORDER\s+BY\s+([a-zA-Z0-9_.,\s]+?))?(?:\s+LIMIT\s+(\d+))?$/i
    );
    if (!selectMatch) {
      throw new Error("Câu lệnh SQL chưa hợp lệ (hỗ trợ SELECT ... FROM ... [INNER JOIN] [WHERE] [GROUP BY] [ORDER BY] [LIMIT])");
    }

    const [, selectColsRaw, fromTable, joinTable, joinLeft, joinRight, whereRaw, groupByRaw, orderByRaw, limitRaw] =
      selectMatch;
    const tables = lesson.sqlTables || {};
    const baseTable = tables[fromTable.toLowerCase()];
    if (!baseTable) throw new Error(`Không tìm thấy bảng "${fromTable}"`);

    let rows: Record<string, unknown>[] = baseTable.map((r) => {
      const prefixed: Record<string, unknown> = { ...r };
      for (const [k, v] of Object.entries(r)) prefixed[`${fromTable}.${k}`] = v;
      return prefixed;
    });

    // INNER JOIN
    if (joinTable && joinLeft && joinRight) {
      const rightTbl = tables[joinTable.toLowerCase()];
      if (!rightTbl) throw new Error(`Không tìm thấy bảng "${joinTable}"`);
      const joined: Record<string, unknown>[] = [];
      for (const lRow of rows) {
        for (const rRow of rightTbl) {
          const merged: Record<string, unknown> = { ...lRow, ...rRow };
          for (const [k, v] of Object.entries(rRow)) merged[`${joinTable}.${k}`] = v;
          const lv = merged[joinLeft] ?? merged[joinLeft.split(".").pop()!];
          const rv = merged[joinRight] ?? merged[joinRight.split(".").pop()!];
          if (lv == rv) joined.push(merged);
        }
      }
      rows = joined;
    }

    // WHERE
    if (whereRaw) {
      rows = rows.filter((r) => evalSqlCondition(r, whereRaw));
    }

    // SELECT projection / GROUP BY
    const colSpecs = selectColsRaw.split(",").map((s) => s.trim());
    let projected: Record<string, unknown>[] = [];

    if (groupByRaw) {
      const gCol = groupByRaw.trim().split(".")[0];
      const groups = new Map<unknown, Record<string, unknown>[]>();
      for (const r of rows) {
        const key = r[gCol];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
      for (const [gk, items] of groups.entries()) {
        const outRow: Record<string, unknown> = {};
        for (const spec of colSpecs) {
          const asMatch = spec.match(/^(.+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
          const expr = asMatch ? asMatch[1].trim() : spec;
          const alias = asMatch ? asMatch[2].trim() : expr.split(".").pop()!;
          const agg = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\((.+)\)$/i);
          if (agg) {
            const fnName = agg[1].toUpperCase();
            const arg = agg[2].trim();
            if (fnName === "COUNT") outRow[alias] = items.length;
            else if (fnName === "SUM") outRow[alias] = items.reduce((s, it) => s + Number(it[arg] || 0), 0);
            else if (fnName === "AVG")
              outRow[alias] = items.reduce((s, it) => s + Number(it[arg] || 0), 0) / (items.length || 1);
            else if (fnName === "MIN") outRow[alias] = Math.min(...items.map((it) => Number(it[arg] || 0)));
            else if (fnName === "MAX") outRow[alias] = Math.max(...items.map((it) => Number(it[arg] || 0)));
          } else {
            outRow[alias] = gk;
          }
        }
        projected.push(outRow);
      }
    } else if (colSpecs.length === 1 && colSpecs[0] === "*") {
      projected = rows.map((r) => {
        const cleanRow: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          if (!k.includes(".")) cleanRow[k] = v;
        }
        return cleanRow;
      });
    } else {
      projected = rows.map((r) => {
        const outRow: Record<string, unknown> = {};
        for (const spec of colSpecs) {
          const asMatch = spec.match(/^(.+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
          const expr = asMatch ? asMatch[1].trim() : spec;
          const alias = asMatch ? asMatch[2].trim() : expr.split(".").pop()!;
          outRow[alias] = r[expr] !== undefined ? r[expr] : r[expr.split(".").pop()!];
        }
        // Keep hidden sort keys if ORDER BY references table.col not in SELECT
        if (orderByRaw) {
          const sortCol = orderByRaw.trim().split(/\s+/)[0];
          if (outRow[sortCol] === undefined && r[sortCol] !== undefined) {
            outRow[`__sort_${sortCol}`] = r[sortCol];
          }
        }
        return outRow;
      });
    }

    // ORDER BY
    if (orderByRaw) {
      const [colToken, dirToken] = orderByRaw.trim().split(/\s+/);
      const desc = (dirToken || "ASC").toUpperCase() === "DESC";
      const shortCol = colToken.split(".").pop()!;
      projected.sort((a, b) => {
        const av = (a[colToken] ?? a[shortCol] ?? a[`__sort_${colToken}`]) as number | string;
        const bv = (b[colToken] ?? b[shortCol] ?? b[`__sort_${colToken}`]) as number | string;
        if (av < bv) return desc ? 1 : -1;
        if (av > bv) return desc ? -1 : 1;
        return 0;
      });
    }

    // Remove temporary sort helper keys
    projected = projected.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        if (!k.startsWith("__sort_")) out[k] = v;
      }
      return out;
    });

    if (limitRaw) {
      projected = projected.slice(0, Number(limitRaw));
    }

    return gradeQueryRows(lesson, projected);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      allPassed: false,
      consoleOutput: "",
      error: `Lỗi SQL PostgreSQL: ${msg}`,
      tests: lesson.tests.map((t) => ({ id: t.id, label: t.label, passed: false, detail: msg })),
    };
  }
}

function gradeQueryRows(lesson: CodingLesson, rows: Record<string, unknown>[]): RunResult {
  const tests: TestCaseResult[] = lesson.tests.map((t) => {
    if (t.expectedCount !== undefined) {
      const ok = rows.length === t.expectedCount;
      return {
        id: t.id,
        label: t.label,
        passed: ok,
        detail: ok ? undefined : `Truy vấn trả về ${rows.length} bản ghi, kỳ vọng ${t.expectedCount}`,
      };
    }
    if (t.checkFirstRow) {
      const first = rows[0] || {};
      const mismatches: string[] = [];
      for (const [k, exp] of Object.entries(t.checkFirstRow)) {
        if (first[k] != exp) {
          mismatches.push(`${k}: nhận "${String(first[k] ?? "undefined")}", cần "${String(exp)}"`);
        }
      }
      return {
        id: t.id,
        label: t.label,
        passed: mismatches.length === 0,
        detail: mismatches.length ? mismatches.join("; ") : undefined,
      };
    }
    return { id: t.id, label: t.label, passed: true };
  });

  return {
    allPassed: tests.every((t) => t.passed),
    consoleOutput: JSON.stringify(rows, null, 2),
    resultRows: rows,
    tests,
  };
}

// ================= DISPATCHER =================
export async function executeCodingLesson(
  lesson: CodingLesson,
  code: string
): Promise<RunResult> {
  switch (lesson.trackId) {
    case "html":
      return runHtml(lesson, code);
    case "css":
      return runCss(lesson, code);
    case "javascript":
      return runJsOrTs(lesson, code, false);
    case "typescript":
      return runJsOrTs(lesson, code, true);
    case "python":
      return runPython(lesson, code);
    case "golang":
      return runGolang(lesson, code);
    case "mongodb":
      return runMongoDb(lesson, code);
    case "postgresql":
      return runPostgreSql(lesson, code);
  }
}
