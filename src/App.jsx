import { useEffect, useMemo, useState } from 'react'
import { INITIAL_ROOMS, OCCASIONS, START_TIME, USERS } from './data.js'

const STORE_KEY = 'lance-occasions-v1'
const fresh = () => ({ rooms: INITIAL_ROOMS, user: 'maya', clock: START_TIME })

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY))
    if (s && s.rooms) return s
  } catch {}
  return fresh()
}

const fmt = (m) => {
  if (m == null) return ''
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0')
  return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`
}

// Lower tier = clean sooner. Occasions with a deadline go first, then arrivals,
// then vacant checkouts, then stayovers; DND waits until its retry time.
function tier(r, clock) {
  if (r.status === 'dnd' && clock < r.retryAt) return 9
  if (r.occasion && r.arrival) return 0
  if (r.arrival) return 1
  if (r.type === 'checkout') return 2
  return 3
}

function rankQueue(rooms, clock) {
  return [...rooms].sort((a, b) =>
    tier(a, clock) - tier(b, clock) ||
    (a.arrival ?? 9999) - (b.arrival ?? 9999) ||
    a.floor - b.floor ||
    a.id.localeCompare(b.id))
}

function reason(r, clock) {
  if (r.status === 'dnd') return clock < r.retryAt ? `🔕 DND · try again ${fmt(r.retryAt)}` : `🔕 DND · attempt ${r.attempts + 1} now`
  if (r.occasion && r.arrival) return `Arrival ${fmt(r.arrival)} · set up surprise`
  if (r.arrival) return `Arrival ${fmt(r.arrival)}`
  if (r.type === 'checkout') return 'Checkout · empty now'
  return 'Stayover'
}

export default function App() {
  const [state, setState] = useState(load)
  const [prev, setPrev] = useState(null)
  const [toast, setToast] = useState(null)
  const [openRoom, setOpenRoom] = useState(null)
  const [switcher, setSwitcher] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const user = USERS.find((u) => u.id === state.user)

  const updateRoom = (id, patch, msg) => {
    setPrev(state)
    setState((s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r)) }))
    if (msg) setToast(msg)
  }
  const undo = () => { if (prev) setState(prev); setPrev(null); setToast(null) }
  const switchUser = (id) => { setState((s) => ({ ...s, user: id })); setOpenRoom(null); setSwitcher(false) }
  const reset = () => { setState(fresh()); setOpenRoom(null); setSwitcher(false); setToast('Demo reset') }

  return (
    <div className="phone">
      <header className="top">
        <button className="me" onClick={() => setSwitcher(true)} aria-label="Switch user">
          <span className="avatar" style={{ background: user.color }}>{user.initials}</span>
          <span><b>{user.name.split(' ')[0]}</b><small>{user.role} ▾</small></span>
        </button>
        <div className="clock">
          <span>{fmt(state.clock)}</span>
          <button onClick={() => setState((s) => ({ ...s, clock: s.clock + 60 }))} title="Demo: advance clock 1 hour">+1h</button>
        </div>
      </header>

      {user.id === 'maya'
        ? <Housekeeper state={state} openRoom={openRoom} setOpenRoom={setOpenRoom} updateRoom={updateRoom} />
        : <FrontDesk state={state} updateRoom={updateRoom} />}

      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          {prev && <button onClick={undo}>Undo</button>}
        </div>
      )}

      {switcher && (
        <Sheet title="Switch user" onClose={() => setSwitcher(false)}>
          {USERS.map((u) => (
            <button key={u.id} className={`user-row ${u.id === state.user ? 'on' : ''}`} onClick={() => switchUser(u.id)}>
              <span className="avatar" style={{ background: u.color }}>{u.initials}</span>
              <span><b>{u.name}</b><small>{u.role}</small></span>
              {u.id === state.user && <span className="check">✓</span>}
            </button>
          ))}
          <button className="link" onClick={reset}>Reset demo data</button>
        </Sheet>
      )}
    </div>
  )
}

/* ---------------- Housekeeper ---------------- */

function Housekeeper({ state, openRoom, setOpenRoom, updateRoom }) {
  const [enterFor, setEnterFor] = useState(null)
  const mine = state.rooms.filter((r) => r.assignee === 'maya')
  const todo = rankQueue(mine.filter((r) => r.status !== 'clean'), state.clock)
  const done = mine.filter((r) => r.status === 'clean')
  const room = openRoom && state.rooms.find((r) => r.id === openRoom)

  if (room) return <RoomScreen room={room} clock={state.clock} onBack={() => setOpenRoom(null)} updateRoom={updateRoom} />

  const [next, ...rest] = todo
  const minsLeft = todo.reduce((n, r) => n + r.planned, 0)

  return (
    <main className="screen">
      {enterFor && (
        <CantEnterSheet room={enterFor} clock={state.clock} updateRoom={updateRoom}
          onClose={() => setEnterFor(null)} onDone={() => setEnterFor(null)} />
      )}
      <div className="progress">
        <div><b>{done.length} of {mine.length}</b> done · ~{Math.floor(minsLeft / 60)}h {minsLeft % 60}m left</div>
        <div className="bar"><i style={{ width: `${(done.length / mine.length) * 100}%` }} /></div>
      </div>

      {next ? (
        <section className="next">
          <div className="label">NEXT ROOM</div>
          <div className="next-head">
            <span className="room-no big">{next.id}</span>
            <div>
              <div className="why">{reason(next, state.clock)}</div>
              <small>{next.type === 'checkout' ? 'Full clean' : 'Refresh'} · {next.bed} · {next.planned} min</small>
            </div>
          </div>
          {next.occasion && <OccasionBadge occ={next.occasion} />}
          <button className="primary" onClick={() => {
            if (next.status !== 'progress') updateRoom(next.id, { status: 'progress', startedAt: Date.now() })
            setOpenRoom(next.id)
          }}>
            {next.status === 'progress' ? 'Continue' : 'Start'} {next.id}
          </button>
          <button className="secondary" onClick={() => setEnterFor(next)}>🚪 Can't enter</button>
        </section>
      ) : (
        <section className="next empty">🎉 All rooms done. Nice work.</section>
      )}

      {rest.length > 0 && <div className="label pad">THEN</div>}
      {rest.map((r) => (
        <button key={r.id} className={`card ${tier(r, state.clock) === 9 ? 'muted' : ''}`} onClick={() => setOpenRoom(r.id)}>
          <span className="room-no">{r.id}</span>
          <span className="card-body">
            <b>{reason(r, state.clock)}</b>
            <small>{r.type === 'checkout' ? 'Full clean' : 'Refresh'} · {r.bed}</small>
          </span>
          {r.occasion && <span className="occ-dot" title={OCCASIONS[r.occasion.kind].label}>{OCCASIONS[r.occasion.kind].icon}</span>}
        </button>
      ))}

      {done.length > 0 && <div className="label pad">DONE TODAY</div>}
      {done.map((r) => (
        <div key={r.id} className="card done">
          <span className="room-no">{r.id}</span>
          <span className="card-body"><b>Clean ✓</b>{r.occasion && <small>{occStateText(r.occasion)}</small>}</span>
        </div>
      ))}
    </main>
  )
}

function occStateText(o) {
  if (o.state === 'set') return '✅ Surprise set'
  if (o.state === 'issue') return `⚠️ Missing: ${o.missing.join(', ')}`
  return '⏳ Surprise pending'
}

function OccasionBadge({ occ }) {
  const o = OCCASIONS[occ.kind]
  return (
    <div className="occ">
      <span className="occ-icon">{o.icon}</span>
      <div>
        <b>{o.label}{occ.guest ? ` · ${occ.guest}` : ''}</b>
        {occ.note && <small>{occ.note}</small>}
      </div>
    </div>
  )
}

function Elapsed({ since, planned }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const secs = Math.max(0, Math.floor((now - since) / 1000))
  const over = secs > planned * 60
  return (
    <div className={`timer ${over ? 'over' : ''}`}>
      <span>● In progress</span>
      <b>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</b>
      <small>/ {planned} min</small>
    </div>
  )
}

function RoomScreen({ room, clock, onBack, updateRoom }) {
  const [sheet, setSheet] = useState(null)
  const [photo, setPhoto] = useState(false)
  const occ = room.occasion
  const missing = occ?.missing ?? []
  const left = occ ? occ.items.filter((i) => !occ.done.includes(i) && !missing.includes(i)) : []

  const toggleItem = (item) => updateRoom(room.id, (r) => {
    const d = r.occasion.done
    return { occasion: { ...r.occasion, done: d.includes(item) ? d.filter((x) => x !== item) : [...d, item] } }
  })
  const markMissing = (item) => updateRoom(room.id, (r) => ({
    occasion: { ...r.occasion, missing: [...(r.occasion.missing ?? []), item], done: r.occasion.done.filter((x) => x !== item) },
  }), `${item} flagged to front desk`)

  const complete = () => {
    updateRoom(room.id, (r) => ({
      status: 'clean',
      occasion: r.occasion && { ...r.occasion, photo, state: (r.occasion.missing ?? []).length ? 'issue' : 'set' },
    }), occ ? `${room.id} clean · surprise ${missing.length ? 'set with issue' : 'set'} ✓` : `${room.id} clean ✓`)
    onBack()
  }

  const start = () => updateRoom(room.id, { status: 'progress', startedAt: Date.now() })

  return (
    <main className="screen room">
      <button className="back" onClick={onBack}>‹ My rooms</button>
      <div className="room-head">
        <span className="room-no big">{room.id}</span>
        <div>
          <b>{room.type === 'checkout' ? 'Full clean' : 'Refresh'} · {room.bed}</b>
          <small>{reason(room, clock)}</small>
        </div>
      </div>

      {room.status === 'progress' && <Elapsed since={room.startedAt} planned={room.planned} />}

      {occ && (
        <section className="occ-block">
          <OccasionBadge occ={occ} />
          <div className="label">SURPRISE CHECKLIST · {occ.items.length - left.length}/{occ.items.length}</div>
          {occ.items.map((item) => {
            const isDone = occ.done.includes(item), isMissing = missing.includes(item)
            return (
              <div key={item} className={`check-row ${isDone ? 'on' : ''} ${isMissing ? 'miss' : ''}`}>
                <button className="tick" disabled={room.status !== 'progress' || isMissing} onClick={() => toggleItem(item)}>
                  <span className="box">{isDone ? '✓' : isMissing ? '!' : ''}</span>
                  <span>{item}{isMissing && <small> · flagged missing</small>}</span>
                </button>
                {!isDone && !isMissing && room.status === 'progress' && (
                  <button className="mini" onClick={() => markMissing(item)}>Out of stock</button>
                )}
              </div>
            )
          })}
          {room.status === 'progress' && (
            <button className={`photo ${photo ? 'on' : ''}`} onClick={() => setPhoto(!photo)}>
              {photo ? '📷 Photo added ✓' : '📷 Add photo of setup (optional)'}
            </button>
          )}
        </section>
      )}

      <div className="actions">
        {room.status === 'progress' ? (
          <button className="primary" disabled={left.length > 0} onClick={complete}>
            {left.length > 0 ? `${left.length} surprise item${left.length > 1 ? 's' : ''} left` : 'Complete clean'}
          </button>
        ) : (
          <button className="primary" onClick={start}>Start {room.id}</button>
        )}
        <button className="secondary" onClick={() => setSheet('enter')}>🚪 Can't enter</button>
      </div>

      {sheet === 'enter' && (
        <CantEnterSheet room={room} clock={clock} updateRoom={updateRoom}
          onClose={() => setSheet(null)} onDone={onBack} />
      )}
    </main>
  )
}

function CantEnterSheet({ room, clock, updateRoom, onClose, onDone }) {
  const pick = (why) => {
    updateRoom(room.id, (r) => ({ status: 'dnd', dndReason: why, retryAt: clock + 120, attempts: (r.attempts ?? 0) + 1 }),
      `${room.id} moved to come back at ${fmt(clock + 120)}`)
    onDone()
  }
  return (
    <Sheet title={`Can't enter ${room.id}`} onClose={onClose}>
      {['🔕 Do not disturb', '🙋 Guest inside', '🙅 Declined service', '🔒 Double-locked'].map((w) => (
        <button key={w} className="big-choice" onClick={() => pick(w)}>{w}</button>
      ))}
      <p className="hint">Logged with time and your name. Room comes back in 2 hours.</p>
    </Sheet>
  )
}

