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
// being dragged. Clicking drops a ripple. Unticking restores the grid.
(function () {
    const toggle = document.getElementById('waves-toggle');
    if (!toggle) return; // only present on the landing page

    const control = document.getElementById('sim-control');
    const stateMenu = document.getElementById('wave-states');

    const TWO_PI = Math.PI * 2;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
    }
    const TILT_GAIN = 0.0016; // surge velocity -> tile lean (rad per px/s)
    const MAX_TILT  = 0.20;   // rad, clamp so storms don't flip tiles

    // A faint always-on ground swell, so tiles are never frozen in a perfect
    // grid during the lull between waves (which read as a "snap to grid").
    const SWELL_AMP = 7;      // px

    // Temporal smoothing. The swash starts and stops with non-zero velocity, so
    // the surge (and the tilt it drives) is discontinuous at each wave's edges.
    // Easing the rendered offset and angle toward their targets absorbs those
    // jumps — and eases the tiles out of the grid on start. Smaller = snappier.
    const TAU_POS = 0.10;     // s, position smoothing time constant
    const TAU_ANG = 0.18;     // s, angle smoothing (looser, to kill tilt snaps)
    const FADE    = 0.8;      // s, fade the whole field in on enable

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
    const STATES = {
        calm:  { amp: 0.60, speed: 0.70, tilt: 0.70 },
        swell: { amp: 1.00, speed: 1.00, tilt: 1.00 },
        storm: { amp: 1.70, speed: 1.40, tilt: 1.50 },
    };
    let state = STATES.swell;

    // --- pointer ripples ----------------------------------------------------
    // A click sends a circular wave outward from the contact point: a ring of
    // radius RIPPLE_SPEED*age, fading over RIPPLE_LIFE, that nudges tiles
    // radially as it passes.
    const RIPPLE_SPEED = 520;  // px/s the ring expands
    const RIPPLE_LIFE  = 2.4;  // s until a ripple is spent
    const RIPPLE_LEN   = 180;  // px wavelength of the ring
    const RIPPLE_AMP   = 26;   // px peak radial nudge
    const MAX_RIPPLES  = 6;
    let ripples = [];

    let tiles = [];
    let running = false;
    let rafId = null;
    let startT = 0;
    let lastT = 0;

    // --- enable / disable ---------------------------------------------------
    function enable() {
        const els = Array.from(document.querySelectorAll('#test > a'));
        if (!els.length) return;

        // Measure every tile BEFORE mutating any, so detaching one doesn't
        // reflow the others mid-measurement.
        const measured = els.map(el => ({ el, rect: el.getBoundingClientRect() }));

        tiles = measured.map(({ el, rect }) => {
            const t = {
                el,
                prevCss: el.style.cssText,
                hx: rect.left + rect.width / 2,   // home centre (the resting waterline)
                hy: rect.top + rect.height / 2,
                hw: rect.width / 2,
                hh: rect.height / 2,
                sx: 0, sy: 0, sa: 0,              // smoothed offset + angle (ease from grid)
            };
            el.style.cssText =
                'position:fixed;margin:0;left:0;top:0;' +
                'width:' + rect.width + 'px;height:' + rect.height + 'px;' +
                'z-index:900;will-change:transform;';
            return t;
        });

        if (control) control.classList.add('waves');
        ripples = [];
        running = true;
        startT = lastT = performance.now();
        attachInput();
        rafId = requestAnimationFrame(step);
    }

    function disable() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        detachInput();
        tiles.forEach(t => { t.el.style.cssText = t.prevCss; }); // snap back into grid
        tiles = [];
        ripples = [];
        if (control) control.classList.remove('waves');
    }

    // --- displacement -------------------------------------------------------
    // Total screen offset + tilt for a tile whose home centre is (hx,hy) at t.
    function displace(hx, hy, t) {
        let dx = 0, dy = 0, velx = 0;
        const dp = 0.0015; // phase step for the numeric surge velocity (tilt)

        for (const w of TRAINS) {
            const u = w.dx * hx + w.dy * hy;        // distance along the beach
            const T = w.T / state.speed;
            const speed = w.speed * state.speed;
            const amp = w.amp * state.amp;
            // Phase since this train's front reached the tile. Tiles farther up
            // the beach (larger u) are reached later -> the surge sweeps across.
            let phase = ((t - u / speed) / T) % 1;
            if (phase < 0) phase += 1;

            const g = swash(phase, w.rise, w.active);
            dx += w.dx * amp * g;                   // carried along the beach...
            dy += w.dy * amp * g;                   // ...up and back

            // surge velocity (numeric d/dt of the displacement) drives the lean
            const p2 = (phase + dp) % 1, p1 = (phase - dp + 1) % 1;
            const dg = (swash(p2, w.rise, w.active) - swash(p1, w.rise, w.active)) / (2 * dp);
            velx += w.dx * amp * dg / T;
        }

        // gentle ground swell — always moving, so tiles never settle into a
        // dead-still grid during the lull between waves.
        const swa = SWELL_AMP * state.amp;
        const gp = 0.9 * t + hx * 0.012 + hy * 0.006;
        dx += swa * Math.sin(gp);
        dy += swa * 0.6 * Math.cos(0.7 * t + hy * 0.013);
        velx += swa * 0.9 * Math.cos(gp);

        for (const r of ripples) {
            const age = t - r.t0;
            const rx = hx - r.x, ry = hy - r.y;
            const dist = Math.hypot(rx, ry) || 1;
            const ring = RIPPLE_SPEED * age;            // current radius of the wavefront
            const fade = 1 - age / RIPPLE_LIFE;
            // Gaussian band around the expanding ring, so only tiles the front is
            // crossing get pushed; everything is multiplied by the time fade.
            const band = Math.exp(-((dist - ring) * (dist - ring)) / (2 * RIPPLE_LEN * RIPPLE_LEN));
            const amp = RIPPLE_AMP * fade * band * Math.sin((dist - ring) * (TWO_PI / RIPPLE_LEN));
            dx += (rx / dist) * amp;
            dy += (ry / dist) * amp;
        }

        const ang = clamp(velx * TILT_GAIN * state.tilt, -MAX_TILT, MAX_TILT);
        return { dx, dy, ang };
    }

    function step(now) {
        if (!running) return;
        const t = (now - startT) / 1000;
        let dt = (now - lastT) / 1000;
        lastT = now;
        if (dt > 0.05) dt = 0.05; // clamp after a tab switch so smoothing stays sane

        if (ripples.length) ripples = ripples.filter(r => t - r.t0 < RIPPLE_LIFE);

        // fade the field in (smoothstep) so tiles ease out of the grid on start
        const f = clamp(t / FADE, 0, 1);
        const level = f * f * (3 - 2 * f);
        const kp = 1 - Math.exp(-dt / TAU_POS); // per-frame easing factors
        const ka = 1 - Math.exp(-dt / TAU_ANG);

        for (const tile of tiles) {
            const d = displace(tile.hx, tile.hy, t);
            tile.sx += (d.dx * level - tile.sx) * kp;
            tile.sy += (d.dy * level - tile.sy) * kp;
            tile.sa += (d.ang * level - tile.sa) * ka;
            tile.el.style.transform =
                'translate(' + (tile.hx - tile.hw + tile.sx) + 'px,' +
                               (tile.hy - tile.hh + tile.sy) + 'px) ' +
                'rotate(' + tile.sa + 'rad)';
        }
        rafId = requestAnimationFrame(step);
    }

    // --- input --------------------------------------------------------------
    function onDown(e) {
        if (e.target.closest && e.target.closest('#sim-control')) return; // let the menu work
        const p = e.touches && e.touches[0] ? e.touches[0] : e;
        ripples.push({ x: p.clientX, y: p.clientY, t0: (performance.now() - startT) / 1000 });
        if (ripples.length > MAX_RIPPLES) ripples.shift();
        // No preventDefault: a clean click on a tile still opens its project page.
    }

    function attachInput() {
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown, { passive: true });
    }

    function detachInput() {
        document.removeEventListener('mousedown', onDown);
        document.removeEventListener('touchstart', onDown);
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

    // Window resize invalidates the measured home positions; recapture them.
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (!running) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (!running) return;
            disable();
            enable();
        }, 150);
    });
})();
