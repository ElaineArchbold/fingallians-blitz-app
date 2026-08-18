import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Home, Users, Trophy, UtensilsCrossed, Info, MapPin, ChevronLeft, Plus, Minus, Check, Megaphone, Lock, X, Phone, Eye, EyeOff, Shield, UserCircle, Flag } from "lucide-react";
import { supabase } from "./supabaseClient";
import { QRCodeSVG } from "qrcode.react";

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
*, *::before, *::after { box-sizing: border-box; }
input, select, textarea, button { box-sizing: border-box; max-width: 100%; }
body { font-family: "Inter", sans-serif; }
`;
const HERO_BRIGHT = "#D61224";
const HERO_DARK = "#750712";

// The ?v= tag forces browsers/CDN to re-fetch when a crest/logo image is updated —
// bump this number any time an image file changes, otherwise cached copies can stick around.
const CREST_VERSION = "8";
const BADGE_LOGO = `/logo.png?v=${CREST_VERSION}`;

const CRESTS = {
  fing: `/crests/fing.png?v=${CREST_VERSION}`,
  finian: `/crests/finian.png?v=${CREST_VERSION}`,
  thomasdavis: `/crests/thomasdavis.png?v=${CREST_VERSION}`,
  knockbridge: `/crests/knockbridge.png?v=${CREST_VERSION}`,
  naomheoin: `/crests/naomheoin.png?v=${CREST_VERSION}`,
  navanom: `/crests/navanom.png?v=${CREST_VERSION}`,
  ratoath: `/crests/ratoath.png?v=${CREST_VERSION}`,
};

// Some crest PNGs have extra whitespace/padding around the actual shield — scale
// them up inside the badge circle so they fill the space properly.
const CREST_SCALE = {
  thomasdavis: 1.45,
};


/* ---------- Event constants ---------- */
const EVENT = {
  name: "Fingallians U12 Hurling Blitz",
  date: "Saturday 22 August 2026",
  venue: "Lawless Memorial Park, Fingallians GAA, Swords",
  registration: "8:45",
  procession: "9:15",
  parade: "9:30",
  firstThrowIn: "10:00",
  targetFinish: "~3pm",
};
// Used to check "is it actually event day" — separate from the display string
// above, so scheduled announcements can't accidentally fire on some random
// Tuesday just because the time-of-day happens to match.
const EVENT_YEAR = 2026;
const EVENT_MONTH = 7; // August — JS months are 0-indexed
const EVENT_DAY = 22;
function isEventDay(d = new Date()) {
  return d.getFullYear() === EVENT_YEAR && d.getMonth() === EVENT_MONTH && d.getDate() === EVENT_DAY;
}

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
  { id: "naomheoin", name: "Naomh Eoin CLG / St. John's GAA", town: "Belfast", county: "Antrim", color: "#1D4E89", contact: "" },
  { id: "thomasdavis", name: "Thomas Davis GAA", town: "Tallaght", county: "Dublin", color: "#1C7A3E", contact: "" },
  { id: "knockbridge", name: "Knockbridge Hurling Club", town: "Knockbridge", county: "Louth", color: "#1C1C1C", contact: "" },
  { id: "finian", name: "St. Finian's GAA, Swords", town: "Swords", county: "Dublin", color: "#7A1F2B", contact: "" },
  { id: "navanom", name: "Navan O'Mahony's", town: "Navan", county: "Meath", color: "#8C1A2B", contact: "" },
  { id: "ratoath", name: "Ratoath GAA", town: "Ratoath", county: "Meath", color: "#1C5FA8", contact: "" },
];

// Most clubs field an A and a B team, but a club sending a single team can be
// pinned to just one grade here — the grade ("A" or "B") decides which
// round-robin group (and finals path, Cup vs Shield) that lone team plays in.
// Anything not listed below defaults to fielding both an A and a B team.
//
// Knockbridge is down to a single team, playing in the B grouping (moved from
// A — this filled the B-slot gap Laois Harps' withdrawal left, and leaves the
// A grouping in Group 1 short a team instead, pending a hoped-for extra A-team
// club). roundRobinGroup() handles a group of 3 fine either way.
const SINGLE_TEAM_CLUBS = {
  knockbridge: ["B"],
  ratoath: ["A"],
};

// Keep the stable A/B ids internally because the fixture, standings and finals
// logic is built around them. Everything visible to users is branded Red/Green.
function gradeDisplayName(grade) {
  return grade === "A" ? "Red" : grade === "B" ? "Green" : grade;
}

function finalDisplayLabel(label) {
  if (!label) return label;
  if (label.startsWith("A ")) return `Red ${label.slice(2)}`;
  if (label.startsWith("B ")) return `Green ${label.slice(2)}`;
  return label;
}

function normalizeTeamDisplayName(team) {
  const grade = team.id?.endsWith("A") ? "A" : team.id?.endsWith("B") ? "B" : null;
  if (!grade) return team;
  const clubId = team.clubId || team.id?.slice(0, -1);
  const isSingleTeam = SINGLE_TEAM_CLUBS[clubId]?.length === 1;
  const fallbackBase = String(team.name || team.id || "Team").replace(/\s+(?:A|B|Red|Green)$/i, "");
  const clubBase = DEFAULT_CLUBS.find((c) => c.id === clubId)?.name || fallbackBase;
  return { ...team, name: isSingleTeam ? clubBase : `${clubBase} ${gradeDisplayName(grade)}` };
}

// Fixtures, results and the leaderboard all operate on the entries this produces,
// while burger headcounts are organiser-managed per team.
function buildTeamsFromClubs(clubs) {
  return clubs.flatMap((c) => {
    const suffixes = SINGLE_TEAM_CLUBS[c.id] || ["A", "B"];
    const isSingleTeam = suffixes.length === 1;
    return suffixes.map((suffix) => ({
      id: `${c.id}${suffix}`,
      clubId: c.id,
      name: isSingleTeam ? c.name : `${c.name} ${gradeDisplayName(suffix)}`,
      town: c.town,
      county: c.county,
      color: c.color,
    }));
  });
}
const DEFAULT_TEAMS = buildTeamsFromClubs(DEFAULT_CLUBS);

// The two competition groupings (feed Lunch 1 / Lunch 2 and the Cup/Shield
// finals) are pinned explicitly by club id rather than inferred from array
// order. Update these two lists (not DEFAULT_CLUBS' order) if the groupings
// ever change.
const CLUB_GROUP_1 = ["fing", "naomheoin", "thomasdavis"];
const CLUB_GROUP_2 = ["finian", "navanom", "ratoath", "knockbridge"];

const DEFAULT_MATCHES = [];

const DEFAULT_ANNOUNCEMENTS = [];

const DEFAULT_ORDERS = {};
const DEFAULT_SPONSORS = [
  { id: "s1", name: "Samrod Blinds", url: "https://www.samrod.ie/", logo: "/samrod-blinds.png" },
  { id: "s2", name: "Fusion Insurance", url: "https://fusioninsurance.ie/", logo: "/fusion-insurance.png" },
  { id: "s3", name: "Hanleys", url: "https://thecardandpartystore.ie/", logo: "/hanleys.png" },
  { id: "s4", name: "Image Fitness Training", url: "https://www.imageft.ie/", logo: "/image-fitness.png" },
];



// Named organiser logins — all have identical full access (fixtures, scores, all burger headcounts,
// announcements, sponsors). Each person has their own PIN (not their name) — add/remove
// people or change PINs here any time.
const ADMIN_ACCOUNTS = {
  "1001": "Elaine",
  "1002": "Sean",
  "1003": "Dara",
};
function findAdminByCode(code) {
  const trimmed = (code || "").trim();
  return ADMIN_ACCOUNTS[trimmed] || null;
}

// Referees get in via a secret link (e.g. blitz.fingallians.fun/?ref=blitzref2026)
// rather than a visible button — there's no password gate on referee mode (just a
// name, for accountability in the audit log), so this keeps it from being an open
// door anyone browsing the app could stumble into. Change this any time if it leaks.
const REFEREE_SECRET = "sliotar22aug";

/* ---------- Storage helpers (Supabase kv_store) ---------- */

async function loadShared(key, fallback) {
  try {
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        // PGRST116 = "no rows returned" — genuinely doesn't exist yet, safe to seed.
        await saveShared(key, fallback);
        return fallback;
      }
      // Some other failure (network, RLS block, misconfigured client, cold-start
      // hiccup, etc). Do NOT overwrite whatever's actually stored — just use the
      // fallback for this one load so the app still renders something.
      console.error("loadShared: error, not overwriting stored data", key, error);
      return fallback;
    }
    if (!data) return fallback;
    return data.value;
  } catch (e) {
    console.error("loadShared: request failed, not overwriting stored data", key, e);
    return fallback;
  }
}

async function saveShared(key, value) {
  try {
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      console.error("save failed", key, error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error("save failed", key, e);
    return { ok: false, error: e.message || "Network error" };
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
            fontFamily: "'League Spartan', sans-serif",
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
        style={{ width: "88%", height: "88%", objectFit: "contain" }}
      />
    </div>
  );
}

function TeamBadge({ team, size = 40 }) {
  // Resolve the crest key: prefer clubId, then try the raw id, then strip
  // trailing A/B suffix (covers cases where clubId is missing from stored data).
  const crestKey = team.clubId || team.id;
  const crest = CRESTS[crestKey] || CRESTS[crestKey?.replace(/[AB]$/, "")];
  const grade = team.id?.endsWith("A") ? "A" : team.id?.endsWith("B") ? "B" : null;
  const badgeSize = Math.max(10, Math.round(size * 0.36));

  const gradeBadge = grade && (
    <div
      style={{
        position: "absolute",
        bottom: -badgeSize * 0.08,
        right: -badgeSize * 0.08,
        width: badgeSize,
        height: badgeSize,
        borderRadius: "50%",
        background: grade === "A" ? "#B3202E" : "#1C7A3E",
        border: "1.5px solid #fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'League Spartan', sans-serif",
        fontWeight: 800,
        fontSize: badgeSize * 0.62,
        color: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
      }}
    >
      {grade === "A" ? "R" : "G"}
    </div>
  );

  if (crest) {
    const scaleKey = team.clubId || team.id?.replace(/[AB]$/, "");
    const scale = CREST_SCALE[scaleKey] || 1;
    return (
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#fff",
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
              transform: scale !== 1 ? `scale(${scale})` : undefined,
            }}
          />
        </div>
        {gradeBadge}
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
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
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
          fontFamily: "'League Spartan', sans-serif",
          fontWeight: 600,
          fontSize: size * 0.4,
          boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
        }}
      >
        {initials}
      </div>
      {gradeBadge}
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
function BottomNav({ screen, setScreen, showAdmin }) {
  const items = [
    { key: "today", label: "Home", icon: Home },
    { key: "fixtures", label: "Fixtures", icon: Trophy },
    { key: "standings", label: "Standings", icon: Users },
    { key: "team", label: "Team", icon: Shield },
    { key: "info", label: "Info", icon: Info },
    ...(showAdmin ? [{ key: "admin", label: "Admin", icon: Lock }] : []),
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
function TopBar({ title, onBack, right, followedTeam }) {
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
        <LogoBadge size={46} ringWidth={2.5} />
      )}
      <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 18, letterSpacing: 0.3, flex: 1 }}>
        {title}
      </div>
      {right}
      {!right && followedTeam && <TeamBadge team={followedTeam} size={46} />}
    </div>
  );
}

function SponsorStrip({ sponsors }) {
  const list = sponsors;
  if (!list.length) return null;

  return (
    <div
      style={{
        background: "#fff",
        padding: "12px 12px 14px",
        borderBottom: `1px solid ${C.pitch}14`,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          fontWeight: 700,
          color: C.inkSoft,
          textTransform: "uppercase",
          letterSpacing: 1.4,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Proudly Supported By
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {list.map((s) => (
          <a
            key={s.id}
            href={s.url || undefined}
            target={s.url ? "_blank" : undefined}
            rel={s.url ? "noopener noreferrer" : undefined}
            onClick={(e) => !s.url && e.preventDefault()}
            title={s.name}
            style={{
              flex: 1,
              maxWidth: 90,
              height: 70,
              borderRadius: 10,
              background: C.line,
              border: `1.5px solid ${C.sliotar}66`,
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              textDecoration: "none",
              padding: 4,
            }}
          >
            {s.logo ? (
              <img src={s.logo} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 10, color: C.ink, textAlign: "center", lineHeight: 1.2, padding: 4 }}>
                {s.name}
              </span>
            )}
          </a>
        ))}
      </div>
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
            fontFamily: "'League Spartan', sans-serif",
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
            fontFamily: "'League Spartan', sans-serif",
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
          Select your club, then explore fixtures, standings, burger-break times, and event information.
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
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", marginTop: 2 }}>
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
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 13, color: C.ink, textAlign: "center", lineHeight: 1.25 }}>
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

function DayTimeline({ matches, lunchWindows, presentations }) {
  const groupMatches = matches.filter((m) => !m.finalLabel);
  const finals = matches.filter((m) => m.finalLabel && m.finalLabel !== "Presentations");
  const hasLunch = Array.isArray(lunchWindows) && lunchWindows.length > 0;
  const lastGroupTime = groupMatches.length > 0 ? groupMatches.map((m) => m.time).sort().slice(-1)[0] : null;
  const cupFinal = finals.find((f) => f.finalLabel?.includes("Cup"));
  const shieldFinal = finals.find((f) => f.finalLabel?.includes("Shield"));

  const steps = [
    { time: EVENT.registration, label: "Registration" },
    { time: EVENT.procession, label: "Teams lined up for parade" },
    { time: EVENT.parade, label: "Parade" },
    {
      time: EVENT.firstThrowIn,
      label: hasLunch ? `Matches begin — first round, through ${lunchWindows[0].from}` : "Matches begin",
    },
    hasLunch && {
      time: lunchWindows[0].from,
      label: `Lunch begins — matches continue on remaining pitches, through ${lunchWindows[lunchWindows.length - 1].to}`,
      note: "See your Team tab for your Red-team and Green-team burger break times.",
    },
    lastGroupTime && {
      time: lastGroupTime,
      label: "Final group matches",
    },
    shieldFinal && { time: shieldFinal.time, label: "\uD83D\uDEE1\uFE0F Shield Finals" },
    cupFinal && { time: cupFinal.time, label: "\uD83C\uDFC6 Cup Finals" },
    presentations && {
      time: presentations.from,
      label: `Presentations & close — all done by ${presentations.to}`,
    },
  ].filter(Boolean);

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: "14px 16px" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: i === steps.length - 1 ? C.sliotar : C.pitch,
                marginTop: 4,
                flexShrink: 0,
              }}
            />
            {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: `${C.pitch}22`, minHeight: 24 }} />}
          </div>
          <div style={{ paddingBottom: i < steps.length - 1 ? 14 : 0 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 13.5, color: C.pitch }}>{s.time}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink, marginTop: 1, lineHeight: 1.4 }}>{s.label}</div>
            {s.note && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, marginTop: 3, lineHeight: 1.4, fontStyle: "italic" }}>
                {s.note}
              </div>
            )}
          </div>
        </div>
      ))}
      {!hasLunch && (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginTop: 8, fontStyle: "italic" }}>
          The rest of the day's timing will appear here once the schedule is generated.
        </div>
      )}
    </div>
  );
}

function TodayScreen({ teams, clubs, matches, announcements, sponsors, setScreen, setSelectedTeam, myClubName, myClubObj, onChangeClub, onOpenWelcome, lunchWindows, presentations }) {
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
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, letterSpacing: 1.5, color: "#F5D9A0", textTransform: "uppercase" }}>
              {EVENT.date}
            </div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 19, marginTop: 2, lineHeight: 1.15, letterSpacing: 0.2, textTransform: "uppercase" }}>
              {EVENT.name}
            </div>
          </div>
          {myClubObj && <TeamBadge team={myClubObj} size={44} />}
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
            background: "rgba(0,0,0,0.18)",
            border: `1px solid ${C.sliotar}`,
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            Order of the Day
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
            {[
              ["Registration", EVENT.registration],
              ["Lined up", EVENT.procession],
              ["Parade", EVENT.parade],
              ["Throw-in", EVENT.firstThrowIn],
              ["Finish", presentations?.to ? `~${presentations.to}` : EVENT.targetFinish],
            ].map(([label, time]) => (
              <div key={label} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12.5, color: "#fff" }}>{time}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, color: "rgba(255,255,255,0.7)" }}>{label}</div>
              </div>
            ))}
          </div>
          {Array.isArray(lunchWindows) && lunchWindows.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.15)", textAlign: "center" }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12.5, color: "#fff" }}>
                {lunchWindows[0].from} – {lunchWindows[lunchWindows.length - 1].to}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                Burger breaks — separate Red-team and Green-team sittings (check the Team tab for times)
              </div>
            </div>
          )}
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.75)", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            Register your team, then be ready to line up for the parade by 9:15.
          </div>
        </div>
      </div>

      <SponsorStrip sponsors={sponsors} />

      <div style={{ padding: "16px 16px 4px" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 10 }}>
          Plan for the Day
        </div>
        <DayTimeline matches={matches} lunchWindows={lunchWindows} presentations={presentations} />
      </div>

      <div style={{ padding: "14px 16px 4px" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>
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
    </div>
  );
}

function finalIcon(label) {
  if (!label) return "";
  return label.includes("Shield") ? "🛡️" : "🏆";
}

function MatchRow({ match, teamById }) {
  if (match.finalLabel === "Presentations") {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.sliotar, textTransform: "uppercase", letterSpacing: 0.5 }}>
          🏆 Presentations
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
          Trophies and medals — day officially wraps up here
        </div>
      </div>
    );
  }

  const aBlank = !match.teamA;
  const bBlank = !match.teamB;

  if (match.finalLabel && (aBlank || bBlank)) {
    const isShield = match.finalLabel.includes("Shield");
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.pitch, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {finalIcon(match.finalLabel)} {finalDisplayLabel(match.finalLabel)}
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
        <div style={{ textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 11, color: C.sliotar, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
          {finalIcon(match.finalLabel)} {finalDisplayLabel(match.finalLabel)}
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
      clubs.push({ clubId: cid, name: t.name.replace(/\s+(?:A|B|Red|Green)$/i, ""), town: t.town, county: t.county, color: t.color });
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
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 16, color: C.ink, lineHeight: 1.25 }}>
                {c.name}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginBottom: 8 }}>{c.town}, Co. {c.county}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["A", "B"]
                  .filter((suffix) => teams.some((t) => t.id === `${c.clubId}${suffix}`))
                  .map((suffix) => (
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
                      fontFamily: "'League Spartan', sans-serif",
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
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 17, color: C.ink }}>{team.name}</div>
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
  const [selectedClub, setSelectedClub] = useState(null);
  return (
    <div style={{ background: "#fff", padding: "16px 12px 14px", borderBottom: `1px solid ${C.pitch}14` }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {clubs.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClub(c)}
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
      {selectedClub && (
        <div
          onClick={() => setSelectedClub(null)}
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(20,17,16,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: "32px 24px", maxWidth: 300, width: "100%", textAlign: "center", boxShadow: "0 16px 50px rgba(0,0,0,0.4)", position: "relative" }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 16px", padding: 4, background: `linear-gradient(135deg, ${C.sliotar}, ${selectedClub.color})` }}>
              <TeamBadge team={selectedClub} size={112} />
            </div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 20, color: C.ink, marginBottom: 4 }}>{selectedClub.name}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft }}>{selectedClub.town}, Co. {selectedClub.county}</div>
            <button onClick={() => setSelectedClub(null)} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "#f3ecec", border: "none", fontSize: 16, fontWeight: 900, color: C.pitch, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>X</button>
          </div>
        </div>
      )}
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
          fontFamily: "'League Spartan', sans-serif",
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

function FixturesScreen({ teams, clubs, matches, sponsors, setScreen, myClubObj }) {
  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };
  const groupMatches = matches.filter((m) => !m.finalLabel);
  const finals = matches.filter((m) => m.finalLabel);

  const upcomingGroupMatches = groupMatches.filter((m) => m.status !== "finished");
  const finishedGroupMatches = groupMatches.filter((m) => m.status === "finished");

  const groupByTime = (list) => {
    const groups = {};
    list.forEach((m) => {
      groups[m.time] = groups[m.time] || [];
      groups[m.time].push(m);
    });
    return groups;
  };
  const upcomingGroups = groupByTime(upcomingGroupMatches);
  const finishedGroups = groupByTime(finishedGroupMatches);

  const renderMatchCard = (m) => (
    <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <PitchBadge pitch={m.pitch} />
        <StatusPill status={m.status} />
      </div>
      <MatchRow match={m} teamById={teamById} />
    </div>
  );

  return (
    <div>
      <TopBar title="Fixtures" followedTeam={myClubObj} />
      <SponsorStrip sponsors={sponsors} />
      <div style={{ padding: 16 }}>
        {matches.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "30px 0" }}>
            Fixtures will appear here once the organiser adds them.
          </div>
        )}

        {Object.keys(upcomingGroups).sort().map((time) => (
          <div key={time} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.pitch, marginBottom: 6 }}>{time}</div>
            {upcomingGroups[time].map(renderMatchCard)}
          </div>
        ))}

        {finishedGroupMatches.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 18 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, paddingTop: 10, borderTop: `1px solid ${C.pitch}14` }}>
              ✅ Results
            </div>
            {Object.keys(finishedGroups).sort().map((time) => (
              <div key={time} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.inkSoft, marginBottom: 6 }}>{time}</div>
                {finishedGroups[time].map(renderMatchCard)}
              </div>
            ))}
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
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, textAlign: "center" }}>
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
                    {time} — {ms[0].finalLabel === "Presentations" ? "🏆 Presentations" : ms[0].finalLabel?.includes("Shield") ? "🛡️ Shield Finals" : "🏆 Cup Finals"}
                  </div>
                  {ms.map((m) => (
                    <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                      {m.finalLabel !== "Presentations" && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <PitchBadge pitch={m.pitch} />
                          <StatusPill status={m.status} />
                        </div>
                      )}
                      <MatchRow match={m} teamById={teamById} />
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
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

// Computes the set of auto-triggered announcements based on the actual schedule —
// registration, one per lunch sitting (naming the clubs in it), and one ahead of
// the finals. Recomputes fresh any time the schedule changes, so it always
// reflects reality rather than a fixed guess. Each has a stable `id` so the
// trigger effect can tell "already posted" from "not yet due".
function computeScheduledAnnouncements(matches, lunchWindows, clubs, overrides = {}, finalsPublished = false) {
  const list = [];
  const teamName = (teamId) => {
    const clubId = teamId?.slice(0, -1);
    const club = clubs.find((c) => c.id === clubId);
    return `${club?.name || clubId} ${gradeDisplayName(teamId?.slice(-1)) || ""}`.trim();
  };
  const timeToMin = (t) => {
    const [h, m] = String(t || "0:00").replace(/\s*[ap]\.?m\.?/i, "").trim().split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const minToLabel = (mins) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  const LEAD_MINUTES = 10;
  const applyOverride = (item) => {
    const o = overrides[item.id] || {};
    const triggerMin = o.triggerTime ? timeToMin(o.triggerTime) : item.triggerMin;
    return {
      ...item,
      triggerMin,
      text: o.text ?? item.text,
      enabled: o.enabled !== false,
      isTimeOverridden: Boolean(o.triggerTime),
    };
  };

  list.push(applyOverride({
    id: "sched-registration",
    triggerMin: timeToMin(EVENT.registration) - LEAD_MINUTES,
    eventTime: EVENT.registration,
    audienceClubIds: [],
    text: `Registration opens at ${EVENT.registration}. Please head to registration on arrival and have your team ready to line up for the parade by 9:15.`,
  }));

  if (Array.isArray(lunchWindows)) {
    lunchWindows.forEach((w) => {
      [...(w.teams || [])].forEach((teamId) => {
        const clubId = teamId.slice(0, -1);
        list.push(applyOverride({
          id: `sched-lunch-${teamId}`,
          triggerMin: timeToMin(w.from) - LEAD_MINUTES,
          eventTime: w.from,
          audienceClubIds: [clubId],
          teamIds: [teamId],
          text: `${teamName(teamId)}: your burger break starts at ${w.from}. Your burgers will be ready at your allocated time.`,
        }));
      });
    });
  }

  const shieldFinal = matches.find((m) => m.finalLabel === "A Shield Final");
  if (finalsPublished && shieldFinal) {
    list.push(applyOverride({
      id: "sched-finals",
      triggerMin: timeToMin(shieldFinal.time) - LEAD_MINUTES,
      eventTime: shieldFinal.time,
      audienceClubIds: [],
      text: `Finals are almost here. Shield Finals begin at ${shieldFinal.time}, with Cup Finals to follow. Please make your way to the main pitch area.`,
    }));
  }

  return list.filter((x) => x.enabled).map((x) => ({ ...x, triggerLabel: minToLabel(Math.max(0, x.triggerMin)) }));
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

// A group of 4 is "complete" once all 6 of its round-robin matches are finished.
function groupIsComplete(groupTeams, matches) {
  const ids = groupTeams.map((t) => t.id);
  const groupMatches = matches.filter((m) => !m.finalLabel && ids.includes(m.teamA) && ids.includes(m.teamB));
  const expected = (groupTeams.length * (groupTeams.length - 1)) / 2; // 6 for a group of 4
  if (groupMatches.length < expected) return false;
  return groupMatches.every((m) => m.status === "finished");
}

// Once BOTH of a grade's groups are complete, returns the two group winners
// (→ Cup Final) and two runners-up (→ Shield Final). Returns null if either
// group still has results outstanding.
function resolvedTopTwo(groupTeams, matches) {
  const rows = computeStandings(groupTeams, matches);
  const byPoints = {};
  rows.forEach((r) => { byPoints[r.points] = [...(byPoints[r.points] || []), r]; });
  const pointLevels = Object.keys(byPoints).map(Number).sort((a, b) => b - a);
  const ordered = [];
  for (const pts of pointLevels) {
    const bucket = byPoints[pts];
    if (bucket.length === 1) {
      ordered.push(bucket[0]);
      continue;
    }
    // The published rule uses head-to-head, then a coin toss. For exactly two
    // level teams we can resolve the head-to-head result safely. For 3+ tied
    // teams, or a drawn head-to-head, the app must not guess a qualifier.
    if (bucket.length === 2) {
      const [x, y] = bucket;
      const h2h = matches.find((m) => !m.finalLabel && m.status === "finished" && ((m.teamA === x.id && m.teamB === y.id) || (m.teamA === y.id && m.teamB === x.id)));
      if (h2h) {
        const sa = scoreTotal(h2h.goalsA, h2h.pointsA);
        const sb = scoreTotal(h2h.goalsB, h2h.pointsB);
        if (sa !== sb) {
          const winner = sa > sb ? h2h.teamA : h2h.teamB;
          ordered.push(winner === x.id ? x : y, winner === x.id ? y : x);
          continue;
        }
      }
    }
    if (ordered.length < 2) return null;
    ordered.push(...bucket);
  }
  return ordered.length >= 2 ? [ordered[0].id, ordered[1].id] : null;
}

function qualifiersForGrade(teams, matches, grade) {
  const groupedTeams = computeGroups(teams, matches).filter((g) => g[0].id.endsWith(grade));
  if (groupedTeams.length < 2) return null;
  for (const g of groupedTeams) {
    if (!groupIsComplete(g, matches)) return null;
  }
  const topTwos = groupedTeams.map((g) => resolvedTopTwo(g, matches));
  if (topTwos.some((x) => !x)) return null;
  return {
    winners: topTwos.map((x) => x[0]),
    runnersUp: topTwos.map((x) => x[1]),
  };
}

function unresolvedQualificationTies(teams, matches) {
  const out = [];
  for (const grade of ["A", "B"]) {
    const groups = computeGroups(teams, matches).filter((g) => g[0].id.endsWith(grade));
    groups.forEach((g, i) => {
      if (groupIsComplete(g, matches) && !resolvedTopTwo(g, matches)) out.push(`${gradeDisplayName(grade)} Group ${i + 1}`);
    });
  }
  return out;
}

// Fills in teamA/teamB for any of the 4 finals that are still blank and whose
// qualifiers are now determinable — never overwrites a final that's already set
// (whether auto-filled earlier or picked manually), so nothing gets clobbered.
function autoFillFinals(matchesList, teams) {
  const qualA = qualifiersForGrade(teams, matchesList, "A");
  const qualB = qualifiersForGrade(teams, matchesList, "B");
  const fillFor = {
    "A Cup Final": qualA?.winners,
    "A Shield Final": qualA?.runnersUp,
    "B Cup Final": qualB?.winners,
    "B Shield Final": qualB?.runnersUp,
  };
  return matchesList.map((m) => {
    if (!m.finalLabel || m.finalLabel === "Presentations") return m;
    const pair = fillFor[m.finalLabel];
    if (pair && pair[0] && pair[1]) return { ...m, teamA: pair[0], teamB: pair[1] };
    return { ...m, teamA: "", teamB: "" };
  });
}

function groupStageIsComplete(matches) {
  const groupMatches = matches.filter((m) => !m.finalLabel && m.teamA && m.teamB);
  return groupMatches.length > 0 && groupMatches.every((m) => m.status === "finished");
}

function finalPairingsReady(matches) {
  const finals = matches.filter((m) => m.finalLabel && m.finalLabel !== "Presentations");
  return finals.length >= 4 && finals.every((m) => m.teamA && m.teamB);
}

function StandingsScreen({ teams, matches, sponsors, myClubObj }) {
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
      <TopBar title="Standings" followedTeam={myClubObj} />
      <SponsorStrip sponsors={sponsors} />
      <div style={{ padding: 16 }}>
        {labeled.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "30px 0" }}>
            Group tables will appear here once fixtures are added and results come in.
          </div>
        )}

        {labeled.map((grp) => {
          const rows = computeStandings(grp.teams, matches);
          return (
            <div key={`${grp.grade}${grp.num}`} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>
                {gradeDisplayName(grp.grade)} Group {grp.num}
              </div>
              <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.3fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr", background: C.turf, color: C.line, fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, padding: "9px 8px", textTransform: "uppercase" }}>
                  <div>Team</div><div style={{ textAlign: "center" }}>P</div><div style={{ textAlign: "center" }}>W</div><div style={{ textAlign: "center" }}>D</div><div style={{ textAlign: "center" }}>L</div><div style={{ textAlign: "center" }}>Pts</div>
                </div>
                {rows.map((r, i) => {
                  const teamObj = teams.find((t) => t.id === r.id);
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2.3fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr",
                        padding: "9px 8px",
                        borderTop: `1px solid ${C.pitch}14`,
                        alignItems: "center",
                        background: "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 12.5, color: C.inkSoft, flexShrink: 0 }}>{i + 1}</span>
                        {teamObj && <TeamBadge team={teamObj} size={26} />}
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.name}
                        </span>
                      </div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.played}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.won}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.drawn}</div>
                      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13 }}>{r.lost}</div>
                      <div style={{ textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.pitch }}>{r.points}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 6, fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, lineHeight: 1.5 }}>
          Win = 3 pts, draw = 1 pt, loss = 0. Score difference is not used as a tiebreaker — level teams are separated by head-to-head result, then a coin toss.
        </div>
      </div>
    </div>
  );
}

function InfoScreen({ sponsors, announcements, myClubObj, onMentorClick }) {
  const items = [
    {
      title: "Registration",
      body: "We’re planning for registration at 8:45am, so if everyone could be at the club for that time it would really help keep the morning running smoothly. All teams should be lined up by 9:15, ready for the parade at 9:30. First throw-in is at 10:00, with a target finish of approximately 3pm.",
    },
    {
      title: "Coach Parking",
      body: "We have very limited space for coaches, so please let us know in advance if your team will be arriving by coach. We have made a note of those already confirmed.",
    },
    {
      title: "Car Parking",
      body: "Limited parking is available at Balheary Skatepark. Please walk or carpool if possible. From the carpark, just walk across Balheary Park and over the footbridge to the club.",
      maps: [
        { label: "Open Balheary Skatepark in Google Maps", url: "https://www.google.com/maps/search/?api=1&query=Balheary+Skatepark%2C+Swords%2C+Co.+Dublin" },
      ],
    },
    {
      title: "Food",
      body: "Burgers will be provided for all players and mentors at their allocated time during the day. Final player and mentor numbers for each team must be provided to the organisers no later than the Tuesday before the blitz. That number of burgers will be prepared and ready for the team at its allocated burger break. Each team’s burger-break time will be shown in the app once the schedule is finalised.",
    },
    {
      title: "Teas, Coffees & BBQ",
      body: "There is a coffee shop on site, where teas and coffees can be purchased throughout the day. Separate from the team burgers, there will also be a BBQ area where spectators and others can purchase burgers and sausages during the day.",
    },
    {
      title: "Event App",
      body: "This app will contain all the key information for the day, including fixtures, results, team standings, burger-break times and important announcements. Please keep an eye on it throughout the blitz for updates.",
    },
    {
      title: "Gazebos",
      body: "Teams are very welcome to bring their own gazebo, but please ensure you have suitable weights to secure it, as it will not be possible to peg gazebos into the ground.",
    },
    {
      title: "Bibs",
      body: "Please bring a full set of bibs in case you are drawn against a team with similar colours.",
    },
    {
      title: "Spectators",
      body: "Spectators are very welcome around the sides of the main pitch, but please do not stand between Pitch 2 and Pitch 3. The all-weather (astro) surface is strictly limited to players, mentors and referees only, and appropriate footwear must be worn.",
    },
    {
      title: "Pitch Layout",
      image: `/pitch-layout.jpg?v=${CREST_VERSION}`,
      body: "Pitch 1 is on the all-weather surface. Pitches 2 and 3 are on the main grass pitch. Please follow steward directions when moving between the clubhouse, pitches and team areas.",
    },
    {
      title: "Facilities & Medical",
      body: "The Order of Malta will provide medical assistance at the entrance to the main pitch — teams are welcome to bring their own first-aid kits too. Toilets are in the Fingallians clubhouse through the changing-room entrance.",
    },
    {
      title: "Playing Rules",
      list: [
        "Teams: minimum 11, maximum 13 players on the field, with unlimited substitutions and a maximum panel size of 15.",
        "Matches: 10 minutes per half, 20 minutes total, with 3 minutes for half-time.",
        "3 points for a win, 1 for a draw, 0 for a loss. 65s will be taken.",
        "On taking possession a player may take 4 steps, max 8 steps solo running, then 4 steps to play away — 16 steps maximum from possession to striking the sliotar.",
        "The player who is fouled takes the free. The player closest to the line ball takes the sideline cut.",
        "Goalkeepers may take up to 5 steps for puck-outs.",
        "Unlimited substitutions during stoppages, with the referee's consent, from the centre point of each sideline.",
        "Abuse of referees or officials results in expulsion. Coaches and mentors must not encroach onto the field of play.",
        "Tied teams at end of group stage: separated by (a) head-to-head result, then (b) a coin toss. Points difference is not used.",
        "If level at the end of a final, extra time of 2 × 5 minutes per half is played; if still level, play restarts from the middle and next score wins.",
        "Jersey clash: one team turns their jersey inside out or wears bibs — please bring a set of bibs.",
        "A straight red card disqualifies a player from the rest of the blitz; two yellow cards disqualifies a player from the rest of that game.",
        "The organising committee's decision on all matters is binding, including the right to amend the blitz structure.",
      ],
      highlighted: [
        "All mentors must wear bibs at all times so they are clearly identifiable on and around the pitch.",
        "Spectators are welcome inside the main pitch area but must remain around the sides only. No spectators permitted between Pitch 2 and Pitch 3.",
        "Strictly only players, mentors, and referees are permitted on the all-weather (astro) surface, and only with appropriate footwear.",
      ],
      note: "It's not about winning — the goal is for every child to enjoy the day. If there's a clear skill gap between teams, please rest your best players or focus on certain skills to keep matches competitive.",
      preNote: "Scoring: 3 points for a goal, 1 point for a point over the bar.",
    },
    {
      title: "Communications",
      body: "A lead-mentors WhatsApp group is set up for the blitz. Any important updates during the day will be shared in that group and through announcements in this app.",
    },
  ];
  return (
    <div>
      <TopBar title="Event Info" followedTeam={myClubObj} />
      <div style={{ padding: 16 }}>
        {announcements && announcements.length > 0 && (
          <div
            style={{
              background: `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 20,
              border: `2px solid ${C.sliotar}`,
            }}
          >
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, textAlign: "center" }}>
              📢 Announcements
            </div>
            {announcements.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 8,
                  background: "#fff",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <Megaphone size={16} color={C.pitch} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink }}>{a.text}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.ash}44`,
            borderRadius: 10,
            padding: "16px 16px",
            marginBottom: 16,
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

        {items.map((it) => (
          <div key={it.title} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 15, color: C.ink, marginBottom: 6 }}>{it.title}</div>
            {it.image && (
              <img
                src={it.image}
                alt={it.title}
                style={{ width: "100%", height: "auto", borderRadius: 8, display: "block", marginBottom: it.body ? 8 : 0 }}
              />
            )}
            {it.body && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>{it.body}</div>}
            {it.list && (
              <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.6 }}>
                {it.list.map((li, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{li}</li>
                ))}
              </ul>
            )}
            {it.preNote && (
              <div style={{ marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
                {it.preNote}
              </div>
            )}
            {it.highlighted && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {it.highlighted.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fff8e1", border: `1.5px solid ${C.sliotar}`, borderRadius: 10, padding: "10px 12px" }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>!</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>{h}</span>
                  </div>
                ))}
              </div>
            )}
            {it.note && (
              <div style={{ marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.inkSoft, fontWeight: 500, lineHeight: 1.5, fontStyle: "italic" }}>
                {it.note}
              </div>
            )}
            {it.maps && it.maps.map((m, i) => (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: i === 0 ? 10 : 8,
                  marginRight: 8,
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
                <MapPin size={14} /> {m.label}
              </a>
            ))}
          </div>
        ))}

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, margin: "18px 0 12px" }}>
          Thank You to Our Sponsors
        </div>

        {sponsors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {sponsors.map((s) => (
              <a
                key={s.id}
                href={s.url || undefined}
                target={s.url ? "_blank" : undefined}
                rel={s.url ? "noopener noreferrer" : undefined}
                onClick={(e) => !s.url && e.preventDefault()}
                style={{
                  background: "#fff",
                  border: `1px solid ${C.pitch}22`,
                  borderRadius: 12,
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 56,
                  minWidth: 120,
                  flex: "1 1 45%",
                  textDecoration: "none",
                }}
              >
                {s.logo ? (
                  <img src={s.logo} alt={s.name} style={{ maxWidth: "100%", maxHeight: 40, objectFit: "contain" }} />
                ) : (
                  <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, textAlign: "center" }}>
                    {s.name}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.pitch}14` }}>
          <button
            onClick={onMentorClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: `1.5px solid ${C.pitch}44`,
              borderRadius: 30,
              padding: "10px 20px",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: C.pitch,
              cursor: "pointer",
            }}
          >
            <UserCircle size={16} /> Admin login
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Burger headcount controls ---------- */
function Stepper({ label, value, onChange, sub, disabled, onLockedTap }) {
  const handleChange = (v) => {
    if (disabled) {
      onLockedTap && onLockedTap();
      return;
    }
    onChange(v);
  };
  return (
    <div style={{ background: disabled ? C.line : "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 14, marginBottom: 10, opacity: disabled ? 0.75 : 1 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{sub}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
        <button
          onClick={() => handleChange(Math.max(0, value - 1))}
          style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.pitch}33`, background: C.line, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Minus size={18} color={C.pitch} />
        </button>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 22, minWidth: 34, textAlign: "center", color: C.ink }}>{value}</div>
        <button
          onClick={() => handleChange(value + 1)}
          style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: disabled ? C.ash : C.pitch, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Plus size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function computeTeamGaps(teamId, matches) {
  if (!teamId) return [];
  const timeToMin = (t) => {
    const [h, m] = String(t || "0:00").split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const minToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  };
  const myTimes = (Array.isArray(matches) ? matches : [])
    .filter((m) => (m.teamA === teamId || m.teamB === teamId) && !m.finalLabel && m.time)
    .map((m) => timeToMin(m.time))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 0; i < myTimes.length - 1; i++) {
    const freeFrom = myTimes[i] + MATCH_DURATION_MIN;
    const freeTo = myTimes[i + 1];
    const minutes = freeTo - freeFrom;
    if (minutes >= 10) gaps.push({ from: minToTime(freeFrom), to: minToTime(freeTo), minutes });
  }
  return gaps;
}

function TeamScreen({ teams, clubs, matches, sponsors, myClub, myClubName, onOpenWelcome, onChangeClub, lunchWindows, logAction }) {
  if (!myClub) {
    return (
      <div>
        <TopBar title="My Team" />
        <div style={{ padding: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>👋</div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 6 }}>
              Choose your club to get started
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 18, lineHeight: 1.5 }}>
              See your team's fixtures, standing, burger-break times and event updates all in one place.
            </div>
            <button
              onClick={onOpenWelcome}
              style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: "12px 28px", fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
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
  // Most clubs field both, but a club sending a single team (see SINGLE_TEAM_CLUBS)
  // only has one of teamA/teamB — the sections below only render columns/labels
  // for grades this club actually has, rather than showing a "Not started"
  // placeholder for a team that will never exist.
  const clubGrades = [teamA && "A", teamB && "B"].filter(Boolean);
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
      <TopBar title={club?.name || "My Team"} followedTeam={club} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          {club && <TeamBadge team={club} size={52} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>{club?.name}</div>
            <button
              onClick={onChangeClub}
              style={{ background: "none", border: "none", padding: 0, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.pitch, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
            >
              Not your club? Change
            </button>
          </div>
        </div>

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>
          Your Standing
        </div>
        <div style={{ display: "grid", gridTemplateColumns: clubGrades.length > 1 ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 20 }}>
          {[{ label: "Red Team", info: infoA, grade: "A" }, { label: "Green Team", info: infoB, grade: "B" }].filter((r) => clubGrades.includes(r.grade)).map(({ label, info }) => (
            <div key={label} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, textAlign: "center" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
              {info ? (
                <>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 20, color: C.pitch }}>
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

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 4 }}>
          🍔 Burger Break
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft, marginBottom: 8, lineHeight: 1.4 }}>
          Each team has its own protected burger break. Burgers will be ready at the allocated time shown below.
        </div>
        {(() => {
          const windows = Array.isArray(lunchWindows) ? lunchWindows : [];
          const aLunch = windows.find((w) => w.teams?.includes(`${myClub}A`)) || null;
          const bLunch = windows.find((w) => w.teams?.includes(`${myClub}B`)) || null;
          return (
            <div style={{ display: "grid", gridTemplateColumns: clubGrades.length > 1 ? "1fr 1fr" : "1fr", gap: 8, marginBottom: 10 }}>
              {[{label:"Red Team", w:aLunch, grade:"A"}, {label:"Green Team", w:bLunch, grade:"B"}].filter((r) => clubGrades.includes(r.grade)).map(({label,w}) => <div key={label} style={{ background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 12, padding: 12, textAlign: "center" }}><div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, marginBottom: 4 }}>{label}</div>{w ? <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 18, color: C.pitch }}>{w.from}–{w.to}</div> : (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.inkSoft, padding: "6px 0" }}>Generate the schedule to see this</div>
              )}</div>)}
            </div>
          );
        })()}

        {(() => {
          const windows = Array.isArray(lunchWindows) ? lunchWindows : [];
          const lunchFor = (teamId) => windows.find((w) => w.teams?.includes(teamId)) || null;
          const overlapsLunch = (gap, teamId) => { const w = lunchFor(teamId); return w && gap.from < w.to && gap.to > w.from; };
          const otherGapsA = teamA ? computeTeamGaps(teamA.id, matches).filter((g) => !overlapsLunch(g, teamA.id)) : [];
          const otherGapsB = teamB ? computeTeamGaps(teamB.id, matches).filter((g) => !overlapsLunch(g, teamB.id)) : [];
          if (otherGapsA.length === 0 && otherGapsB.length === 0) return null;
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Other breaks between matches
              </div>
              {otherGapsA.map((g, i) => (
                <div key={`a${i}`} style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginBottom: 3 }}>
                  Red team: {g.from}–{g.to} <span style={{ opacity: 0.7 }}>({g.minutes} min)</span>
                </div>
              ))}
              {otherGapsB.map((g, i) => (
                <div key={`b${i}`} style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginBottom: 3 }}>
                  Green team: {g.from}–{g.to} <span style={{ opacity: 0.7 }}>({g.minutes} min)</span>
                </div>
              ))}
            </div>
          );
        })()}

        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>
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

// Round-robin for a group of 3 (one club fielding a single team at that grade
// drops the group from 4 to 3): 3 rounds, each with exactly 1 match — the
// remaining team has that round free rather than sitting idle mid-fixture.
const roundRobin3 = (g) => [
  [[g[0], g[1]]],
  [[g[0], g[2]]],
  [[g[1], g[2]]],
];

// Round-robin for a group of 2 (when only two clubs field a team at a given
// grade): just a single round with one match.
const roundRobin2 = (g) => [
  [[g[0], g[1]]],
];

// Dispatches to the right round-robin shape for however many teams ended up
// in a group — normally 4, but a club fielding only one team at a grade
// (see SINGLE_TEAM_CLUBS) drops that group to 3.
function roundRobinGroup(g) {
  if (g.length === 2) return roundRobin2(g);
  if (g.length === 3) return roundRobin3(g);
  if (g.length === 4) return roundRobin4(g);
  throw new Error(`roundRobinGroup: unsupported group size ${g.length} (expected 2, 3 or 4)`);
}

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

const LUNCH_MINUTES = 30;
const MATCH_DURATION_MIN = 23; // 20 min play + 3 min half-time, per the playing rules
const PRESENTATION_MINUTES = 15; // buffer for trophies/presentations after the last final
const LUNCH_MIN_SLOTS = Math.max(1, Math.floor(LUNCH_MINUTES / SLOT_MINUTES));
const LUNCH_REMAINDER_MINUTES = LUNCH_MINUTES - LUNCH_MIN_SLOTS * SLOT_MINUTES; // the bit that doesn't fit a whole slot

// Fills pitches for consecutive slots from the given pool, respecting the absolute
// rest-gap rule (never back-to-back). Runs for at least `minSlots` slots even if the
// pool empties sooner, so a lunch block can be padded to a real fixed duration.
// Mutates `pool` and `lastPlayedSlot`; returns the next free slot index.
function fillSlots(pool, fixtures, startSlot, lastPlayedSlot, minSlots = 0, excludeTeamIds = null, extraOffsetRef = null, pitchCounts = null) {
  let slotIndex = startSlot;
  let slotsUsed = 0;
  let guard = 0;
  const offset = extraOffsetRef ? extraOffsetRef.value : 0;
  // Shared across every fillSlots call for the whole day (passed in by the
  // caller) so pitch balance is tracked globally, not reset each phase.
  const counts = pitchCounts || Object.fromEntries(PITCHES.map((p) => [p, 0]));
  while (guard < 200) {
    guard++;
    const used = new Set();
    const slotMatches = [];
    for (let i = 0; i < pool.length && slotMatches.length < PITCHES.length; i++) {
      const m = pool[i];
      const aRested = lastPlayedSlot[m.a.id] === undefined || lastPlayedSlot[m.a.id] < slotIndex - 1;
      const bRested = lastPlayedSlot[m.b.id] === undefined || lastPlayedSlot[m.b.id] < slotIndex - 1;
      const excluded = excludeTeamIds && (excludeTeamIds.has(m.a.id) || excludeTeamIds.has(m.b.id));
      if (!excluded && !used.has(m.a.id) && !used.has(m.b.id) && aRested && bRested) {
        slotMatches.push(m);
        used.add(m.a.id);
        used.add(m.b.id);
        pool.splice(i, 1);
        i--;
      }
    }
    if (slotMatches.length > 0) {
      const timeLabel = minutesToLabel(START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES + offset);
      // Assign pitches by whichever have hosted the FEWEST matches so far, rather
      // than by fixed position in this slot's list. A slot with fewer than 3
      // eligible matches (e.g. during a lunch exclusion) would otherwise always
      // shortchange the same pitch — this keeps the running total balanced
      // across the whole day instead.
      const pitchOrder = [...PITCHES].sort((p1, p2) => counts[p1] - counts[p2]);
      slotMatches.forEach((m, pi) => {
        const pitch = pitchOrder[pi];
        counts[pitch]++;
        lastPlayedSlot[m.a.id] = slotIndex;
        lastPlayedSlot[m.b.id] = slotIndex;
        fixtures.push({
          id: `m${Date.now()}_${fixtures.length}_${Math.random().toString(36).slice(2, 6)}`,
          time: timeLabel,
          pitch,
          teamA: m.a.id,
          teamB: m.b.id,
          goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
          status: "scheduled",
        });
      });
    }
    slotIndex++;
    slotsUsed++;

    if (excludeTeamIds) {
      // Exclusion phase (a lunch window): run for exactly minSlots and stop.
      // Whatever's left in the pool is deliberately deferred to a later phase —
      // it is NOT this phase's job to finish, so don't keep looping over it.
      if (slotsUsed >= minSlots) break;
    } else {
      // Normal phase (no exclusions): finish once the pool is actually empty.
      if (pool.length === 0 && slotsUsed >= minSlots) break;
    }
  }
  return slotIndex;
}

function generateGroupFixtures(teams) {
  // Competition groups remain club-aligned, but A and B teams now have separate burger breaks.
  // Fixed grouping (not shuffled, not positional) — this specific split was
  // chosen deliberately and is pinned by CLUB_GROUP_1/CLUB_GROUP_2 above:
  // Group 1 / Lunch 1: Fingallians, Naomh Eoin, Thomas Davis, Knockbridge (B team only — A slot vacant)
  // Group 2 / Lunch 2: St Finian's, Navan O'Mahony's, Ratoath (A team only)
  const clubGroup1 = CLUB_GROUP_1;
  const clubGroup2 = CLUB_GROUP_2;

  const teamsFor = (clubList, grade) => teams.filter((t) => clubList.includes(t.clubId) && t.id.endsWith(grade));

  // "Group 1" is the same 4 clubs whether you're looking at their A team or B team —
  // this is the actual COMPETITION grouping (feeds the Cup/Shield finals). A club
  // fielding only one team (see SINGLE_TEAM_CLUBS) drops its "missing" grade's
  // group from 4 teams to 3 (or 2) — roundRobinGroup() below handles any valid size.
  const groupsA = [teamsFor(clubGroup1, "A"), teamsFor(clubGroup2, "A")];
  const groupsB = [teamsFor(clubGroup1, "B"), teamsFor(clubGroup2, "B")];

  // Filter out empty groups (a group with 0 or 1 teams can't play)
  const validGroupsA = groupsA.filter((g) => g.length >= 2);
  const validGroupsB = groupsB.filter((g) => g.length >= 2);

  const toMatches = (round) => round.map(([a, b]) => ({ a, b }));
  const allRR = [...validGroupsA, ...validGroupsB].map((g) => roundRobinGroup(g));

  const fixtures = [];
  const lastPlayedSlot = {};
  let slotIndex = 0;
  const extraOffset = { value: 0 };
  // Shared across every fillSlots call below (warm-up, both lunch phases,
  // mop-up) so pitch totals stay balanced across the whole day rather than
  // each phase restarting its own count.
  const pitchCounts = Object.fromEntries(PITCHES.map((p) => [p, 0]));

  // Warm-up: everyone's first round only — just enough that nobody
  // breaks for lunch before playing at least once.
  const round1All = allRR.flatMap((rr) => toMatches(rr[0]));
  slotIndex = fillSlots(round1All, fixtures, slotIndex, lastPlayedSlot, 0, null, extraOffset, pitchCounts);

  // Remaining pool: rounds 2+ combined — deliberately NOT
  // split, so the staggered lunch phases below have enough slack to pack well.
  // Groups with fewer rounds (e.g. a 2-team group has only 1 round) simply
  // contribute nothing to later rounds — that's fine.
  let remainingPool = allRR.flatMap((rr) => {
    const later = [];
    for (let r = 1; r < rr.length; r++) later.push(...toMatches(rr[r]));
    return later;
  });

  // Staggered burger breaks: 30-minute sittings beginning at 11:30,
  // with a hard maximum of four team groups in any sitting. Travelling teams
  // (Naomh Eoin, Navan O'Mahonys and Knockbridge) are prioritised into the
  // earliest sittings, while the fixture exclusions below keep them off the
  // pitch during their protected break.
  const lunchWindows = [];
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));
  const preferredLunchOrder = [
    "naomheoinA", "navanomA", "knockbridgeB",
    "naomheoinB", "navanomB",
  ];
  const preferredTeams = preferredLunchOrder.map((id) => byId[id]).filter(Boolean);
  const preferredIds = new Set(preferredTeams.map((t) => t.id));
  const localTeams = teams.filter((t) => !preferredIds.has(t.id));
  const lunchTeams = [...preferredTeams, ...localTeams];
  const cohorts = [];
  for (let i = 0; i < lunchTeams.length; i += 4) cohorts.push(lunchTeams.slice(i, i + 4));
  const PHASE_MINUTES = LUNCH_MINUTES;
  const PHASE_SLOTS = Math.max(1, Math.floor(PHASE_MINUTES / SLOT_MINUTES));
  const PHASE_REMAINDER = PHASE_MINUTES - PHASE_SLOTS * SLOT_MINUTES;

  // The first sitting is fixed at 11:30. If the warm-up rounds finish earlier,
  // leave that time as breathing room rather than pulling lunch forward.
  const FIRST_LUNCH_MINUTES = 11 * 60 + 30;
  const currentBeforeLunch = START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES + extraOffset.value;
  if (currentBeforeLunch < FIRST_LUNCH_MINUTES) extraOffset.value += FIRST_LUNCH_MINUTES - currentBeforeLunch;

  cohorts.forEach((cohort, cohortIndex) => {
    const phaseStartMinutes = START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES + extraOffset.value;
    const teamIds = cohort.map((t) => t.id);
    lunchWindows.push({
      from: minutesToLabel(phaseStartMinutes),
      to: minutesToLabel(phaseStartMinutes + LUNCH_MINUTES),
      teams: teamIds,
      clubs: [...new Set(cohort.map((t) => t.clubId))],
      cohort: cohortIndex + 1,
    });

    slotIndex = fillSlots(remainingPool, fixtures, slotIndex, lastPlayedSlot, PHASE_SLOTS, new Set(teamIds), extraOffset, pitchCounts);
    extraOffset.value += PHASE_REMAINDER;
  });

  // Mop-up: anything still unplayed (shouldn't normally be much, if anything —
  // safety net in case a match's teams were still excluded right to the end).
  slotIndex = fillSlots(remainingPool, fixtures, slotIndex, lastPlayedSlot, 0, null, extraOffset, pitchCounts);

  // Finals — teams left blank until group placings are known.
  // Shield finals first, then Cup finals.
  const shieldTime = minutesToLabel(START_HOUR * 60 + START_MIN + slotIndex * SLOT_MINUTES + extraOffset.value);
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

  const cupMinutes = START_HOUR * 60 + START_MIN + (slotIndex + 1) * SLOT_MINUTES + extraOffset.value;
  const cupTime = minutesToLabel(cupMinutes);
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

  // Bake presentation time into the actual schedule
  const presentationsFrom = minutesToLabel(cupMinutes + MATCH_DURATION_MIN);
  const presentationsTo = minutesToLabel(cupMinutes + MATCH_DURATION_MIN + PRESENTATION_MINUTES);
  fixtures.push({
    id: `presentations-${Date.now()}`,
    time: presentationsFrom,
    pitch: "",
    teamA: "", teamB: "",
    goalsA: 0, pointsA: 0, goalsB: 0, pointsB: 0,
    status: "scheduled",
    finalLabel: "Presentations",
  });

  return { fixtures, lunchWindows, presentations: { from: presentationsFrom, to: presentationsTo } };
}

/* ---------- Admin ---------- */
function RefereeLinkCard({ adminName, logAction }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/?ref=${REFEREE_SECRET}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      logAction(adminName, "Copied the referee link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. older browser) — fall back to a manual select.
      window.prompt("Copy this link:", link);
    }
  };

  return (
    <div style={{ background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Flag size={16} color={C.pitch} />
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink }}>Referee Access</div>
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 14 }}>
        Refs scan this QR code, enter PIN <b>1884</b>, then their name. They'll go straight to score entry for their pitch.
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: `2px solid ${C.sliotar}` }}>
          <QRCodeSVG value={link} size={160} fgColor={C.turf} />
        </div>
      </div>
      <div
        style={{
          background: C.line,
          border: `1px solid ${C.pitch}22`,
          borderRadius: 8,
          padding: "10px 12px",
          fontFamily: "Inter, sans-serif",
          fontSize: 12.5,
          color: C.ink,
          wordBreak: "break-all",
          marginBottom: 10,
        }}
      >
        {link}
      </div>
      <button
        onClick={copyLink}
        style={{
          width: "100%",
          background: copied ? C.sliotar : C.pitch,
          color: copied ? C.ink : "#fff",
          border: "none",
          borderRadius: 8,
          padding: 11,
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {copied ? "✓ Copied!" : "Copy link"}
      </button>
    </div>
  );
}

function AdminScreen({ teams, clubs, matches, setMatches, orders, setOrders, announcements, setAnnouncements, scheduledAnnouncementOverrides, setScheduledAnnouncementOverrides, sponsors, setSponsors, persist, auditLog, logAction, lunchWindows, setLunchWindows, wasRecentlySaved, adminName, onLogout, presentations, setPresentations, finalsPublished, setFinalsPublished }) {
  const [tab, setTab] = useState("orders");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [newAnnouncementTime, setNewAnnouncementTime] = useState("");
  const [newFixture, setNewFixture] = useState({ time: "", pitch: "", teamA: "", teamB: "" });
  const [saveError, setSaveError] = useState(null);
  const [previewAnnouncement, setPreviewAnnouncement] = useState(null);
  const [showFinalsReview, setShowFinalsReview] = useState(false);
  const [finalsReviewDismissed, setFinalsReviewDismissed] = useState(false);

  const groupMatches = matches.filter((m) => !m.finalLabel && m.teamA && m.teamB);
  const finishedGroupCount = groupMatches.filter((m) => m.status === "finished").length;
  const groupComplete = groupMatches.length > 0 && finishedGroupCount === groupMatches.length;
  const proposedFinals = matches.filter((m) => m.finalLabel && m.finalLabel !== "Presentations");
  const unresolvedTies = unresolvedQualificationTies(teams, matches);

  useEffect(() => {
    if (groupComplete && !finalsPublished && !finalsReviewDismissed) setShowFinalsReview(true);
    if (!groupComplete) {
      setShowFinalsReview(false);
      setFinalsReviewDismissed(false);
    }
  }, [groupComplete, finalsPublished, finalsReviewDismissed]);

  const publishFinals = async () => {
    if (!finalPairingsReady(matches)) return;
    setFinalsPublished(true);
    const r = await persist("finalsPublished", true);
    if (!r.ok) {
      setFinalsPublished(false);
      setSaveError(`Finals publish failed (${r.error}). Please try again.`);
      return;
    }
    logAction(adminName, "Published confirmed Cup and Shield final pairings to the app");
    setShowFinalsReview(false);
  };

  const updateMatch = async (id, patch) => {
    // Pull the freshest copy from the server right before writing, so a second
    // admin/referee saving a different match seconds ago doesn't get clobbered
    // by this save re-writing the whole list from a stale local copy. Skip the
    // fetch if WE just saved seconds ago — that fetch could itself race ahead
    // of our own write and hand back stale data, wiping what we just did.
    const latest = wasRecentlySaved("matches") ? matches : await loadShared("matches", matches);
    const editedMatch = latest.find((m) => m.id === id);
    const updatedList = latest.map((m) => (m.id === id ? { ...m, ...patch } : m));
    const next = editedMatch && !editedMatch.finalLabel ? autoFillFinals(updatedList, teams) : updatedList;
    if (editedMatch && !editedMatch.finalLabel && (patch.status !== undefined || patch.goalsA !== undefined || patch.pointsA !== undefined || patch.goalsB !== undefined || patch.pointsB !== undefined)) {
      setFinalsPublished(false);
      persist("finalsPublished", false);
      setFinalsReviewDismissed(false);
    }
    setMatches(next);
    persist("matches", next).then((r) => {
      if (!r.ok) setSaveError(`Score save failed (${r.error}) — this change may only be showing on your screen. Try again.`);
      else setSaveError(null);
    });

    // If auto-fill just populated a final that was blank before, log it separately.
    next.forEach((m, i) => {
      const before = updatedList[i];
      if (before && before.finalLabel && !before.teamA && m.teamA) {
        const a = teams.find((t) => t.id === m.teamA);
        const b = teams.find((t) => t.id === m.teamB);
        logAction(adminName, `Auto-filled ${finalDisplayLabel(m.finalLabel)}: ${a?.name || m.teamA} v ${b?.name || m.teamB} (from group standings)`);
      }
    });

    const m = latest.find((x) => x.id === id);
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
        title="Mentor dashboard"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.line, opacity: 0.85 }}>
              {adminName}
            </span>
            <button
              onClick={onLogout}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 14, padding: "4px 10px", fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: "#fff", cursor: "pointer" }}
            >
              Logout
            </button>
          </div>
        }
      />
      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto" }}>
        {["orders", "fixtures", "finals", "announce", "settings"].map((t) => (
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
            {t === "orders" ? "Burgers" : t === "announce" ? "Announcements" : t === "finals" ? "Finals" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ margin: "10px 16px 0", background: groupComplete ? "#eef9f1" : "#fff", border: `1.5px solid ${groupComplete ? C.pitch : C.pitch + "33"}`, borderRadius: 10, padding: 11, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 13.5, color: C.ink }}>
            Group matches finished: {finishedGroupCount}/{groupMatches.length}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
            {groupComplete ? "All group matches are complete. Review the calculated finals before publishing." : "A score does not count as complete until that fixture is marked Finished."}
          </div>
        </div>
        {groupComplete && !finalsPublished && (
          <button onClick={() => { setFinalsReviewDismissed(false); setShowFinalsReview(true); }} style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: "8px 11px", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap" }}>
            Review Finals
          </button>
        )}
      </div>

      {saveError && (
        <div style={{ margin: "10px 16px 0", background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, fontWeight: 600, lineHeight: 1.5 }}>⚠️ {saveError}</div>
          <button onClick={() => setSaveError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.pitch, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {tab === "orders" && (
        <div style={{ padding: 16 }}>
          {(() => {
            const getCount = (clubId, grade) => {
              const o = orders[clubId] || {};
              if (grade === "A") return Number(o.aTotal ?? (((o.aPlayers || 0) + (o.aMentors || 0)) || ((o.players || 0) + (o.mentors || 0)))) || 0;
              return Number(o.bTotal ?? ((o.bPlayers || 0) + (o.bMentors || 0))) || 0;
            };
            const setCount = async (clubId, grade, value) => {
              const nextValue = Math.max(0, Number(value) || 0);
              const latest = await loadShared("orders", orders);
              const current = latest[clubId] || {};
              const next = { ...latest, [clubId]: { ...current, [grade === "A" ? "aTotal" : "bTotal"]: nextValue } };
              setOrders(next);
              const result = await persist("orders", next);
              if (!result.ok) setSaveError(`Burger total save failed (${result.error}). Please try again.`);
            };
            const getCoachCount = (clubId, grade) => {
              const o = orders[clubId] || {};
              return Number(o[grade === "A" ? "aCoachCount" : "bCoachCount"] || 0) || 0;
            };
            const setCoachCount = async (clubId, grade, value) => {
              const nextValue = Math.max(0, Number(value) || 0);
              const latest = await loadShared("orders", orders);
              const current = latest[clubId] || {};
              const key = grade === "A" ? "aCoachCount" : "bCoachCount";
              const next = { ...latest, [clubId]: { ...current, [key]: nextValue } };
              setOrders(next);
              const result = await persist("orders", next);
              if (!result.ok) setSaveError(`Coach/bus count save failed (${result.error}). Please try again.`);
            };
            // Only build a row for grades the club actually fields — a club sending
            // a single team (see SINGLE_TEAM_CLUBS) should show just the one row,
            // not a phantom entry for the team it isn't bringing.
            const teamRows = clubs.flatMap((club) =>
              ["A", "B"]
                .filter((grade) => teams.some((t) => t.id === `${club.id}${grade}`))
                .map((grade) => ({ id: `${club.id}${grade}`, club, grade, burgers: getCount(club.id, grade), coaches: getCoachCount(club.id, grade) }))
            );
            const aTotal = teamRows.filter((r) => r.grade === "A").reduce((n, r) => n + r.burgers, 0);
            const bTotal = teamRows.filter((r) => r.grade === "B").reduce((n, r) => n + r.burgers, 0);
            const grandTotal = aTotal + bTotal;
            const coachTotal = teamRows.reduce((n, r) => n + r.coaches, 0);
            return (<>
              <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 4 }}>🍔 Burger & Coach/Bus Counts</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>Enter each team’s final burger headcount and the number of coaches/buses arriving. Teams do not submit these themselves; the figures are organiser-managed and can be updated here at any time.</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[["Red Teams", aTotal], ["Green Teams", bTotal], ["Total Burgers", grandTotal], ["Coaches / Buses", coachTotal]].map(([label,val]) => <div key={label} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 12, textAlign: "center" }}><div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 24, color: C.pitch }}>{val}</div><div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft }}>{label}</div></div>)}
              </div>

              {Array.isArray(lunchWindows) && lunchWindows.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 3 }}>⏰ Burgers by sitting time</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, marginBottom: 8, lineHeight: 1.5 }}>
                    How many burgers need to be ready, and for which teams, at each burger-break sitting — so the kitchen knows what's coming and when.
                  </div>
                  {lunchWindows.map((w, i) => {
                    const windowTeamRows = teamRows.filter((r) => (w.teams || []).includes(r.id));
                    const windowBurgers = windowTeamRows.reduce((n, r) => n + r.burgers, 0);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: "12px 14px", marginBottom: 7 }}>
                        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 900, fontSize: 30, color: C.pitch, lineHeight: 1, minWidth: 52, textAlign: "center" }}>
                          🍔 {windowBurgers}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 13.5, color: C.ink, marginBottom: 3 }}>{w.from}–{w.to}</div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
                            {windowTeamRows.length > 0
                              ? windowTeamRows.map((r) => `${r.club.name} ${gradeDisplayName(r.grade)} (${r.burgers})`).join(" · ")
                              : "No teams assigned to this sitting"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {teamRows.map((r) => <div key={r.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 11, marginBottom: 7 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0, marginBottom: 9 }}><TeamBadge team={r.club} size={26}/><div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink }}>{r.club.name} {gradeDisplayName(r.grade)}</div></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, marginBottom: 5 }}>🍔 Burgers</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <button onClick={() => setCount(r.club.id, r.grade, r.burgers - 1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.pitch}33`, background: "#fff", color: C.pitch, fontWeight: 800, cursor: "pointer" }}>−</button>
                      <input type="number" min="0" value={r.burgers} onChange={(e) => setCount(r.club.id, r.grade, e.target.value)} style={{ width: 58, padding: "7px 5px", borderRadius: 8, border: `1px solid ${C.pitch}33`, textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 17, color: C.pitch }} />
                      <button onClick={() => setCount(r.club.id, r.grade, r.burgers + 1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.pitch}33`, background: "#fff", color: C.pitch, fontWeight: 800, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, marginBottom: 5 }}>🚌 Coaches / Buses</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <button onClick={() => setCoachCount(r.club.id, r.grade, r.coaches - 1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.pitch}33`, background: "#fff", color: C.pitch, fontWeight: 800, cursor: "pointer" }}>−</button>
                      <input type="number" min="0" value={r.coaches} onChange={(e) => setCoachCount(r.club.id, r.grade, e.target.value)} style={{ width: 58, padding: "7px 5px", borderRadius: 8, border: `1px solid ${C.pitch}33`, textAlign: "center", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 17, color: C.pitch }} />
                      <button onClick={() => setCoachCount(r.club.id, r.grade, r.coaches + 1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.pitch}33`, background: "#fff", color: C.pitch, fontWeight: 800, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                </div>
              </div>)}
            </>);
          })()}
        </div>
      )}

      {tab === "fixtures" && (
        <div style={{ padding: 16 }}>
          {groupComplete && (
            <div style={{ background: finalsPublished ? "#eef8f0" : "#fff8e8", border: `2px solid ${finalsPublished ? C.pitch : C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.ink, marginBottom: 5 }}>
                {finalsPublished ? "✓ Finals Published" : "🏆 Finals Ready for Review"}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: finalsPublished ? 0 : 10 }}>
                {finalsPublished ? "The confirmed Cup and Shield pairings are now visible to everyone in the app." : "The group stage is complete. Review the proposed finalists before publishing them to teams, spectators and referees."}
              </div>
              {!finalsPublished && <button onClick={() => { setFinalsReviewDismissed(false); setShowFinalsReview(true); }} style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: "9px 12px", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Review Finals</button>}
            </div>
          )}
          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              ⚡ Auto-generate the full schedule
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Creates the round-robin group matches across three pitches, keeping Red teams against Red teams and Green teams against Green teams. <b>Every team receives a staggered {LUNCH_MINUTES}-minute burger break</b>. Burger sittings run from 11:30 in 30-minute blocks, with a hard maximum of four team groups on break at once. Travelling teams are prioritised into the earliest available sittings. No team is double-booked or scheduled in back-to-back slots. Shield finals are played first, followed by Cup finals and presentations. Finalists are only auto-filled when the group placing is genuinely resolved; any tie requiring a coin toss is left for an organiser to decide.
            </div>
            <button
              onClick={async () => {
                const hasResults = matches.some((m) => m.status === "finished" || m.goalsA > 0 || m.pointsA > 0 || m.goalsB > 0 || m.pointsB > 0);
                if (hasResults) {
                  const ok = window.confirm(
                    "Some fixtures already have scores or are marked finished. Generating a new schedule will ERASE all of that. Are you sure?"
                  );
                  if (!ok) return;
                }
                setSaveError(null);
                const { fixtures, lunchWindows: newLunch, presentations: newPresentations } = generateGroupFixtures(teams);
                setMatches(fixtures);
                setFinalsPublished(false);
                persist("finalsPublished", false);
                setLunchWindows(newLunch);
                setPresentations(newPresentations);
                const [r1, r2, r3] = await Promise.all([persist("matches", fixtures), persist("lunchWindows", newLunch), persist("presentations", newPresentations)]);
                if (!r1.ok || !r2.ok || !r3.ok) {
                  setSaveError(`Save to the database failed (${r1.error || r2.error || r3.error}). The schedule is showing on THIS screen only and has NOT been saved — reloading or checking on another device will show the old data. Please try again, and if it keeps failing, this needs checking on the Vercel/Turso side.`);
                  return;
                }
                logAction(adminName, `Auto-generated the full schedule with four staggered 30-minute burger sittings from 11:30 (maximum four team groups at once; travelling teams prioritised early) (replaced ${matches.length} existing fixture${matches.length === 1 ? "" : "s"})`);
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Generate schedule (group stage + hidden finals)
            </button>
            {Array.isArray(lunchWindows) && lunchWindows.length > 0 && (
              <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 12, color: C.ink, background: "#fff", borderRadius: 8, padding: 10, lineHeight: 1.6 }}>
                {lunchWindows.map((w, i) => (
                  <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>
                    <b>{`Burger sitting ${i + 1}`}</b> ({w.from}–{w.to}) — {(w.teams || []).map((id) => teams.find((t) => t.id === id)?.name || id).join(", ")}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.pitch}33`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>
              Finals fill in automatically the moment a group's results are complete. If you've edited fixtures directly and think a final should be fillable now, recalculate manually here.
            </div>
            {unresolvedQualificationTies(teams, matches).length > 0 && (
              <div style={{ background: "#FFF4E5", border: "1px solid #E7A23B", borderRadius: 8, padding: 10, marginBottom: 10, fontFamily: "Inter, sans-serif", fontSize: 12, color: C.ink, lineHeight: 1.45 }}>
                <b>Coin-toss decision required:</b> {unresolvedQualificationTies(teams, matches).join(", ")}. The app will not guess the qualifier; set the relevant final teams manually after the toss.
              </div>
            )}
            <button
              onClick={async () => {
                const latest = wasRecentlySaved("matches") ? matches : await loadShared("matches", matches);
                const next = autoFillFinals(latest, teams);
                const changed = next.some((m, i) => m.teamA !== latest[i].teamA);
                setMatches(next);
                persist("matches", next);
                if (changed) {
                  next.forEach((m, i) => {
                    const before = latest[i];
                    if (before.finalLabel && !before.teamA && m.teamA) {
                      const a = teams.find((t) => t.id === m.teamA);
                      const b = teams.find((t) => t.id === m.teamB);
                      logAction(adminName, `Auto-filled ${finalDisplayLabel(m.finalLabel)}: ${a?.name || m.teamA} v ${b?.name || m.teamB} (from group standings)`);
                    }
                  });
                }
              }}
              style={{ width: "100%", background: "#fff", border: `1px dashed ${C.pitch}55`, borderRadius: 8, padding: 10, fontFamily: "Inter, sans-serif", color: C.pitch, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              🔄 Recalculate finals from standings
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
                  The opponent list is filtered to {newFixture.teamA.endsWith("A") ? "Red" : "Green"} teams only — Red teams only play Red teams, and Green teams only play Green teams.
                </div>
              )}
            </div>
            <button
              onClick={async () => {
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
                const latest = wasRecentlySaved("matches") ? matches : await loadShared("matches", matches);
                const next = [...latest, fixture];
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
                        {finalIcon(m.finalLabel)} {finalDisplayLabel(m.finalLabel)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      const latest = wasRecentlySaved("matches") ? matches : await loadShared("matches", matches);
                      const next = latest.filter((x) => x.id !== m.id);
                      setMatches(next);
                      persist("matches", next);
                      logAction(adminName, `Deleted fixture: ${a?.name || m.teamA || "TBC"} v ${b?.name || m.teamB || "TBC"} (${m.time}, ${m.pitch})`);
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                {m.finalLabel !== "Presentations" && (
                  <>
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}


      {tab === "finals" && (
        <div style={{ padding: 16 }}>
          {/* Progress */}
          <div style={{ background: groupComplete ? "#eef9f1" : "#fff8e8", border: `1.5px solid ${groupComplete ? C.pitch : C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 15, color: C.ink, marginBottom: 4 }}>
              {groupComplete ? "✓ All group matches complete" : `Group matches: ${finishedGroupCount} / ${groupMatches.length} finished`}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
              {groupComplete
                ? finalsPublished
                  ? "Finals are currently published and visible to everyone."
                  : "Review the standings and proposed finals below. Nothing is visible to anyone else until you publish."
                : "Finals will be calculated once every group match is marked Finished."}
            </div>
          </div>

          {/* Unresolved ties warning */}
          {unresolvedTies.length > 0 && (
            <div style={{ background: "#fff4f2", border: `1.5px solid ${C.pitch}`, borderRadius: 10, padding: 11, marginBottom: 14, fontFamily: "Inter, sans-serif", fontSize: 12, color: C.ink, lineHeight: 1.45 }}>
              ⚠️ <b>Admin decision required:</b> {unresolvedTies.join(", ")} cannot be resolved by head-to-head alone. A coin toss is needed — manually set the finalists in the Fixtures tab.
            </div>
          )}

          {/* Group standings */}
          {groupMatches.length > 0 && (() => {
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
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 10 }}>Group Standings</div>
                {labeled.map((grp) => {
                  const rows = computeStandings(grp.teams, matches);
                  return (
                    <div key={`${grp.grade}${grp.num}`} style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.pitch, marginBottom: 4 }}>
                        {gradeDisplayName(grp.grade)} Group {grp.num}
                      </div>
                      <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr", background: C.turf, color: C.line, fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, padding: "7px 8px", textTransform: "uppercase" }}>
                          <div>Team</div><div style={{ textAlign: "center" }}>P</div><div style={{ textAlign: "center" }}>W</div><div style={{ textAlign: "center" }}>D</div><div style={{ textAlign: "center" }}>L</div><div style={{ textAlign: "center" }}>Pts</div>
                        </div>
                        {rows.map((r, i) => {
                          const teamObj = teams.find((t) => t.id === r.id);
                          const isQualifier = i < 2;
                          return (
                            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr", padding: "6px 8px", borderTop: `1px solid ${C.pitch}11`, background: isQualifier ? "#f0faf3" : "transparent" }}>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: isQualifier ? 700 : 500, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {isQualifier && <span style={{ color: i === 0 ? C.pitch : C.sliotar, marginRight: 3 }}>{i === 0 ? "🏆" : "🛡️"}</span>}
                                {teamObj?.name || r.id}
                              </div>
                              <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{r.played}</div>
                              <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{r.won}</div>
                              <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{r.drawn}</div>
                              <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{r.lost}</div>
                              <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.ink }}>{r.points}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, marginTop: 4 }}>
                  🏆 = Cup finalist (group winner) · 🛡️ = Shield finalist (runner-up)
                </div>
              </div>
            );
          })()}

          {/* Proposed finals with pitch assignments */}
          {groupComplete && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 10 }}>Proposed Finals</div>
              {proposedFinals.map((m) => {
                const a = teams.find((t) => t.id === m.teamA);
                const b = teams.find((t) => t.id === m.teamB);
                return (
                  <div key={m.id} style={{ background: "#fff", border: `1.5px solid ${C.pitch}22`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 800, color: C.pitch }}>{finalDisplayLabel(m.finalLabel)}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{m.time}</div>
                    </div>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                      {a?.name || "TBC"} <span style={{ color: C.inkSoft, fontWeight: 400 }}>v</span> {b?.name || "TBC"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: C.inkSoft }}>Pitch:</label>
                      <select
                        value={m.pitch}
                        onChange={async (e) => {
                          const newPitch = e.target.value;
                          const updated = matches.map((mx) => mx.id === m.id ? { ...mx, pitch: newPitch } : mx);
                          setMatches(updated);
                          const r = await persist("matches", updated);
                          if (!r.ok) setSaveError(`Pitch update failed (${r.error}).`);
                          else logAction(adminName, `Set ${finalDisplayLabel(m.finalLabel)} pitch to ${newPitch}`);
                        }}
                        style={{ fontFamily: "Inter, sans-serif", fontSize: 12, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.pitch}33`, background: "#fff" }}
                      >
                        {PITCHES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}

              {!finalPairingsReady(matches) && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, background: "#fff8e8", border: `1px solid ${C.sliotar}44`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  Not all pairings are resolved yet. Check for unresolved ties above or ensure all group matches are finished.
                </div>
              )}
            </div>
          )}

          {/* Publish / Unpublish actions */}
          {groupComplete && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {!finalsPublished && (
                <button
                  disabled={!finalPairingsReady(matches)}
                  onClick={publishFinals}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: finalPairingsReady(matches) ? C.pitch : "#bbb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: 13,
                    fontFamily: "'League Spartan', sans-serif",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: finalPairingsReady(matches) ? "pointer" : "not-allowed",
                  }}
                >
                  Publish Finals
                </button>
              )}
              {finalsPublished && (
                <button
                  onClick={async () => {
                    setFinalsPublished(false);
                    const r = await persist("finalsPublished", false);
                    if (!r.ok) {
                      setFinalsPublished(true);
                      setSaveError(`Unpublish failed (${r.error}).`);
                      return;
                    }
                    logAction(adminName, "Unpublished finals — hidden from public again");
                  }}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: "#fff",
                    color: C.pitch,
                    border: `2px solid ${C.pitch}`,
                    borderRadius: 10,
                    padding: 13,
                    fontFamily: "'League Spartan', sans-serif",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Unpublish Finals
                </button>
              )}
            </div>
          )}

          {!groupComplete && groupMatches.length === 0 && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "30px 0" }}>
              Generate or add fixtures first. Finals are calculated automatically once all group matches are complete.
            </div>
          )}
        </div>
      )}


      {tab === "announce" && (
        <div style={{ padding: 16 }}>
          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              ⏰ Scheduled announcements
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              These are generated from the live schedule and default to 10 minutes before the relevant event. You can edit both the wording and the send time. If you manually change a time, that announcement keeps your chosen time even if the schedule is regenerated. Each Red/Green team gets its own burger-break notice, targeted to that club only.
            </div>
            {computeScheduledAnnouncements(matches, lunchWindows, clubs, scheduledAnnouncementOverrides, finalsPublished).map((s) => {
              const alreadyPosted = announcements.some((a) => a.id === s.id);
              return (
                <div key={s.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 700, color: C.ink }}>
                      Send at
                      <input
                        type="time"
                        value={s.triggerLabel}
                        onChange={(e) => {
                          const next = { ...scheduledAnnouncementOverrides, [s.id]: { ...(scheduledAnnouncementOverrides[s.id] || {}), triggerTime: e.target.value } };
                          setScheduledAnnouncementOverrides(next);
                          persist("scheduledAnnouncementOverrides", next);
                        }}
                        style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: C.pitch }}
                      />
                    </label>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: alreadyPosted ? C.pitch : C.inkSoft, textTransform: "uppercase" }}>
                      {alreadyPosted ? "✓ Posted" : "Not yet due"}
                    </span>
                  </div>
                  <textarea
                    value={s.text}
                    onChange={(e) => {
                      const next = { ...scheduledAnnouncementOverrides, [s.id]: { ...(scheduledAnnouncementOverrides[s.id] || {}), text: e.target.value } };
                      setScheduledAnnouncementOverrides(next);
                      persist("scheduledAnnouncementOverrides", next);
                    }}
                    style={{ width: "100%", boxSizing: "border-box", minHeight: 64, resize: "vertical", border: `1px solid ${C.pitch}22`, borderRadius: 8, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink, lineHeight: 1.4, marginBottom: 8 }}
                  />
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, marginBottom: 8 }}>{s.isTimeOverridden ? `Manual send time · linked event is ${s.eventTime}` : `Defaults to 10 minutes before ${s.eventTime}`}{s.teamIds?.length ? " · only the relevant club sees this team notice" : " · shown to everyone"}</div>
                  <button
                    onClick={() => setPreviewAnnouncement(s)}
                    style={{ background: "none", border: `1px solid ${C.pitch}33`, borderRadius: 20, padding: "5px 12px", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 700, color: C.pitch, cursor: "pointer" }}
                  >
                    Preview
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder="New announcement"
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                style={{ flex: "1 1 240px", padding: 10, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13 }}
              />
              <input
                type="time"
                aria-label="Announcement time"
                value={newAnnouncementTime}
                onChange={(e) => setNewAnnouncementTime(e.target.value)}
                style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink }}
              />
              <button
                onClick={() => {
                  if (!newAnnouncement.trim()) return;
                  const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
                  const chosenTime = newAnnouncementTime || nowTime;
                  const next = [{ id: `a${Date.now()}`, text: newAnnouncement, time: chosenTime, publishTime: newAnnouncementTime || null }, ...announcements];
                  setAnnouncements(next);
                  persist("announcements", next);
                  logAction(adminName, `${newAnnouncementTime ? `Scheduled announcement for ${chosenTime}` : "Posted announcement"}: "${newAnnouncement}"`);
                  setNewAnnouncement("");
                  setNewAnnouncementTime("");
                }}
                style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", minHeight: 38, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
              >
                {newAnnouncementTime ? "Schedule" : "Post Now"}
              </button>
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, marginTop: 6 }}>Leave the time blank to post immediately, or choose a time to show it automatically later on blitz day.</div>
          </div>
          {announcements.map((a) => (
            <div key={a.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.inkSoft }}>Show at</span>
                  <input
                    type="time"
                    value={a.publishTime || a.time || ""}
                    onChange={(e) => {
                      const next = announcements.map((x) => x.id === a.id ? { ...x, time: e.target.value, publishTime: e.target.value } : x);
                      setAnnouncements(next);
                      persist("announcements", next);
                    }}
                    style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${C.pitch}22`, fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 700, color: C.pitch }}
                  />
                </div>
                <textarea
                  value={a.text}
                  onChange={(e) => {
                    const next = announcements.map((x) => x.id === a.id ? { ...x, text: e.target.value } : x);
                    setAnnouncements(next);
                  }}
                  onBlur={() => {
                    persist("announcements", announcements);
                    logAction(adminName, `Edited announcement: "${a.text}"`);
                  }}
                  style={{ width: "100%", boxSizing: "border-box", minHeight: 58, resize: "vertical", border: `1px solid ${C.pitch}22`, borderRadius: 8, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink, lineHeight: 1.4 }}
                />
                {a.audienceClubIds?.length > 0 && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, marginTop: 4 }}>Targeted team notice</div>}
              </div>
              <button
                onClick={() => {
                  const next = announcements.filter((x) => x.id !== a.id);
                  setAnnouncements(next);
                  persist("announcements", next);
                  logAction(adminName, `Deleted announcement: "${a.text}"`);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, flexShrink: 0, paddingTop: 6 }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "sponsors" && (
        <div style={{ padding: 16 }}>
          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              🔄 Reset sponsor names
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Renames all 6 sponsors to plain "Sponsor 1" through "Sponsor 6" — fixes any leftover "Gold/Silver/Supporter" names from before. Any logos or website links you've already added are kept untouched.
            </div>
            <button
              onClick={async () => {
                const next = sponsors.map((s, i) => ({ ...s, name: `Sponsor ${i + 1}` }));
                setSponsors(next);
                const r = await persist("sponsors", next);
                if (!r.ok) { setSaveError(`Sponsor save failed (${r.error}) — this change may only be showing on your screen. Try again.`); return; }
                logAction(adminName, "Reset all sponsor names to plain Sponsor 1-6");
              }}
              style={{ width: "100%", background: "#fff", border: `1px dashed ${C.pitch}55`, borderRadius: 8, padding: 10, fontFamily: "Inter, sans-serif", color: C.pitch, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Reset all names to Sponsor 1–6
            </button>
          </div>

          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
            Paste a hosted image URL for each logo (e.g. from their website, or an image you've uploaded to Google Drive/Imgur with public sharing on). Leave it blank and the sponsor's name shows instead.
          </div>
          {sponsors.map((s, i) => {
            const update = async (patch) => {
              const next = sponsors.map((x, j) => (j === i ? { ...x, ...patch } : x));
              setSponsors(next);
              const r = await persist("sponsors", next);
              if (!r.ok) setSaveError(`Sponsor save failed (${r.error}) — this change may only be showing on your screen. Try again.`);
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
                    onClick={async () => {
                      const next = sponsors.filter((_, j) => j !== i);
                      setSponsors(next);
                      const r = await persist("sponsors", next);
                      if (!r.ok) { setSaveError(`Sponsor save failed (${r.error}) — this change may only be showing on your screen. Try again.`); return; }
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
                  style={{ width: "100%", border: `1px solid ${C.pitch}22`, borderRadius: 6, padding: 8, fontFamily: "Inter, sans-serif", fontSize: 12 }}
                />
                {s.logo && (
                  <div style={{ marginTop: 8, padding: 8, background: C.line, borderRadius: 6, display: "flex", justifyContent: "center" }}>
                    <img src={s.logo} alt={s.name} style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={async () => {
              const next = [...sponsors, { id: `s${Date.now()}`, name: "New sponsor", url: "", logo: "" }];
              setSponsors(next);
              const r = await persist("sponsors", next);
              if (!r.ok) { setSaveError(`Sponsor save failed (${r.error}) — this change may only be showing on your screen. Try again.`); return; }
              logAction(adminName, "Added a new sponsor slot");
            }}
            style={{ width: "100%", background: "#fff", border: `1px dashed ${C.pitch}55`, borderRadius: 10, padding: 12, fontFamily: "Inter, sans-serif", color: C.pitch, fontWeight: 700, cursor: "pointer" }}
          >
            + Add sponsor
          </button>
        </div>
      )}

      {tab === "settings" && (
        <div style={{ padding: 16 }}>
          <RefereeLinkCard adminName={adminName} logAction={logAction} />

          <div style={{ background: C.line, border: `1.5px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              💾 Download full backup
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Saves everything — teams, fixtures, scores, burger headcounts, announcements, sponsors — as a file on your device. This is independent of the database, so it's your safety net if anything ever needs restoring. Worth doing before the event, and again a few times during the day.
            </div>
            <button
              onClick={() => {
                const backup = {
                  exportedAt: new Date().toISOString(),
                  teams,
                  matches,
                  orders,
                  announcements,
                  sponsors,
                  auditLog,
                };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const stamp = new Date().toISOString().replace(/[:.]/g, "-");
                a.href = url;
                a.download = `blitz-backup-${stamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                logAction(adminName, "Downloaded a full data backup");
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Download backup (.json)
            </button>
          </div>

          <div style={{ background: "#fff", border: `2px solid ${C.sliotar}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.pitch, marginBottom: 4 }}>
              🧹 Clear Test Scores Only
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Clears every test score and Finished/Live status while keeping the fixture schedule, pitches, lunch sittings, teams, burger/coach counts and announcements exactly as they are. Finals return to TBC and must be confirmed again after the real group matches are completed.
            </div>
            <button
              onClick={async () => {
                const sure = window.confirm(
                  "Clear all test scores and match statuses but KEEP the current schedule and lunch allocations?"
                );
                if (!sure) return;

                const cleaned = matches.map((m) => ({
                  ...m,
                  goalsA: 0,
                  pointsA: 0,
                  goalsB: 0,
                  pointsB: 0,
                  status: "scheduled",
                  ...(m.finalLabel && m.finalLabel !== "Presentations" ? { teamA: "", teamB: "" } : {}),
                }));

                setMatches(cleaned);
                const result = await persist("matches", cleaned);
                setFinalsPublished(false);
                await persist("finalsPublished", false);
                setShowFinalsReview(false);
                setFinalsReviewDismissed(false);
                if (result?.ok === false) {
                  window.alert(`Could not clear scores: ${result.error || "save failed"}`);
                  return;
                }
                logAction(adminName, "Cleared test scores/statuses while preserving the schedule and lunch allocations");
                window.alert("Test scores cleared. The schedule and lunch allocations have been kept.");
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Clear scores — keep schedule
            </button>
          </div>

          <div style={{ background: "#fff", border: `2px solid ${C.pitch}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 14, color: C.pitch, marginBottom: 4 }}>
              🗑️ Reset test data
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Clears fixtures, scores, burger headcounts, announcements, and lunch windows — back to a completely clean slate, as if the event hadn't started yet. Your 9 clubs, sponsors, and admin logins are <b>not</b> affected. Use this to wipe today's test run before the real event. Downloads a backup automatically first, just in case.
            </div>
            <button
              onClick={() => {
                const sure = window.confirm(
                  "This will permanently clear all fixtures, scores, burger headcounts, announcements, and lunch windows. Teams, sponsors and logins are kept. This cannot be undone (though a backup will download first). Continue?"
                );
                if (!sure) return;
                const typed = window.prompt('Type RESET to confirm:');
                if (typed !== "RESET") return;

                // Auto-download a safety backup before wiping anything.
                const backup = { exportedAt: new Date().toISOString(), teams, matches, orders, announcements, sponsors, auditLog };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const stamp = new Date().toISOString().replace(/[:.]/g, "-");
                a.href = url;
                a.download = `blitz-backup-before-reset-${stamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                setMatches(DEFAULT_MATCHES);
                persist("matches", DEFAULT_MATCHES);
                setOrders(DEFAULT_ORDERS);
                persist("orders", DEFAULT_ORDERS);
                setAnnouncements(DEFAULT_ANNOUNCEMENTS);
                persist("announcements", DEFAULT_ANNOUNCEMENTS);
                setLunchWindows([]);
                persist("lunchWindows", []);
                setPresentations(null);
                persist("presentations", null);
                setFinalsPublished(false);
                persist("finalsPublished", false);
                logAction(adminName, "Reset all test data (fixtures, orders, announcements, lunch windows) to a clean slate");
              }}
              style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.pitch}`, borderRadius: 8, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, color: C.pitch, cursor: "pointer" }}
            >
              Reset everything to a clean slate
            </button>
          </div>

          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, marginTop: 16, marginBottom: 10 }}>Activity Log</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
            Every score update, fixture change, announcement, and login. Most recent first.
          </div>
          {auditLog.length === 0 && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "20px 0" }}>
              Nothing logged yet.
            </div>
          )}
          {auditLog.map((entry) => (
            <div key={entry.id} style={{ background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 600, fontSize: 12.5, color: C.pitch }}>{entry.admin}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.inkSoft }}>{new Date(entry.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink }}>{entry.action}</div>
            </div>
          ))}

          </div>
        )}

      {showFinalsReview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,40,28,0.72)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 430, maxHeight: "88dvh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 16px 50px rgba(0,0,0,.28)" }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 22, color: C.ink, marginBottom: 4 }}>🏆 Confirm Finals</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 14 }}>
              The app has calculated the final pairings from the completed group results. Check them carefully before publishing. They remain hidden from everyone else until you press <b>Publish Finals</b>.
            </div>
            {unresolvedTies.length > 0 && (
              <div style={{ background: "#fff4f2", border: `1.5px solid ${C.pitch}`, borderRadius: 10, padding: 11, marginBottom: 12, fontFamily: "Inter, sans-serif", fontSize: 12, color: C.ink, lineHeight: 1.45 }}>
                ⚠️ <b>Admin decision required:</b> {unresolvedTies.join(", ")} cannot be resolved by head-to-head. Complete the required coin toss/manual finalist selection in Fixtures before publishing.
              </div>
            )}
            {proposedFinals.map((m) => {
              const a = teams.find((t) => t.id === m.teamA);
              const b = teams.find((t) => t.id === m.teamB);
              return (
                <div key={m.id} style={{ border: `1px solid ${C.pitch}22`, borderRadius: 10, padding: 11, marginBottom: 8 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 800, color: C.pitch, marginBottom: 4 }}>{m.time} · {finalDisplayLabel(m.finalLabel)}</div>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 15, fontWeight: 700, color: C.ink }}>{a?.name || "TBC"} <span style={{ color: C.inkSoft, fontWeight: 500 }}>v</span> {b?.name || "TBC"}</div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => { setShowFinalsReview(false); setFinalsReviewDismissed(true); setTab("fixtures"); }} style={{ flex: 1, background: "#fff", color: C.ink, border: `1px solid ${C.pitch}44`, borderRadius: 9, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}>Review / Adjust</button>
              <button disabled={!finalPairingsReady(matches)} onClick={publishFinals} style={{ flex: 1.25, background: finalPairingsReady(matches) ? C.pitch : "#bbb", color: "#fff", border: "none", borderRadius: 9, padding: 11, fontFamily: "Inter, sans-serif", fontWeight: 800, cursor: finalPairingsReady(matches) ? "pointer" : "not-allowed" }}>Publish Finals</button>
            </div>
            {!finalPairingsReady(matches) && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, textAlign: "center", marginTop: 8 }}>All four final pairings must be confirmed before publishing.</div>}
          </div>
        </div>
      )}

      {previewAnnouncement && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,17,16,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setPreviewAnnouncement(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, padding: "28px 24px", maxWidth: 340, width: "100%", textAlign: "center", border: `3px solid ${C.sliotar}`, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}
          >
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 700, color: C.pitch, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              👁 Preview only — not posted
            </div>
            <div style={{ fontSize: 42, marginBottom: 10 }}>📢</div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, color: C.pitch, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
              Announcement
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: C.ink, lineHeight: 1.5, marginBottom: 22 }}>
              {previewAnnouncement.text}
            </div>
            <button
              onClick={() => setPreviewAnnouncement(null)}
              style={{ background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: "12px 36px", fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Close preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniScoreInput({ label, value, onChange, large }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: large ? 6 : 4 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: large ? 13 : 10, color: C.inkSoft }}>{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))}
        style={{ width: large ? 56 : 36, padding: large ? 12 : 6, borderRadius: large ? 10 : 6, border: `${large ? 2 : 1}px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", fontSize: large ? 18 : 13, fontWeight: large ? 700 : 400, textAlign: "center" }}
      />
    </div>
  );
}

function RefereeScreen({ teams, matches, setMatches, persist, logAction, wasRecentlySaved }) {
  const [refName, setRefName] = useState(() => {
    try { return localStorage.getItem("refName") || ""; } catch { return ""; }
  });
  const [pinVerified, setPinVerified] = useState(() => {
    try { return localStorage.getItem("refPinOk") === "1"; } catch { return false; }
  });
  const [myPitch, setMyPitch] = useState(() => {
    try { return localStorage.getItem("refPitch") || ""; } catch { return ""; }
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const wasAdjustRef = useRef(false);
  const REF_PIN = "1884";
  const REF_PITCHES = ["Pitch 1", "Pitch 2", "Pitch 3"];

  const teamById = (id) => teams.find((t) => t.id === id) || { name: id, color: "#999" };

  if (!pinVerified) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title="Referee Access" />
        <div style={{ marginTop: 40, background: "#fff", border: `2px solid ${C.sliotar}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
          <Flag size={36} color={C.pitch} style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 20, color: C.pitch, textTransform: "uppercase", marginBottom: 8 }}>Referee PIN</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>Enter the 4-digit code given at the referee briefing.</div>
          <input type="tel" maxLength={4} placeholder="PIN" value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(false); }} style={{ width: "100%", padding: 16, borderRadius: 12, textAlign: "center", border: `2px solid ${pinError ? C.pitch : C.pitch + "33"}`, fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 12, marginBottom: 12 }} />
          {pinError && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, fontWeight: 700, marginBottom: 10 }}>Incorrect PIN.</div>}
          <button onClick={() => { if (pinInput === REF_PIN) { setPinVerified(true); try { localStorage.setItem("refPinOk", "1"); } catch {} } else setPinError(true); }} style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: 14, fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Enter</button>
        </div>
      </div>
    );
  }

  if (!refName) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title="Referee" />
        <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>Enter your first and last name to record scores.</div>
          <input
            placeholder="First and last name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", marginBottom: 10 }}
          />
          <button
            onClick={() => {
              const name = nameInput.trim();
              if (!name || !name.includes(" ")) return;
              try { localStorage.setItem("refName", name); } catch {}
              setRefName(name);
            }}
            style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
          >
            Continue
          </button>
          {nameInput.trim() && !nameInput.trim().includes(" ") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.pitch, marginTop: 6 }}>Please enter both first and last name.</div>}
        </div>
      </div>
    );
  }

  if (!myPitch) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title="Referee" />
        <div style={{ marginTop: 20, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: 20, textAlign: "center" }}>
          <MapPin size={32} color={C.pitch} style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, color: C.ink, textTransform: "uppercase", marginBottom: 6 }}>Select Your Pitch</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>You'll only see matches on your assigned pitch.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {REF_PITCHES.map((p) => (
              <button key={p} onClick={() => { setMyPitch(p); try { localStorage.setItem("refPitch", p); } catch {} }} style={{ width: "100%", padding: 18, borderRadius: 14, background: p === "Pitch 1" ? "linear-gradient(135deg, #2a7d3f, #1a5c2d)" : `linear-gradient(135deg, ${HERO_BRIGHT}, ${HERO_DARK})`, color: "#fff", border: "none", fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, cursor: "pointer" }}>{p} {p === "Pitch 1" ? "(All-Weather)" : "(Grass)"}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedId) {
    const m = matches.find((x) => x.id === selectedId);
    if (!m) {
      setSelectedId(null);
      return null;
    }
    const a = teamById(m.teamA);
    const b = teamById(m.teamB);
    const wasAdjust = wasAdjustRef.current;
    const TapBtn = ({ onClick, children, minus }) => (<button onClick={onClick} style={{ width: 48, height: 48, borderRadius: 14, border: minus ? `2px solid ${C.pitch}33` : "none", background: minus ? "#fff" : C.pitch, fontSize: 24, fontWeight: 700, cursor: "pointer", color: minus ? C.pitch : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</button>);
    const ScoreRow = ({ label, goals, points, onGoals, onPoints }) => (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 10 }}>{label}</div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 6 }}>Goals</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <TapBtn minus onClick={() => onGoals(Math.max(0, goals - 1))}>-</TapBtn>
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 36, fontWeight: 900, color: C.ink, minWidth: 40, textAlign: "center" }}>{goals}</span>
              <TapBtn onClick={() => onGoals(goals + 1)}>+</TapBtn>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", marginBottom: 6 }}>Points</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <TapBtn minus onClick={() => onPoints(Math.max(0, points - 1))}>-</TapBtn>
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 36, fontWeight: 900, color: C.ink, minWidth: 40, textAlign: "center" }}>{points}</span>
              <TapBtn onClick={() => onPoints(points + 1)}>+</TapBtn>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: "'League Spartan', sans-serif", fontSize: 14, color: C.inkSoft }}>Total: {scoreLabel(goals, points)} ({scoreTotal(goals, points)} pts)</div>
      </div>
    );
    return (
      <div style={{ padding: 16 }}>
        <TopBar title={wasAdjust ? "Adjust Score" : "Enter Score"} onBack={() => { setSelectedId(null); setSaved(false); }} />
        <div style={{ marginTop: 16, background: "#fff", border: `1px solid ${C.pitch}22`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.pitch }}>{m.time}</span>
            <PitchBadge pitch={m.pitch} />
            {wasAdjust && <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.sliotar, background: `${C.sliotar}22`, padding: "3px 8px", borderRadius: 8 }}>Adjusting</span>}
          </div>
          <ScoreRow label={a.name} goals={draft.goalsA} points={draft.pointsA} onGoals={(v) => setDraft((d) => ({ ...d, goalsA: v }))} onPoints={(v) => setDraft((d) => ({ ...d, pointsA: v }))} />
          <div style={{ borderTop: `1px solid ${C.pitch}14`, paddingTop: 16 }}>
            <ScoreRow label={b.name} goals={draft.goalsB} points={draft.pointsB} onGoals={(v) => setDraft((d) => ({ ...d, goalsB: v }))} onPoints={(v) => setDraft((d) => ({ ...d, pointsB: v }))} />
          </div>
          {saved && <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,17,16,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div style={{ background: "#fff", borderRadius: 18, padding: "28px 24px", maxWidth: 340, width: "100%", textAlign: "center", border: `3px solid ${C.sliotar}`, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}><Check size={40} color={C.pitch} style={{ marginBottom: 12 }} /><div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, color: C.pitch, textTransform: "uppercase", marginBottom: 8 }}>{wasAdjust ? "Score Adjusted" : "Score Saved"}</div><div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.ink, marginBottom: 20 }}>{scoreLabel(draft.goalsA, draft.pointsA)} v {scoreLabel(draft.goalsB, draft.pointsB)}</div><button onClick={() => { const nm = matches.filter((x) => x.pitch === myPitch && x.status !== "finished" && x.id !== m.id && x.teamA && x.teamB).sort((x, y) => x.time.localeCompare(y.time))[0]; if (nm) { setDraft({ goalsA: nm.goalsA, pointsA: nm.pointsA, goalsB: nm.goalsB, pointsB: nm.pointsB }); setSelectedId(nm.id); } else { setSelectedId(null); } setSaved(false); }} style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 30, padding: 14, fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 8 }}>{(() => { const nm = matches.filter((x) => x.pitch === myPitch && x.status !== "finished" && x.id !== m.id && x.teamA && x.teamB); return nm.length > 0 ? "Next match" : "Back to list"; })()}</button><button onClick={() => { setSelectedId(null); setSaved(false); }} style={{ width: "100%", background: "none", border: "none", color: C.inkSoft, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 8 }}>Back to match list</button></div></div>}
          <button
            onClick={async () => {
              // Pull the freshest copy from the server right before writing, same
              // safeguard AdminScreen uses — with multiple pitches/referees saving
              // at once, writing from a stale local `matches` array would silently
              // erase whatever another referee just saved for a different match.
              // Skipped only if WE just saved seconds ago, so that fetch can't
              // itself race ahead of our own write and hand back stale data.
              const latest = wasRecentlySaved("matches") ? matches : await loadShared("matches", matches);
              const updatedList = latest.map((x) => (x.id === m.id ? { ...x, ...draft, status: "finished" } : x));
              const next = autoFillFinals(updatedList, teams);
              setMatches(next);
              await persist("matches", next);
              logAction(`Referee: ${refName}`, `${wasAdjust ? "Adjusted" : "Entered final"} score for ${a.name} v ${b.name}: ${scoreLabel(draft.goalsA, draft.pointsA)} - ${scoreLabel(draft.goalsB, draft.pointsB)}`);
              next.forEach((x, i) => { const before = updatedList[i]; if (before && before.finalLabel && !before.teamA && x.teamA) { const fa = teams.find((t) => t.id === x.teamA); const fb = teams.find((t) => t.id === x.teamB); logAction(`Referee: ${refName}`, `Auto-filled ${x.finalLabel}: ${fa?.name || x.teamA} v ${fb?.name || x.teamB}`); } });
              setSaved(true);
            }}
            style={{ width: "100%", background: C.sliotar, color: C.ink, border: "none", borderRadius: 30, padding: 18, fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 17, cursor: "pointer", marginTop: 10 }}
          >
            {wasAdjust ? "Save adjustment" : "Save final score"}
          </button>
        </div>
      </div>
    );
  }

  const pitchMatches = matches.filter((m) => m.pitch === myPitch && m.teamA && m.teamB && m.finalLabel !== "Presentations");
  const sorted = [...pitchMatches].sort((x, y) => x.time.localeCompare(y.time));
  const finishedCount = sorted.filter((m) => m.status === "finished").length;
  const visible = showFinished ? sorted : sorted.filter((m) => m.status !== "finished");

  return (
    <div style={{ paddingBottom: 20 }}>
      <TopBar
        title={myPitch}
        right={<span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.line, opacity: 0.85 }}>{refName}</span>}
      />
      <div style={{ padding: "10px 16px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => { setMyPitch(""); try { localStorage.removeItem("refPitch"); } catch {} }} style={{ background: "none", border: "none", color: C.pitch, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Change pitch</button>
        <button onClick={() => { try { localStorage.removeItem("refName"); localStorage.removeItem("refPitch"); localStorage.removeItem("refPinOk"); } catch {} setRefName(""); setMyPitch(""); setPinVerified(false); }} style={{ background: "none", border: "none", color: C.inkSoft, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}>Sign out</button>
      </div>
      <div style={{ padding: "8px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.inkSoft }}>
            Tap a match to enter or adjust its score.
          </div>
          {finishedCount > 0 && (
            <button
              onClick={() => setShowFinished((v) => !v)}
              style={{ background: "none", border: "none", color: C.pitch, fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}
            >
              {showFinished ? "Hide finished" : `Show finished (${finishedCount})`}
            </button>
          )}
        </div>
        {visible.length === 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: C.inkSoft, textAlign: "center", padding: "40px 20px" }}>
            {sorted.length === 0 ? "No fixtures on this pitch yet." : "All matches on this pitch are done!"}
          </div>
        )}
        {visible.map((m) => {
          const a = teamById(m.teamA);
          const b = teamById(m.teamB);
          return (
            <button
              key={m.id}
              onClick={async () => {
                let target = m;
                if (m.status === "finished") {
                  // Re-check the server before opening an already-finished match —
                  // guards against two people (or the same ref, twice) both viewing
                  // this pitch and one having a stale/finished view of it.
                  const latest = await loadShared("matches", matches);
                  target = latest.find((x) => x.id === m.id) || m;
                  const ok = window.confirm(
                    `This match already has a final score: ${teamById(target.teamA).name} ${scoreLabel(target.goalsA, target.pointsA)} - ${scoreLabel(target.goalsB, target.pointsB)} ${teamById(target.teamB).name}. Change it?`
                  );
                  if (!ok) return;
                }
                wasAdjustRef.current = target.status === "finished";
                setDraft({ goalsA: target.goalsA, pointsA: target.pointsA, goalsB: target.goalsB, pointsB: target.pointsB });
                setSelectedId(target.id);
                setSaved(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                background: "#fff",
                border: `1.5px solid ${m.status === "finished" ? C.ash + "55" : C.pitch + "33"}`,
                borderRadius: 14,
                padding: 16,
                marginBottom: 10,
                cursor: "pointer",
                opacity: m.status === "finished" ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 18, color: C.pitch }}>{m.time}</span>
                <StatusPill status={m.status} />
              </div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, lineHeight: 1.3 }}>
                {m.finalLabel === "Presentations" ? "🏆 Presentations" : (
                  <>
                    {a.name} <span style={{ color: C.inkSoft, fontWeight: 400, fontSize: 14 }}>v</span> {b.name}
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <PitchBadge pitch={m.pitch} />
                {m.finalLabel && !m.finalLabel.includes("Presentations") && (
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: C.sliotar }}>{finalIcon(m.finalLabel)} {finalDisplayLabel(m.finalLabel)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LoginModal({ mode, onClose, onMentorSuccess, onRefereeSuccess }) {
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState(false);
  const [name, setName] = useState("");

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,17,16,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, padding: "24px 22px", maxWidth: 320, width: "100%", border: `3px solid ${C.sliotar}` }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
            <X size={18} />
          </button>
        </div>

        {mode === "mentor" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <UserCircle size={20} color={C.pitch} />
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Mentor sign-in</span>
            </div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <input
                type={showCode ? "text" : "password"}
                placeholder="Passcode"
                value={code}
                autoFocus
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(false);
                }}
                style={{ width: "100%", padding: "12px 42px 12px 12px", borderRadius: 8, border: `1px solid ${error ? C.pitch : C.pitch + "33"}`, fontFamily: "Inter, sans-serif" }}
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}
              >
                {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.pitch, marginBottom: 8 }}>
                That passcode isn't recognised.
              </div>
            )}
            <button
              onClick={() => {
                const found = findAdminByCode(code);
                if (found) onMentorSuccess(found);
                else setError(true);
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
            >
              Enter
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Flag size={20} color={C.pitch} />
              <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Referee sign-in</span>
            </div>
            <input
              placeholder="Your name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.pitch}33`, fontFamily: "Inter, sans-serif", marginBottom: 10 }}
            />
            <button
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) return;
                onRefereeSuccess(trimmed);
              }}
              style={{ width: "100%", background: C.pitch, color: "#fff", border: "none", borderRadius: 8, padding: 12, fontFamily: "Inter, sans-serif", fontWeight: 700, cursor: "pointer" }}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WelcomeMessageModal({ onDismiss }) {
  const scrollRef = useRef(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const checkScrolled = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 15) setScrolledToEnd(true);
  };

  useEffect(() => {
    // If the message already fits without scrolling (e.g. a tall screen), don't
    // leave someone stuck unable to trigger a scroll event that will never fire.
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 15) setScrolledToEnd(true);
  }, []);

  return (
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
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "24px 22px 18px",
          maxWidth: 360,
          width: "100%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          border: `3px solid ${C.sliotar}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div ref={scrollRef} onScroll={checkScrolled} style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <LogoBadge size={56} ringWidth={2.5} />
          </div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 16, color: C.pitch, textAlign: "center", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Welcome!
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: C.ink, lineHeight: 1.6 }}>
            {WELCOME_PARAGRAPHS.map((p, i) => (
              <p key={i} style={{ margin: i === 0 ? "0 0 8px" : "0 0 10px" }}>{p}</p>
            ))}
            <p style={{ margin: 0, fontWeight: 700, color: C.pitch }}>{WELCOME_SIGNOFF}</p>
          </div>
        </div>
        <button
          onClick={() => scrolledToEnd && onDismiss()}
          disabled={!scrolledToEnd}
          style={{
            width: "100%",
            background: scrolledToEnd ? C.pitch : C.ash,
            color: "#fff",
            border: "none",
            borderRadius: 30,
            padding: 12,
            fontFamily: "'League Spartan', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: scrolledToEnd ? "pointer" : "not-allowed",
            marginTop: 14,
            flexShrink: 0,
          }}
        >
          {scrolledToEnd ? "Let's go!" : "Scroll to read the full message ↓"}
        </button>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: C.inkSoft, textAlign: "center", marginTop: 10, flexShrink: 0 }}>
          You can always read this again on the Info tab.
        </div>
      </div>
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
  const [scheduledAnnouncementOverrides, setScheduledAnnouncementOverrides] = useState({});
  const [sponsors, setSponsors] = useState(DEFAULT_SPONSORS);
  const [auditLog, setAuditLog] = useState([]);
  const [announcementModal, setAnnouncementModal] = useState(null); // holds the announcement to show, or null
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  // Persisted like referee/club sign-in, so admins aren't logged out on every
  // reload — cleared on explicit "Sign out" only.
  const [adminName, setAdminName] = useState(() => {
    try { return localStorage.getItem("adminName") || ""; } catch { return ""; }
  });
  const [adminAuthed, setAdminAuthed] = useState(() => {
    try { return !!localStorage.getItem("adminName"); } catch { return false; }
  });
  const [loginModalMode, setLoginModalMode] = useState(null); // null | "mentor" | "referee"
  const [lunchWindows, setLunchWindows] = useState([]);
  const [presentations, setPresentations] = useState(null);
  const [finalsPublished, setFinalsPublished] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [myClub, setMyClub] = useState(() => {
    try {
      return localStorage.getItem("myClub") || null;
    } catch {
      return null;
    }
  });
  const [screen, setScreen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Resume referee mode either from the link's ?ref= secret, or — so a ref who
      // fully closes their phone/browser (not just backgrounds it) still lands back
      // in referee mode without re-scanning the QR code — from a previously
      // verified PIN on this device. "Sign out" clears refPinOk, so this only
      // persists until they deliberately sign out.
      if (params.get("ref") === REFEREE_SECRET || localStorage.getItem("refPinOk") === "1") return "referee";
      // Same idea for admin — resume straight back on the Admin screen after a
      // reload/reopen, not just silently stay "authed" underneath a Home screen.
      if (localStorage.getItem("adminName")) return "admin";
      return localStorage.getItem("myClub") ? "team" : "welcome";
    } catch {
      return "welcome";
    }
  });

  const isRefMode = useRef(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ref") === REFEREE_SECRET || localStorage.getItem("refPinOk") === "1") {
        isRefMode.current = true;
        setScreen("referee");
      }
    } catch {}
  }, []);

  const chooseClub = useCallback((clubId) => {
    try {
      localStorage.setItem("myClub", clubId);
    } catch {}
    setMyClub(clubId);
    setScreen("team");
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
    const visible = list.filter((a) => !a.audienceClubIds?.length || (myClub && a.audienceClubIds.includes(myClub)));
    if (visible.length === 0) return;
    const newest = visible[0];
    let seenId = null;
    try {
      seenId = localStorage.getItem("seenAnnouncementId");
    } catch {}
    if (newest.id !== seenId) {
      setAnnouncementModal(newest);
      playAnnouncementDing();
    }
  }, [myClub]);

  useEffect(() => {
    (async () => {
      const [t, m, o, a, sao, s, log, lunch, pres, finalsPub] = await Promise.all([
        loadShared("teams", DEFAULT_TEAMS),
        loadShared("matches", DEFAULT_MATCHES),
        loadShared("orders", DEFAULT_ORDERS),
        loadShared("announcements", DEFAULT_ANNOUNCEMENTS),
        loadShared("scheduledAnnouncementOverrides", {}),
        loadShared("sponsors", DEFAULT_SPONSORS),
        loadShared("auditLog", []),
        loadShared("lunchWindows", []),
        loadShared("presentations", null),
        loadShared("finalsPublished", false),
      ]);
      setTeams((Array.isArray(t) ? t : DEFAULT_TEAMS).map(normalizeTeamDisplayName));
      setMatches(m);
      setOrders(o);
      setAnnouncements(a);
      setScheduledAnnouncementOverrides(sao && typeof sao === "object" ? sao : {});
      setSponsors(s);
      setAuditLog(log);
      setLunchWindows(Array.isArray(lunch) ? lunch : []); // old data was an object, not an array — discard if so
      setPresentations(pres && pres.from ? pres : null);
      setFinalsPublished(Boolean(finalsPub));
      setLoaded(true);
      checkForNewAnnouncement(a);

      let seenWelcome = null;
      try {
        seenWelcome = localStorage.getItem("seenWelcomeMessage");
      } catch {}
      if (!seenWelcome) {
        setShowWelcomeMessage(true);
      }
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

  // Poll for fixture/score changes too, so with multiple people using the app
  // at once (referees entering scores, mentors and parents watching), everyone's
  // Fixtures/Standings/Team views stay current without needing a manual reload.
  // Skips the update if we saved locally very recently, so this can never race
  // ahead of our own save and wipe fixtures we just generated/edited.
  // Also skips entirely in ref mode — the ref is the one writing scores.
  useEffect(() => {
    if (isRefMode.current) return;
    const interval = setInterval(async () => {
      const recentlySaved = Date.now() - (lastSaveTimeRef.current.matches || 0) < 15000;
      if (recentlySaved) return;
      const [latest, published] = await Promise.all([
        loadShared("matches", DEFAULT_MATCHES),
        loadShared("finalsPublished", false),
      ]);
      setMatches(latest);
      setFinalsPublished(Boolean(published));
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Keep the publish gate in sync for every open app, including referee mode.
  useEffect(() => {
    const interval = setInterval(async () => {
      const published = await loadShared("finalsPublished", false);
      setFinalsPublished(Boolean(published));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // (Scheduled-announcement auto-posting effect moved below, after `clubs` is defined.)

  const dismissAnnouncementModal = useCallback(() => {
    if (announcementModal) {
      try {
        localStorage.setItem("seenAnnouncementId", announcementModal.id);
      } catch {}
    }
    setAnnouncementModal(null);
  }, [announcementModal]);

  const dismissWelcomeMessage = useCallback(() => {
    try {
      localStorage.setItem("seenWelcomeMessage", "1");
    } catch {}
    setShowWelcomeMessage(false);

  }, []);

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
          name: t.name.replace(/\s+(?:A|B|Red|Green)$/i, ""),
          town: t.town,
          county: t.county,
          color: t.color,
        });
      }
    });
    return Array.from(seen.values());
  }, [teams]);

  // Auto-post scheduled announcements (registration, each lunch sitting, finals)
  // once their trigger time arrives. Whichever open browser's check fires first
  // posts it — checking the latest data first means two browsers checking around
  // the same moment won't both post a duplicate.
  useEffect(() => {
    const checkScheduled = async () => {
      const now = new Date();
      if (!isEventDay(now)) return; // never fire on any day other than the real event day
      const scheduled = computeScheduledAnnouncements(matches, lunchWindows, clubs, scheduledAnnouncementOverrides, finalsPublished);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const due = scheduled.filter((s) => nowMin >= s.triggerMin);
      if (due.length === 0) return;
      const latest = await loadShared("announcements", DEFAULT_ANNOUNCEMENTS);
      const existingIds = new Set(latest.map((a) => a.id));
      const toAdd = due.filter((s) => !existingIds.has(s.id));
      if (toAdd.length === 0) return;
      const newEntries = toAdd.map((s) => ({ id: s.id, text: s.text, time: s.triggerLabel, publishTime: s.triggerLabel, audienceClubIds: s.audienceClubIds || [], teamIds: s.teamIds || [] }));
      const next = [...newEntries, ...latest];
      setAnnouncements(next);
      await saveShared("announcements", next);
      checkForNewAnnouncement(next);
    };
    checkScheduled();
    const interval = setInterval(checkScheduled, 30000);
    return () => clearInterval(interval);
  }, [matches, lunchWindows, clubs, scheduledAnnouncementOverrides, finalsPublished, checkForNewAnnouncement]);

  const lastSaveTimeRef = useRef({});
  const persist = useCallback((key, value) => {
    lastSaveTimeRef.current[key] = Date.now();
    return saveShared(key, value);
  }, []);
  const wasRecentlySaved = useCallback((key, ms = 3000) => Date.now() - (lastSaveTimeRef.current[key] || 0) < ms, []);

  const myClubObj = clubs.find((c) => c.id === myClub) || null;
  const visibleAnnouncements = announcements.filter((a) => {
    const audienceOk = !a.audienceClubIds?.length || (myClub && a.audienceClubIds.includes(myClub));
    if (!audienceOk) return false;
    if (!a.publishTime) return true;
    const now = new Date();
    if (!isEventDay(now)) return false;
    const [h, m] = String(a.publishTime).split(":").map(Number);
    const publishMin = (h || 0) * 60 + (m || 0);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return nowMin >= publishMin;
  });


  // Finals and presentations are completely hidden from every non-admin screen
  // until an organiser has checked the standings and explicitly published them.
  const publicMatches = useMemo(() => {
    if (finalsPublished) return matches;
    return matches.filter((m) => !m.finalLabel);
  }, [matches, finalsPublished]);


  if (!loaded) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.turf, gap: 16 }}>
        <img src={BADGE_LOGO} alt="Fingallians" style={{ width: 100, height: 100, objectFit: "contain" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.sliotar, letterSpacing: 1, textTransform: "uppercase" }}>Meas</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>&#183;</span>
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.sliotar, letterSpacing: 1, textTransform: "uppercase" }}>Neart</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>&#183;</span>
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: C.sliotar, letterSpacing: 1, textTransform: "uppercase" }}>Bua</span>
        </div>
        <span style={{ color: C.line, fontFamily: "Inter, sans-serif", fontSize: 13 }}>Loading blitz day...</span>
      </div>
    );
  }

  if (screen === "welcome") {
    return <WelcomeScreen clubs={clubs} onChoose={chooseClub} onClose={closeWelcome} myClubName={myClubObj?.name} />;
  }

  if (isRefMode.current && screen === "referee") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", background: C.line, minHeight: "100dvh", fontFamily: "Inter, sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <RefereeScreen teams={teams} matches={publicMatches} setMatches={setMatches} persist={persist} logAction={logAction} wasRecentlySaved={wasRecentlySaved} />
      </div>
    );
  }

  let body;
  if (screen === "today") body = <TodayScreen teams={teams} clubs={clubs} matches={publicMatches} announcements={visibleAnnouncements} sponsors={sponsors} setScreen={setScreen} setSelectedTeam={setSelectedTeam} myClubName={myClubObj?.name} myClubObj={myClubObj} onChangeClub={changeClub} onOpenWelcome={openWelcome} lunchWindows={lunchWindows} presentations={finalsPublished ? presentations : null} />;
  else if (screen === "teams") body = <TeamsScreen teams={teams} matches={publicMatches} setScreen={setScreen} setSelectedTeam={setSelectedTeam} />;
  else if (screen === "teamDetail") body = <TeamDetailScreen teamId={selectedTeam} teams={teams} matches={publicMatches} setScreen={setScreen} />;
  else if (screen === "fixtures") body = <FixturesScreen teams={teams} clubs={clubs} matches={publicMatches} sponsors={sponsors} setScreen={setScreen} myClubObj={myClubObj} />;
  else if (screen === "standings") body = <StandingsScreen teams={teams} matches={publicMatches} sponsors={sponsors} myClubObj={myClubObj} />;
  else if (screen === "team") body = <TeamScreen teams={teams} clubs={clubs} matches={publicMatches} sponsors={sponsors} myClub={myClub} myClubName={myClubObj?.name} onOpenWelcome={openWelcome} onChangeClub={changeClub} lunchWindows={lunchWindows} logAction={logAction} />;
  else if (screen === "info") body = <InfoScreen sponsors={sponsors} announcements={visibleAnnouncements} myClubObj={myClubObj} onMentorClick={() => (adminAuthed ? setScreen("admin") : setLoginModalMode("mentor"))} />;
  else if (screen === "admin" && adminAuthed)
    body = (
      <AdminScreen
        teams={teams}
        clubs={clubs}
        matches={matches}
        setMatches={setMatches}
        orders={orders}
        setOrders={setOrders}
        announcements={announcements}
        scheduledAnnouncementOverrides={scheduledAnnouncementOverrides}
        setScheduledAnnouncementOverrides={setScheduledAnnouncementOverrides}
        setAnnouncements={setAnnouncements}
        sponsors={sponsors}
        setSponsors={setSponsors}
        persist={persist}
        auditLog={auditLog}
        logAction={logAction}
        lunchWindows={lunchWindows}
        setLunchWindows={setLunchWindows}
        presentations={presentations}
        setPresentations={setPresentations}
        finalsPublished={finalsPublished}
        setFinalsPublished={setFinalsPublished}
        wasRecentlySaved={wasRecentlySaved}
        adminName={adminName}
        onLogout={() => {
          logAction(adminName, "Logged out");
          try { localStorage.removeItem("adminName"); } catch {}
          setAdminAuthed(false);
          setAdminName("");
          setScreen("today");
        }}
      />
    );
  else if (screen === "referee")
    body = <RefereeScreen teams={teams} matches={publicMatches} setMatches={setMatches} persist={persist} logAction={logAction} wasRecentlySaved={wasRecentlySaved} />;
  // If screen is somehow "admin" without being authed, body stays unset here and
  // falls through to the safety-net default below — no state updates during render.

  if (!body) body = <TodayScreen teams={teams} clubs={clubs} matches={publicMatches} announcements={visibleAnnouncements} sponsors={sponsors} setScreen={setScreen} setSelectedTeam={setSelectedTeam} myClubName={myClubObj?.name} myClubObj={myClubObj} onChangeClub={changeClub} onOpenWelcome={openWelcome} lunchWindows={lunchWindows} presentations={finalsPublished ? presentations : null} />;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: C.line, minHeight: "100dvh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ flex: 1, overflowY: "auto" }}>{body}</div>
      {screen !== "referee" && screen !== "admin" && (
        <div style={{ textAlign: "center", padding: "6px 0", background: C.line, borderTop: `1px solid #e9e2de` }}>
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, fontSize: 11, color: C.pitch, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6 }}>Meas &#183; Neart &#183; Bua</span>
        </div>
      )}
      {screen !== "referee" && <BottomNav screen={screen} setScreen={setScreen} showAdmin={adminAuthed} />}

      {loginModalMode && (
        <LoginModal
          mode={loginModalMode}
          onClose={() => setLoginModalMode(null)}
          onMentorSuccess={(name) => {
            try { localStorage.setItem("adminName", name); } catch {}
            setAdminName(name);
            setAdminAuthed(true);
            logAction(name, "Logged in");
            setLoginModalMode(null);
            setScreen("admin");
          }}
          onRefereeSuccess={(name) => {
            try {
              localStorage.setItem("refName", name);
            } catch {}
            setLoginModalMode(null);
            setScreen("referee");
          }}
        />
      )}

      {showWelcomeMessage && screen !== "referee" && <WelcomeMessageModal onDismiss={dismissWelcomeMessage} />}

            {announcementModal && screen !== "referee" && (
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
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 12, color: C.pitch, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
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
                fontFamily: "'League Spartan', sans-serif",
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