/* ---------------- Front desk ---------------- */

function FrontDesk({ state, updateRoom }) {
  const [edit, setEdit] = useState(null)
  const rooms = useMemo(() => [...state.rooms].sort((a, b) => (a.arrival ?? 9999) - (b.arrival ?? 9999)), [state.rooms])
  const alerts = state.rooms.filter((r) => r.occasion && (r.occasion.state === 'issue' || (r.occasion.state === 'pending' && r.status === 'dnd')))
  const tagged = state.rooms.filter((r) => r.occasion)

  return (
    <main className="screen">
      <div className="stats">
        <div><b>{tagged.length}</b><small>Occasions</small></div>
        <div><b>{tagged.filter((r) => r.occasion.state === 'set').length}</b><small>Surprise set</small></div>
        <div><b>{tagged.filter((r) => r.occasion.state === 'pending').length}</b><small>Pending</small></div>
      </div>

      {alerts.map((r) => (
        <div key={r.id} className="alert">
          <b>⚠️ {r.id} · {OCCASIONS[r.occasion.kind].label}</b>
          <small>{r.occasion.state === 'issue'
            ? `Missing: ${r.occasion.missing.join(', ')}. Bring it up before ${fmt(r.arrival)}.`
            : `Room is DND. Guest arrives ${fmt(r.arrival)}.`}</small>
        </div>
      ))}

      <div className="label pad">TODAY'S ARRIVALS & ROOMS</div>
      {rooms.map((r) => (
        <button key={r.id} className="card" onClick={() => setEdit(r)}>
          <span className="room-no">{r.id}</span>
          <span className="card-body">
            <b>{r.arrival ? `Arrives ${fmt(r.arrival)}` : r.type === 'checkout' ? 'No arrival' : 'Stayover'}</b>
            <small>
              {statusText(r)} · {r.assignee === 'maya' ? 'Maya' : r.assignee === 'priya' ? 'Priya' : 'Rosa'}
              {r.occasion && ` · ${OCCASIONS[r.occasion.kind].icon} ${occStateText(r.occasion)}`}
              {r.occasion?.photo && ' 📷'}
            </small>
          </span>
          <span className="add">{r.occasion ? 'Edit' : '＋ 🎉'}</span>
        </button>
      ))}

      {edit && (
        <OccasionSheet room={edit} onClose={() => setEdit(null)} onSave={(occasion, msg) => {
          updateRoom(edit.id, { occasion }, msg)
          setEdit(null)
        }} />
      )}
    </main>
  )
}

