import { useState } from "react";
import { ChevronDown, Calendar, Clock, Link2 } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, feelingLabel } from "../lib/constants";
import { fmtDate, fmtTime, fmtDuration, groupSupersets, groupDrops, formatSet, isSetFilled } from "../lib/utils";
import { Avatar } from "./Avatar";
import { SessionTypeBadges } from "./SessionTypes";
import { Modal } from "./Modal";
import { SessionEntryForm, entryDraftFrom } from "./SessionEntryForm";
import { SessionEditForm, sessionMetaFrom } from "./SessionEditForm";

// Photo(s) de la séance : la principale (ma photo perso si j'en ai mis une, sinon
// celle de la séance), puis celles des autres participants en miniatures pour
// basculer de l'une à l'autre.
// object-fit: contain (plutôt que cover en 4/3 fixe) : chacun cadre sa photo comme
// il veut, on affiche donc la photo entière plutôt que d'en cacher des morceaux
// avec un recadrage forcé.
function SessionPhoto({ photos }) {
  const [idx, setIdx] = useState(0);
  if (!photos.length) return null;
  const cur = photos[Math.min(idx, photos.length - 1)];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ background: COLORS.surface2, borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.5)" }}>
        <img src={cur.url} alt="" style={{ display: "block", width: "100%", maxHeight: "55vh", objectFit: "contain", borderRadius: 10 }} />
      </div>
      {photos.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          {photos.map((p, i) => (
            <img
              key={p.url} src={p.url} alt="" loading="lazy" onClick={() => setIdx(i)}
              style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 7, cursor: "pointer", opacity: p === cur ? 1 : 0.5, border: p === cur ? `2px solid ${COLORS.lime}` : "2px solid transparent" }}
            />
          ))}
          <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: 4 }}>{cur.label}</span>
        </div>
      )}
    </div>
  );
}

// Code couleur par rapport à l'objectif (reps ou secondes selon le mode, si renseigné) :
// en dessous de la fourchette = rouge, dedans = vert, au-dessus = jaune.
function targetTint(value, min, max) {
  const v = Number(value);
  if (v < min) return "rgba(255,107,74,0.28)";
  if (v > max) return "rgba(224,198,74,0.3)";
  return "rgba(201,245,66,0.25)";
}

// Carte à deux lignes plutôt qu'un seul pill compressé "10/10-12×50kg" : la valeur
// principale (reps × charge, ou temps) se lit d'un coup d'œil, l'objectif (si renseigné)
// et le repos passent en sous-ligne secondaire. Le code couleur reste sur le fond de la
// carte, et marche aussi bien pour un objectif de reps que pour un objectif de temps
// (gainage, planche...).
// Les paliers d'un dropset s'affichent dans la carte de leur série ("↳ 8×45kg").
function SetChip({ number, s, drops = [] }) {
  const hasTarget = s.targetMin != null && s.targetMax != null;
  const isTime = s.mode === "time";
  const mainValue = isTime ? s.seconds : s.reps;
  const cardStyle = {
    borderRadius: 8, padding: "5px 9px", minWidth: isTime ? 56 : 74,
    background: hasTarget ? targetTint(mainValue, s.targetMin, s.targetMax) : COLORS.surface2,
  };
  const loadLabel =
    s.weightType === "bodyweight" ? "PDC" :
    s.weightType === "bodyweight_plus" ? `PDC +${s.weight}kg` :
    s.weightType === "assisted" ? `PDC −${s.weight}kg` :
    `${s.weight}kg`;
  if (!isSetFilled(s)) {
    return (
      <div style={{ ...cardStyle, background: "transparent", border: `1px dashed ${COLORS.line}` }}>
        <div style={{ fontSize: 9.5, color: COLORS.muted, marginBottom: 2 }}>Série {number}</div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>à remplir</div>
        {hasTarget && <div style={{ fontSize: 10.5, marginTop: 2, color: COLORS.muted }}>obj. {s.targetMin}-{s.targetMax}{isTime ? "s" : ""}</div>}
      </div>
    );
  }
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 9.5, color: COLORS.muted, marginBottom: 2 }}>Série {number}{drops.length ? " · dropset" : ""}</div>
      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
        {isTime ? (
          `${s.seconds}s`
        ) : (
          <>{s.reps} reps <span style={{ fontWeight: 400, color: COLORS.muted }}>×</span> {loadLabel}</>
        )}
      </div>
      {drops.map((d, k) => (
        <div key={k} style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", marginTop: 1 }}>
          <span style={{ color: COLORS.lime }}>↳</span> {formatSet(d)}
        </div>
      ))}
      {hasTarget && <div style={{ fontSize: 10.5, marginTop: 2 }}>obj. {s.targetMin}-{s.targetMax}{isTime ? "s" : ""}</div>}
      {s.restSeconds != null && (
        <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>repos {s.restSeconds}s</div>
      )}
    </div>
  );
}

