import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Home, Users, Trophy, UtensilsCrossed, Info, MapPin, ChevronLeft, Plus, Minus, Check, Megaphone, Lock, X, Phone, Eye, EyeOff, Shield } from "lucide-react";

/* ---------- Design tokens (matched to the real club crest: red / black / gold) ---------- */
const C = {
  turf: "#141110",
  pitch: "#E31E24",
  pitchLight: "#8C1216",
  line: "#FBF8F3",
  ash: "#AE7D64",
  sliotar: "#F2B632",
  ink: "#1C1613",
  inkSoft: "#6B5A52",
};

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; }
input, select, textarea, button { box-sizing: border-box; max-width: 100%; }
`;
const HERO_BRIGHT = "#D61224";
const HERO_DARK = "#750712";

// The ?v= tag forces browsers/CDN to re-fetch when a crest/logo image is updated —
// bump this number any time an image file changes, otherwise cached copies can stick around.
const CREST_VERSION = "5";
const BADGE_LOGO = `/logo.png?v=${CREST_VERSION}`;

const CRESTS = {
  fing: `/crests/fing.png?v=${CREST_VERSION}`,
  finian: `/crests/finian.png?v=${CREST_VERSION}`,
  rathvilly: `/crests/rathvilly.png?v=${CREST_VERSION}`,
  knockbridge: `/crests/knockbridge.png?v=${CREST_VERSION}`,
  naomheoin: `/crests/naomheoin.png?v=${CREST_VERSION}`,
  navanom: `/crests/navanom.png?v=${CREST_VERSION}`,
  ratoath: `/crests/ratoath.png?v=${CREST_VERSION}`,
  brayemmets: `/crests/brayemmets.png?v=${CREST_VERSION}`,
};


/* ---------- Event constants ---------- */
const EVENT = {
  name: "Fingallians U12 Hurling Blitz",
  date: "Saturday 22 August 2026",
  venue: "Lawless Memorial Park, Fingallians GAA, Swords",
  registration: "9:15 a.m.",
};

const WELCOME_PARAGRAPHS = [
  "A Chairde,",
  "Céad míle fáilte to Lawless Memorial Park.",
  "Fingallians GAA are absolutely thrilled to welcome every player, mentor, parent and supporter who has made the journey to Swords today for our Under 12 Hurling Invitational. Whether you have travelled from down the road or from across the country, we are genuinely delighted to have you here with us.",
  "Days like today are what the GAA is all about. There is something truly special about watching Under 12s take to the pitch, the energy, the enthusiasm and the sheer joy of the game at that age is something that never gets old. We are proud to host clubs from across Ireland, each bringing their own style, skill and spirit, and we hope every child goes home having been challenged, encouraged and most importantly, having had a brilliant day.",
  "To our visiting clubs - thank you. The effort involved in preparing a squad, organising travel and giving up a Saturday is not lost on us. We hope you feel the warmth of our welcome from the moment you arrive.",
  "To our own Fingallians players - today is your day to shine on home turf. Play with pride, play with heart, and represent your club the way we know you can.",
  "To every parent, mentor and volunteer who has given their time to make today possible - both here at Fingallians and in clubs across the country - thank you sincerely. None of this happens without you.",
  "We ask everyone to embrace the spirit of fair play, to cheer on every child regardless of the jersey they wear and to remember that at Under 12, the most important thing is that every player enjoys their day and leaves the pitch with a smile.",
  "Today is one of the highlights of the Fingallians Juvenile Calendar, and we hope it becomes a memory that players, families and clubs treasure for years to come.",
  "Enjoy every minute of it.",
];
const WELCOME_SIGNOFF = "2014 Boys Mentoring Team";

const DEFAULT_CLUBS = [
  { id: "fing", name: "Fingallians GAA", town: "Swords", county: "Dublin", color: "#B3202E", contact: "" },
  { id: "finian", name: "St. Finian's GAA, Swords", town: "Swords", county: "Dublin", color: "#7A1F2B", contact: "" },
  { id: "rathvilly", name: "Rathvilly GAA", town: "Rathvilly", county: "Carlow", color: "#D9A441", contact: "" },
  { id: "knockbridge", name: "Knockbridge Hurling Club", town: "Knockbridge", county: "Louth", color: "#1C1C1C", contact: "" },
  { id: "naomheoin", name: "Naomh Eoin CLG / St. John's GAA", town: "Belfast", county: "Antrim", color: "#1D4E89", contact: "" },
  { id: "navanom", name: "Navan O'Mahony's", town: "Navan", county: "Meath", color: "#8C1A2B", contact: "" },
  { id: "ratoath", name: "Ratoath GAA", town: "Ratoath", county: "Meath", color: "#1C5FA8", contact: "" },
  { id: "brayemmets", name: "Bray Emmets GAA", town: "Bray", county: "Wicklow", color: "#2F8F3E", contact: "" },
];

// Each club fields an A and a B team — fixtures, results and the leaderboard all
// operate on these 16 entries, while food ordering stays at the club (8) level.
function buildTeamsFromClubs(clubs) {
  return clubs.flatMap((c) =>
    ["A", "B"].map((suffix) => ({
      id: `${c.id}${suffix}`,
      clubId: c.id,
      name: `${c.name} ${suffix}`,
      town: c.town,
      county: c.county,
      color: c.color,
    }))
  );
}
const DEFAULT_TEAMS = buildTeamsFromClubs(DEFAULT_CLUBS);

const DEFAULT_MATCHES = [];

const DEFAULT_ANNOUNCEMENTS = [
  { id: "a1", text: "Registration is open at the clubhouse from 9:15 a.m. Please have team sheets ready.", time: "08:00" },
];

const DEFAULT_ORDERS = {};
const DEFAULT_SPONSORS = [
  { id: "s1", name: "Gold Sponsor 1", tier: "gold", url: "", logo: "" },
  { id: "s2", name: "Gold Sponsor 2", tier: "gold", url: "", logo: "" },
  { id: "s3", name: "Silver Sponsor 1", tier: "silver", url: "", logo: "" },
  { id: "s4", name: "Silver Sponsor 2", tier: "silver", url: "", logo: "" },
  { id: "s5", name: "Supporter 1", tier: "supporter", url: "", logo: "" },
  { id: "s6", name: "Supporter 2", tier: "supporter", url: "", logo: "" },
];

// Named organiser logins — all have identical full access (fixtures, scores, all food orders,
// announcements, sponsors). Add/remove people here; swap out passwords whenever you like.
const ADMIN_ACCOUNTS = {
  blitz2026: "Organiser",
  elaine1884: "Elaine",
  Sean1884: "Sean",
  Dara1884: "Dara",
  Rebecca1884: "Rebecca",
  Sinead1884: "Sinead",
  Deco1884: "Deco",
  Conor1884: "Conor",
};
function findAdminByCode(code) {
  const trimmed = (code || "").trim().toLowerCase();
  const match = Object.entries(ADMIN_ACCOUNTS).find(([key]) => key.toLowerCase() === trimmed);
  return match ? match[1] : null;
}

// Per-club password for editing that club's food order — pattern: 4-letter club code + 2-digit
// founding year. Case-insensitive on entry (see checkPassword below).
const CLUB_PASSWORDS = {
  fing: "fing84",
  finian: "fini83",
  rathvilly: "rath88",
  knockbridge: "knoc85",
  naomheoin: "naom29",
  navanom: "nava48",
  ratoath: "rato03",
  brayemmets: "bray85",
};
function checkPassword(input, expected) {
  return (input || "").trim().toLowerCase() === (expected || "").trim().toLowerCase();
}
const MENTOR_BURGER_NOTE = "Every registered player and mentor gets a voucher on arrival for a burger at lunch, plus a tea/coffee voucher for mentors — nothing to order there. This form is so organisers can plan catering numbers: confirm your headcount and add any breakfast sausage rolls you'd like from the BBQ.";

/* ---------- Storage helpers (Turso via /api/kv) ---------- */
const API_BASE = "/api/kv";

async function loadShared(key, fallback) {
  try {
    const res = await fetch(`${API_BASE}?key=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    return JSON.parse(data.value);
  } catch {
    await saveShared(key, fallback);
    return fallback;
  }
}
async function saveShared(key, value) {
  try {
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: JSON.stringify(value) }),
    });
  } catch (e) {
    console.error("save failed", key, e);
  }
}

/* ---------- Score helpers ---------- */
function scoreTotal(goals, points) {
  return goals * 3 + points;
}
function scoreLabel(goals, points) {
  return `${goals}-${String(points).padStart(2, "0")}`;
}