function statusText(r) {
  return { dirty: 'Dirty', progress: 'Cleaning now', clean: 'Clean', dnd: 'DND' }[r.status]
}

function OccasionSheet({ room, onClose, onSave }) {
  const [kind, setKind] = useState(room.occasion?.kind ?? null)
  const [guest, setGuest] = useState(room.occasion?.guest ?? '')
  const [note, setNote] = useState(room.occasion?.note ?? '')

  const save = () => {
    const keep = room.occasion?.kind === kind ? room.occasion : null
    onSave({
      kind, guest, note,
      items: OCCASIONS[kind].items,
      done: keep?.done ?? [], missing: keep?.missing ?? [],
      state: room.status === 'clean' && !keep ? 'pending' : keep?.state ?? 'pending',
    }, `${OCCASIONS[kind].icon} ${OCCASIONS[kind].label} added to ${room.id} · Maya notified`)
  }

  return (
    <Sheet title={`Occasion · Room ${room.id}`} onClose={onClose}>
      <div className="chips">
        {Object.entries(OCCASIONS).map(([k, o]) => (
          <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
            <span>{o.icon}</span>{o.label}
          </button>
        ))}
      </div>
      {kind && (
        <>
          <div className="pkg"><b>Auto package:</b> {OCCASIONS[kind].items.join(' · ')}</div>
          <input placeholder="Guest name (optional)" value={guest} onChange={(e) => setGuest(e.target.value)} />
          <input placeholder="Note for housekeeping (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )}
      <button className="primary" disabled={!kind} onClick={save}>Add to room {room.id}</button>
      {room.occasion && <button className="link" onClick={() => onSave(null, `Occasion removed from ${room.id}`)}>Remove occasion</button>}
    </Sheet>
  )
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><b>{title}</b><button onClick={onClose} aria-label="Close">✕</button></div>
        {children}
      </div>
    </div>
  )
}
