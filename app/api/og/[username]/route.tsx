import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { analyzeUser, getMockAnalysis } from "@/lib/github-service";
import { CARD_THEMES, THEME_ORDER } from "@/lib/card-themes";
import { formatNumber } from "@/lib/utils";
import type {
  AnalysisPayload,
  CardDesignState,
  CardTheme,
  CardThemeId,
} from "@/types/github";

export const runtime = "nodejs";
export const revalidate = 300;

const size = { width: 880, height: 420 };

function themeFor(id: string | null): CardTheme {
  const t = THEME_ORDER.find((x) => x === id) ?? "github-dark";
  return CARD_THEMES[t];
}

async function loadPayload(username: string): Promise<AnalysisPayload> {
  try {
    const result = await analyzeUser(username);
    if ("notFound" in result) {
      return getMockAnalysis(username, false);
    }
    return result;
  } catch {
    return getMockAnalysis(username, true);
  }
}

/** Truncate on a worst-case character estimate; satori re-clips with maxWidth. */
function clampText(s: string, maxWidth: number, fontSize: number): string {
  const maxChars = Math.max(0, Math.floor(maxWidth / (fontSize * 0.55)));
  if (s.length <= maxChars) return s;
  return maxChars > 1 ? s.slice(0, maxChars - 1) + "…" : "…";
}

const MONO_STACK =
  "'JetBrains Mono', 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace";

/** Plain, minimal fallback card — safe even when everything else fails. */
function fallbackResponse(reason: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d1117",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: "#e6edf3" }}>
          DevScore
        </div>
        <div style={{ fontSize: 18, color: "#9da7b3" }}>{reason}</div>
      </div>
    ),
    { ...size }
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      style={{ display: "flex", marginRight: 6 }}
    >
      <path
        d="M12 2l2.9 6.28 6.85.62-5.19 4.55 1.54 6.69L12 16.63 5.9 20.14l1.54-6.69L2.25 8.9l6.85-.62L12 2z"
        fill={color}
      />
    </svg>
  );
}

