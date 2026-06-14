import type { ColumnInfo, ColumnRole } from "./types";

export function columnRole(column: ColumnInfo): ColumnRole {
  return column.role ?? column.dtype;
}

export function continuousColumns(columns: ColumnInfo[]): ColumnInfo[] {
  return columns.filter((c) => columnRole(c) === "continuous" && c.values.length > 0);
}

export function categoricalColumns(columns: ColumnInfo[]): ColumnInfo[] {
  return columns.filter((c) => {
    const role = columnRole(c);
    return role === "categorical" || role === "ordinal";
  });
}

export function analysisColumns(columns: ColumnInfo[]): ColumnInfo[] {
  return columns.filter((c) => {
    const role = columnRole(c);
    return role === "continuous" || role === "categorical" || role === "ordinal";
  });
}

export function numericAnalysisColumns(columns: ColumnInfo[]): ColumnInfo[] {
  return analysisColumns(columns).filter((c) => c.values.length > 0);
}

export function findColumn(columns: ColumnInfo[], name: string): ColumnInfo | undefined {
  return columns.find((c) => c.name === name);
}

/** カテゴリ列に出現する値をユニークかつ出現順で取得する */
export function uniqueCategories(col: ColumnInfo): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const v of col.cat_values) {
    if (v === null || seen.has(v)) continue;
    seen.add(v);
    order.push(v);
  }
  return order;
}

/** 値列をグループ列のカテゴリごとに分割する（欠損は除外） */
export function splitByGroup(
  valueCol: ColumnInfo,
  groupCol: ColumnInfo
): { groupNames: string[]; groups: number[][] } {
  const map = new Map<string, number[]>();
  const order: string[] = [];

  valueCol.values.forEach((val, i) => {
    const grp = groupCol.cat_values[i];
    if (val === null || grp === null) return;
    if (!map.has(grp)) {
      map.set(grp, []);
      order.push(grp);
    }
    map.get(grp)!.push(val);
  });

  return { groupNames: order, groups: order.map((g) => map.get(g)!) };
}

/** 値列をグループ列の指定された2カテゴリで抽出する（2群比較用） */
export function extractTwoGroups(
  valueCol: ColumnInfo,
  groupCol: ColumnInfo,
  groupA: string,
  groupB: string
): { a: number[]; b: number[] } {
  const a: number[] = [];
  const b: number[] = [];
  valueCol.values.forEach((val, i) => {
    const grp = groupCol.cat_values[i];
    if (val === null || grp === null) return;
    if (grp === groupA) a.push(val);
    else if (grp === groupB) b.push(val);
  });
  return { a, b };
}

/** 2つの連続変数列から欠損のない行だけを取り出してペアにする */
export function pairColumns(
  colA: ColumnInfo,
  colB: ColumnInfo
): { a: number[]; b: number[] } {
  const a: number[] = [];
  const b: number[] = [];
  const n = Math.max(colA.values.length, colB.values.length);
  for (let i = 0; i < n; i++) {
    const va = colA.values[i];
    const vb = colB.values[i];
    if (va === null || va === undefined || vb === null || vb === undefined) continue;
    a.push(va);
    b.push(vb);
  }
  return { a, b };
}

/** 2つのカテゴリ列からクロス集計表を作成する */
export function crossTabulate(
  rowCol: ColumnInfo,
  colCol: ColumnInfo
): { table: number[][]; rowLabels: string[]; colLabels: string[] } {
  const rowLabels = uniqueCategories(rowCol);
  const colLabels = uniqueCategories(colCol);
  const table = rowLabels.map(() => colLabels.map(() => 0));

  rowCol.cat_values.forEach((rv, i) => {
    const cv = colCol.cat_values[i];
    if (rv === null || cv === null) return;
    const ri = rowLabels.indexOf(rv);
    const ci = colLabels.indexOf(cv);
    if (ri === -1 || ci === -1) return;
    table[ri][ci] += 1;
  });

  return { table, rowLabels, colLabels };
}

/** 連続変数列(時間・イベント)とカテゴリ列(任意)を欠損なく揃えて取り出す（生存分析用） */
export function alignSurvivalColumns(
  timeCol: ColumnInfo,
  eventCol: ColumnInfo,
  groupCol: ColumnInfo | null
): { times: number[]; events: number[]; groups: string[] | null } {
  const times: number[] = [];
  const events: number[] = [];
  const groups: string[] = [];
  const n = Math.max(timeCol.values.length, eventCol.values.length);

  for (let i = 0; i < n; i++) {
    const t = timeCol.values[i];
    const e = eventCol.values[i];
    if (t === null || t === undefined || e === null || e === undefined) continue;
    const g = groupCol ? groupCol.cat_values[i] : null;
    if (groupCol && g === null) continue;
    times.push(t);
    events.push(e);
    if (groupCol) groups.push(g!);
  }

  return { times, events, groups: groupCol ? groups : null };
}

/** スコア列とラベル列(0/1)を欠損なく揃えて取り出す（ROC用） */
export function alignRocColumns(
  scoreCol: ColumnInfo,
  labelCol: ColumnInfo
): { scores: number[]; labels: number[] } {
  const scores: number[] = [];
  const labels: number[] = [];
  const n = Math.max(scoreCol.values.length, labelCol.values.length);
  for (let i = 0; i < n; i++) {
    const s = scoreCol.values[i];
    const l = labelCol.values[i];
    if (s === null || s === undefined || l === null || l === undefined) continue;
    scores.push(s);
    labels.push(l);
  }
  return { scores, labels };
}
