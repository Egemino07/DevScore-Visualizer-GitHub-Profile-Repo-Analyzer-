import type { AnalysisPayload, CardDesignState } from "@/types/github";
import { CARD_THEMES } from "./card-themes";
import { formatNumber } from "./utils";

/**
 * Shareable DevScore card, rendered as a standalone SVG string.
 *
 * Canvas is 880×420 with generous margins so nothing sits on the rounding edge.
 * Layout is built on an explicit spacing grid — no absolute/magic positions:
 *   header row   : avatar · name/handle · gradient grade badge
 *   hairline divider at a fixed y
 *   left column  : DEVSCORE block (big mono number, progress bar), stat rows,
 *                  persona chip (bottom-anchored)
 *   right column : LANGUAGES (section label, stacked bar, legend), then
 *                  TOP REPOSITORIES (star icon, right-aligned count, name)
 */
export const CARD_W = 880;
export const CARD_H = 420;

/* --------------------------------- tokens -------------------------------- */

const PAD = 32;
const HEADER_H = 112; // header row + divider plane below it
const LEFT_X = PAD;
const LEFT_W = 300; // left column content width
const RIGHT_X = 400;
const RIGHT_W = CARD_W - RIGHT_X - PAD;

const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const MONO =
  "'JetBrains Mono', 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace";

const ROW = 24; // one stat/top-repo row on the grid

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Truncate with an ellipsis on a worst-case ~0.55em per-char estimate. */
function clampText(s: string, maxWidth: number, fontSize: number): string {
  const maxChars = Math.max(0, Math.floor(maxWidth / (fontSize * 0.55)));
  if (s.length <= maxChars) return s;
  return maxChars > 1 ? s.slice(0, maxChars - 1) + "…" : "…";
}

/** Five-point star drawn from a 24×24 path, scaled/positioned via transform. */
const STAR_PATH =
  "M12 2l2.9 6.28 6.85.62-5.19 4.55 1.54 6.69L12 16.63 5.9 20.14l1.54-6.69L2.25 8.9l6.85-.62L12 2z";

function star(cx: number, cy: number, size: number, fill: string): string {
  const s = size / 24;
  return `<path d="${STAR_PATH}" fill="${fill}" transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})"/>`;
}

function fillWidth(total: number, pct: number): number {
  return Math.max(6, Math.min(total, (total * pct) / 100));
}

/* --------------------------------- render -------------------------------- */