function CardMarkup({
  payload,
  design,
  theme,
}: {
  payload: AnalysisPayload;
  design: CardDesignState;
  theme: CardTheme;
}) {
  const { user, totals, devScore } = payload;

  const hasName = Boolean(user.name) && user.name !== user.login;

  const langSegs = payload.languages.slice(0, 6);
  const topRepos = [...payload.repos]
    .filter((r) => !r.fork && r.stargazers_count > 0)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);
  const showLangs = design.showLanguages && langSegs.length > 0;
  const showRepos = design.showTopRepos && topRepos.length > 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: theme.bgSolid,
        padding: 32,
      }}
    >
      {/* ------------------------------- header ------------------------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.avatar_url}
            width={56}
            height={56}
            style={{ borderRadius: 28 }}
          />            <div style={{ display: "flex", marginLeft: 16, flexDirection: "column" }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: theme.text,
                maxWidth: 240,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {hasName ? clampText(user.name!, 240, 17) : `@${user.login}`}
            </div>
            {hasName ? (
              <div
                style={{
                  fontSize: 13,
                  color: theme.subtext,
                  marginTop: 3,
                  fontFamily: MONO_STACK,
                  display: "flex",
                }}
              >
                {`@${user.login}`}
              </div>
            ) : null}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 34,
            borderRadius: 17,
            padding: "0 16px",
            backgroundImage: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent2} 100%)`,
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#0b0e14",
              fontFamily: MONO_STACK,
              display: "flex",
            }}
          >
            {devScore.grade}
          </div>
        </div>
      </div>

      {/* hairline divider */}
      <div
        style={{
          height: 1,
          background: theme.border,
          marginTop: 23,
          display: "flex",
        }}
      />

      {/* ------------------------------- body --------------------------------- */}
      <div
        style={{
          display: "flex",
          flex: 1,
          marginTop: 26,
          justifyContent: "space-between",
        }}
      >
        {/* left column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 300,
          }}
        >
          {design.showDevScore ? (
            <div
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  fontWeight: 600,
                  color: theme.subtext,
                  display: "flex",
                }}
              >
                DEVSCORE
              </div>
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 700,
                  color: theme.accent2,
                  marginTop: 6,
                  fontFamily: MONO_STACK,
                  display: "flex",
                }}
              >
                {devScore.score}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: theme.subtext,
                  marginTop: 2,
                  fontFamily: MONO_STACK,
                  letterSpacing: 1,
                  display: "flex",
                }}
              >
                / 100
              </div>
              {/* progress bar */}
              <div
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.08)",
                  marginTop: 10,
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${devScore.score}%`,
                    height: 6,
                    borderRadius: 3,
                    backgroundImage: `linear-gradient(90deg, ${theme.accent2}, ${theme.accent})`,
                    display: "flex",
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}

          {/* stat rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 26,
              gap: 4,
            }}
          >
            {[
              ["COMMITS", formatNumber(totals.commits)],
              ["STARS", formatNumber(totals.stars)],
              ["MERGED PRS", formatNumber(totals.prsMerged)],
              ["REPOS", formatNumber(totals.originalRepos)],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    fontWeight: 600,
                    color: theme.subtext,
                    display: "flex",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: theme.text,
                    fontFamily: MONO_STACK,
                    display: "flex",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* persona chip, pinned to the card's bottom padding edge */}
          {design.showPersona && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "auto",
                height: 36,
                alignSelf: "flex-start",
                padding: "0 14px",
                borderRadius: 18,
                background: theme.chipBg,
                border: `1px solid ${devScore.persona.color}`,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  color: theme.text,
                  maxWidth: 280,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {`${devScore.persona.emoji} ${devScore.persona.title}`}
              </div>
            </div>
          )}
        </div>

        {/* right column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 448,
          }}
        >
          {showLangs ? (
            <>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  fontWeight: 600,
                  color: theme.subtext,
                  display: "flex",
                }}
              >
                LANGUAGES
              </div>
              <div
                style={{ display: "flex", gap: 3, height: 8, marginTop: 12 }}
              >
                {langSegs.map((l) => (
                  <div
                    key={l.name}
                    style={{
                      width: `${Math.max(l.percentage, 2)}%`,
                      background: l.color,
                      borderRadius: 3,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px 16px",
                  marginTop: 16,
                }}
              >
                {langSegs.map((l) => (
                  <div
                    key={l.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: 13,
                      color: theme.text,
                      width: 216,
                    }}
                  >
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 5,
                        background: l.color,
                        marginRight: 8,
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        maxWidth: 128,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {l.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        marginLeft: "auto",
                        fontSize: 12,
                        color: theme.subtext,
                        fontFamily: MONO_STACK,
                      }}
                    >
                      {`${l.percentage.toFixed(1)}%`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: "flex" }} />
          )}

          {showRepos ? (
            <>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  fontWeight: 600,
                  color: theme.subtext,
                  marginTop: showLangs ? 32 : 0,
                  display: "flex",
                }}
              >
                TOP REPOSITORIES
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 16,
                }}
              >
                {topRepos.map((repo) => (
                  <div
                    key={repo.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      height: 24,
                      marginBottom: 2,
                    }}
                  >
                    <StarIcon color={theme.accent2} />
                    <div
                      style={{
                        width: 48,
                        color: theme.text,
                        fontFamily: MONO_STACK,
                        display: "flex",
                        justifyContent: "flex-end",
                        fontWeight: 600,
                      }}
                    >
                      {formatNumber(repo.stargazers_count)}
                    </div>
                    <div
                      style={{
                        marginLeft: 12,
                        display: "flex",
                        maxWidth: 364,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {repo.name}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            !showLangs && (
              <div style={{ fontSize: 14, color: theme.subtext, display: "flex" }}>
                All metrics hidden in this design.
              </div>
            )
          )}
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1,
            color: theme.subtext,
            fontFamily: MONO_STACK,
            display: "flex",
          }}
        >
          DEVSCORE VISUALIZER
        </div>
      </div>
    </div>
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  const search = req.nextUrl.searchParams;

  const shows = (search.get("show") ?? "score,langs,persona")
    .split(",")
    .map((s) => s.trim());
  const theme = themeFor(search.get("theme"));

  const design: CardDesignState = {
    theme: theme.id,
    username,
    showDevScore: shows.includes("score"),
    showLanguages: shows.includes("langs"),
    showPersona: shows.includes("persona"),
    showTopRepos: shows.includes("repos"),
  };

  try {
    const payload = await loadPayload(username);
    return new ImageResponse(
      <CardMarkup payload={payload} design={design} theme={theme} />,
      { ...size, emoji: "twemoji" }
    );
  } catch (err) {
    console.error("[og] card render failed:", err);
    return fallbackResponse("Card unavailable right now — try again shortly.");
  }
}
