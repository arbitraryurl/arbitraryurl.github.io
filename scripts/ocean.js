// ocean.js — toggleable beach-swash simulation for the landing page.
// When "Waves On" is ticked, the gallery tiles detach from the grid and ride
// waves running up a beach: a surge rushes each tile up the shore (fast), the
// backwash drags it back (slow), then the water lulls before the next wave.
//
// The motion is a travelling swash rather than a standing ripple — each wave
// front sweeps across the grid at a finite speed, so tiles surge in sequence
// (the rows nearest the sea move first) instead of all bobbing in unison. Two
// trains of different period and direction keep the rhythm from feeling
// mechanical, and the surge velocity leans each tile in the direction it's
// being dragged. Clicking drops a ripple. Unticking eases the tiles back into
// the grid.
//
// Two modes, picked per run: with a mouse, and the whole gallery on screen,
// the tiles detach and roam the viewport; on touch (or in a window too short
// for the gallery) they stay in flow and only transform, so the gallery goes
// on scrolling under them. See the environment block below.
(function () {
    const toggle = document.getElementById('waves-toggle');
    if (!toggle) return; // only present on the landing page

    const control = document.getElementById('sim-control');
    const stateMenu = document.getElementById('wave-states');

    const TWO_PI = Math.PI * 2;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const smoothstep = f => f * f * (3 - 2 * f);

    // --- wave field ---------------------------------------------------------
    // Tiles ride the swash of waves running up a beach. Each train is a surge
    // that travels across the grid in a fixed direction (dx,dy): as its front
    // reaches a tile the tile is rushed up the beach (fast), then the backwash
    // drags it back (slow), then a lull until the next wave. `speed` is how fast
    // the front sweeps across the screen (px/s) — so rows surge in sequence, not
    // in unison — and `T` is the seconds between waves.
    const TRAINS = [
        { dx: 0.35, dy: -1.00, T: 4.5, speed: 520, amp: 80, rise: 0.28, active: 0.65 },
        { dx: 1.00, dy: -0.18, T: 6.5, speed: 380, amp: 40, rise: 0.32, active: 0.72 },
    ];
    for (const w of TRAINS) {            // normalise the propagation directions
        const m = Math.hypot(w.dx, w.dy);
        w.dx /= m; w.dy /= m;
        // Spacing between successive fronts. Sea state scales speed and wave
        // frequency together, so this never changes — only how fast it moves.
        w.len = w.speed * w.T;
        w.ph = 0;                        // running phase in cycles, see step()
    }
    const TILT_GAIN = 0.0016; // surge velocity -> tile lean (rad per px/s)
    const MAX_TILT  = 0.20;   // rad, clamp so storms don't flip tiles

    // A faint always-on ground swell, so tiles are never frozen in a perfect
    // grid during the lull between waves (which read as a "snap to grid").
    const SWELL_AMP = 7;      // px

    // Temporal smoothing. The swash starts and stops with non-zero velocity, so
    // the surge (and the tilt it drives) is discontinuous at each wave's edges.
    // Easing the rendered offset and angle toward their targets absorbs those
    // jumps. Smaller = snappier.
    const TAU_POS  = 0.10;    // s, position smoothing time constant
    const TAU_ANG  = 0.18;    // s, angle smoothing (looser, to kill tilt snaps)
    const FADE_IN  = 0.8;     // s, fade the whole field in on enable...
    const FADE_OUT = 0.7;     // s, ...and back out on disable

    // The swash profile: 0 at rest, a fast rise to a crest, a slow draw-back to
    // 0, then a flat lull for the rest of the cycle. `rise` is where the crest
    // sits inside the active window; `active` is the fraction of the cycle the
    // wave occupies (the remainder is calm before the next one arrives).
    function swash(phase, rise, active) {
        if (phase >= active) return 0;                         // lull between waves
        const q = phase / active;                              // 0..1 across the wave
        if (q < rise) return Math.sin((q / rise) * (Math.PI / 2));        // rush in
        return Math.cos(((q - rise) / (1 - rise)) * (Math.PI / 2));       // draw back
    }

    // Sea state scales the same field up or down. Swell is the default feel.
    // `speed` also raises the wave frequency (faster water arrives more often).
    // Picking a state sets where the sea is heading; `sea` is where it is, and
    // eases over, so a change reads as the weather turning rather than a jolt.
    const STATES = {
        calm:  { amp: 0.60, speed: 0.70, tilt: 0.70 },
        swell: { amp: 1.00, speed: 1.00, tilt: 1.00 },
        storm: { amp: 1.70, speed: 1.40, tilt: 1.50 },
    };
    let state = STATES.swell;
    const sea = Object.assign({}, state);
    const TAU_SEA = 0.9;      // s, how quickly the sea settles into a new state

    // --- edges --------------------------------------------------------------
    // Each tile knows how much room it has on every side (to the header and the
    // screen edges, or to the gallery's clip box when in flow). Displacement is
    // untouched through most of that room and then eases into the edge instead
    // of crossing it, so a storm piles tiles against the edge rather than
    // throwing them off-screen or under the nav.
    const EDGE_PAD = 8;       // px kept clear at every edge
    const KNEE     = 0.6;     // fraction of the room before easing starts

    function soft(d, room) {  // d >= 0
        const k = KNEE * room;
        if (d <= k) return d;
        const r = room - k;
        return k + r * Math.tanh((d - k) / r);
    }
    function bounded(d, roomNeg, roomPos) {
        return d >= 0 ? soft(d, Math.max(roomPos, 1)) : -soft(-d, Math.max(roomNeg, 1));
    }

    // Tiles float; they don't pass through each other. Mostly the water drives a
    // lower row up-beach before the row above it has moved — where that closes
    // the gap between neighbours, split the overlap between the two.
    const SEP = 8;            // px kept between neighbouring tiles
    let pairs = [];           // [upper/left index, lower/right index, 'v' | 'h']

    function findPairs() {
        pairs = [];
        tiles.forEach((a, i) => {
            let below = -1, right = -1;
            tiles.forEach((b, j) => {
                if (Math.min(a.vr, b.vr) > Math.max(a.vl, b.vl) && b.vt >= a.vb &&
                    (below < 0 || b.vt < tiles[below].vt)) below = j;
                if (Math.min(a.vb, b.vb) > Math.max(a.vt, b.vt) && b.vl >= a.vr &&
                    (right < 0 || b.vl < tiles[right].vl)) right = j;
            });
            if (below >= 0) pairs.push([i, below, 'v']);
            if (right >= 0) pairs.push([i, right, 'h']);
        });
    }

    function separate() {
        for (let pass = 0; pass < 3; pass++) {
            for (const [i, j, axis] of pairs) {
                const a = tiles[i], b = tiles[j];
                if (axis === 'v') {
                    if (Math.min(a.vr + a.tx, b.vr + b.tx) <= Math.max(a.vl + a.tx, b.vl + b.tx)) continue;
                    const p = (a.vb + a.ty + SEP) - (b.vt + b.ty);
                    if (p > 0) { a.ty -= p / 2; b.ty += p / 2; }
                } else {
                    if (Math.min(a.vb + a.ty, b.vb + b.ty) <= Math.max(a.vt + a.ty, b.vt + b.ty)) continue;
                    const p = (a.vr + a.tx + SEP) - (b.vl + b.tx);
                    if (p > 0) { a.tx -= p / 2; b.tx += p / 2; }
                }
            }
            for (const t of tiles) {     // ...but never out through an edge
                t.tx = clamp(t.tx, -Math.max(t.lft - t.lx, 0), Math.max(t.rgt - t.lx, 0));
                t.ty = clamp(t.ty, -Math.max(t.up - t.ly, 0), Math.max(t.down - t.ly, 0));
            }
        }
    }

    // --- environment --------------------------------------------------------
    // The field above assumes a viewport that doesn't scroll: tiles detach to
    // position:fixed and ride a wave in screen space. On touch the gallery is
    // itself the scrolling element (#grid), so detaching the tiles empties it —
    // the page freezes, anything below the fold stays pinned off-screen for
    // good, and every swipe completes as a tap on a link. There the tiles stay
    // in flow and move by transform alone, so layout and native scrolling
    // survive untouched, and the field runs in the gallery's own layout space
    // rather than the viewport's so scrolling doesn't drag the waves along. A
    // desktop window too short for the gallery has the same problem, and gets
    // the same treatment.
    const touchMQ = window.matchMedia('(pointer: coarse), (max-width: 799px)');

    // How hard the water can push depends on the clear space the layout leaves
    // between neighbouring tiles: neighbours move nearly together, so what
    // collides is the small lag between them, and that scales with strength.
    // Desktop gaps take the full field; phones and tablets, where tiles sit
    // closer, get it scaled down so they jostle rather than collide. A gallery
    // being scrolled through also heaves a little less than one sitting still.
    const GAP_FULL  = 32;     // px of clear space that takes full strength
    const FIT_MIN   = 0.3;
    const FLOW_CALM = 0.75;
    let env = { amp: 1, tilt: 1, ripple: 1 };

    // --- pointer ripples ----------------------------------------------------
    // A press sends a circular wave outward from the contact point: a ring of
    // radius RIPPLE_SPEED*age, fading over RIPPLE_LIFE, that nudges tiles
    // radially as it passes.
    const RIPPLE_SPEED = 520;  // px/s the ring expands
    const RIPPLE_LIFE  = 2.4;  // s until a ripple is spent
    const RIPPLE_LEN   = 180;  // px wavelength of the ring
    const RIPPLE_AMP   = 26;   // px peak radial nudge
    const MAX_RIPPLES  = 6;
    let ripples = [];

    let tiles = [];
    let running = false;        // animation loop alive (including the ease-out)
    let wantOn = false;         // the checkbox: easing in (true) or out (false)
    let fade = 0;               // 0..1 ramp toward wantOn, smoothstepped into the field
    let rafId = null;
    let lastT = 0;
    let clock = 0;              // s of simulated time; advances by clamped dt, never jumps
    let inFlow = false;         // this run leaves the tiles in flow
    let scroller = null;        // #grid — what scrolls when the gallery is taller than the screen
    let gridEl = null;          // #test — clipped while in flow, see place()
    let prevGridOverflow = '';

    // --- layout -------------------------------------------------------------
    // Everything visible in a tile (image and captions — the captions overflow
    // the grid cell, so the anchor's own box undersells it).
    function visualBox(el) {
        let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        for (const c of el.querySelectorAll('.image-item > *')) {
            const q = c.getBoundingClientRect();
            if (!q.width && !q.height) continue;
            l = Math.min(l, q.left); t = Math.min(t, q.top);
            r = Math.max(r, q.right); b = Math.max(b, q.bottom);
        }
        return l === Infinity ? el.getBoundingClientRect() : { left: l, top: t, right: r, bottom: b };
    }

    // Home centre, size and free room on each side for every tile, read from the
    // grid while the tiles sit in it untransformed. In flow the numbers are in
    // the gallery's layout space (scroll added back), so they hold as it
    // scrolls; detached they're viewport coordinates.
    function measure(els) {
        const ox = scroller ? scroller.scrollLeft : 0;
        const oy = scroller ? scroller.scrollTop : 0;
        const fx = inFlow ? ox : 0, fy = inFlow ? oy : 0;
        let top, bottom, left, right;
        if (inFlow) {
            const g = gridEl.getBoundingClientRect();
            top = g.top + fy; bottom = g.bottom + fy; left = g.left + fx; right = g.right + fx;
        } else {
            const head = document.getElementById('head');
            top = head ? head.getBoundingClientRect().bottom : 0;
            bottom = window.innerHeight; left = 0; right = document.documentElement.clientWidth;
        }
        top += EDGE_PAD; bottom -= EDGE_PAD; left += EDGE_PAD; right -= EDGE_PAD;

        return els.map(el => {
            const r = el.getBoundingClientRect();
            const v = visualBox(el);
            return {
                hx: r.left + r.width / 2 + fx,   // home centre (the middle of its motion)
                hy: r.top + r.height / 2 + fy,
                w: r.width, h: r.height,
                vl: v.left + fx, vt: v.top + fy, vr: v.right + fx, vb: v.bottom + fy,   // visible box
                up: v.top + fy - top, down: bottom - (v.bottom + fy),
                lft: v.left + fx - left, rgt: right - (v.right + fx),
                refX: ox, refY: oy,              // #grid scroll at measure, see transformFor()
            };
        });
    }

    function fitEnv(m) {
        let gap = Infinity;
        for (let i = 0; i < m.length; i++) {
            for (let j = i + 1; j < m.length; j++) {
                const a = m[i], b = m[j];
                if (Math.min(a.vr, b.vr) > Math.max(a.vl, b.vl))     // same column
                    gap = Math.min(gap, Math.max(b.vt - a.vb, a.vt - b.vb));
                if (Math.min(a.vb, b.vb) > Math.max(a.vt, b.vt))     // same row
                    gap = Math.min(gap, Math.max(b.vl - a.vr, a.vl - b.vr));
            }
        }
        let k = gap === Infinity ? 1 : clamp(gap / GAP_FULL, FIT_MIN, 1);
        if (inFlow) k *= FLOW_CALM;
        return { amp: k, tilt: k, ripple: k };
    }

    function transformFor(t, scX, scY) {
        // In flow the grid already places the tile, so the transform is a pure
        // offset. Detached it carries the absolute position too, and follows
        // any scroll of the (normally still) gallery so the tile lands back in
        // its own slot.
        const x = inFlow ? t.sx : t.hx - t.w / 2 + t.sx - (scX - t.refX);
        const y = inFlow ? t.sy : t.hy - t.h / 2 + t.sy - (scY - t.refY);
        return 'translate(' + x + 'px,' + y + 'px) rotate(' + t.sa + 'rad)';
    }

    // Take the tiles out of the grid for a run. `carry` holds offsets from a
    // previous placement, so a re-measure picks up exactly where it left off.
    // Styles are set one property at a time, leaving anything else inline on
    // the anchors alone.
    function place(els, carry) {
        // Detaching only works when every tile is already on screen.
        const fits = els.every(el => visualBox(el).bottom <= window.innerHeight);
        inFlow = touchMQ.matches || !fits;
        const m = measure(els);
        env = fitEnv(m);
        tiles = els.map((el, i) => Object.assign({ el, sx: 0, sy: 0, sa: 0 }, carry && carry[i], m[i]));
        findPairs();

        if (inFlow) {
            // A transformed child still counts toward its scroll container's
            // range, so without this #grid's scroll height would breathe with
            // the waves under the reader's thumb. Clipping at the grid box pins
            // the range and keeps stray tiles out of the nav.
            prevGridOverflow = gridEl.style.overflow;
            gridEl.style.overflow = 'hidden';
        }
        const scX = scroller ? scroller.scrollLeft : 0, scY = scroller ? scroller.scrollTop : 0;
        for (const t of tiles) {
            const s = t.el.style;
            if (!inFlow) {
                s.position = 'fixed'; s.margin = '0'; s.left = '0'; s.top = '0';
                s.width = t.w + 'px'; s.height = t.h + 'px'; s.zIndex = '900';
            }
            s.willChange = 'transform';
            s.transform = transformFor(t, scX, scY);   // in place from the first frame
        }
    }

    function unplace() {
        for (const t of tiles) {
            const s = t.el.style;
            for (const p of ['position', 'margin', 'left', 'top', 'width', 'height', 'z-index', 'will-change', 'transform'])
                s.removeProperty(p);
        }
        if (inFlow && gridEl) gridEl.style.overflow = prevGridOverflow;
    }

    // --- enable / disable ---------------------------------------------------
    function enable() {
        wantOn = true;
        if (control) control.classList.add('waves');
        if (running) return;             // caught mid ease-out: just turn back around

        const els = Array.from(document.querySelectorAll('#test > a'));
        if (!els.length) return;
        scroller = document.getElementById('grid');
        gridEl = document.getElementById('test');
        place(els, null);

        Object.assign(sea, state);       // fading in from still water anyway
        ripples = [];
        fade = 0;
        running = true;
        lastT = performance.now();
        lastW = window.innerWidth;
        attachInput();
        rafId = requestAnimationFrame(step);
    }

    function disable() {
        wantOn = false;                  // step() eases the field out, then tears down
        if (control) control.classList.remove('waves');
    }

    function teardown() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        detachInput();
        unplace();
        tiles = [];
        ripples = [];
        gridEl = null;
    }

    // Re-read home positions (after a resize) without restarting the water: the
    // tiles drop back into the grid just long enough to be measured — all in one
    // task, so nothing is painted in between — and carry on from where they were,
    // switching mode if the new window calls for it. Detached tiles haven't moved
    // with the layout, so they glide from where they are to their new slots.
    function remeasure() {
        lastW = window.innerWidth;
        const wasFlow = inFlow;
        const carry = tiles.map(t => ({ sx: t.sx, sy: t.sy, sa: t.sa }));
        const was = tiles.map(t => ({ x: t.hx - t.w / 2, y: t.hy - t.h / 2 }));
        const els = tiles.map(t => t.el);
        unplace();
        place(els, carry);
        if (wasFlow || inFlow) return;
        const scX = scroller ? scroller.scrollLeft : 0, scY = scroller ? scroller.scrollTop : 0;
        tiles.forEach((t, i) => {
            t.sx += was[i].x - (t.hx - t.w / 2);
            t.sy += was[i].y - (t.hy - t.h / 2);
            t.el.style.transform = transformFor(t, scX, scY);
        });
    }

    // --- displacement -------------------------------------------------------
    // Total offset + tilt for a tile whose home centre is (hx,hy), right now.
    function displace(hx, hy) {
        let dx = 0, dy = 0, velx = 0;
        const dp = 0.0015; // phase step for the numeric surge velocity (tilt)
        const ampK = sea.amp * env.amp;

        for (const w of TRAINS) {
            const u = w.dx * hx + w.dy * hy;        // distance along the beach
            const amp = w.amp * ampK;
            // Phase at this tile. Tiles farther up the beach (larger u) are
            // reached later -> the surge sweeps across.
            let phase = (w.ph - u / w.len) % 1;
            if (phase < 0) phase += 1;

            // Centred on the middle of the swash's range rather than its trough:
            // tiles travel half a surge either side of home instead of a whole
            // one up-beach, which is what used to throw the top row off-screen.
            const g = swash(phase, w.rise, w.active) - 0.5;
            dx += w.dx * amp * g;                   // carried along the beach...
            dy += w.dy * amp * g;                   // ...up and back

            // surge velocity (numeric d/dt of the displacement) drives the lean
            const p2 = (phase + dp) % 1, p1 = (phase - dp + 1) % 1;
            const dg = (swash(p2, w.rise, w.active) - swash(p1, w.rise, w.active)) / (2 * dp);
            velx += w.dx * amp * dg * sea.speed / w.T;
        }

        // gentle ground swell — always moving, so tiles never settle into a
        // dead-still grid during the lull between waves.
        const swa = SWELL_AMP * ampK;
        const gp = 0.9 * clock + hx * 0.012 + hy * 0.006;
        dx += swa * Math.sin(gp);
        dy += swa * 0.6 * Math.cos(0.7 * clock + hy * 0.013);
        velx += swa * 0.9 * Math.cos(gp);

        for (const r of ripples) {
            const age = clock - r.t0;
            const rx = hx - r.x, ry = hy - r.y;
            const dist = Math.hypot(rx, ry) || 1;
            const ring = RIPPLE_SPEED * age;            // current radius of the wavefront
            const fade = 1 - age / RIPPLE_LIFE;
            // Gaussian band around the expanding ring, so only tiles the front is
            // crossing get pushed; everything is multiplied by the time fade.
            const band = Math.exp(-((dist - ring) * (dist - ring)) / (2 * RIPPLE_LEN * RIPPLE_LEN));
            const amp = RIPPLE_AMP * env.ripple * fade * band * Math.sin((dist - ring) * (TWO_PI / RIPPLE_LEN));
            dx += (rx / dist) * amp;
            dy += (ry / dist) * amp;
        }

        const ang = clamp(velx * TILT_GAIN * sea.tilt * env.tilt, -MAX_TILT, MAX_TILT);
        return { dx, dy, ang };
    }

    function step(now) {
        if (!running) return;
        let dt = (now - lastT) / 1000;
        lastT = now;
        dt = clamp(dt, 0, 0.05); // clamp after a tab switch so the water doesn't lurch
        clock += dt;

        // Ease the sea toward the chosen state, and advance each train's phase at
        // the current speed. The phase is integrated rather than derived from the
        // clock, so a change of speed accelerates the water instead of
        // teleporting every tile to a different point in its cycle.
        const ks = 1 - Math.exp(-dt / TAU_SEA);
        sea.amp   += (state.amp   - sea.amp)   * ks;
        sea.speed += (state.speed - sea.speed) * ks;
        sea.tilt  += (state.tilt  - sea.tilt)  * ks;
        for (const w of TRAINS) w.ph = (w.ph + dt * sea.speed / w.T) % 1;

        if (ripples.length) ripples = ripples.filter(r => clock - r.t0 < RIPPLE_LIFE);

        // fade the field toward on/off (smoothstep), so tiles ease out of the
        // grid on start and settle back into it on stop
        fade = clamp(fade + (wantOn ? dt / FADE_IN : -dt / FADE_OUT), 0, 1);
        const level = smoothstep(fade);
        const kp = 1 - Math.exp(-dt / TAU_POS); // per-frame easing factors
        const ka = 1 - Math.exp(-dt / TAU_ANG);
        const scX = scroller ? scroller.scrollLeft : 0, scY = scroller ? scroller.scrollTop : 0;

        for (const tile of tiles) {
            const d = displace(tile.hx, tile.hy);
            // a leaning tile's corners reach further out, so it needs that much
            // less room before meeting an edge
            const lean = Math.abs(Math.sin(tile.sa));
            tile.lx = lean * (tile.vb - tile.vt) / 2;
            tile.ly = lean * (tile.vr - tile.vl) / 2;
            tile.tx = bounded(d.dx * level, tile.lft - tile.lx, tile.rgt - tile.lx);
            tile.ty = bounded(d.dy * level, tile.up - tile.ly, tile.down - tile.ly);
            tile.ta = d.ang * level;
        }
        separate();

        let settled = true;
        for (const tile of tiles) {
            tile.sx += (tile.tx - tile.sx) * kp;
            tile.sy += (tile.ty - tile.sy) * kp;
            tile.sa += (tile.ta - tile.sa) * ka;
            tile.el.style.transform = transformFor(tile, scX, scY);
            if (Math.abs(tile.sx) > 0.3 || Math.abs(tile.sy) > 0.3 || Math.abs(tile.sa) > 0.002) settled = false;
        }

        if (!wantOn && fade === 0 && settled) { teardown(); return; }
        rafId = requestAnimationFrame(step);
    }

    // --- input --------------------------------------------------------------
    const TAP_SLOP = 10; // px of travel before a touch reads as a drag, not a tap
    let tap = null;

    // Mouse, pen or finger: a press drops a ripple where it lands.
    function onPointerDown(e) {
        if (!wantOn) return;
        if (e.target.closest && e.target.closest('#sim-control')) return; // let the menu work
        // Ripples are seeded in the same space as the field they perturb.
        const ox = inFlow && scroller ? scroller.scrollLeft : 0;
        const oy = inFlow && scroller ? scroller.scrollTop : 0;
        ripples.push({ x: e.clientX + ox, y: e.clientY + oy, t0: clock });
        if (ripples.length > MAX_RIPPLES) ripples.shift();
        // No preventDefault: a clean click on a tile still opens its project page.
    }

    function onTouchStart(e) {
        const p = e.touches[0];
        tap = p ? { x: p.clientX, y: p.clientY, moved: false } : null;
    }

    function onTouchMove(e) {
        const p = e.touches[0];
        if (!tap || !p) return;
        if (Math.hypot(p.clientX - tap.x, p.clientY - tap.y) > TAP_SLOP) tap.moved = true;
    }

    // A swipe that scrolls is swallowed by the browser, but one that can't —
    // at either end of the list — still arrives as a tap on whatever tile sat
    // under the thumb. Drop the navigation for anything that moved like a drag.
    function onClickCapture(e) {
        const dragged = tap && tap.moved;
        tap = null;
        if (!dragged) return;
        if (e.target.closest && e.target.closest('#sim-control')) return;
        e.preventDefault();
        e.stopPropagation();
    }

    function attachInput() {
        document.addEventListener('pointerdown', onPointerDown, { passive: true });
        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('click', onClickCapture, true);
    }

    function detachInput() {
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('click', onClickCapture, true);
        tap = null;
    }

    // --- sea-state menu -----------------------------------------------------
    if (stateMenu) {
        stateMenu.addEventListener('click', (e) => {
            const choice = e.target.closest('a[data-w]');
            if (!choice) return;
            e.preventDefault();
            state = STATES[choice.dataset.w] || STATES.swell;
            stateMenu.querySelectorAll('a').forEach(a => a.classList.remove('active'));
            choice.classList.add('active');
        });
    }

    // --- toggle -------------------------------------------------------------
    toggle.addEventListener('change', () => {
        if (toggle.checked) enable(); else disable();
    });

    // Coming back to the page, the browser may restore the ticked checkbox
    // without firing `change` (whenever the page wasn't kept alive in the
    // back/forward cache, and on reload in Firefox), which left a ticked box
    // over a still grid. Pick the run back up once the page is laid out.
    window.addEventListener('pageshow', () => {
        if (toggle.checked && !wantOn) enable();
    });

    // Window resize invalidates the measured home positions; recapture them.
    // On touch the URL bar sliding in and out fires resize constantly; home
    // positions only set the wave's phase in that mode (the grid still does the
    // placing), so nothing but a width change — which re-columns the grid — is
    // worth re-measuring.
    let resizeTimer = null;
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
        if (!running) return;
        if (touchMQ.matches && window.innerWidth === lastW) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (running) remeasure();
        }, 150);
    });
})();