/* ---------- Scoreboard flip component (signature element) ---------- */
function Scoreline({ goals, points, big }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[goals, "\u2013", String(points).padStart(2, "0")].map((ch, i) => (
        <div
          key={i}
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: big ? 23 : 16,
            lineHeight: 1,
            color: C.line,
            background: C.turf,
            borderRadius: 4,
            padding: big ? "6px 8px" : "3px 5px",
            minWidth: ch === "\u2013" ? "auto" : big ? 22 : 15,
            textAlign: "center",
            border: `1px solid ${C.pitchLight}`,
          }}
        >
          {ch}
        </div>
      ))}
    </div>
  );
}

function LogoBadge({ size = 60, ringWidth = 3 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fff",
        border: `${ringWidth}px solid ${C.sliotar}`,
        boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <img
        src={BADGE_LOGO}
        alt="Fingallians Hurling Blitz badge"
        style={{ width: "76%", height: "76%", objectFit: "contain" }}
      />
    </div>
  );
}

function TeamBadge({ team, size = 40 }) {
  const crest = CRESTS[team.clubId || team.id];
  if (crest) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#fff",
          flexShrink: 0,
          boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
          overflow: "hidden",
          border: `1px solid ${C.pitch}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={crest}
          alt={team.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }
  const initials = team.name
    .replace(/GAA|Hurling Club|CLG/gi, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 30% 25%, ${team.color}dd, ${team.color})`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Poppins, sans-serif",
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0,
        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
      }}
    >
      {initials}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    scheduled: { bg: "#EDE7DA", fg: C.inkSoft, label: "Scheduled" },
    live: { bg: C.sliotar, fg: C.ink, label: "● Live" },
    finished: { bg: C.pitch, fg: "#fff", label: "Full time" },
  };
  const s = map[status] || map.scheduled;
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 20,
        fontFamily: "Inter, sans-serif",
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  );
}

/* ---------- Bottom nav ---------- */
function BottomNav({ screen, setScreen }) {
  const items = [
    { key: "today", label: "Home", icon: Home },
    { key: "fixtures", label: "Fixtures", icon: Trophy },
    { key: "standings", label: "Standings", icon: Users },
    { key: "team", label: "Team", icon: Shield },
    { key: "info", label: "Info", icon: Info },
  ];
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        background: C.pitch,
        borderTop: `2px solid ${C.sliotar}`,
        display: "flex",
        zIndex: 20,
      }}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const active = screen === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setScreen(it.key)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              padding: "10px 4px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: active ? C.line : "rgba(255,255,255,0.65)",
              cursor: "pointer",
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} fill={active ? C.line : "none"} />
            <span style={{ fontSize: 10, fontFamily: "Inter, sans-serif", fontWeight: active ? 700 : 500 }}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Header ---------- */
function TopBar({ title, onBack, right }) {
  return (
    <div
      style={{
        background: C.pitch,
        color: C.line,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        position: "sticky",
        top: 0,
        zIndex: 15,
        borderBottom: `2px solid ${C.sliotar}`,
      }}
    >
      {onBack ? (
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.line, cursor: "pointer", padding: 0, flexShrink: 0 }}>
          <ChevronLeft size={22} />
        </button>
      ) : (
        <LogoBadge size={34} ringWidth={2} />
      )}
      <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 18, letterSpacing: 0.3, flex: 1 }}>
        {title}
      </div>
      {right}
    </div>
  );
}

