import { CHAPTERS, CHAPTER_BY_ID } from "./chapters";
import { GameState } from "./types";
import { Compass, Flag, GitBranch, MapPin, X } from "lucide-react";
import { useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Arc colours — mirrors the .arc-* classes in index.css              */
/* ------------------------------------------------------------------ */

const ARC_COLORS: Record<string, string> = {
  "Dry Shrine": "#96d3ca",
  "Forty Roofs": "#d39d70",
  "Hollow Market": "#d4b481",
  "Moving Lights": "#b2a3e6",
  "Great Storm": "#a1b9d5",
  "Forgotten Channels": "#7eb8c4",
};

function arcColor(arc: string): string {
  return ARC_COLORS[arc] ?? "#a1b9d5";
}

/* ------------------------------------------------------------------ */
/*  Village map locations                                              */
/* ------------------------------------------------------------------ */

type MapLocation = {
  id: string;
  label: string;
  x: number;
  y: number;
  arc: string;
  chapterIds: number[];
  underground?: boolean;
};

/**
 * Stylised top-down schematic of Varsha Hollow.  Coordinates are on a
 * 440 x 470 viewBox.  The shrine sits at the top of the slope (high
 * ground); the river runs along the bottom.  Underground locations are
 * rendered with a dashed style directly beneath the shrine marker.
 */
const MAP_LOCATIONS: MapLocation[] = [
  { id: "western-forest", label: "W. Forest", x: 45, y: 80, arc: "Moving Lights", chapterIds: [16] },
  { id: "western-road", label: "W. Road", x: 72, y: 170, arc: "Dry Shrine", chapterIds: [1] },
  { id: "rain-shrine", label: "Rain Shrine", x: 220, y: 58, arc: "Dry Shrine", chapterIds: [4, 18, 20, 24, 25, 31, 35, 36] },
  { id: "dry-reservoir", label: "Reservoir", x: 128, y: 125, arc: "Dry Shrine", chapterIds: [2, 3] },
  { id: "council-veranda", label: "Council", x: 310, y: 88, arc: "Dry Shrine", chapterIds: [5] },
  { id: "watch-house", label: "Watch-house", x: 340, y: 145, arc: "Forty Roofs", chapterIds: [8] },
  { id: "eastern-homes", label: "E. Homes", x: 385, y: 185, arc: "Forty Roofs", chapterIds: [7] },
  { id: "village-square", label: "Square", x: 215, y: 220, arc: "Forty Roofs", chapterIds: [10, 12, 15, 21] },
  { id: "market-lane", label: "Market", x: 300, y: 200, arc: "Hollow Market", chapterIds: [11, 14] },
  { id: "garden-clinic", label: "Clinic", x: 345, y: 248, arc: "Hollow Market", chapterIds: [17, 29] },
  { id: "sanctuary", label: "Sanctuary", x: 380, y: 290, arc: "Hollow Market", chapterIds: [30] },
  { id: "southern-lane", label: "S. Lane", x: 155, y: 275, arc: "Forty Roofs", chapterIds: [9] },
  { id: "riverbed", label: "Riverbed", x: 88, y: 245, arc: "Forty Roofs", chapterIds: [6] },
  { id: "southern-road", label: "S. Road", x: 245, y: 315, arc: "Hollow Market", chapterIds: [13] },
  { id: "old-bridge", label: "Bridge", x: 180, y: 355, arc: "Great Storm", chapterIds: [23] },
  { id: "flooded-lane", label: "Flooded Ln", x: 360, y: 335, arc: "Great Storm", chapterIds: [22, 33] },
  { id: "the-mill", label: "Mill", x: 310, y: 395, arc: "Great Storm", chapterIds: [34] },
  { id: "beneath-shrine", label: "Beneath", x: 220, y: 100, arc: "Forgotten Channels", chapterIds: [19, 26, 27, 28, 32], underground: true },
];

/** Reverse lookup: chapter id -> map location id */
const CHAPTER_TO_LOCATION: Record<number, string> = {};
for (const loc of MAP_LOCATIONS) {
  for (const chId of loc.chapterIds) {
    CHAPTER_TO_LOCATION[chId] = loc.id;
  }
}

/** Chapters where at least one choice branches to a non-sequential id. */
const BRANCH_CHAPTERS = new Set([4, 5, 13, 18, 22, 24]);

/* ------------------------------------------------------------------ */
/*  Village SVG map                                                    */
/* ------------------------------------------------------------------ */

function VillageMap({ state }: { state: GameState }) {
  const { currentChapterId, history } = state;

  const visitedChapters = useMemo(() => {
    const chapters = history.map((h) => h.chapterId);
    if (!chapters.includes(currentChapterId)) chapters.push(currentChapterId);
    return chapters;
  }, [history, currentChapterId]);

  const visitedLocationIds = useMemo(
    () => visitedChapters.map((chId) => CHAPTER_TO_LOCATION[chId]).filter(Boolean),
    [visitedChapters],
  );

  const visitedLocationSet = useMemo(() => new Set(visitedLocationIds), [visitedLocationIds]);

  /** Ordered, de-duplicated location ids — the player's actual path. */
  const pathLocations = useMemo(() => {
    const result: string[] = [];
    for (const locId of visitedLocationIds) {
      if (result[result.length - 1] !== locId) result.push(locId);
    }
    return result;
  }, [visitedLocationIds]);

  const currentLocationId = CHAPTER_TO_LOCATION[currentChapterId];
  const currentChapter = CHAPTER_BY_ID.get(currentChapterId);

  const locationById = useMemo(() => {
    const map: Record<string, MapLocation> = {};
    for (const loc of MAP_LOCATIONS) map[loc.id] = loc;
    return map;
  }, []);

  const pathPoints = pathLocations
    .map((id) => locationById[id])
    .filter(Boolean);

  const pathD = pathPoints.length > 1
    ? pathPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : "";

  return (
    <div className="village-map-wrap">
      <svg viewBox="0 0 440 470" className="village-map-svg" role="img" aria-label="Map of Varsha Hollow">
        <defs>
          <radialGradient id="map-bg-grad" cx="50%" cy="18%" r="75%">
            <stop offset="0%" stopColor="#15383b" />
            <stop offset="100%" stopColor="#0a1719" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="440" height="470" fill="url(#map-bg-grad)" />

        {/* Topographic contour lines — suggest the slope from shrine down to river */}
        <ellipse cx="220" cy="55" rx="205" ry="165" fill="none" stroke="rgba(168,216,216,0.05)" strokeWidth="1" />
        <ellipse cx="220" cy="55" rx="160" ry="130" fill="none" stroke="rgba(168,216,216,0.04)" strokeWidth="1" />
        <ellipse cx="220" cy="55" rx="115" ry="95" fill="none" stroke="rgba(168,216,216,0.03)" strokeWidth="1" />

        {/* Village boundary — subtle organic shape */}
        <path
          d="M 55 135 Q 100 110 165 100 Q 225 92 285 100 Q 345 112 395 145 Q 405 200 380 255 Q 345 295 295 305 Q 240 312 185 305 Q 130 298 85 275 Q 60 245 55 195 Z"
          fill="rgba(168,216,216,0.025)"
          stroke="rgba(168,216,216,0.06)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />

        {/* River / riverbed — runs from west to southeast along the bottom */}
        <path
          d="M 15 255 Q 75 285 135 315 Q 195 350 255 375 Q 320 398 425 425"
          fill="none"
          stroke="rgba(126,184,196,0.07)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M 15 255 Q 75 285 135 315 Q 195 350 255 375 Q 320 398 425 425"
          fill="none"
          stroke="rgba(126,184,196,0.12)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Forest cluster — northwest */}
        <g fill="rgba(155,209,140,0.1)" stroke="rgba(155,209,140,0.18)" strokeWidth="0.5">
          <circle cx="28" cy="68" r="7" />
          <circle cx="45" cy="52" r="5" />
          <circle cx="18" cy="85" r="4" />
          <circle cx="55" cy="72" r="4" />
          <circle cx="38" cy="95" r="3.5" />
        </g>

        {/* Connector from shrine down to the "beneath" marker */}
        <line
          x1="220" y1="65" x2="220" y2="93"
          stroke="rgba(168,216,216,0.14)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* "BENEATH" label for the underground zone */}
        <text
          x="252" y="103"
          fill="rgba(168,216,216,0.25)"
          fontSize="6"
          fontFamily="'DM Mono', monospace"
          letterSpacing="0.15em"
        >
          BENEATH
        </text>

        {/* Path between visited locations */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="rgba(214,174,114,0.45)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Location markers */}
        {MAP_LOCATIONS.map((loc) => {
          const isVisited = visitedLocationSet.has(loc.id);
          const isCurrent = loc.id === currentLocationId;
          const color = arcColor(loc.arc);
          const r = isCurrent ? 6.5 : isVisited ? 5 : 3.5;

          return (
            <g key={loc.id}>
              {/* Pulse glow for current location */}
              {isCurrent && (
                <>
                  <circle cx={loc.x} cy={loc.y} r={14} fill={color} opacity={0.12} className="map-glow-outer" />
                  <circle cx={loc.x} cy={loc.y} r={10} fill={color} opacity={0.2} className="map-glow-inner" />
                </>
              )}

              {/* Marker circle */}
              <circle
                cx={loc.x}
                cy={loc.y}
                r={r}
                fill={isVisited || isCurrent ? color : "rgba(168,216,216,0.06)"}
                stroke={isVisited || isCurrent ? color : "rgba(168,216,216,0.22)"}
                strokeWidth={isCurrent ? 2 : 1}
                strokeDasharray={loc.underground ? "2 2" : undefined}
                opacity={isVisited || isCurrent ? 1 : 0.5}
              />

              {/* Inner dot for current location */}
              {isCurrent && <circle cx={loc.x} cy={loc.y} r={2} fill="#fff" />}

              {/* Label */}
              <text
                x={loc.x}
                y={loc.y + r + 9}
                textAnchor="middle"
                fill={isVisited || isCurrent ? "rgba(233,239,231,0.78)" : "rgba(168,216,216,0.28)"}
                fontSize="7"
                fontFamily="'DM Mono', monospace"
                letterSpacing="0.04em"
              >
                {loc.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Current location text below the SVG */}
      {currentChapter && (
        <div className="map-current-loc">
          <MapPin size={12} />
          <span>{currentChapter.location}</span>
        </div>
      )}

      {/* Arc legend */}
      <div className="map-legend">
        {Object.entries(ARC_COLORS).map(([arc, color]) => (
          <div className="map-legend-item" key={arc}>
            <span className="map-legend-dot" style={{ background: color }} />
            <span>{arc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Journey timeline                                                   */
/* ------------------------------------------------------------------ */

function JourneyTimeline({ state }: { state: GameState }) {
  const { currentChapterId, history } = state;

  const visitedSet = useMemo(() => {
    const set = new Set(history.map((h) => h.chapterId));
    set.add(currentChapterId);
    return set;
  }, [history, currentChapterId]);

  const visitedCount = visitedSet.size;

  return (
    <div className="map-timeline">
      <div className="map-timeline-head">
        <span>Journey Line</span>
        <span className="map-timeline-count">{visitedCount} / 36 visited</span>
      </div>
      <div className="map-timeline-list">
        {CHAPTERS.map((ch) => {
          const isVisited = visitedSet.has(ch.id);
          const isCurrent = ch.id === currentChapterId;
          const isBranch = BRANCH_CHAPTERS.has(ch.id);
          const isEnding = Boolean(ch.isEnding);
          const color = arcColor(ch.arc);

          return (
            <div
              className={`map-tl-node ${isVisited ? "visited" : ""} ${isCurrent ? "current" : ""} ${isEnding ? "ending" : ""}`}
              key={ch.id}
            >
              <div className="map-tl-rail">
                <span
                  className="map-tl-dot"
                  style={{
                    borderColor: color,
                    background: isVisited ? color : "transparent",
                    color: isVisited ? "#0a1719" : color,
                  }}
                >
                  {isEnding ? <Flag size={7} /> : isCurrent ? <MapPin size={7} /> : ch.id}
                </span>
              </div>
              <div className="map-tl-info">
                <span className="map-tl-title">{ch.title}</span>
                <span className="map-tl-arc" style={{ color: isVisited ? color : "rgba(168,216,216,0.3)" }}>{ch.arc}</span>
              </div>
              {isBranch && (
                <span className="map-tl-branch" title="Branch point">
                  <GitBranch size={10} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MapView — overlay wrapper                                          */
/* ------------------------------------------------------------------ */

export function MapView({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <div className="map-overlay" role="dialog" aria-modal="true" aria-labelledby="map-title">
      <div className="map-panel">
        <div className="map-header">
          <div className="map-title">
            <Compass size={16} />
            <span id="map-title">Village Map</span>
            <span className="map-subtitle">Varsha Hollow</span>
          </div>
          <button className="map-close" onClick={onClose} aria-label="Close map">
            <X size={18} />
          </button>
        </div>
        <div className="map-content">
          <div className="map-svg-section">
            <VillageMap state={state} />
          </div>
          <div className="map-timeline-section">
            <JourneyTimeline state={state} />
          </div>
        </div>
      </div>
    </div>
  );
}