export function buildCardSvg(
  payload: AnalysisPayload,
  design: CardDesignState,
  /** Prefer an inlined data-URI avatar so no external fetches happen at view time. */
  avatarSrc?: string | null
): string {
  const theme = CARD_THEMES[design.theme] ?? CARD_THEMES["github-dark"];
  const { user, totals, devScore } = payload;
  const p: string[] = [];

  /* --------------------------- background + border ------------------------ */
  p.push(
    `<rect width="${CARD_W}" height="${CARD_H}" rx="16" fill="${theme.bgSolid}"/>`,
    `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="${theme.accent2}" stop-opacity="0.04"/>
    </linearGradient>`,
    `<rect width="${CARD_W}" height="${CARD_H}" rx="16" fill="url(#sheen)"/>`,
    `<linearGradient id="chipGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.accent}"/>
      <stop offset="1" stop-color="${theme.accent2}"/>
    </linearGradient>`,
    `<linearGradient id="numGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.accent2}"/>
      <stop offset="1" stop-color="${theme.accent}"/>
    </linearGradient>`
  );

  /* -------------------------------- header -------------------------------- */
  const AV = 56;
  const avCx = LEFT_X + AV / 2;
  const avCy = PAD + AV / 2;
  p.push(
    `<clipPath id="avc"><circle cx="${avCx}" cy="${avCy}" r="${AV / 2}"/></clipPath>`
  );
  if (avatarSrc) {
    // href + xlink:href for maximum renderer compatibility (GitHub camo, browsers)
    p.push(
      `<image href="${esc(avatarSrc)}" xlink:href="${esc(avatarSrc)}" x="${LEFT_X}" y="${PAD}" width="${AV}" height="${AV}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avc)"/>`
    );
  } else {
    // Inline developer silhouette — never an external fetch, never breaks.
    p.push(
      `<circle cx="${avCx}" cy="${avCy}" r="${AV / 2}" fill="${theme.chipBg}"/>`,
      `<circle cx="${avCx}" cy="${avCy - 7}" r="9.5" fill="${theme.subtext}" opacity="0.85"/>`,
      `<path d="M ${avCx - 15} ${avCy + 22} c 0 -10 7.5 -14.5 15 -14.5 c 7.5 0 15 4.5 15 14.5 z" fill="${theme.subtext}" opacity="0.85" clip-path="url(#avc)"/>`
    );
  }

  const hasName = Boolean(user.name) && user.name !== user.login;
  const nameY = avCy - (hasName ? 6 : 4);
  const loginY = avCy + 18;
  p.push(
    `<text x="${LEFT_X + AV + 16}" y="${nameY}" font-family="${SANS}" font-size="17" font-weight="700" fill="${theme.text}">${esc(clampText(hasName ? user.name! : `@${user.login}`, 240, 17))}</text>`
  );
  if (hasName) {
    p.push(
      `<text x="${LEFT_X + AV + 16}" y="${loginY}" font-family="${MONO}" font-size="13" fill="${theme.subtext}">${esc(`@${user.login}`)}</text>`
    );
  }

  /* gradient grade badge, top-right: filled chip, inner border, centered text */
  if (design.showDevScore) {
    const grade = devScore.grade;
    const chipW = Math.max(grade.length * 11 + 28, 48);
    const chipX = CARD_W - PAD - chipW;
    const chipY = PAD + (AV - 34) / 2;
    p.push(
      `<rect x="${chipX}" y="${chipY}" width="${chipW}" height="34" rx="17" fill="url(#chipGrad)"/>`,
      `<rect x="${chipX + 1}" y="${chipY + 1}" width="${chipW - 2}" height="32" rx="16" fill="none" stroke="rgba(255,255,255,0.22)" stroke-opacity="0.35"/>`,
      `<text x="${chipX + chipW / 2}" y="${chipY + 23}" text-anchor="middle" font-family="${MONO}" font-size="16" font-weight="700" fill="#0b0e14">${esc(grade)}</text>`
    );
  }

  /* ------------------------------ hairline divider ----------------------- */
  p.push(
    `<line x1="${PAD}" y1="${HEADER_H}" x2="${CARD_W - PAD}" y2="${HEADER_H}" stroke="${theme.border}" stroke-width="1"/>`
  );

  /* ------------------------------- left column --------------------------- */
  let rowY: number;
  if (design.showDevScore) {
    // DEVSCORE
    const scoreLblY = HEADER_H + 32;
    const scoreNumY = scoreLblY + 60; // baseline for the 58px number
    p.push(
      `<text x="${LEFT_X}" y="${scoreLblY}" font-family="${SANS}" font-size="10" letter-spacing="3" font-weight="600" fill="${theme.subtext}">DEVSCORE</text>`,
      `<text x="${LEFT_X}" y="${scoreNumY}" font-family="${MONO}" font-size="58" font-weight="700" fill="url(#numGrad)">${devScore.score}</text>`,
      `<text x="${LEFT_X}" y="${scoreNumY + 16}" font-family="${MONO}" font-size="13" fill="${theme.subtext}">/ 100</text>`
    );

    const barY = scoreNumY + 26;
    p.push(
      `<rect x="${LEFT_X}" y="${barY}" width="${LEFT_W}" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>`,
      `<rect x="${LEFT_X}" y="${barY}" width="${fillWidth(LEFT_W, devScore.score)}" height="6" rx="3" fill="url(#numGrad)"/>`
    );
    rowY = barY + 26; // first baseline
  } else {
    rowY = HEADER_H + 32; // stat rows move up to fill the space
  }

  // stat rows on the grid; values right-aligned in mono
  const statRows: Array<[string, string]> = [
    ["COMMITS", formatNumber(totals.commits)],
    ["STARS", formatNumber(totals.stars)],
    ["MERGED PRS", formatNumber(totals.prsMerged)],
    ["REPOS", formatNumber(totals.originalRepos)],
  ];
  for (const [label, value] of statRows) {
    p.push(
      `<text x="${LEFT_X}" y="${rowY}" font-family="${SANS}" font-size="10" letter-spacing="2" font-weight="600" fill="${theme.subtext}">${esc(label)}</text>`,
      `<text x="${LEFT_X + LEFT_W}" y="${rowY}" text-anchor="end" font-family="${MONO}" font-size="14" font-weight="600" fill="${theme.text}">${esc(value)}</text>`
    );
    rowY += ROW;
  }

  // persona chip, bottom-anchored: chipBg fill + persona-colored inner border
  if (design.showPersona) {
    const chipH = 36;
    const perY = CARD_H - PAD - chipH;
    const per = devScore.persona;
    const perW = 24 + 14 + per.emoji.length * 16 + per.title.length * 8.6 + 14;
    p.push(
      `<rect x="${LEFT_X}" y="${perY}" width="${Math.min(perW, LEFT_W + 20).toFixed(0)}" height="${chipH}" rx="18" fill="${theme.chipBg}" stroke="${per.color}" stroke-opacity="0.55"/>`,
      `<text x="${LEFT_X + 14}" y="${perY + 24}" font-family="${SANS}" font-size="15" fill="${theme.text}">${per.emoji} ${esc(clampText(per.title, Math.min(perW, LEFT_W + 20) - 42, 15))}</text>`
    );
  }

  /* ------------------------------ right column --------------------------- */
  let ry = HEADER_H + 32;
  const sectionLabel = (y: number, label: string) =>
    p.push(
      `<text x="${RIGHT_X}" y="${y}" font-family="${SANS}" font-size="10" letter-spacing="3" font-weight="600" fill="${theme.subtext}">${esc(label)}</text>`
    );

  const langSegs = payload.languages.slice(0, 6);
  const topRepos = [...payload.repos]
    .filter((r) => !r.fork && r.stargazers_count > 0)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);
  const showLangs = design.showLanguages && langSegs.length > 0;
  const showRepos = design.showTopRepos && topRepos.length > 0;

  if (showLangs) {
    sectionLabel(ry, "LANGUAGES");
    ry += 12;
    // stacked share bar
    const BAR_H = 8;
    const gap = 3;
    const usable = RIGHT_W - (langSegs.length - 1) * gap;
    let x = RIGHT_X;
    for (const seg of langSegs) {
      const w = Math.max((usable * seg.percentage) / 100, 3);
      p.push(
        `<rect x="${x.toFixed(1)}" y="${ry}" width="${w.toFixed(1)}" height="${BAR_H}" rx="3" fill="${seg.color}"/>`
      );
      x += w + gap;
    }
    ry += BAR_H + 22;

    // legend: two columns × up to three rows; percent right-aligned per cell
    const CELL = RIGHT_W / 2;
    langSegs.forEach((seg, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cellX = RIGHT_X + col * CELL;
      const by = ry + row * (ROW - 2);
      p.push(
        `<circle cx="${cellX + 4}" cy="${by - 4}" r="4" fill="${seg.color}"/>`,
        `<text x="${cellX + 14}" y="${by}" font-family="${SANS}" font-size="13" fill="${theme.text}">${esc(clampText(seg.name, CELL - 64, 13))}</text>`,
        `<text x="${cellX + CELL - 8}" y="${by}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${theme.subtext}">${seg.percentage.toFixed(1)}%</text>`
      );
    });
    ry += Math.ceil(langSegs.length / 2) * (ROW - 2);
  }

  if (showRepos) {
    ry += showLangs ? 34 : 0;
    sectionLabel(ry, "TOP REPOSITORIES");
    ry += 20;

    // row: star icon · right-aligned count · name (never leaves the canvas)
    const COUNT_W = 48;
    const countX = RIGHT_X + COUNT_W;
    const nameX = countX + 12;
    for (const repo of topRepos) {
      if (ry > CARD_H - PAD - 4) break; // never overflow the canvas
      p.push(
        star(RIGHT_X + 6, ry - 5, 12, theme.accent2),
        `<text x="${countX}" y="${ry}" text-anchor="end" font-family="${MONO}" font-size="13" font-weight="600" fill="${theme.text}">${esc(formatNumber(repo.stargazers_count))}</text>`,
        `<text x="${nameX}" y="${ry}" font-family="${SANS}" font-size="13" fill="${theme.text}">${esc(clampText(repo.name, RIGHT_W - COUNT_W - 12 - 8, 13))}</text>`
      );
      ry += ROW;
    }
  }

  if (!showLangs && !showRepos) {
    p.push(
      `<text x="${RIGHT_X}" y="${ry + 44}" font-family="${SANS}" font-size="14" fill="${theme.subtext}">All metrics hidden in this design.</text>`
    );
  }

  /* --------------------------------- footer ------------------------------- */
  p.push(
    `<text x="${CARD_W - PAD}" y="${CARD_H - 17}" text-anchor="end" font-family="${MONO}" font-size="10" letter-spacing="1" fill="${theme.subtext}">DEVSCORE VISUALIZER</text>`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">${p.join("\n")}</svg>`;
}