function SponsorStrip({ sponsors, tier }) {
  const list = tier === "gold"
    ? sponsors.filter((s) => s.tier === "gold")
    : sponsors.filter((s) => s.tier === "gold" || s.tier === "silver");
  if (!list.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        padding: "8px 16px",
        borderBottom: `1px solid ${C.pitch}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {list.map((s) => (
        <a
          key={s.id}
          href={s.url || undefined}
          onClick={(e) => !s.url && e.preventDefault()}
          title={s.name}
          style={{
            width: 46,
            height: 46,
            borderRadius: 10,
            background: C.line,
            border: `1.5px solid ${s.tier === "gold" ? C.sliotar : C.ash + "88"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            textDecoration: "none",
          }}
        >
          {s.logo ? (
            <img src={s.logo} alt={s.name} style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 9, color: C.ink, textAlign: "center", lineHeight: 1.05, padding: 2 }}>
              {s.name}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

/* ================= SCREENS ================= */

function WelcomeScreen({ clubs, onChoose, onClose, myClubName }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: C.line,
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`,
          padding: "14px 20px 26px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.14)",
              border: "none",
              borderRadius: 20,
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        <div
          style={{
            width: 150,
            height: 179,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 4,
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))",
          }}
        >
          <img src={BADGE_LOGO} alt="Fingallians Hurling Blitz badge" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        <div
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "5px 14px",
            borderRadius: 20,
            border: "1.5px solid rgba(255,255,255,0.55)",
            background: "rgba(255,255,255,0.1)",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 1,
            color: "#fff",
            textTransform: "uppercase",
          }}
        >
          Fingallians
        </div>

        <div
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 800,
            fontSize: 30,
            color: "#fff",
            textTransform: "uppercase",
            lineHeight: 1.05,
            marginTop: 10,
            letterSpacing: 0.3,
          }}
        >
          Hurling Blitz
        </div>

        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 8, maxWidth: 320 }}>
          Select your club, then explore fixtures, standings, and your food order.
        </div>

        {myClubName && (
          <div
            style={{
              marginTop: 18,
              background: "rgba(0,0,0,0.18)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 1 }}>
              Following
            </div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", marginTop: 2 }}>
              {myClubName}
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", padding: 0, marginTop: 2, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.sliotar, textDecoration: "underline", cursor: "pointer" }}
            >
              Continue with this club
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          marginTop: -14,
          padding: "20px 18px 24px",
        }}
      >
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, textAlign: "center" }}>
          {myClubName ? "Pick a different club" : "Choose your club"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {clubs.map((c) => (
            <button
              key={c.id}
              onClick={() => onChoose(c.id)}
              style={{
                background: "#FFF7F6",
                border: `2px solid ${HERO_BRIGHT}33`,
                borderRadius: 16,
                padding: "18px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                minWidth: 0,
              }}
            >
              <TeamBadge team={c} size={76} />
              <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, color: C.ink, textAlign: "center", lineHeight: 1.25 }}>
                {c.name}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            display: "block",
            width: "100%",
            background: "none",
            border: "none",
            marginTop: 20,
            fontFamily: "Inter, sans-serif",
            fontSize: 12.5,
            color: HERO_BRIGHT,
            fontWeight: 600,
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          Just browsing — continue without a club
        </button>
      </div>
    </div>
  );
}

function TodayScreen({ teams, clubs, matches, announcements, sponsors, setScreen, setSelectedTeam, myClubName, onChangeClub, onOpenWelcome }) {
  const next = matches.find((m) => m.status !== "finished");
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };
  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`, color: C.line, padding: "20px 16px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#fff",
              border: `2px solid ${C.sliotar}`,
              boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img src={BADGE_LOGO} alt="Fingallians badge" style={{ width: "72%", height: "72%", objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, letterSpacing: 1.5, color: "#F5D9A0", textTransform: "uppercase" }}>
              {EVENT.date}
            </div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 19, marginTop: 2, lineHeight: 1.15, letterSpacing: 0.2, textTransform: "uppercase" }}>
              {EVENT.name}
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#E9DAD0", marginTop: 4 }}>{EVENT.venue}</div>

        {myClubName ? (
          <button
            onClick={onChangeClub}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "Inter, sans-serif",
              fontSize: 12.5,
              color: C.sliotar,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Following {myClubName} <span style={{ color: "#E9DAD0", fontWeight: 400 }}>· change</span>
          </button>
        ) : (
          <button
            onClick={onOpenWelcome}
            style={{
              marginTop: 10,
              background: "rgba(255,255,255,0.12)",
              border: `1px solid ${C.sliotar}`,
              borderRadius: 20,
              padding: "6px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "Inter, sans-serif",
              fontSize: 12.5,
              color: C.line,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            👋 Choose your club
          </button>
        )}

        <div
          style={{
            marginTop: 14,
            background: "rgba(245,241,231,0.12)",
            border: `1px solid ${C.sliotar}`,
            borderRadius: 10,
            padding: "10px 12px",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: C.line,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: C.sliotar, fontWeight: 700 }}>Registration by {EVENT.registration}</span> — register, then head to the club ball wall for a team photo.
        </div>
      </div>

      <SponsorStrip sponsors={sponsors} tier="gold" />

      <div style={{ padding: "12px 16px 0" }}>
        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.ash}44`,
            borderRadius: 10,
            padding: "16px 16px",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: C.ink,
            lineHeight: 1.6,
          }}
        >
          {WELCOME_PARAGRAPHS.map((p, i) => (
            <p key={i} style={{ margin: i === 0 ? "0 0 8px" : "0 0 10px" }}>{p}</p>
          ))}
          <p style={{ margin: 0, fontWeight: 700, color: C.pitch }}>{WELCOME_SIGNOFF}</p>
        </div>
      </div>

      <div style={{ padding: "14px 16px 4px" }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>
          Pitch Layout
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 8 }}>
          <img
            src={`/pitch-layout.jpg?v=${CREST_VERSION}`}
            alt="Pitch layout at Lawless Memorial Park — Pitch 1 on the all-weather surface, Pitches 2 and 3 on the main grass pitch"
            style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }}
          />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, marginTop: 8, textAlign: "center" }}>
            Pitch 1 is on the all-weather surface. Pitches 2 and 3 are on the main grass pitch. The ball wall (for team photos) is marked top right.
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 4px" }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>
          The 8 Clubs
        </div>
        <ClubsShowcase clubs={clubs} setScreen={setScreen} />
      </div>

      {announcements.length > 0 && (
        <div style={{ padding: "12px 16px 0" }}>
          {announcements.slice(0, 2).map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                gap: 8,
                background: "#fff",
                border: `1px solid ${C.ash}33`,
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 8,
              }}
            >
              <Megaphone size={16} color={C.sliotar} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink }}>{a.text}</div>
            </div>
          ))}
        </div>
      )}

      {next && (
        <div style={{ padding: "12px 16px 0" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1 }}>
            Next up
          </div>
          <div
            onClick={() => setScreen("fixtures")}
            style={{
              marginTop: 6,
              background: "#fff",
              border: `1px solid ${C.pitch}22`,
              borderRadius: 12,
              padding: 14,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{next.time}</span>
                <PitchBadge pitch={next.pitch} />
              </div>
              <StatusPill status={next.status} />
            </div>
            <MatchRow match={next} teamById={teamById} />
          </div>
        </div>
      )}
    </div>
  );
}

function finalIcon(label) {
  if (!label) return "";
  return label.includes("Shield") ? "🛡️" : "🏆";
}

function MatchRow({ match, teamById }) {
  const aBlank = !match.teamA;
  const bBlank = !match.teamB;

  if (match.finalLabel && (aBlank || bBlank)) {
    const isShield = match.finalLabel.includes("Shield");
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 16, color: C.pitch, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {finalIcon(match.finalLabel)} {match.finalLabel}
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
          Teams to be confirmed — group {isShield ? "runners-up" : "winners"}
        </div>
      </div>
    );
  }

  const a = teamById(match.teamA);
  const b = teamById(match.teamB);
  return (
    <div>
      {match.finalLabel && (
        <div style={{ textAlign: "center", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 11, color: C.sliotar, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
          {finalIcon(match.finalLabel)} {match.finalLabel}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
          <TeamBadge team={a} size={40} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.name}
          </span>
        </div>
        {match.status !== "scheduled" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Scoreline goals={match.goalsA} points={match.pointsA} />
            <span style={{ color: C.inkSoft, fontSize: 11, fontFamily: "Inter, sans-serif" }}>v</span>
            <Scoreline goals={match.goalsB} points={match.pointsB} />
          </div>
        ) : (
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, padding: "0 4px" }}>v</span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
            {b.name}
          </span>
          <TeamBadge team={b} size={40} />
        </div>
      </div>
    </div>
  );
}

function TeamsScreen({ teams, matches, setScreen, setSelectedTeam }) {
  const clubs = [];
  const seen = new Set();
  teams.forEach((t) => {
    const cid = t.clubId || t.id;
    if (!seen.has(cid)) {
      seen.add(cid);
      clubs.push({ clubId: cid, name: t.name.replace(/\s+[AB]$/, ""), town: t.town, county: t.county, color: t.color });
    }
  });

  return (
    <div style={{ padding: 16 }}>
      <TopBar title="Teams" />
      <div style={{ height: 12 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {clubs.map((c) => (
          <div
            key={c.clubId}
            style={{
              background: "#fff",
              border: `1px solid ${C.pitch}22`,
              borderRadius: 14,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <TeamBadge team={c} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 16, color: C.ink, lineHeight: 1.25 }}>
                {c.name}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginBottom: 8 }}>{c.town}, Co. {c.county}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["A", "B"].map((suffix) => (
                  <button
                    key={suffix}
                    onClick={() => {
                      setSelectedTeam(`${c.clubId}${suffix}`);
                      setScreen("teamDetail");
                    }}
                    style={{
                      background: C.turf,
                      color: C.line,
                      border: "none",
                      borderRadius: 8,
                      padding: "7px 16px",
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {suffix} team
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamDetailScreen({ teamId, teams, matches, setScreen }) {
  const team = teams.find((t) => t.id === teamId);
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };
  const teamMatches = matches.filter((m) => m.teamA === teamId || m.teamB === teamId);
  if (!team) return null;
  return (
    <div>
      <TopBar title={team.name} onBack={() => setScreen("teams")} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TeamBadge team={team} size={56} />
          <div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 17, color: C.ink }}>{team.name}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{team.town}, Co. {team.county}</div>
          </div>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Fixtures & results
        </div>
        {teamMatches.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft }}>No fixtures yet.</div>
        )}
        {teamMatches.map((m) => (
          <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{m.time}</span>
                <PitchBadge pitch={m.pitch} />
              </div>
              <StatusPill status={m.status} />
            </div>
            <MatchRow match={m} teamById={teamById} />
          </div>
        ))}
        {team.contact && (
          <div style={{ marginTop: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink }}>
            <b>Team contact:</b> {team.contact}
          </div>
        )}
      </div>
    </div>
  );
}

function ClubsShowcase({ clubs, setScreen }) {
  return (
    <div style={{ background: "#fff", padding: "16px 12px 14px", borderBottom: `1px solid ${C.pitch}14` }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {clubs.map((c) => (
          <button
            key={c.id}
            onClick={() => setScreen("teams")}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              cursor: "pointer",
              padding: 0,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                padding: 3,
                background: `linear-gradient(135deg, ${C.sliotar}, ${c.color})`,
              }}
            >
              <TeamBadge team={c} size={62} />
            </div>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: C.ink, textAlign: "center", lineHeight: 1.2 }}>
              {c.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PitchBadge({ pitch }) {
  const num = (pitch.match(/\d+/) || [])[0] || "?";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: C.pitch,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 700,
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        {num}
      </div>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>Pitch {num}</span>
    </div>
  );
}

function FixturesScreen({ teams, clubs, matches, sponsors, setScreen }) {
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };
  const groupMatches = matches.filter((m) => !m.finalLabel);
  const finals = matches.filter((m) => m.finalLabel);
  const groups = {};
  groupMatches.forEach((m) => {
    groups[m.time] = groups[m.time] || [];
    groups[m.time].push(m);
  });
  return (
    <div>
      <TopBar title="Fixtures" />
      <ClubsShowcase clubs={clubs} setScreen={setScreen} />
      <SponsorStrip sponsors={sponsors} tier="silver" />
      <div style={{ padding: 16 }}>
        {matches.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "30px 0" }}>
            Fixtures will appear here once the organiser adds them.
          </div>
        )}

        {finals.length > 0 && (
          <div
            style={{
              background: `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
              border: `2px solid ${C.sliotar}`,
            }}
          >
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, textAlign: "center" }}>
              🏆 Finals Day
            </div>
            {Object.entries(
              finals.reduce((acc, m) => {
                acc[m.time] = acc[m.time] || [];
                acc[m.time].push(m);
                return acc;
              }, {})
            )
              .sort(([t1], [t2]) => t1.localeCompare(t2))
              .map(([time, ms]) => (
                <div key={time}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "#fff", opacity: 0.85, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    {time} — {ms[0].finalLabel?.includes("Shield") ? "🛡️ Shield Finals" : "🏆 Cup Finals"}
                  </div>
                  {ms.map((m) => (
                    <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <PitchBadge pitch={m.pitch} />
                        <StatusPill status={m.status} />
                      </div>
                      <MatchRow match={m} teamById={teamById} />
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}

        {Object.keys(groups).sort().map((time) => (
          <div key={time} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 14, color: C.pitch, marginBottom: 6 }}>{time}</div>
            {groups[time].map((m) => (
              <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <PitchBadge pitch={m.pitch} />
                  <StatusPill status={m.status} />
                </div>
                <MatchRow match={m} teamById={teamById} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function computeStandings(teams, matches) {
  const table = {};
  teams.forEach((t) => {
    table[t.id] = { id: t.id, name: t.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 };
  });
  const headToHead = {}; // key `${a}-${b}` -> winner id
  matches.filter((m) => m.status === "finished").forEach((m) => {
    const ta = table[m.teamA];
    const tb = table[m.teamB];
    if (!ta || !tb) return;
    const sa = scoreTotal(m.goalsA, m.pointsA);
    const sb = scoreTotal(m.goalsB, m.pointsB);
    ta.played++;
    tb.played++;
    if (sa > sb) {
      ta.won++; ta.points += 3; tb.lost++;
      headToHead[`${m.teamA}-${m.teamB}`] = m.teamA;
      headToHead[`${m.teamB}-${m.teamA}`] = m.teamA;
    } else if (sb > sa) {
      tb.won++; tb.points += 3; ta.lost++;
      headToHead[`${m.teamA}-${m.teamB}`] = m.teamB;
      headToHead[`${m.teamB}-${m.teamA}`] = m.teamB;
    } else {
      ta.drawn++; tb.drawn++; ta.points += 1; tb.points += 1;
    }
  });
  const rows = Object.values(table).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const hh = headToHead[`${x.id}-${y.id}`];
    if (hh === x.id) return -1;
    if (hh === y.id) return 1;
    return 0;
  });
  return rows;
}

function computeGroups(teams, matches) {
  // Two teams are in the same group if they've been drawn against each other in
  // the group stage — connected components of that "has played" graph = the groups.
  // This is derived from the fixtures themselves, so it stays correct even if an
  // admin edits fixtures by hand rather than using the auto-generator.
  const groupMatches = matches.filter((m) => !m.finalLabel && m.teamA && m.teamB);
  const parent = {};
  teams.forEach((t) => {
    parent[t.id] = t.id;
  });
  const find = (x) => {
    while (parent[x] !== x) x = parent[x];
    return x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  groupMatches.forEach((m) => union(m.teamA, m.teamB));

  const buckets = {};
  teams.forEach((t) => {
    const root = find(t.id);
    buckets[root] = buckets[root] || [];
    buckets[root].push(t);
  });
  return Object.values(buckets).filter((g) => g.length > 1);
}

function StandingsScreen({ teams, matches, sponsors }) {
  const groupedTeams = computeGroups(teams, matches);
  let aCount = 0, bCount = 0;
  const labeled = groupedTeams
    .map((g) => {
      const grade = g[0].id.endsWith("A") ? "A" : "B";
      const num = grade === "A" ? ++aCount : ++bCount;
      return { grade, num, teams: g };
    })
    .sort((x, y) => (x.grade === y.grade ? x.num - y.num : x.grade.localeCompare(y.grade)));

  return (
    <div>
      <TopBar title="Standings" />
      <SponsorStrip sponsors={sponsors} tier="silver" />
      <div style={{ padding: 16 }}>
        {labeled.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "30px 0" }}>
            Group tables will appear here once fixtures are added and results come in.
          </div>
        )}

        {labeled.length > 0 && (
          <div style={{ background: "#fff", border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", gap: 14, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>🏆</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.ink }}>1st place → Cup Final</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.ink }}>2nd place → Shield Final</span>
            </div>
          </div>
        )}

        {labeled.map((grp) => {
          const rows = computeStandings(grp.teams, matches);
          return (
            <div key={`${grp.grade}${grp.num}`} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>
                {grp.grade} Grade — Group {grp.num}
              </div>
              <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.3fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr", background: C.turf, color: C.line, fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, padding: "9px 8px", textTransform: "uppercase" }}>
                  <div>Team</div><div style={{ textAlign: "center" }}>P</div><div style={{ textAlign: "center" }}>W</div><div style={{ textAlign: "center" }}>D</div><div style={{ textAlign: "center" }}>L</div><div style={{ textAlign: "center" }}>Pts</div>
                </div>
                {rows.map((r, i) => {
                  const teamObj = teams.find((t) => t.id === r.id);
                  const started = r.played > 0;
                  const isCup = i === 0 && started;
                  const isShield = i === 1 && started;
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2.3fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr",
                        padding: "9px 8px",
                        borderTop: `1px solid ${C.pitch}14`,
                        alignItems: "center",
                        background: isCup ? `${C.sliotar}22` : isShield ? `${C.pitch}0F` : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12.5, color: C.inkSoft, flexShrink: 0 }}>{i + 1}</span>
                        {teamObj && <TeamBadge team={teamObj} size={26} />}
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.name}
                        </span>
                        {isCup && <span style={{ fontSize: 13, flexShrink: 0 }}>🏆</span>}
                        {isShield && <span style={{ fontSize: 13, flexShrink: 0 }}>🛡️</span>}
                      </div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.played}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.won}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.drawn}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.lost}</div>
                      <div style={{ textAlign: "center", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 14, color: C.pitch }}>{r.points}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 6, fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, lineHeight: 1.5 }}>
          Win = 3 pts, draw = 1 pt, loss = 0. Score difference is not used as a tiebreaker — level teams are separated by head-to-head result, then a coin toss. 🏆 marks the team currently on course for the Cup Final (1st in group), 🛡️ for the Shield Final (2nd in group).
        </div>
      </div>
    </div>
  );
}

function InfoScreen({ sponsors }) {
  const items = [
    {
      title: "Arrival & registration",
      body: "Teams are to arrive by 9:15 a.m. for registration at Lawless Park, Fingallians. On arrival, register your team then proceed to the club ball wall for a team photo.",
    },
    {
      title: "Food & beverages",
      body: "Please bring your own water bottles — a refill station is outside the changing rooms. On arrival each team is given vouchers for players and mentors for burgers from the BBQ at lunchtime (teams called individually to avoid queues), plus vouchers for tea or coffee for mentors. Teas, coffees and breakfast sausage rolls are also available to purchase from the BBQ through the day. A separate BBQ area is open for anyone wanting to buy a burger later on.",
    },
    {
      title: "Parking & directions",
      body: "Limited car parking is available at Fingallians GAA, and buses are welcome to park on site. Overflow parking has been kindly provided by the HSE at Swords Business Campus, a short ten-minute walk from the grounds — stewards will be on duty at both locations to guide you.",
      map: true,
    },
    {
      title: "Facilities & medical",
      body: "The Order of Malta will provide medical assistance at the entrance to the main pitch — teams are welcome to bring their own first aid kits too. Toilets are at the Fingallians clubhouse through the changing-room entrance. Tents, gazebos or changing rooms will be allocated to visiting teams where available, for storing kit bags. Main-pitch matches can be viewed from the hill on the far side of the pitch; all-weather matches can be watched from outside the pitch.",
    },
    {
      title: "Playing rules",
      list: [
        "Teams of 11 with unlimited substitution, panel size 15.",
        "Matches: 10 minutes per half, 20 minutes total, with 3 minutes for half-time.",
        "3 points for a win, 1 for a draw, 0 for a loss. There will be 65's.",
        "On taking possession a player may take 4 steps, max 8 steps solo running, then 4 steps to play away — 16 steps maximum from possession to striking the sliotar.",
        "The player who is fouled takes the free. The player closest to the line ball takes the sideline cut.",
        "Goalkeepers may take up to 5 steps for puck-outs.",
        "Unlimited substitutions during stoppages, with the referee's consent, from the centre point of each sideline.",
        "Abuse of referees or officials results in expulsion. Coaches and mentors must not encroach onto the field of play.",
        "Tied teams at end of group stage: separated by (a) previous head-to-head result, in the order of the excel table, then (b) a coin toss. Points difference is not considered.",
        "If level at the end of the final, extra time of 2 x 5 minutes per half is played; if still level, play restarts from the middle and next score wins.",
        "Jersey clash: one team turns their jersey inside out or wears bibs — please bring a set of bibs.",
        "A straight red card disqualifies a player from the rest of the blitz; two yellow cards disqualify a player from the rest of that game.",
        "The organising committee's decision on all matters is binding, including the right to amend the blitz structure.",
      ],
      note: "Scoring: 3 points for a goal, 1 point for a point over the bar. It's not about winning — the goal is for every child to enjoy the day. If there's a clear skill gap between teams, please rest your best players or focus on certain skills to keep matches competitive.",
    },
    {
      title: "Communications",
      body: "In the days leading up to the festival a lead-mentors WhatsApp group is set up. Any updates arising during the day are circulated through that group — and through the Announcements on the Today tab of this app.",
    },
  ];
  return (
    <div>
      <TopBar title="Event info" />
      <div style={{ padding: 16 }}>
        {items.map((it) => (
          <div key={it.title} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 15, color: C.ink, marginBottom: 6 }}>{it.title}</div>
            {it.body && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>{it.body}</div>}
            {it.list && (
              <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.6 }}>
                {it.list.map((li, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{li}</li>
                ))}
              </ul>
            )}
            {it.note && (
              <div style={{ marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.pitch, fontWeight: 600, lineHeight: 1.5 }}>
                {it.note}
              </div>
            )}
            {it.map && (
              <a
                href="https://maps.google.com/?q=HSE+Swords+Business+Campus"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  background: C.pitch,
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <MapPin size={14} /> Open overflow parking in Maps
              </a>
            )}
          </div>
        ))}

        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, margin: "18px 0 12px" }}>
          Thank You to Our Sponsors
        </div>

        {["gold", "silver", "supporter"].map((tierKey) => {
          const inTier = sponsors.filter((s) => s.tier === tierKey);
          if (!inTier.length) return null;
          const tierLabel = tierKey === "gold" ? "Main Sponsors" : tierKey === "silver" ? "Silver Sponsors" : "Supporters";
          const cardSize = tierKey === "gold" ? 76 : tierKey === "silver" ? 56 : 40;
          return (
            <div key={tierKey} style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {tierLabel}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {inTier.map((s) => (
                  <a
                    key={s.id}
                    href={s.url || undefined}
                    onClick={(e) => !s.url && e.preventDefault()}
                    style={{
                      background: "#fff",
                      border: `1px solid ${tierKey === "gold" ? C.sliotar : C.pitch + "22"}`,
                      borderRadius: 12,
                      padding: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: cardSize,
                      minWidth: tierKey === "supporter" ? 100 : 130,
                      flex: tierKey === "gold" ? "1 1 45%" : "0 0 auto",
                      textDecoration: "none",
                    }}
                  >
                    {s.logo ? (
                      <img src={s.logo} alt={s.name} style={{ maxWidth: "100%", maxHeight: cardSize - 20, objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: tierKey === "supporter" ? 12 : 14, color: C.ink, textAlign: "center" }}>
                        {s.name}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Food ordering (coach view) ---------- */
function Stepper({ label, value, onChange, sub }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{sub}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.pitch}33`, background: C.line, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Minus size={18} color={C.pitch} />
        </button>
        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 22, minWidth: 34, textAlign: "center", color: C.ink }}>{value}</div>
        <button
          onClick={() => onChange(value + 1)}
          style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: C.pitch, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Plus size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function FoodScreen({ clubs, orders, saveOrder, sponsors, defaultClubId, embedded }) {
  const [clubId, setClubId] = useState(defaultClubId || null);
  const [order, setOrder] = useState(null);
  const [saved, setSaved] = useState(false);
  const [authedClub, setAuthedClub] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);

  useEffect(() => {
    setAuthedClub(false);
    setPasscode("");
    setPasswordError(false);
  }, [clubId]);

  useEffect(() => {
    if (clubId) {
      setOrder(
        orders[clubId] || {
          contactName: "",
          mobile: "",
          players: 0,
          mentors: 0,
          sausageRolls: 0,
          burgers: 0,
          collectionTime: "",
          paid: false,
        }
      );
      setSaved(false);
    }
  }, [clubId]);

  if (!clubId && !embedded) {
    return (
      <div>
        <TopBar title="Food ordering" />
        <SponsorStrip sponsors={sponsors} tier="silver" />
        <div style={{ padding: 16 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>
            On the day each club gets its own private link straight to this form. For now, pick your club below.
          </div>
          {clubs.map((t) => (
            <button
              key={t.id}
              onClick={() => setClubId(t.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#fff",
                border: `1px solid ${C.pitch}22`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <TeamBadge team={t} size={34} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: C.ink }}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!clubId) return null; // embedded with no club yet — parent handles the prompt

  const team = clubs.find((t) => t.id === clubId);

  if (!authedClub) {
    return (
      <div style={embedded ? {} : { padding: 16 }}>
        {!embedded && <TopBar title={team.name} onBack={() => setClubId(null)} />}
        <div style={{ marginTop: embedded ? 0 : 20, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <TeamBadge team={team} size={40} />
            <div>
              <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 15, color: C.ink }}>{team.name}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>Enter your club password to view or edit the food order. Don't have it? Contact your team mentor.</div>
            </div>
          </div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              type={showPasscode ? "text" : "password"}
              placeholder="Club password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setPasswordError(false);
              }}
              style={{ width: "100%", padding: "12px 42px 12px 12px", borderRadius: 8, border: `1px solid ${passwordError ? C.pitch : C.pitch + "33"}`, fontFamily: "Inter, sans-serif" }}
            />
            <button
              type="button"
              onClick={() => setShowPasscode((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}
            >
              {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {passwordError && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, marginBottom: 8 }}>
              That doesn't match — contact your team mentor for the club password.
            </div>
          )}
          <button
            onClick={() => {
              if (checkPassword(passcode, CLUB_PASSWORDS[clubId])) {
                setAuthedClub(true);
              } else {
                setPasswordError(true);
              }
            }}
            style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
          >
            Unlock order
          </button>
        </div>
      </div>
    );
  }

  const set = (k, v) => setOrder((o) => ({ ...o, [k]: v }));
  const totalLunches = order?.burgers || 0;

  return (
    <div style={{ paddingBottom: embedded ? 10 : 90 }}>
      {!embedded && <TopBar title={team.name} onBack={() => setClubId(null)} />}
      <div style={embedded ? {} : { padding: 16 }}>
        <div style={{ background: C.turf, color: C.line, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 16 }}>{team.name} — food order</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#E9DAD0", marginTop: 4 }}>Order by 15 August</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#E9DAD0", marginTop: 8, lineHeight: 1.5 }}>{MENTOR_BURGER_NOTE}</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            placeholder="Contact name"
            value={order?.contactName || ""}
            onChange={(e) => set("contactName", e.target.value)}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 14 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            placeholder="Mobile number"
            value={order?.mobile || ""}
            onChange={(e) => set("mobile", e.target.value)}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 14 }}
          />
        </div>

        <Stepper label="Players" value={order?.players || 0} onChange={(v) => set("players", v)} />
        <Stepper label="Mentors" value={order?.mentors || 0} onChange={(v) => set("mentors", v)} />
        <Stepper label="Breakfast sausage rolls" value={order?.sausageRolls || 0} onChange={(v) => set("sausageRolls", v)} sub="Purchased from the BBQ — let us know how many to have ready" />
        <Stepper label="Beef burger headcount" value={order?.burgers || 0} onChange={(v) => set("burgers", v)} sub="Vouchered — confirm numbers for catering" />

        <div style={{ background: C.line, border: `1px solid ${C.ash}55`, borderRadius: 12, padding: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: C.ink }}>Total lunch headcount</span>
          <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 22, color: C.pitch }}>{totalLunches}</span>
        </div>

        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.pitch, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            <Check size={16} /> Order saved. Reopen this link any time to amend it.
          </div>
        )}

        <button
          onClick={async () => {
            await saveOrder(clubId, order);
            setSaved(true);
          }}
          style={{
            width: "100%",
            background: C.sliotar,
            color: C.ink,
            border: "none",
            borderRadius: 30,
            padding: "14px 20px",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: 0.5,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(238,180,59,0.4)",
          }}
        >
          Save order
        </button>
      </div>
    </div>
  );
}

function TeamScreen({ teams, clubs, matches, orders, saveOrder, sponsors, myClub, myClubName, onOpenWelcome, onChangeClub }) {
  if (!myClub) {
    return (
      <div>
        <TopBar title="My Team" />
        <div style={{ padding: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>👋</div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 6 }}>
              Choose your club to get started
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 18, lineHeight: 1.5 }}>
              See your team's fixtures, standing, and food order all in one place.
            </div>
            <button
              onClick={onOpenWelcome}
              style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: "12px 28px", fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Choose your club
            </button>
          </div>
        </div>
      </div>
    );
  }

  const club = clubs.find((c) => c.id === myClub);
  const teamA = teams.find((t) => t.id === `${myClub}A`);
  const teamB = teams.find((t) => t.id === `${myClub}B`);
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };
  const myTeamIds = [teamA?.id, teamB?.id].filter(Boolean);
  const clubMatches = matches
    .filter((m) => myTeamIds.includes(m.teamA) || myTeamIds.includes(m.teamB))
    .sort((a, b) => a.time.localeCompare(b.time));

  const groupedTeams = computeGroups(teams, matches);
  const groupInfoFor = (teamId) => {
    const grp = groupedTeams.find((g) => g.some((t) => t.id === teamId));
    if (!grp) return null;
    const rows = computeStandings(grp, matches);
    const idx = rows.findIndex((r) => r.id === teamId);
    if (idx === -1) return null;
    return { position: idx + 1, total: rows.length, points: rows[idx].points, played: rows[idx].played };
  };
  const infoA = teamA ? groupInfoFor(teamA.id) : null;
  const infoB = teamB ? groupInfoFor(teamB.id) : null;

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar title={club?.name || "My Team"} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          {club && <TeamBadge team={club} size={52} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>{club?.name}</div>
            <button
              onClick={onChangeClub}
              style={{ background: "none", border: "none", padding: 0, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.pitch, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
            >
              Not your club? Change
            </button>
          </div>
        </div>

        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>
          Your Standing
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[{ label: "A Team", info: infoA }, { label: "B Team", info: infoB }].map(({ label, info }) => (
            <div key={label} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, textAlign: "center" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
              {info ? (
                <>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 20, color: C.pitch }}>
                    {info.position === 1 ? "🏆 " : info.position === 2 ? "🛡️ " : ""}{info.position}{info.position === 1 ? "st" : info.position === 2 ? "nd" : info.position === 3 ? "rd" : "th"}
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>of {info.total} · {info.points} pts</div>
                </>
              ) : (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, padding: "6px 0" }}>Not started</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>
          Your Fixtures
        </div>
        {clubMatches.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 20 }}>
            No fixtures yet for your club — check back once the organiser adds them.
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          {clubMatches.map((m) => (
            <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{m.time}</span>
                  <PitchBadge pitch={m.pitch} />
                </div>
                <StatusPill status={m.status} />
              </div>
              <MatchRow match={m} teamById={teamById} />
            </div>
          ))}
        </div>

        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>
          Food Order
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14 }}>
          <FoodScreen clubs={clubs} orders={orders} saveOrder={saveOrder} sponsors={sponsors} defaultClubId={myClub} embedded />
        </div>
      </div>
    </div>
  );
}

/* ---------- Fixture generator: A teams and B teams grouped separately, 3 pitches, plus finals ---------- */
const PITCHES = ["Pitch 1", "Pitch 2", "Pitch 3"];
const SLOT_MINUTES = 25;
const START_HOUR = 10;
const START_MIN = 0;

// Round-robin for a group of 4 via the circle method: 3 rounds, each with 2 matches
// that between them use all 4 teams (so they can run in parallel on different pitches).
const roundRobin4 = (g) => [
  [[g[0], g[1]], [g[2], g[3]]],
  [[g[0], g[2]], [g[1], g[3]]],
  [[g[0], g[3]], [g[1], g[2]]],
];

function minutesToLabel(totalMin) {
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateGroupFixtures(teams) {
  // Keep grades separate — A teams only ever play A teams, B only ever play B.
  const aTeams = shuffle(teams.filter((t) => t.id.endsWith("A")));
  const bTeams = shuffle(teams.filter((t) => t.id.endsWith("B")));

  // Each grade (8 teams) splits into 2 groups of 4. Shuffling first means the
  // same club's A and B teams don't always land in the same-numbered group,
  // and re-running the generator gives a fresh draw rather than the same
  // fixed pairing every time.
  const groupsA = [[], []];
  aTeams.forEach((t, i) => groupsA[i % 2].push(t));
  const groupsB = [[], []];
  bTeams.forEach((t, i) => groupsB[i % 2].push(t));

  let pool = [];
  [...groupsA, ...groupsB].forEach((g) => {
    roundRobin4(g).forEach((round) => {
      round.forEach(([a, b]) => pool.push({ a, b }));
    });
  });

  const fixtures = [];
  let slotIndex = 0;
  let guard = 0;
  const lastPlayedSlot = {}; // teamId -> slot index they last played in

  while (pool.length && guard < 200) {
    guard++;
    const used = new Set();
    const slotMatches = [];

    // Only take matches where neither team played in the immediately preceding
    // slot. No fallback that allows back-to-back — the rest gap is absolute.
    for (let i = 0; i < pool.length && slotMatches.length < PITCHES.length; i++) {
      const m = pool[i];
      const aRested = lastPlayedSlot[m.a.id] === undefined || lastPlayedSlot[m.a.id] < slotIndex - 1;
      const bRested = lastPlayedSlot[m.b.id] === undefined || lastPlayedSlot[m.b.id] < slotIndex - 1;
      if (!used.has(m.a.id) && !used.has(m.b.id) && aRested && bRested) {
        slotMatches.push(m);
        used.add(m.a.id);
        used.add(m.b.id);
        pool.splice(i, 1);
        i--;
      }
    }

    if (slotMatches.length === 0) {
      // Nobody eligible to rest into this slot yet (everyone just played) —
      // skip the slot forward rather than forcing a back-to-back match.
      slotIndex++;
      continue;
    }

    const timeLabel = minutesToLabel(START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES);

    slotMatches.forEach((m, pi) => {
      lastPlayedSlot[m.a.id] = slotIndex;
      lastPlayedSlot[m.b.id] = slotIndex;
      fixtures.push({
        id: `m${Date.now()}_${fixtures.length}_${Math.random().toString(36).slice(2, 6)}`,
        time: timeLabel,
        pitch: PITCHES[pi],
        teamA: m.a.id,
        teamB: m.b.id,
        goalsA: 0,
        pointsA: 0,
        goalsB: 0,
        pointsB: 0,
        status: "scheduled",
      });
    });
    slotIndex++;
  }

  // Finals — teams left blank until group placings are known.
  // Cup (group winners) get the main pitch first; Shield (runners-up) follow
  // in the next slot on the same two pitches. Both grades' finals run in parallel.
  const cupTime = minutesToLabel(START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES);
  fixtures.push({
    id: `final-acup-${Date.now()}`,
    time: cupTime,
    pitch: "Pitch 2",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "A Cup Final",
  });
  fixtures.push({
    id: `final-bcup-${Date.now()}`,
    time: cupTime,
    pitch: "Pitch 3",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "B Cup Final",
  });

  const shieldTime = minutesToLabel(START_HOUR * 60 + START_MIN + (slotIndex + 1) * SLOT_MINUTES);
  fixtures.push({
    id: `final-ashield-${Date.now()}`,
    time: shieldTime,
    pitch: "Pitch 2",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "A Shield Final",
  });
  fixtures.push({
    id: `final-bshield-${Date.now()}`,
    time: shieldTime,
    pitch: "Pitch 3",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "B Shield Final",
  });

  return fixtures;
}

/* ---------- Admin ---------- */
function AdminScreen({ teams, clubs, matches, setMatches, orders, announcements, setAnnouncements, sponsors, setSponsors, persist, auditLog, logAction }) {
  const [authed, setAuthed] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [tab, setTab] = useState("orders");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [newFixture, setNewFixture] = useState({ time: "", pitch: "", teamA: "", teamB: "" });

  if (!authed) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title="Organiser login" />
        <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Lock size={16} color={C.pitch} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft }}>Organisers only</span>
          </div>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <input
              type={showCode ? "text" : "password"}
              placeholder="Passcode"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setLoginError(false);
              }}
              style={{ width: "100%", padding: "12px 42px 12px 12px", borderRadius: 8, border: `1px solid ${loginError ? C.pitch : C.pitch + "33"}`, fontFamily: "Inter, sans-serif" }}
            />
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}
            >
              {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {loginError && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, marginBottom: 8 }}>
              That passcode isn't recognised.
            </div>
          )}
          <button
            onClick={() => {
              const name = findAdminByCode(code);
              if (name) {
                setAdminName(name);
                setAuthed(true);
                logAction(name, "Logged in");
              } else {
                setLoginError(true);
              }
            }}
            style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  const totals = clubs.reduce(
    (acc, t) => {
      const o = orders[t.id];
      if (!o) return acc;
      acc.sausageRolls += o.sausageRolls || 0;
      acc.burgers += o.burgers || 0;
      return acc;
    },
    { sausageRolls: 0, burgers: 0 }
  );

  const updateMatch = (id, patch) => {
    const next = matches.map((m) => (m.id === id ? { ...m, ...patch } : m));
    setMatches(next);
    persist("matches", next);
    const m = matches.find((x) => x.id === id);
    if (m) {
      if (patch.teamA !== undefined || patch.teamB !== undefined) {
        const updated = { ...m, ...patch };
        const a = teams.find((t) => t.id === updated.teamA);
        const b = teams.find((t) => t.id === updated.teamB);
        logAction(adminName, `Set ${m.finalLabel || "fixture"} teams: ${a?.name || "TBC"} v ${b?.name || "TBC"}`);
        return;
      }
      const a = teams.find((t) => t.id === m.teamA);
      const b = teams.find((t) => t.id === m.teamB);
      const label = `${a?.name || m.teamA || "TBC"} v ${b?.name || m.teamB || "TBC"}`;
      if (patch.status) {
        logAction(adminName, `Marked ${label} as ${patch.status}`);
      } else {
        const updated = { ...m, ...patch };
        logAction(adminName, `Updated score for ${label}: ${scoreLabel(updated.goalsA, updated.pointsA)} - ${scoreLabel(updated.goalsB, updated.pointsB)}`);
      }
    }
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar
        title="Organiser dashboard"
        right={
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.line, opacity: 0.85 }}>
            {adminName}
          </span>
        }
      />
      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto" }}>
        {["orders", "fixtures", "announcements", "sponsors", "log"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: `1px solid ${C.pitch}33`,
              background: tab === t ? C.pitch : "#fff",
              color: tab === t ? "#fff" : C.ink,
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              ["Sausage rolls", totals.sausageRolls],
              ["Beef burgers", totals.burgers],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 26, color: C.pitch }}>{val}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 8 }}>
            Per club
          </div>
          {clubs.map((t) => {
            const o = orders[t.id];
            return (
              <div key={t.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink }}>{t.name}</span>
                  {o ? (
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: o.paid ? C.inkSoft : C.pitch, fontWeight: 700 }}>
                      {o.paid ? "Paid" : "Unpaid"}
                    </span>
                  ) : (
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>No order yet</span>
                  )}
                </div>
                {o && (
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
                    {o.contactName} · {o.mobile} · {o.sausageRolls} sausage rolls, {o.burgers} beef burgers
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "fixtures" && (
        <div style={{ padding: 16 }}>
          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              ⚡ Auto-generate the full schedule
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Splits the 8 A teams and 8 B teams into their own groups of 4 (As only ever play As, Bs only ever play Bs), round-robins within each group (24 group matches total), and spreads them across your 3 pitches at 25-minute intervals from 10:00 — no team double-booked in the same slot, and every team is guaranteed at least one rest slot between its own matches (a pitch may sit idle for a slot rather than ever break this). Adds 4 finals on the main pitch (Pitch 2 and 3): A Cup, B Cup (group winners), then A Shield, B Shield (group runners-up) 25 minutes later. All teams left blank until group placings are known. This replaces any fixtures currently listed below.
            </div>
            <button
              onClick={() => {
                const next = generateGroupFixtures(teams);
                setMatches(next);
                persist("matches", next);
                logAction(adminName, `Auto-generated the full 24-match schedule (replaced ${matches.length} existing fixture${matches.length === 1 ? "" : "s"})`);
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Generate schedule (24 group + 4 finals)
            </button>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 8 }}>
              Add fixture
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input
                placeholder="Time e.g. 9:30"
                value={newFixture.time}
                onChange={(e) => setNewFixture((f) => ({ ...f, time: e.target.value }))}
                style={{ flex: 1, padding: 9, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              />
              <select
                value={newFixture.pitch}
                onChange={(e) => setNewFixture((f) => ({ ...f, pitch: e.target.value }))}
                style={{ flex: 1, padding: 9, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              >
                <option value="">Pitch…</option>
                {PITCHES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              <select
                value={newFixture.teamA}
                onChange={(e) => setNewFixture((f) => ({ ...f, teamA: e.target.value, teamB: f.teamB && f.teamB.slice(-1) !== e.target.value.slice(-1) ? "" : f.teamB }))}
                style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              >
                <option value="">Team A…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>v</div>
              <select
                value={newFixture.teamB}
                onChange={(e) => setNewFixture((f) => ({ ...f, teamB: e.target.value }))}
                style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              >
                <option value="">Team B…</option>
                {(newFixture.teamA ? teams.filter((t) => t.id.slice(-1) === newFixture.teamA.slice(-1)) : teams).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {newFixture.teamA && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>
                  Team B is filtered to {newFixture.teamA.endsWith("A") ? "A" : "B"} teams only — As only play As, Bs only play Bs.
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (!newFixture.teamA || !newFixture.teamB || newFixture.teamA === newFixture.teamB) return;
                const fixture = {
                  id: `m${Date.now()}`,
                  time: newFixture.time || "TBC",
                  pitch: newFixture.pitch || "TBC",
                  teamA: newFixture.teamA,
                  teamB: newFixture.teamB,
                  goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
                  status: "scheduled",
                };
                const next = [...matches, fixture];
                setMatches(next);
                persist("matches", next);
                const a = teams.find((t) => t.id === newFixture.teamA);
                const b = teams.find((t) => t.id === newFixture.teamB);
                logAction(adminName, `Added fixture: ${a?.name || newFixture.teamA} v ${b?.name || newFixture.teamB} (${fixture.time}, ${fixture.pitch})`);
                setNewFixture({ time: "", pitch: "", teamA: "", teamB: "" });
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 10, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              + Add fixture
            </button>
          </div>

          {matches.length === 0 && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "20px 0" }}>
              No fixtures yet — add the first one above.
            </div>
          )}

          {matches.map((m) => {
            const a = teams.find((t) => t.id === m.teamA);
            const b = teams.find((t) => t.id === m.teamB);
            // Work out which grade this fixture is restricted to, if any.
            const grade = m.finalLabel?.startsWith("A ") ? "A" : m.finalLabel?.startsWith("B ") ? "B" : m.teamA ? m.teamA.slice(-1) : m.teamB ? m.teamB.slice(-1) : null;
            const teamOptions = grade ? teams.filter((t) => t.id.endsWith(grade)) : teams;
            return (
              <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>{m.time}</span>
                    <PitchBadge pitch={m.pitch} />
                    {m.finalLabel && (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: C.sliotar, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {finalIcon(m.finalLabel)} {m.finalLabel}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const next = matches.filter((x) => x.id !== m.id);
                      setMatches(next);
                      persist("matches", next);
                      logAction(adminName, `Deleted fixture: ${a?.name || m.teamA || "TBC"} v ${b?.name || m.teamB || "TBC"} (${m.time}, ${m.pitch})`);
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                  <select
                    value={m.teamA}
                    onChange={(e) => updateMatch(m.id, { teamA: e.target.value })}
                    style={{ flex: 1, minWidth: 0, padding: 7, borderRadius: 6, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 11.5 }}
                  >
                    <option value="">TBC…</option>
                    {teamOptions.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, flexShrink: 0 }}>v</span>
                  <select
                    value={m.teamB}
                    onChange={(e) => updateMatch(m.id, { teamB: e.target.value })}
                    style={{ flex: 1, minWidth: 0, padding: 7, borderRadius: 6, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 11.5 }}
                  >
                    <option value="">TBC…</option>
                    {teamOptions.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                  <MiniScoreInput label="G" value={m.goalsA} onChange={(v) => updateMatch(m.id, { goalsA: v })} />
                  <MiniScoreInput label="P" value={m.pointsA} onChange={(v) => updateMatch(m.id, { pointsA: v })} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft }}>v</span>
                  <MiniScoreInput label="G" value={m.goalsB} onChange={(v) => updateMatch(m.id, { goalsB: v })} />
                  <MiniScoreInput label="P" value={m.pointsB} onChange={(v) => updateMatch(m.id, { pointsB: v })} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["scheduled", "live", "finished"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateMatch(m.id, { status: s })}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 20,
                        border: `1px solid ${C.pitch}33`,
                        background: m.status === s ? C.pitch : "#fff",
                        color: m.status === s ? "#fff" : C.ink,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "announcements" && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              placeholder="New announcement"
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
            />
            <button
              onClick={() => {
                if (!newAnnouncement.trim()) return;
                const next = [{ id: `a${Date.now()}`, text: newAnnouncement, time: new Date().toLocaleTimeString().slice(0, 5) }, ...announcements];
                setAnnouncements(next);
                persist("announcements", next);
                logAction(adminName, `Posted announcement: "${newAnnouncement}"`);
                setNewAnnouncement("");
              }}
              style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
            >
              Post
            </button>
          </div>
          {announcements.map((a) => (
            <div key={a.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink }}>{a.text}</span>
              <button
                onClick={() => {
                  const next = announcements.filter((x) => x.id !== a.id);
                  setAnnouncements(next);
                  persist("announcements", next);
                  logAction(adminName, `Deleted announcement: "${a.text}"`);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "sponsors" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
            Paste a hosted image URL for each logo (e.g. from their website, or an image you've uploaded to Google Drive/Imgur with public sharing on). Leave it blank and the sponsor's name shows instead.
          </div>
          {sponsors.map((s, i) => {
            const update = (patch) => {
              const next = sponsors.map((x, j) => (j === i ? { ...x, ...patch } : x));
              setSponsors(next);
              persist("sponsors", next);
            };
            return (
              <div key={s.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input
                    value={s.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Sponsor name"
                    style={{ flex: 1, border: `1px solid ${C.pitch}22`, borderRadius: 6, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700 }}
                  />
                  <button
                    onClick={() => {
                      const next = sponsors.filter((_, j) => j !== i);
                      setSponsors(next);
                      persist("sponsors", next);
                      logAction(adminName, `Removed sponsor: ${s.name}`);
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={s.url}
                  onChange={(e) => update({ url: e.target.value })}
                  placeholder="Website URL (optional)"
                  style={{ width: "100%", border: `1px solid ${C.pitch}22`, borderRadius: 6, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 12, marginBottom: 6 }}
                />
                <input
                  value={s.logo}
                  onChange={(e) => update({ logo: e.target.value })}
                  placeholder="Logo image URL (optional)"
                  style={{ width: "100%", border: `1px solid ${C.pitch}22`, borderRadius: 6, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 12, marginBottom: 8 }}
                />
                {s.logo && (
                  <div style={{ marginBottom: 8, padding: 8, background: C.line, borderRadius: 6, display: "flex", justifyContent: "center" }}>
                    <img src={s.logo} alt={s.name} style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  {["gold", "silver", "supporter"].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => {
                        update({ tier });
                        if (s.tier !== tier) logAction(adminName, `Changed ${s.name} to ${tier} tier`);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 20,
                        border: `1px solid ${C.ash}55`,
                        background: s.tier === tier ? C.ash : "#fff",
                        color: s.tier === tier ? "#fff" : C.ink,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <button
            onClick={() => {
              const next = [...sponsors, { id: `s${Date.now()}`, name: "New sponsor", tier: "supporter", url: "", logo: "" }];
              setSponsors(next);
              persist("sponsors", next);
              logAction(adminName, "Added a new sponsor slot");
            }}
            style={{ width: "100%", background: "#fff", border: `1px dashed ${C.pitch}55`, borderRadius: 10, padding: 12, fontFamily: "Inter, sans-serif", color: C.pitch, fontWeight: 700, cursor: "pointer" }}
          >
            + Add sponsor
          </button>
        </div>
      )}

      {tab === "log" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
            Every score update, fixture change, announcement, sponsor edit, and login — most recent first. Kept to the last 300 entries.
          </div>
          {auditLog.length === 0 && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "20px 0" }}>
              Nothing logged yet — changes will show up here as they're made.
            </div>
          )}
          {auditLog.map((entry) => {
            const d = new Date(entry.time);
            const timeLabel = isNaN(d.getTime()) ? entry.time : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={entry.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 12.5, color: C.pitch }}>{entry.admin}</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{timeLabel}</span>
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink }}>{entry.action}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniScoreInput({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: C.inkSoft }}>{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))}
        style={{ width: 36, padding: 6, borderRadius: 6, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13, textAlign: "center" }}
      />
    </div>
  );
}

function playAnnouncementDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.75);
    });
  } catch {
    // Web Audio unavailable or blocked — fail silently, the modal still shows.
  }
}

/* ================= APP ================= */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [teams, setTeams] = useState(DEFAULT_TEAMS);
  const [matches, setMatches] = useState(DEFAULT_MATCHES);
  const [orders, setOrders] = useState(DEFAULT_ORDERS);
  const [announcements, setAnnouncements] = useState(DEFAULT_ANNOUNCEMENTS);
  const [sponsors, setSponsors] = useState(DEFAULT_SPONSORS);
  const [auditLog, setAuditLog] = useState([]);
  const [announcementModal, setAnnouncementModal] = useState(null); // holds the announcement to show, or null
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [myClub, setMyClub] = useState(() => {
    try {
      return localStorage.getItem("myClub") || null;
    } catch {
      return null;
    }
  });
  const [screen, setScreen] = useState("today");

  const chooseClub = useCallback((clubId) => {
    try {
      localStorage.setItem("myClub", clubId);
    } catch {}
    setMyClub(clubId);
    setScreen("today");
  }, []);

  const closeWelcome = useCallback(() => {
    setScreen("today");
  }, []);

  const openWelcome = useCallback(() => {
    setScreen("welcome");
  }, []);

  const changeClub = useCallback(() => {
    try {
      localStorage.removeItem("myClub");
    } catch {}
    setMyClub(null);
    setScreen("welcome");
  }, []);

  const checkForNewAnnouncement = useCallback((list) => {
    if (!list || list.length === 0) return;
    const newest = list[0]; // announcements are unshifted, so index 0 is newest
    let seenId = null;
    try {
      seenId = localStorage.getItem("seenAnnouncementId");
    } catch {}
    if (newest.id !== seenId) {
      setAnnouncementModal(newest);
      playAnnouncementDing();
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [t, m, o, a, s, log] = await Promise.all([
        loadShared("teams", DEFAULT_TEAMS),
        loadShared("matches", DEFAULT_MATCHES),
        loadShared("orders", DEFAULT_ORDERS),
        loadShared("announcements", DEFAULT_ANNOUNCEMENTS),
        loadShared("sponsors", DEFAULT_SPONSORS),
        loadShared("auditLog", []),
      ]);
      setTeams(t);
      setMatches(m);
      setOrders(o);
      setAnnouncements(a);
      setSponsors(s);
      setAuditLog(log);
      setLoaded(true);
      checkForNewAnnouncement(a);
    })();
  }, []);

  // Poll for new announcements while the app stays open, so someone already
  // using the app sees the modal+ding as soon as an organiser posts one.
  useEffect(() => {
    const interval = setInterval(async () => {
      const latest = await loadShared("announcements", DEFAULT_ANNOUNCEMENTS);
      setAnnouncements(latest);
      checkForNewAnnouncement(latest);
    }, 25000);
    return () => clearInterval(interval);
  }, [checkForNewAnnouncement]);

  const dismissAnnouncementModal = useCallback(() => {
    if (announcementModal) {
      try {
        localStorage.setItem("seenAnnouncementId", announcementModal.id);
      } catch {}
    }
    setAnnouncementModal(null);
  }, [announcementModal]);

  const logAction = useCallback((adminName, action) => {
    setAuditLog((prev) => {
      const entry = { id: `log${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, time: new Date().toISOString(), admin: adminName, action };
      const next = [entry, ...prev].slice(0, 300); // keep the log from growing unbounded
      saveShared("auditLog", next);
      return next;
    });
  }, []);

  const clubs = useMemo(() => {
    const seen = new Map();
    teams.forEach((t) => {
      const cid = t.clubId || t.id;
      if (!seen.has(cid)) {
        seen.set(cid, {
          id: cid,
          clubId: cid,
          name: t.name.replace(/\s+[AB]$/, ""),
          town: t.town,
          county: t.county,
          color: t.color,
        });
      }
    });
    return Array.from(seen.values());
  }, [teams]);

  const persist = useCallback((key, value) => saveShared(key, value), []);

  const myClubObj = clubs.find((c) => c.id === myClub) || null;

  const saveOrder = useCallback(
    async (clubId, order) => {
      const next = { ...orders, [clubId]: order };
      setOrders(next);
      await saveShared("orders", next);
    },
    [orders]
  );

  if (!loaded) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: C.turf }}>
        <span style={{ color: C.line, fontFamily: "Inter, sans-serif" }}>Loading blitz day…</span>
      </div>
    );
  }

  if (screen === "welcome") {
    return <WelcomeScreen clubs={clubs} onChoose={chooseClub} onClose={closeWelcome} myClubName={myClubObj?.name} />;
  }

  let body;
  if (screen === "today") body = <TodayScreen teams={teams} clubs={clubs} matches={matches} announcements={announcements} sponsors={sponsors} setScreen={setScreen} setSelectedTeam={setSelectedTeam} myClubName={myClubObj?.name} onChangeClub={changeClub} onOpenWelcome={openWelcome} />;
  else if (screen === "teams") body = <TeamsScreen teams={teams} matches={matches} setScreen={setScreen} setSelectedTeam={setSelectedTeam} />;
  else if (screen === "teamDetail") body = <TeamDetailScreen teamId={selectedTeam} teams={teams} matches={matches} setScreen={setScreen} />;
  else if (screen === "fixtures") body = <FixturesScreen teams={teams} clubs={clubs} matches={matches} sponsors={sponsors} setScreen={setScreen} />;
  else if (screen === "standings") body = <StandingsScreen teams={teams} matches={matches} sponsors={sponsors} />;
  else if (screen === "team") body = <TeamScreen teams={teams} clubs={clubs} matches={matches} orders={orders} saveOrder={saveOrder} sponsors={sponsors} myClub={myClub} myClubName={myClubObj?.name} onOpenWelcome={openWelcome} onChangeClub={changeClub} />;
  else if (screen === "info") body = <InfoScreen sponsors={sponsors} />;
  else if (screen === "admin")
    body = (
      <AdminScreen
        teams={teams}
        clubs={clubs}
        matches={matches}
        setMatches={setMatches}
        orders={orders}
        announcements={announcements}
        setAnnouncements={setAnnouncements}
        sponsors={sponsors}
        setSponsors={setSponsors}
        persist={persist}
        auditLog={auditLog}
        logAction={logAction}
      />
    );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: C.line, minHeight: "100dvh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ flex: 1, overflowY: "auto" }}>{body}</div>
      <BottomNav screen={screen} setScreen={setScreen} />
      <div style={{ textAlign: "center", padding: "6px 0", background: C.turf, borderTop: `1px solid ${C.pitchLight}` }}>
        <button
          onClick={() => setScreen("admin")}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif", fontSize: 10, cursor: "pointer" }}
        >
          Organiser login
        </button>
      </div>

      {announcementModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,17,16,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={dismissAnnouncementModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "28px 24px",
              maxWidth: 340,
              width: "100%",
              textAlign: "center",
              border: `3px solid ${C.sliotar}`,
              boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 10 }}>📢</div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 12, color: C.pitch, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
              Announcement
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: C.ink, lineHeight: 1.5, marginBottom: 22 }}>
              {announcementModal.text}
            </div>
            <button
              onClick={dismissAnnouncementModal}
              style={{
                background: C.pitch,
                color: "#fff",
                border: "none",
                borderRadius: 30,
                padding: "12px 36px",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