// Détail d'une séance : photos, infos, stats de chaque participant. Bascule vers les
// formulaires "mes stats" (SessionEntryForm) et "modifier la séance" (SessionEditForm),
// dont les brouillons vivent ici pour survivre à un aller-retour entre les vues.
export function SessionModal({
  session, sessions = [], profiles, currentUserId, exerciseList, otherProfiles,
  presets, onCreatePreset, onUpdatePreset, onDeletePreset,
  onClose, onSubmitEntry, onDeleteEntry, onEditSession, onDeleteSession,
}) {
  const [mode, setMode] = useState("view"); // "view" | "fillEntry" | "editEntry" | "editSession"
  const myEntry = session.entries[currentUserId];
  const [entryDraft, setEntryDraft] = useState(() => entryDraftFrom(myEntry));
  const [sessionMeta, setSessionMeta] = useState(() => sessionMetaFrom(session));
  const [expanded, setExpanded] = useState(() => new Set([currentUserId]));

  const participants = session.participants;
  const isCreator = currentUserId === session.creator;
  const toggleExpanded = (id) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (mode === "fillEntry" || mode === "editEntry") {
    return (
      <SessionEntryForm
        session={session} isNew={mode === "fillEntry"} draft={entryDraft} onDraftChange={setEntryDraft}
        sessions={sessions} profiles={profiles} currentUserId={currentUserId} exerciseList={exerciseList}
        presets={presets} onCreatePreset={onCreatePreset} onUpdatePreset={onUpdatePreset} onDeletePreset={onDeletePreset}
        onSubmit={onSubmitEntry}
        onDelete={() => { onDeleteEntry(); setEntryDraft(entryDraftFrom(null)); setMode("view"); }}
        onBack={() => setMode("view")}
        onClose={onClose}
      />
    );
  }

  if (mode === "editSession") {
    return (
      <SessionEditForm
        session={session} meta={sessionMeta} onMetaChange={setSessionMeta} otherProfiles={otherProfiles}
        onSubmit={onEditSession} onDelete={onDeleteSession}
        onBack={() => setMode("view")}
        onClose={onClose}
      />
    );
  }

  // La mienne d'abord (session.photo = ma photo perso s'il y en a une), puis celle de
  // la séance, puis les photos perso des autres participants.
  const photos = [];
  const addPhoto = (url, label) => { if (url && !photos.some((p) => p.url === url)) photos.push({ url, label }); };
  const nameOf = (id) => (id === currentUserId ? "toi" : profiles[id]?.display_name || "?");
  addPhoto(session.photo, session.photo !== session.sharedPhoto ? "Ta photo" : `Photo de ${nameOf(session.creator)}`);
  addPhoto(session.sharedPhoto, `Photo de ${nameOf(session.creator)}`);
  participants.forEach((id) => addPhoto(session.entries[id]?.photo, `Photo de ${nameOf(id)}`));

  const title = (
    <>
      <span style={{ display: "block" }}>{session.title || "Séance"}</span>
      {session.sharedTitle && session.title !== session.sharedTitle && (
        <span style={{ fontSize: 11, fontWeight: 400, color: COLORS.muted }}>Séance de {profiles[session.creator]?.display_name || "?"} : {session.sharedTitle}</span>
      )}
    </>
  );

  return (
    <Modal title={title} onClose={onClose}>
      <SessionPhoto photos={photos} />
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted }}>
          <Calendar size={13} />{fmtDate(session.date)}
        </span>
        {session.createdAt && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted }}>
            <Clock size={13} />
            Publiée à {fmtTime(session.createdAt)}{session.durationMin ? ` · ${fmtDuration(session.durationMin)}` : ""}
          </span>
        )}
      </div>

      {session.guests?.length > 0 && (
        <p style={{ fontSize: 12, color: COLORS.muted, marginTop: -6, marginBottom: 14 }}>
          Aussi présent{session.guests.length > 1 ? "s" : ""} (sans compte) : <span style={{ color: COLORS.chalk }}>{session.guests.join(", ")}</span>
        </p>
      )}

      {participants.map((id) => {
        const entry = session.entries[id];
        const mine = id === currentUserId;
        const solo = participants.length === 1;
        const isOpen = solo || expanded.has(id);
        return (
          <div key={id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${COLORS.line}` }}>
            {!solo && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }} onClick={() => toggleExpanded(id)}>
                <Avatar profile={profiles[id]} size={26} />
                <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{profiles[id]?.display_name || "?"}</span>
                {entry ? <span style={{ fontSize: 11, color: COLORS.lime }}>Fait</span> : <span style={{ fontSize: 11, color: COLORS.muted }}>En attente</span>}
                <ChevronDown size={14} color={COLORS.muted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
              </div>
            )}
            {isOpen && (
              <>
                {entry ? (
                  <>
                    {entry.sessionTypes?.length > 0 && <div style={{ marginBottom: 10 }}><SessionTypeBadges types={entry.sessionTypes} /></div>}
                    {groupSupersets(entry.exercises).map((block) => {
                      const renderEx = ({ ex, index }, inSuperset) => (
                        <div key={index} style={{ marginBottom: inSuperset ? 10 : 18 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.chalk, display: "block", marginBottom: 5 }}>{ex.name}</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {groupDrops(ex.sets).map((g) => <SetChip key={g.index} number={g.number} s={g.set} drops={g.drops.map((d) => d.set)} />)}
                          </div>
                        </div>
                      );
                      if (block.group == null || block.items.length < 2) return renderEx(block.items[0], false);
                      return (
                        <div key={`superset-${block.items[0].index}`} style={{ borderLeft: `2px solid ${COLORS.lime}`, paddingLeft: 10, marginBottom: 18 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                            <Link2 size={12} color={COLORS.lime} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.lime, textTransform: "uppercase", letterSpacing: 0.5 }}>Superset</span>
                          </div>
                          {block.items.map((item) => renderEx(item, true))}
                        </div>
                      );
                    })}
                    {(entry.feeling || mine) && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        {entry.feeling ? (
                          <span
                            style={{
                              display: "inline-block", fontSize: 11, fontWeight: 700, color: COLORS.lime,
                              background: "rgba(201,245,66,0.12)", border: "1px solid rgba(201,245,66,0.35)",
                              borderRadius: 20, padding: "3px 10px",
                            }}
                          >
                            {feelingLabel(entry.feeling)}
                          </span>
                        ) : <span />}
                        {mine && (
                          <button style={styles.linkBtn} onClick={() => setMode("editEntry")}>Modifier mes stats</button>
                        )}
                      </div>
                    )}
                    {entry.comment && (
                      <p
                        style={{
                          fontSize: 13, color: COLORS.chalk, marginTop: 8, marginBottom: 0, lineHeight: 1.4, whiteSpace: "pre-wrap",
                          background: COLORS.surface2, borderRadius: 8, padding: "8px 10px",
                        }}
                      >
                        {entry.comment}
                      </p>
                    )}
                  </>
                ) : mine ? (
                  <button style={styles.secondaryBtn} onClick={() => setMode("fillEntry")}>Ajouter mes stats</button>
                ) : null}
              </>
            )}
          </div>
        );
      })}

      {isCreator && (
        <button style={styles.secondaryBtn} onClick={() => setMode("editSession")}>Modifier la séance</button>
      )}
    </Modal>
  );
}
