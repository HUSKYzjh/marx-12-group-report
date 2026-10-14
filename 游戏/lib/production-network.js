/* A small, deterministic production network for the opening canvas.
 * Classic script on purpose: the portable iframe embeds this source directly. */
(function (root) {
  'use strict';
  var FADE_SECONDS = .7, MIN_LIFE = 3.8, COOLDOWN = 4.5, EVENT_INTERVAL = .3;
  function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function canForm(distance, length) { return Number.isFinite(distance) && length > 0 && Number.isFinite(length) && distance >= 1.5 * length && distance <= 3 * length; }
  function canBreak(distance, length) { return Number.isFinite(distance) && length > 0 && Number.isFinite(length) && distance >= 0 && distance <= 2 * length; }
  function generator(seed) {
    var value = 2166136261, text = String(seed == null ? 9173 : seed);
    for (var i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return function () { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
  }
  function ProductionNetwork(options) {
    options = options || {};
    this.width = Math.max(40, finite(options.width, 960));
    this.height = Math.max(40, finite(options.height, 540));
    this.restLength = Math.max(16, finite(options.restLength, 125));
    this.exclusion = options.exclusion ? {
      x: finite(options.exclusion.x, 0), y: finite(options.exclusion.y, 0),
      width: Math.max(0, finite(options.exclusion.width, 0)), height: Math.max(0, finite(options.exclusion.height, 0))
    } : null;
    this.stats = { formed: 0, broken: 0 };
    this.edges = [];
    this.pointer = { x: 0, y: 0, active: false };
    this._random = generator(options.seed);
    this._time = 0;
    this._eventTime = 0;
    this._maxDegree = 3;
    this._initialBondRatio = Math.max(0, finite(options.initialBondRatio, .62));
    this._maxBondRatio = Math.max(this._initialBondRatio, finite(options.maxBondRatio, .95));
    this._wallReach = Math.max(0, finite(options.wallReach, this.restLength * .65));
    this._topWallReach = Math.max(0, finite(options.topWallReach, this._wallReach));
    this._titleReach = Math.max(0, finite(options.titleReach, this.restLength * .65));
    var self = this;
    this.nodes = (options.nodes || []).map(function (input, i) {
      return Object.assign({}, input, {
        id: input.id == null ? i : input.id,
        symbolKey: typeof input.symbolKey === 'string' && input.symbolKey.length ? input.symbolKey : null,
        x: finite(input.x, self.width * (.15 + self._random() * .7)),
        y: finite(input.y, self.height * (.15 + self._random() * .7)),
        vx: finite(input.vx, 0), vy: finite(input.vy, 0),
        radius: clamp(finite(input.radius, 22), 1, Math.min(self.width, self.height) / 2 - 1),
        pinned: Boolean(input.pinned), _phase: self._random() * Math.PI * 2
      });
    });
    this._force = new Float64Array(this.nodes.length * 2);
    this._escapeTargets = [];
    this._escapeBudget = null;
    this._projectAll();
    // Settle the dense initial touch-target packing before showing frame one.
    // Ordinary animation keeps its cheaper five-pass contact solver below.
    this._separate(this.nodes.length >= 60 && this.width < 360 ? 120 : 20);
    var candidates = [], degrees = this.nodes.map(function () { return 0; });
    for (var a = 0; a < this.nodes.length; a++) {
      for (var b = a + 1; b < this.nodes.length; b++) {
        var edge = { a: a, b: b, bonded: false, alpha: 0, age: 0, cooldown: self._random() * 2 };
        this.edges.push(edge);
        var distance = this._distance(edge);
        if (canForm(distance, this.restLength) && !this._crossesTitle(edge)) candidates.push({ edge: edge, score: distance + this._random() * this.restLength * .6 });
      }
    }
    candidates.sort(function (a, b) { return a.score - b.score; });
    var initialCount = 0, initialLimit = Math.ceil(this.nodes.length * this._initialBondRatio);
    candidates.forEach(function (candidate) {
      var e = candidate.edge;
      if (initialCount < initialLimit && degrees[e.a] < 2 && degrees[e.b] < 2) {
        e.bonded = true; e.alpha = 1; e.cooldown = 0;
        degrees[e.a]++; degrees[e.b]++; initialCount++;
      }
    });
    this.initialBondCount = initialCount;
  }
  ProductionNetwork.canForm = canForm;
  ProductionNetwork.canBreak = canBreak;
  ProductionNetwork.prototype.setPointer = function (x, y, active) {
    this.pointer.x = finite(x, 0); this.pointer.y = finite(y, 0);
    this.pointer.active = Boolean(active) && Number.isFinite(x) && Number.isFinite(y);
  };
  ProductionNetwork.prototype._distance = function (e) {
    var a = this.nodes[e.a], b = this.nodes[e.b];
    return Math.hypot(b.x - a.x, b.y - a.y);
  };
  ProductionNetwork.prototype._crossesTitle = function (e) {
    var rect = this.exclusion;
    if (!rect || !rect.width || !rect.height) return false;
    var a = this.nodes[e.a], b = this.nodes[e.b], dx = b.x - a.x, dy = b.y - a.y;
    var near = 0, far = 1, axes = [[a.x, dx, rect.x - 5, rect.x + rect.width + 5], [a.y, dy, rect.y - 5, rect.y + rect.height + 5]];
    for (var i = 0; i < axes.length; i++) {
      var axis = axes[i];
      if (Math.abs(axis[1]) < .00001) { if (axis[0] < axis[2] || axis[0] > axis[3]) return false; }
      else {
        var t1 = (axis[2] - axis[0]) / axis[1], t2 = (axis[3] - axis[0]) / axis[1];
        near = Math.max(near, Math.min(t1, t2)); far = Math.min(far, Math.max(t1, t2));
        if (near > far) return false;
      }
    }
    return true;
  };
  ProductionNetwork.prototype._project = function (n) {
    if (n.pinned) { n.vx = 0; n.vy = 0; return; }
    var r = n.radius + 2, x = clamp(n.x, r, this.width - r), y = clamp(n.y, r, this.height - r);
    if (x !== n.x) { n.x = x; n.vx = 0; }
    if (y !== n.y) { n.y = y; n.vy = 0; }
    var rect = this.exclusion;
    if (!rect || !rect.width || !rect.height) return;
    var left = rect.x - r - 3, right = rect.x + rect.width + r + 3;
    var top = rect.y - r - 3, bottom = rect.y + rect.height + r + 3;
    if (n.x > left && n.x < right && n.y > top && n.y < bottom) {
      var exits = [];
      if (left >= r) exits.push({ distance: n.x - left, x: left, y: n.y, axis: 'vx' });
      if (right <= this.width - r) exits.push({ distance: right - n.x, x: right, y: n.y, axis: 'vx' });
      if (top >= r) exits.push({ distance: n.y - top, x: n.x, y: top, axis: 'vy' });
      if (bottom <= this.height - r) exits.push({ distance: bottom - n.y, x: n.x, y: bottom, axis: 'vy' });
      exits.sort(function (a, b) { return a.distance - b.distance; });
      if (exits.length) { n.x = exits[0].x; n.y = exits[0].y; n[exits[0].axis] = 0; }
    }
  };
  ProductionNetwork.prototype._projectAll = function () {
    for (var i = 0; i < this.nodes.length; i++) this._project(this.nodes[i]);
  };
  ProductionNetwork.prototype._escapePinned = function (movingIndex, fixedIndex, minimum) {
    var moving = this.nodes[movingIndex], fixed = this.nodes[fixedIndex], target = this._escapeTargets[movingIndex];
    if (!target || target.anchor !== fixedIndex || target.anchorX !== fixed.x || target.anchorY !== fixed.y) {
      var angle = Math.atan2(moving.y - fixed.y, moving.x - fixed.x), best = null, bestScore = Infinity;
      // Search the nearby contact circle only. Projecting samples also finds
      // escape points along a wall or the edge of the title's reserved paper.
      for (var sample = 0; sample < 32; sample++) {
        var theta = angle + sample * Math.PI / 16;
        var point = { x: fixed.x + Math.cos(theta) * (minimum + .05), y: fixed.y + Math.sin(theta) * (minimum + .05), radius: moving.radius, vx: 0, vy: 0, pinned: false };
        this._project(point);
        if (Math.hypot(point.x - fixed.x, point.y - fixed.y) < minimum) continue;
        var score = Math.pow(point.x - moving.x, 2) + Math.pow(point.y - moving.y, 2);
        for (var other = 0; other < this.nodes.length; other++) {
          if (other === movingIndex || other === fixedIndex) continue;
          var n = this.nodes[other], overlap = Math.max(0, moving.radius + n.radius + 5 - Math.hypot(point.x - n.x, point.y - n.y));
          score += overlap * overlap * 4;
        }
        if (score < bestScore) { bestScore = score; best = { x: point.x, y: point.y, anchor: fixedIndex, anchorX: fixed.x, anchorY: fixed.y }; }
      }
      if (!best) return;
      target = this._escapeTargets[movingIndex] = best;
    }
    var dx = target.x - moving.x, dy = target.y - moving.y, distance = Math.hypot(dx, dy);
    // Initial packing may take several short corrections. During animation,
    // the entire substep shares one speed budget, even across solver passes.
    var travel = Math.min(distance, 4, this._escapeBudget ? this._escapeBudget[movingIndex] : 4);
    if (distance > .00001 && travel > 0) {
      moving.x += dx / distance * travel; moving.y += dy / distance * travel;
      if (this._escapeBudget) this._escapeBudget[movingIndex] -= travel;
      this._project(moving);
    }
    if (Math.hypot(moving.x - fixed.x, moving.y - fixed.y) >= minimum) this._escapeTargets[movingIndex] = null;
  };
  ProductionNetwork.prototype._separate = function (passes) {
    for (var pass = 0; pass < passes; pass++) {
      for (var i = 0; i < this.nodes.length; i++) {
        var a = this.nodes[i];
        for (var j = i + 1; j < this.nodes.length; j++) {
          var b = this.nodes[j], dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy), minimum = a.radius + b.radius + 5;
          if (distance >= minimum || (a.pinned && b.pinned)) continue;
          var movingIndex = a.pinned ? j : i, fixedIndex = a.pinned ? i : j;
          if ((a.pinned || b.pinned) && this._escapeTargets[movingIndex] && this._escapeTargets[movingIndex].anchor === fixedIndex) {
            this._escapePinned(movingIndex, fixedIndex, minimum); continue;
          }
          if (distance < .00001) { var angle = (i * 2.399 + j * 1.718); dx = Math.cos(angle); dy = Math.sin(angle); distance = 1; }
          var nx = dx / distance, ny = dy / distance, weightA = a.pinned ? 0 : b.pinned ? 1 : .5, weightB = b.pinned ? 0 : a.pinned ? 1 : .5;
          var push = minimum - Math.hypot(b.x - a.x, b.y - a.y) + .01;
          a.x -= nx * push * weightA; a.y -= ny * push * weightA;
          b.x += nx * push * weightB; b.y += ny * push * weightB;
          var closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (closing < 0) {
            a.vx += closing * nx * weightA; a.vy += closing * ny * weightA;
            b.vx -= closing * nx * weightB; b.vy -= closing * ny * weightB;
          }
          if (a.pinned || b.pinned) {
            this._project(a); this._project(b);
            if (Math.hypot(b.x - a.x, b.y - a.y) < minimum - .001) this._escapePinned(movingIndex, fixedIndex, minimum);
          }
        }
      }
      this._projectAll();
    }
  };
  ProductionNetwork.prototype._changeBond = function (e, bonded) {
    e.bonded = bonded; e.age = 0;
    e.cooldown = bonded ? 0 : COOLDOWN + this._random() * 2;
    this.stats[bonded ? 'formed' : 'broken']++;
  };
  ProductionNetwork.prototype._localDensities = function () {
    var density = new Float64Array(this.nodes.length), reach = this.restLength * 3;
    // Spatial density, not graph degree: nearby symbols count whether linked
    // or not. The smooth kernel reaches zero at 3X without a threshold jump.
    for (var i = 0; i < this.nodes.length; i++) {
      for (var j = i + 1; j < this.nodes.length; j++) {
        var distance = Math.hypot(this.nodes[i].x - this.nodes[j].x, this.nodes[i].y - this.nodes[j].y);
        var weight = Math.pow(Math.max(0, 1 - distance / reach), 2);
        density[i] += weight; density[j] += weight;
      }
    }
    return density;
  };
  ProductionNetwork.prototype._bondRates = function (edge, density) {
    // Exclude the pair itself so separation is governed by the existing
    // distance bands, while third-party neighbours govern crowding.
    var mutual = Math.pow(Math.max(0, 1 - this._distance(edge) / (this.restLength * 3)), 2);
    var local = Math.max(0, (density[edge.a] + density[edge.b]) / 2 - mutual);
    var crowding = local / (local + 4);
    return { form: 3 - 2.4 * crowding, break: .2 + 1.4 * crowding };
  };
  ProductionNetwork.prototype._bonds = function (elapsed) {
    var degrees = this.nodes.map(function () { return 0; }), count = 0, forms = [], breaks = [], stretched = [];
    var density = this._localDensities();
    for (var i = 0; i < this.edges.length; i++) {
      var edge = this.edges[i], distance = this._distance(edge);
      // A fading edge keeps its degree slot until it disappears.
      if (edge.bonded || edge.alpha > 0) { degrees[edge.a]++; degrees[edge.b]++; count++; }
      if (edge.bonded) {
        if (distance > this.restLength * 3 || this._crossesTitle(edge)) stretched.push(edge);
        else if (edge.age >= MIN_LIFE && canBreak(distance, this.restLength)) breaks.push({ edge: edge, rate: this._bondRates(edge, density).break });
      }
    }
    var pick = function (list, random) { return list[Math.floor(random() * list.length)]; };
    // At most one mutation per event, including stretched-link protection.
    if (stretched.length) { this._changeBond(pick(stretched, this._random), false); return; }
    var hasRoom = count < Math.max(1, Math.floor(this.nodes.length * this._maxBondRatio));
    for (var j = 0; hasRoom && j < this.edges.length; j++) {
      var candidate = this.edges[j];
      if (!candidate.bonded && candidate.alpha === 0 && candidate.cooldown === 0 && degrees[candidate.a] < this._maxDegree && degrees[candidate.b] < this._maxDegree && canForm(this._distance(candidate), this.restLength) && !this._crossesTitle(candidate)) forms.push({ edge: candidate, rate: this._bondRates(candidate, density).form });
    }
    var sumRates = function (list) { return list.reduce(function (sum, item) { return sum + item.rate; }, 0); };
    var formSum = sumRates(forms), breakSum = sumRates(breaks);
    // Use average hazards so a bigger screen's extra pairs do not multiply
    // the animation speed. Both event type and pair are density-weighted.
    var formRate = forms.length ? formSum / forms.length : 0;
    var breakRate = breaks.length ? breakSum / breaks.length : 0;
    var totalRate = formRate + breakRate;
    if (!totalRate || this._random() >= 1 - Math.exp(-totalRate * elapsed)) return;
    var bonded = this._random() * totalRate < formRate;
    var list = bonded ? forms : breaks, remaining = this._random() * (bonded ? formSum : breakSum);
    for (var k = 0; k < list.length; k++) {
      remaining -= list[k].rate;
      if (remaining <= 0 || k === list.length - 1) { this._changeBond(list[k].edge, bonded); return; }
    }
  };
  ProductionNetwork.prototype._environmentForce = function (n) {
    var length = this.restLength, r = n.radius + 2, wallReach = this._wallReach;
    function pressure(gap, reach, strength) {
      return reach > 0 && gap < reach ? strength * Math.pow(1 - clamp(gap / reach, 0, 1), 2) : 0;
    }
    var fx = pressure(n.x - r, wallReach, length * 1.2) - pressure(this.width - r - n.x, wallReach, length * 1.2);
    var fy = pressure(n.y - r, this._topWallReach, length * 1.2) - pressure(this.height - r - n.y, wallReach, length * 1.2);
    var rect = this.exclusion;
    if (rect && rect.width && rect.height && this._titleReach > 0) {
      var closestX = clamp(n.x, rect.x, rect.x + rect.width), closestY = clamp(n.y, rect.y, rect.y + rect.height);
      var dx = n.x - closestX, dy = n.y - closestY, distance = Math.hypot(dx, dy);
      if (distance > .00001) {
        var push = pressure(distance - r - 3, this._titleReach, length * 1.5);
        fx += dx / distance * push; fy += dy / distance * push;
      }
    }
    return [fx, fy];
  };
  ProductionNetwork.prototype._sameSymbolForce = function (a, b, distance) {
    var reach = this.restLength * 10;
    if (!a.symbolKey || a.symbolKey !== b.symbolKey || !Number.isFinite(distance) || distance < 0 || distance >= reach) return 0;
    // Additional long-range pressure only for exact artwork families. It
    // smoothly reaches zero at 10X; it is not a 10-fold boost to all forces.
    return this.restLength * .12 * Math.pow(1 - distance / reach, 2);
  };
  ProductionNetwork.prototype._advance = function (dt) {
    var nodes = this.nodes, force = this._force, length = this.restLength;
    this._escapeBudget = nodes.map(function () { return length * .3 * dt; });
    for (var escape = 0; escape < this._escapeTargets.length; escape++) {
      var target = this._escapeTargets[escape];
      if (target && (!nodes[target.anchor].pinned || nodes[escape].pinned)) this._escapeTargets[escape] = null;
    }
    force.fill(0); this._time += dt;
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i], phase = a._phase;
      var environment = this._environmentForce(a);
      force[i * 2] += environment[0]; force[i * 2 + 1] += environment[1];
      // Slow, smooth forcing gives flow without tethering nodes to fixed homes.
      force[i * 2] += length * .14 * (Math.sin(this._time * .31 + phase) + .35 * Math.sin(this._time * .79 + phase * 2));
      force[i * 2 + 1] += length * .14 * (Math.cos(this._time * .27 + phase) + .35 * Math.sin(this._time * .67 + phase));
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j], dx = b.x - a.x, dy = b.y - a.y, distance = Math.max(1, Math.hypot(dx, dy));
        var repulsion = distance <= length * 3 ? Math.min(length * 2, length * .065 * Math.pow(length / distance, 2)) : 0;
        repulsion += this._sameSymbolForce(a, b, distance);
        if (!repulsion) continue;
        var fx = dx / distance * repulsion, fy = dy / distance * repulsion;
        force[i * 2] -= fx; force[i * 2 + 1] -= fy; force[j * 2] += fx; force[j * 2 + 1] += fy;
      }
      if (this.pointer.active) {
        var px = a.x - this.pointer.x, py = a.y - this.pointer.y, pd = Math.hypot(px, py), reach = length * 1.25;
        if (pd > .01 && pd < reach) { var pressure = length * .36 * Math.pow(1 - pd / reach, 2); force[i * 2] += px / pd * pressure; force[i * 2 + 1] += py / pd * pressure; }
      }
    }
    for (var k = 0; k < this.edges.length; k++) {
      var e = this.edges[k];
      e.age += dt; e.cooldown = Math.max(0, e.cooldown - dt);
      e.alpha = clamp(e.alpha + (e.bonded ? 1 : -1) * dt / FADE_SECONDS, 0, 1);
      if (e.alpha === 0) continue;
      var from = nodes[e.a], to = nodes[e.b], ex = to.x - from.x, ey = to.y - from.y, ed = Math.max(1, Math.hypot(ex, ey));
      // At distance X this attraction exactly balances the pair's base
      // repulsion, so X is a net-force equilibrium, not only a spring length.
      var spring = clamp((ed - length) * 1.1 + length * .065, -length, length * 1.3) * e.alpha;
      force[e.a * 2] += ex / ed * spring; force[e.a * 2 + 1] += ey / ed * spring;
      force[e.b * 2] -= ex / ed * spring; force[e.b * 2 + 1] -= ey / ed * spring;
    }
    var damping = Math.exp(-1.75 * dt), maxSpeed = length * .3;
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      if (node.pinned) { node.vx = 0; node.vy = 0; continue; }
      // Let the speed-budgeted contact solver carry a trapped neighbour to
      // its escape point without the wall force driving it back each substep.
      if (this._escapeTargets[n]) { node.vx = 0; node.vy = 0; continue; }
      node.vx = (node.vx + force[n * 2] * dt) * damping; node.vy = (node.vy + force[n * 2 + 1] * dt) * damping;
      var speed = Math.hypot(node.vx, node.vy);
      if (speed > maxSpeed) { node.vx *= maxSpeed / speed; node.vy *= maxSpeed / speed; }
      node.x += node.vx * dt; node.y += node.vy * dt;
    }
    this._projectAll(); this._separate(5);
    this._eventTime += dt;
    if (this._eventTime + 1e-9 >= EVENT_INTERVAL) { this._eventTime -= EVENT_INTERVAL; this._bonds(EVENT_INTERVAL); }
  };
  ProductionNetwork.prototype.step = function (seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    // Ignore excess suspended-tab time; a resumed tab must not fling the graph.
    var dt = Math.min(seconds, .1), steps = Math.ceil(dt / (1 / 120));
    for (var i = 0; i < steps; i++) this._advance(dt / steps);
  };
  root.ProductionNetwork = ProductionNetwork;
})(globalThis);
