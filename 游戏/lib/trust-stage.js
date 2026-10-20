/* Adaptation runtime. Original Slideshow / IteratedPeep / MovieClip / Tween are
 * supplied by the credited, unmodified vendored scripts. No PD rules are used. */
(function () {
  'use strict';
  var state, lastKey, slideshow, stage, busy = false, active = true;
  var transitioning = false, pendingState, queuedState, chapterAnimation = 0;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var timers = new Set();
  var headings = document.getElementById('slideshow');
  var controls = document.getElementById('controls');
  var readout = document.getElementById('readout');
  var notes = document.getElementById('note-content');
  var logoNotice = document.getElementById('production-logo-notice');
  if (logoNotice) document.querySelector('footer > details').appendChild(logoNotice.content.cloneNode(true));
  document.documentElement.style.setProperty('--trust-button', 'url("' + TRUST_ASSETS.button + '")');
  document.documentElement.style.setProperty('--trust-scratch', 'url("' + TRUST_ASSETS.scratch + '")');
  function post(type, extra) { parent.postMessage(Object.assign({ app: 'trust-adaptation', type: type }, extra || {}), '*'); }
  function send(channel, action) { if (!busy && !transitioning) post('action', { channel: channel, action: action }); }
  function later(fn, time) { var id = setTimeout(function () { timers.delete(id); fn(); }, time); timers.add(id); return id; }
  function move(target, values, seconds, delay) {
    Tween.removeTweens(target);
    if (reduced.matches) { Object.assign(target, values); return; }
    Tween_get(target).wait(_s(delay || 0)).to(values, _s(seconds || .45), Ease.quadInOut);
  }
  function node(tag, text, cls) { var n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; StreetArt.decorateMoney(n); return n; }
  function moneyText(n,words){if(n.dataset.moneyText===words)return;n.dataset.moneyText=words;n.textContent=words;StreetArt.decorateMoney(n);}
  function button(label, handler, cls, container) {
    var b = node('button', label, cls || 'primary'); b.type = 'button'; b.onclick = handler;
    (container || controls).appendChild(b); return b;
  }
  function row(cls) { var r = node('div', '', 'row ' + (cls || '')); controls.appendChild(r); return r; }
  function action(label, type, extra, cls, container) {
    return button(label, function () { send('prologue', Object.assign({ type: type }, extra || {})); }, cls, container);
  }
  function machineAction(label, type, extra, cls, container) {
    return button(label, function () { send('machine', Object.assign({ type: type }, extra || {})); }, cls, container);
  }
  function textLine(text, cls) { readout.appendChild(node('p', text, cls)); }
  function number(value) { return String(Math.round(value * 100) / 100); }
  var chapterMenu=document.getElementById('chapter-menu'),chapterToggle=document.getElementById('chapter-toggle');
  STORY_CHAPTERS.forEach(function(chapter){
    var item=node('li');document.getElementById('chapter-list').appendChild(item);
    if(chapter.id==='machine')item.className='chapter-appendix';
    var choice=button(chapter.title,function(){
      chapterMenu.open=false;chapterToggle.focus();
      post('action',{channel:'host',action:{type:'NAVIGATE_CHAPTER',chapter:chapter.id}});
    },'chapter-choice',item);
    choice.dataset.chapter=chapter.id;
  });
  document.addEventListener('click',function(e){if(chapterMenu.open&&!chapterMenu.contains(e.target))chapterMenu.open=false;});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&chapterMenu.open){chapterMenu.open=false;chapterToggle.focus();e.preventDefault();}});
  function metrics(items) {
    var group = node('div', '', 'market-metrics'); readout.appendChild(group);
    items.forEach(function (item) { var cell = node('div'); cell.appendChild(node('span', item[0])); cell.appendChild(node('strong', number(item[1]))); group.appendChild(cell); });
  }
  function quote(words, source, container) { var q = node('blockquote', '', 'quote'); q.appendChild(node('div', words)); q.appendChild(node('cite', source)); (container || readout).appendChild(q); }
  function band(share) { return share <= 20 ? -2 : share <= 40 ? -1 : share === 50 ? 0 : share <= 70 ? 1 : 2; }
  function react(peep, mood) {
    peep.resetFace();
    if (Math.abs(mood) === 2) { peep.restingFace = false; peep.face.gotoAndStop(mood > 0 ? 8 : 9); }
    else if (mood) { peep.eyebrows.visible = true; peep.eyebrows.gotoAndStop(mood > 0 ? 4 : 5); }
    move(peep.graphics.scale, { x: peep.flip * (1 + Math.max(0, mood) * .035) * peep.size, y: peep.size }, .22);
    Tween.removeTweens(peep.animated);
    if (!reduced.matches) Tween_get(peep.animated).to({ y: mood > 0 ? -10 : 4, rotation: mood < 0 ? -.04 : .03 }, _s(.16), Ease.quadOut).to({ y: 0, rotation: 0 }, _s(.28), Ease.quadInOut);
  }
  function register(name, src, atlas) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        var base = new PIXI.BaseTexture(image);
        Object.keys(atlas.frames).forEach(function (key, index) {
          var r = atlas.frames[key].frame;
          var texture = new PIXI.Texture(base, new PIXI.Rectangle(r.x, r.y, r.w, r.h));
          PIXI.Texture.addTextureToCache(texture, key);
          // Original helper resolves resourceName+0000; namespace WBWWB without
          // modifying the original atlas keys or colliding with other characters.
          PIXI.Texture.addTextureToCache(texture, name+String(index).padStart(4,'0'));
        });
        PIXI.loader.resources[name] = { data: atlas }; resolve();
      };
      image.onerror = reject; image.src = src;
    });
  }
  function loadImage(src) { return new Promise(function (resolve, reject) { var image = new Image(); image.onload = function () { resolve(new PIXI.Texture(new PIXI.BaseTexture(image))); }; image.onerror = reject; image.src = src; }); }

  // Request the host element inside the click gesture; the iframe and saved game stay mounted.
  var fullscreenButton = document.getElementById('fullscreen-toggle');
  var fullscreenDocument = parent.document;
  function syncFullscreen() {
    var expanded = !!fullscreenDocument.fullscreenElement;
    fullscreenButton.hidden = !fullscreenDocument.fullscreenEnabled;
    fullscreenButton.textContent = expanded ? '退出全屏 ⛶' : '全屏 ⛶';
    fullscreenButton.setAttribute('aria-pressed', String(expanded));
  }
  fullscreenButton.onclick = function () {
    document.getElementById('fullscreen-status').textContent = '';
    var request = fullscreenDocument.fullscreenElement ? fullscreenDocument.exitFullscreen() : fullscreenDocument.documentElement.requestFullscreen();
    request.catch(function () { document.getElementById('fullscreen-status').textContent = '未能进入全屏，请重试。'; });
  };
  fullscreenDocument.addEventListener('fullscreenchange', syncFullscreen);
  syncFullscreen();
  function footerNavigationHeight() {
    var footer = document.querySelector('footer'), style = getComputedStyle(footer);
    // Expanded credits may scroll, but must not shrink the stage above them.
    return Math.max(44, document.getElementById('stage-navigation').offsetHeight,
      footer.querySelector('summary').getBoundingClientRect().height) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  }
  function openingViewportHeight() {
    // The host viewport is stable while the iframe grows to fit its content.
    // visualViewport also follows the phone browser's expanding address bar.
    return Math.round(parent.visualViewport ? parent.visualViewport.height : parent.innerHeight);
  }

  // Original Slideshow owns one long-lived object. Ordinary forward steps never clear it.
  window.TrustStage = function () {
    var self = this;
    self.dom = node('div', '', 'stage-object');
    self.width = window.innerWidth;
    // Pixi 4.4.3 takes forceCanvas as its FOURTH argument, not an options key.
    // Keep the existing no-unsafe-eval policy rather than weakening it for WebGL.
    self.app = new PIXI.Application(self.width, 340, { transparent: true, resolution: Math.min(2, window.devicePixelRatio || 1), antialias: true }, true);
    // Pixi 4 enables an empty, absolutely positioned accessibility overlay on
    // Tab. All our controls are real DOM elements and the canvas has an image
    // description, so that empty legacy layer must not cover links or expand
    // the mobile viewport. Do not remove keyboard support from the DOM controls.
    var accessibility = self.app.renderer.plugins.accessibility;
    if (accessibility && accessibility.div) {
      accessibility.div.style.pointerEvents = 'none';
      accessibility.div.style.maxWidth = '0px'; accessibility.div.style.maxHeight = '0px';
      accessibility.div.style.overflow = 'hidden'; accessibility.div.setAttribute('aria-hidden', 'true');
    }
    self.dom.appendChild(self.app.view);
    // Use real links above the canvas rather than inaccessible painted hit boxes.
    // Local drawings and separately credited logo paths never fetch remote art.
    self.productionMap = node('div', '', 'production-map'); self.productionMap.hidden = true;
    var symbolNavigation = node('nav', '', 'production-symbols'); symbolNavigation.setAttribute('aria-label', '当代工具与企业：官网参考');
    self.productionElements = {};
    function symbolElement(symbol, instanceId) {
      var item = node(symbol.href ? 'a' : 'div', '', 'production-symbol');
      item.dataset.productionSymbol = symbol.id;
      item.dataset.networkId = instanceId;
      if (instanceId !== symbol.id) { item.dataset.duplicate = 'true'; item.setAttribute('aria-hidden', 'true'); }
      if (symbol.logo) item.dataset.logo = 'true';
      if (symbol.sector) item.dataset.sector = symbol.sector;
      var icon = node('span', '', 'production-icon'); icon.innerHTML = symbol.svgMarkup; item.appendChild(icon);
      var caption = node('span', symbol.label, 'production-symbol-name'); item.appendChild(caption);
      if (symbol.href) {
        item.href = symbol.href; item.target = '_blank'; item.rel = 'noopener noreferrer';
        item.setAttribute('aria-label', symbol.label + '：' + symbol.description + '，打开官网（新标签页）');
        item.title = symbol.description + ' · 打开官网（新标签页）';
        var external = node('span', '↗', 'external-mark'); external.setAttribute('aria-hidden', 'true'); caption.appendChild(external);
      } else { item.title = symbol.label + ' · ' + symbol.description; item.setAttribute('role', 'img'); item.setAttribute('aria-label', symbol.label); }
      self.productionElements[instanceId] = item;
      function pin() {
        if (!self.splashNetwork) return;
        var n = self.splashNetwork.nodes.find(function (entry) { return entry.id === instanceId; });
        if (n) { n.pinned = true; n.vx = 0; n.vy = 0; }
      }
      function release() {
        if (item.matches(':hover') || document.activeElement === item || !self.splashNetwork) return;
        var n = self.splashNetwork.nodes.find(function (entry) { return entry.id === instanceId; });
        if (n) n.pinned = false;
      }
      item.addEventListener('pointerenter', pin); item.addEventListener('pointerdown', pin); item.addEventListener('focus', pin);
      item.addEventListener('pointerleave', release); item.addEventListener('blur', release); item.addEventListener('pointercancel', release);
      item.addEventListener('pointerup', function (event) { if (event.pointerType !== 'mouse') later(release, 300); });
      symbolNavigation.appendChild(item);
      return item;
    }
    PRODUCTION_LINKS.forEach(function (symbol) { symbolElement(symbol, symbol.id); });
    self.productionMap.appendChild(symbolNavigation);
    self.dom.appendChild(self.productionMap);
    self.productionHint = node('p', '点带箭头的符号，去官网看看。', 'production-hint'); self.productionHint.hidden = true;
    controls.parentNode.insertBefore(self.productionHint, controls);
    self.dom.addEventListener('pointermove', function (event) {
      if (!self.splashNetwork || !self.splashLayer.visible || reduced.matches) return;
      var rect = self.app.view.getBoundingClientRect();
      self.splashNetwork.setPointer((event.clientX - rect.left) * self.width / rect.width, (event.clientY - rect.top) * self.splashHeight / rect.height, event.pointerType !== 'touch');
    });
    self.dom.addEventListener('pointerleave', function () { if (self.splashNetwork) self.splashNetwork.setPointer(0, 0, false); });
    self.app.view.setAttribute('role', 'img');
    self.app.view.setAttribute('aria-label', '人物、钱和机器的关系。具体数值和关系说明在下方文字中。');
    self.links = new PIXI.Graphics(); self.app.stage.addChild(self.links);
    self.paths = []; self.linkProgress = { value: 1 };
    self.lines = new PIXI.Graphics(); self.app.stage.addChild(self.lines);
    // The original blank cabinet is a symbolic allocation table, not a machine
    // payoff matrix. Its original artwork supplies a shared focus for this scene.
    self.desk = _makeMovieClip('iterated_machine', { scale: .5 });
    self.desk.visible = false; self.app.stage.addChild(self.desk);
    self.splashLayer = new PIXI.Container(); self.app.stage.addChild(self.splashLayer);
    self.splashPeople = []; self.splashTools = []; self.splashEdges = []; self.splashNodes = [];
    self.syncSplashPins = function () {
      if (!self.splashNetwork) return;
      // A resize/repaint can replace the model without firing DOM focus again.
      // Reconcile with the actual focused/hovered link before every step.
      self.splashNodes.forEach(function (item, index) {
        if (!item.element || item.element.tagName !== 'A') return;
        var n = self.splashNetwork.nodes[index];
        n.pinned = document.activeElement === item.element || item.element.matches(':hover');
        if (n.pinned) { n.vx = 0; n.vy = 0; }
      });
    };
    self.buildSplash = function () {
      self.splashLayer.removeChildren().forEach(function (g) { g.destroy({ children: true }); });
      self.splashPeople = []; self.splashTools = []; self.splashNodes = []; self.splashClock = 0;
      self.splashViewportHeight = openingViewportHeight();
      var chapterHeight = document.querySelector('.chapter-navigation').offsetHeight;
      // Reserve room for the chapter bar, hint, full-size start button and safe space.
      // Never use the auto-sized iframe's height as an input to its own layout.
      self.splashHeight = Math.max(100, self.splashViewportHeight - chapterHeight - footerNavigationHeight() - 128);
      var compact = self.width <= 600 || self.splashHeight < 340;
      Object.keys(self.productionElements).forEach(function (id) {
        if (id.indexOf('repeat-') === 0) { self.productionElements[id].remove(); delete self.productionElements[id]; }
        else self.productionElements[id].hidden = true;
      });
      var titleHeight = compact ? (self.splashHeight < 260 ? 78 : 96) : 142;
      headings.style.setProperty('--splash-title-y', (self.splashHeight / 2) + 'px');
      headings.style.setProperty('--splash-title-size', (compact ? (self.splashHeight < 260 ? 28 : 36) : 56) + 'px');
      headings.style.setProperty('--splash-title-width', (compact ? 180 : 340) + 'px');
      // All subjects belong to the SAME force simulation, regardless of material.
      // The centre is paper reserved for the title, not a separate icon toolbar.
      self.splashInk = new PIXI.Graphics(); self.splashLayer.addChild(self.splashInk);
      function person() {
        var p = new SplashPeep({ x: 0, y: 0, app: self.app });
        var size = compact ? 24 : 32;
        p.graphics.scale.set(size / p.graphics.texture.width, size / p.graphics.texture.width);
        // A peep's atlas frame is taller than it is wide. Reserve its entire
        // rotation circle, not half its width, so turning never clips the edge.
        p.kind = 'person'; p.radius = Math.ceil(Math.hypot(p.graphics.width, p.graphics.height) / 2) + 3;
        self.splashPeople.push(p); return p;
      }
      function tool(kind) {
        var g;
        if (kind === 'old' || kind === 'new') {
          g = new PIXI.Sprite(machineTextures[kind]); g.anchor.set(.5);
          // The new-machine PNG has wider transparent margins than the old one.
          g.width = kind === 'old' ? (compact ? 53 : 64) : (compact ? 62 : 76);
          g.height = g.width / 2;
        } else {
          // Original code-drawn workshop marks; the credited people stay intact.
          g = new PIXI.Graphics(); g.lineStyle(3, 0x555555, 1); g.beginFill(0xffffff);
          if (kind === 'gear') {
            for (var i = 0; i <= 32; i++) {
              var a = i * Math.TAU / 32, radius = i % 4 < 2 ? 31 : 24;
              var px = Math.cos(a) * radius, py = Math.sin(a) * radius;
              if (!i) g.moveTo(px, py); else g.lineTo(px, py);
            }
            g.endFill(); g.drawCircle(0, 0, 10); g.rotation = -.16;
          } else if (kind === 'wrench') {
            [[-8,31],[-10,-7],[-22,-17],[-21,-34],[-11,-22],[1,-23],[9,-36],[13,-19],[5,-7],[9,29],[3,35],[-8,31]].forEach(function (pt, i) { if (!i) g.moveTo(pt[0], pt[1]); else g.lineTo(pt[0], pt[1]); });
            g.endFill(); g.drawCircle(0, 25, 3); g.rotation = .42;
          } else if (kind === 'flywheel') {
            g.drawCircle(0, -4, 29); g.endFill(); g.drawCircle(0, -4, 7);
            for (var spoke = 0; spoke < 4; spoke++) {
              var angle = spoke * Math.TAU / 4 + .3;
              g.moveTo(Math.cos(angle) * 8, -4 + Math.sin(angle) * 8); g.lineTo(Math.cos(angle) * 27, -4 + Math.sin(angle) * 27);
            }
            g.moveTo(-8, 25); g.lineTo(-12, 34); g.lineTo(14, 34); g.lineTo(8, 25);
          } else if (kind === 'conveyor') {
            g.drawRoundedRect(-40, 0, 80, 19, 9); g.endFill();
            [-28, -10, 10, 28].forEach(function (roller) { g.drawCircle(roller, 9, 3); });
            g.moveTo(-30, 20); g.lineTo(-33, 30); g.moveTo(30, 20); g.lineTo(33, 30);
            g.beginFill(0xffffff); g.drawRect(-23, -23, 24, 22); g.endFill(); g.moveTo(-11, -22); g.lineTo(-11, -15);
          } else if (kind === 'motor') {
            g.drawRoundedRect(-27, -21, 49, 38, 6); g.endFill();
            g.moveTo(22, -8); g.lineTo(37, -8); g.lineTo(37, 6); g.lineTo(22, 6);
            [-15, -6, 3].forEach(function (fin) { g.moveTo(fin, -14); g.lineTo(fin, 10); });
            g.moveTo(-16, 18); g.lineTo(-20, 28); g.lineTo(18, 28); g.lineTo(14, 18);
            g.moveTo(-11, -22); g.lineTo(-10, -31); g.lineTo(6, -30); g.lineTo(7, -22);
          }
          g.endFill();
        }
        if (kind !== 'old' && kind !== 'new') g.scale.set(compact ? .38 : .46);
        var item = { kind: kind, graphics: g, radius: kind === 'old' || kind === 'new' ? g.width / 2 + 3 : (compact ? 21 : 24) };
        self.splashTools.push(item); return item;
      }
      var targetCount = Math.max(8, Math.min(compact ? 72 : self.width < 900 ? 92 : 136,
        Math.floor((self.width * self.splashHeight - (compact ? 174 : 326) * titleHeight) / (compact ? 5000 : 4600))));
      var tools = self.splashHeight < 300 || targetCount < 24 ? ['old', 'new', 'gear'] : ['old', 'new', 'gear', 'conveyor', 'wrench', 'flywheel', 'motor'];
      if (self.width >= 900 && !compact) tools = tools.concat(['gear', 'old', 'conveyor', 'new']);
      var count = compact ? Math.max(2, Math.min(6, Math.floor(targetCount / 9))) : self.width < 900 ? 12 : 22;
      var symbolCount = Math.max(1, Math.min(PRODUCTION_LINKS.length, targetCount - tools.length - count));
      // Spread the subset across the catalog so tools and contemporary brands both remain.
      for (var index = 0; index < symbolCount; index++) {
        var symbol = PRODUCTION_LINKS[symbolCount === 1 ? 0 : Math.floor(index * (PRODUCTION_LINKS.length - 1) / (symbolCount - 1))];
        var element = self.productionElements[symbol.id]; element.hidden = false;
        self.splashNodes.push({ id: symbol.id, kind: symbol.id, element: element, radius: symbol.href ? 33 : compact ? 18 : 23 });
      }
      var repeatPool = PRODUCTION_LINKS.filter(function (symbol) { return !symbol.href; });
      var repeatCount = Math.max(0, targetCount - symbolCount - tools.length - count);
      for (var repeat = 0; repeat < repeatCount; repeat++) {
        var symbol = repeatPool[repeat % repeatPool.length], id = 'repeat-' + repeat + '-' + symbol.id;
        self.splashNodes.push({ id: id, kind: symbol.id, element: symbolElement(symbol, id), radius: compact ? 18 : 23 });
      }
      tools.forEach(function (kind, index) { var t = tool(kind); t.id = index < 7 ? kind : kind + '-' + index; self.splashNodes.push(t); });
      for (var i = 0; i < count; i++) { var p = person(); p.id = 'person-' + i; self.splashNodes.push(p); }
      var hole = { x: self.width / 2 - (compact ? 87 : 163), y: (self.splashHeight - titleHeight) / 2, width: compact ? 174 : 326, height: titleHeight };
      var seed = 3817;
      function random() { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }
      var placed = [];
      // Best-candidate packing gives even, irregular coverage from frame one.
      // Largest drawings go first; smaller people fill gaps, with no categories
      // assigned to a row, ring or region. These are seeds, never spring anchors.
      self.splashNodes.slice().sort(function (a, b) { return b.radius - a.radius; }).forEach(function (item) {
        var best, bestScore = -Infinity, r = item.radius + 12;
        for (var attempt = 0; attempt < 96; attempt++) {
          var x = r + random() * (self.width - r * 2), y = r + random() * (self.splashHeight - r * 2);
          var closestX = Math.max(hole.x, Math.min(x, hole.x + hole.width)), closestY = Math.max(hole.y, Math.min(y, hole.y + hole.height));
          if (Math.hypot(x - closestX, y - closestY) < r) continue;
          var score = placed.length ? Infinity : random();
          placed.forEach(function (other) { score = Math.min(score, Math.hypot(x - other.x, y - other.y) / (item.radius + other.radius + 10)); });
          if (score > bestScore) { bestScore = score; best = { x: x, y: y }; }
        }
        item.x = best ? best.x : r; item.y = best ? best.y : r;
        item.tilt = (random() - .5) * .65; placed.push(item);
      });
      self.splashNetwork = new ProductionNetwork({ width: self.width, height: self.splashHeight, restLength: compact ? 48 : 72, initialBondRatio: .62, maxBondRatio: .95, wallReach: compact ? 20 : 38, topWallReach: compact ? 10 : 18, titleReach: compact ? 7 : 14, exclusion: hole, seed: 7419, nodes: self.splashNodes.map(function (item) { return { id: item.id, symbolKey: (item.element ? 'svg:' : 'canvas:') + item.kind, x: item.x, y: item.y, radius: item.radius }; }) });
      self.splashEdges = self.splashNetwork.edges;
      self.splashTools.forEach(function (t) { self.splashLayer.addChild(t.graphics); });
      self.splashPeople.forEach(function (p) { self.splashLayer.addChild(p.graphics); });
      self.paintSplash();
    };
    self.paintSplash = function () {
      var network = self.splashNetwork, ink = self.splashInk;
      if (!network) return;
      self.splashNodes.forEach(function (item, index) {
        var n = network.nodes[index]; item.x = n.x; item.y = n.y;
        if (item.element) {
          item.element.style.left = (100 * n.x / self.width) + '%'; item.element.style.top = (100 * n.y / self.splashHeight) + '%';
          item.element.dataset.captionSide = n.y > self.splashHeight - 80 ? 'top' : 'bottom';
          item.element.dataset.captionAlign = n.x < 70 ? 'left' : n.x > self.width - 70 ? 'right' : 'center';
        }
        if (item.graphics) {
          item.graphics.position.set(n.x, n.y);
          if (item.kind === 'person') item.graphics.rotation = item.tilt + Math.sin(self.splashClock * .011 + index) * .12;
          if (item.kind === 'gear') item.graphics.rotation = self.splashClock * .002;
        }
      });
      ink.clear();
      network.edges.forEach(function (edge) {
        if (edge.alpha < .015) return;
        var a = network.nodes[edge.a], b = network.nodes[edge.b], dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
        if (!distance) return;
        // Stop threads short of the drawings and names, like pencil links on
        // paper. Force exists in the model; this curve just visualises the bond.
        var start = Math.min(.4, (a.radius * .82) / distance), end = 1 - Math.min(.4, b.radius * .82 / distance);
        var sx = a.x + dx * start, sy = a.y + dy * start, ex = a.x + dx * end, ey = a.y + dy * end;
        var bend = Math.sin(edge.a * 2 + edge.b) * 5;
        ink.lineStyle(1.15, 0x868681, edge.alpha * .60);
        ink.moveTo(sx, sy); ink.quadraticCurveTo((sx + ex) / 2 - dy / distance * bend, (sy + ey) / 2 + dx / distance * bend, ex, ey);
      });
    };
    self.splashLayer.visible = false;
    self.people = [];
    // Stable identities: four company workers, four owners, father/daughter,
    // then three upstream jobs. A changed layout never changes a person's role.
    for (var i = 0; i < 13; i++) {
      var p = new IteratedPeep({}); p.flip = 1; p.size = 1; p.hat.visible = false; p.graphics.visible = false;
      self.people.push(p); self.app.stage.addChild(p.graphics);
    }
    self.coins = [];
    for (var k = 0; k < 10; k++) { var c = _makeMovieClip('iterated_coin', { scale: 25 / 102 }); c.visible = false; self.coins.push(c); self.app.stage.addChild(c); }
    self.machine = new PIXI.Sprite(machineTextures.old); self.machine.visible = false; self.machine.anchor.set(.5); self.app.stage.addChild(self.machine);
    self.labels = new PIXI.Container(); self.app.stage.addChild(self.labels);
    self.boxes = new PIXI.Container(); self.app.stage.addChild(self.boxes);
    self.bakery = new BakeryScene(bakeryTextures); self.app.stage.addChild(self.bakery.graphics);
    self.expansion=new BakeryExpansionScene(bakeryTextures);self.app.stage.addChild(self.expansion.graphics);
    self.street=new StreetScene(bakeryTextures,self.dom);self.app.stage.addChild(self.street.graphics);
    self.expansion.onChange=function(sample){
      if(!self.expansion.graphics.visible)return;
      var caption=document.getElementById('expansion-caption');if(caption)moneyText(caption,sample.caption);
      var thought=document.getElementById('expansion-thought');if(thought){var line=String(sample.bossLineIndex);if(thought.dataset.line!==line){thought.dataset.line=line;thought.textContent=sample.bossLine;thought.classList.remove('expansion-bubble-enter');if(sample.bossLine&&!self.expansion.reduced){void thought.offsetWidth;thought.classList.add('expansion-bubble-enter');}}thought.hidden=!sample.bossLine;
        if(sample.bossLine){var canvas=self.app.view.getBoundingClientRect(),area=self.dom.getBoundingClientRect(),boss=self.expansion.boss.getBounds(),scale=canvas.width/self.width;
          var headX=canvas.left-area.left+(boss.x+boss.width/2)*scale,headY=canvas.top-area.top+boss.y*scale,bw=thought.offsetWidth,bh=thought.offsetHeight;
          var left=Math.max(4,Math.min(area.width-bw-4,headX-bw/2));thought.style.left=left+'px';thought.style.top=Math.max(0,headY-bh-14)+'px';thought.style.setProperty('--expansion-tail-x',(headX-left-8)+'px');
        }
      }
      var question=document.getElementById('expansion-question');if(question)question.hidden=!sample.question;
      self.dom.style.setProperty('--expansion-blur',(sample.blur*5)+'px');
      var next=document.getElementById('expansion-next');if(next){next.hidden=!sample.question;next.disabled=!sample.question;}
      var play=document.getElementById('expansion-play');if(play){play.hidden=sample.complete;play.textContent=self.expansion.playing?'暂停':'继续播放';}
      ['expansion-step','expansion-skip'].forEach(function(id){var e=document.getElementById(id);if(e)e.hidden=sample.complete;});
      document.body.dataset.expansionCount=String(sample.count);document.body.dataset.expansionPhase=sample.phase;
    };
    self.bakery.onChange = function (sample) {
      if (!self.bakery.graphics.visible || !document.getElementById('bakery-caption')) return;
      var caption = document.getElementById('bakery-caption');
      var upgrade=self.bakery.mode==='upgrade',words=BakeryTimeline.captionFor(sample,upgrade,state.prologue.bakeryCommitted);
      moneyText(caption,words);
      document.body.dataset.bakeryPhase = sample.phase;
      var next = document.getElementById('bakery-next'); if (next) next.disabled = !sample.complete;
      var play = document.getElementById('bakery-play'); if (play) { play.hidden = sample.complete; play.textContent = self.bakery.playing ? '暂停' : '继续播放'; }
      ['bakery-step','bakery-skip'].forEach(function(id){var control=document.getElementById(id);if(control)control.hidden=sample.complete;});
      var choices=document.getElementById('upgrade-choices');if(choices)choices.hidden=!sample.complete||state.prologue.bakeryCommitted;
      var confirm=document.getElementById('upgrade-confirm');if(confirm){confirm.disabled=!sample.complete||sample.reactionActive;confirm.hidden=state.prologue.bakeryCommitted;}
      var complaint=document.getElementById('chef-complaint');if(complaint)complaint.hidden=!sample.complete||state.prologue.bakeryWage>=5||state.prologue.bakeryComplaintIndex===null;
      var bossReply=document.getElementById('boss-reply');if(bossReply)bossReply.hidden=!sample.complete||state.prologue.bakeryBossQuoteIndex===null;
      var dialogue=document.getElementById('bakery-dialogue');if(dialogue)dialogue.hidden=state.prologue.bakeryCommitted||(!complaint||complaint.hidden)&&(!bossReply||bossReply.hidden);
      if(choices){choices.querySelectorAll('button').forEach(function(b){b.disabled=sample.reactionActive;});}
      document.body.dataset.bakeryReaction=sample.reactionKind||'';
      if(upgrade){var wageOutput=document.querySelector('[data-testid="bakery-wage"]'),retainedOutput=document.querySelector('[data-testid="bakery-retained"]');if(wageOutput)moneyText(wageOutput,'厨师 · '+sample.previewWage+'枚');if(retainedOutput)moneyText(retainedOutput,'老板 · '+(15-sample.previewWage)+'枚');}
      var result=document.getElementById('upgrade-result');if(result)result.hidden=!sample.showBalances;
      if(!upgrade&&sample.complete&&!self.bakery.upgradeQueued){self.bakery.upgradeQueued=true;later(function(){if(state.prologue.scene==='bakery'&&self.bakery.sample.complete)send('prologue',{type:'CONTINUE_BAKERY'});else self.bakery.upgradeQueued=false;},1000);}
    };
    self.viewKey = '';
    self.label = function (words, x, y, color, size) {
      // Canvas labels use the same readable auxiliary size as DOM captions,
      // even when the illustration is proportionally scaled on a phone.
      var pixels = size === 'body' ? (window.innerWidth <= 600 ? 18 : 20) : 14;
      var scaled = pixels * self.width / (self.dom.clientWidth || self.width);
      // Text uses graphite; only the dark cabinet needs white for contrast.
      var fill = color === '#ffffff' ? '#ffffff' : '#555555';
      var t = new PIXI.Text(words, { fontFamily: 'WorkshopHand, Microsoft YaHei, sans-serif', fontWeight: '400', fontSize: scaled, fill: fill, align: 'center' });
      t.anchor.set(.5, 0); t.position.set(x, y); self.labels.addChild(t); return t;
    };
    self.person = function (index, x, y, size, hat, flip) {
      var p = self.people[index]; p.size = size; p.flip = flip || 1; p.graphics.visible = true;
      p.graphics.position.set(x, y); p.graphics.scale.set(size * p.flip, size); p.hat.visible = hat !== null;
      if (hat !== null) p.hat.gotoAndStop(hat);
      return p;
    };
    self.arrow = function (x1, y1, x2, y2, color, kind) {
      self.paths.push({ x1: x1, y1: y1, x2: x2, y2: y2, color: color || 0xaaaaaa, kind: kind });
    };
    self.drawLinks = function () {
      var g = self.links; g.clear();
      self.paths.forEach(function (path) {
        var progress = self.linkProgress.value, x = path.x1 + (path.x2 - path.x1) * progress, y = path.y1 + (path.y2 - path.y1) * progress;
        g.lineStyle(path.kind === 'control' ? 4 : 2.5, path.color, .8); g.moveTo(path.x1, path.y1); g.lineTo(x, y);
        if (progress > .98) {
          var angle = Math.atan2(path.y2 - path.y1, path.x2 - path.x1), len = 9;
          g.moveTo(x - len * Math.cos(angle - .5), y - len * Math.sin(angle - .5)); g.lineTo(x, y); g.lineTo(x - len * Math.cos(angle + .5), y - len * Math.sin(angle + .5));
        }
      });
    };
    self.key = function (x, y) { var g = self.lines; g.lineStyle(3, 0xdd4040, 1); g.drawCircle(x, y, 10); g.moveTo(x + 10, y); g.lineTo(x + 35, y); g.lineTo(x + 35, y + 10); g.moveTo(x + 27, y); g.lineTo(x + 27, y + 7); };
    self.product = function (x, y, name) {
      var g = self.lines; g.lineStyle(3, 0x555555, 1);
      if (name === '汽车') { g.moveTo(x - 38, y + 5); g.lineTo(x - 26, y - 17); g.lineTo(x + 20, y - 18); g.lineTo(x + 33, y + 3); g.lineTo(x + 44, y + 3); g.lineTo(x + 44, y + 25); g.lineTo(x - 43, y + 25); g.lineTo(x - 43, y + 5); g.lineTo(x - 38, y + 5); g.drawCircle(x - 25, y + 25, 8); g.drawCircle(x + 26, y + 25, 8); }
      if (name === '手机') { g.drawRoundedRect(x - 19, y - 28, 38, 63, 5); g.moveTo(x - 10, y + 23); g.lineTo(x + 10, y + 23); }
      if (name === '鞋') { g.moveTo(x - 35, y - 16); g.lineTo(x - 10, y - 14); g.lineTo(x + 5, y + 4); g.lineTo(x + 36, y + 12); g.lineTo(x + 36, y + 26); g.lineTo(x - 37, y + 26); g.lineTo(x - 35, y - 16); g.moveTo(x - 35, y + 18); g.lineTo(x + 34, y + 18); }
      if (name === '面包') { g.moveTo(x - 40, y + 26); g.bezierCurveTo(x - 45, y - 28, x + 45, y - 28, x + 40, y + 26); g.lineTo(x - 40, y + 26); for (var i = -1; i <= 1; i++) { g.moveTo(x + i * 18 - 4, y - 7); g.lineTo(x + i * 18 + 4, y + 7); } }
    };
    self.marketBar = function (label, value, maximum, y, hollow) {
      var x = self.width * .24, width = self.width * .6 * value / maximum;
      self.label(label, self.width * .12, y - 8);
      var bar = new PIXI.Graphics(); bar.lineStyle(2, 0x555555);
      if (!hollow) bar.beginFill(0x999999, .42);
      bar.drawRect(0, 0, Math.max(0, width), 18); bar.endFill(); bar.position.set(x, y); self.boxes.addChild(bar);
      if (!reduced.matches) { bar.scale.x = .01; move(bar.scale, { x: 1 }, .65); }
      self.label(number(value), self.width * .92, y - 8);
    };
    self.clearScene = function () {
      self.people.forEach(function (p) { p.kill(); Tween.removeTweens(p.graphics); Tween.removeTweens(p.graphics.position); Tween.removeTweens(p.graphics.scale); p.graphics.visible = false; p.graphics.alpha = 1; p.resetFace(); p.animated.position.set(0, 0); p.animated.rotation = 0; });
      self.coins.forEach(function (c) { Tween.removeTweens(c); c.visible = false; });
      self.lines.clear(); self.links.clear(); self.paths = []; Tween.removeTweens(self.linkProgress); self.labels.removeChildren().forEach(function (t) { t.destroy(); });
      self.boxes.removeChildren().forEach(function (b) { Tween.removeTweens(b); b.destroy(); });
      self.machine.visible = false; Tween.removeTweens(self.machine); self.machine.rotation = 0;
      self.desk.visible = false; self.splashLayer.visible = false; self.productionMap.hidden = true; self.productionHint.hidden = true;
      self.bakery.close();
      self.expansion.close();
      self.street.close();
      if (self.splashNetwork) { self.splashNetwork.setPointer(0, 0, false); self.splashNetwork.nodes.forEach(function (n) { n.pinned = false; }); }
    };
    self.draw = function (s) {
      var previousWidth = self.width;
      var continuingBakery = self.bakery.graphics.visible, bakeryTime = self.bakery.time, bakeryPlaying = self.bakery.playing;
      var continuingExpansion=self.expansion.graphics.visible,expansionTime=self.expansion.time,expansionPlaying=self.expansion.playing;
      var before = self.people.map(function (person) { return person.graphics.visible ? { x: person.graphics.x, y: person.graphics.y } : null; });
      var beforeCoins = self.coins.map(function (coin) { return coin.visible ? { x: coin.x, y: coin.y } : null; });
      self.viewportWidth = window.innerWidth;
      var p = s.prologue, key = s.section === 'machine' ? 'machine' : keyOf(s);
      var desiredWidth = key === 'opening' ? window.innerWidth : ['street','street-economy'].includes(key)?960:window.innerWidth <= 600 ? 640 : 960;
      if (self.width !== desiredWidth || (key === 'opening' && (self.viewKey !== 'opening' || self.splashViewportHeight !== openingViewportHeight()))) {
        self.width = desiredWidth;
        // Keep the already packed opening when returning from another scene.
        if (key === 'opening' && (!self.splashNetwork || self.splashNetwork.width !== self.width || self.splashViewportHeight !== openingViewportHeight())) self.buildSplash();
      }
      var w = self.width, center = w / 2;
      var changed = key !== self.viewKey || (key === 'allocation' && self.firmId !== p.activeFirmId);
      if (changed || !['allocation','bakery','bakery-upgrade','bakery-expansion','street','street-economy'].includes(key)) self.clearScene();
      self.viewKey = key;
      self.firmId = p.activeFirmId;
      var stageHeight = key.indexOf('relief/')===0||['street','street-economy','street-summary','epilogue','assumptions','technology','needs-technology','ownership-technology','market-rules'].includes(key)?1:key === 'opening' ? self.splashHeight :['bakery','bakery-upgrade','bakery-expansion'].includes(key) ? 425 : 340;
      if(key==='street-economy'||key==='street'&&p.streetMode==='sandbox')stageHeight=self.street.heightFor(w,p.street);
      self.dom.dataset.expansion=String(key==='bakery-expansion');
      if(key!=='bakery-expansion')self.dom.style.removeProperty('--expansion-blur');
      if (self.height !== stageHeight || previousWidth !== w) { self.height = stageHeight; self.app.renderer.resize(w, stageHeight); }
      if (key !== 'opening') self.app.view.setAttribute('aria-label', '人物、钱和机器的关系。具体数值和关系说明在下方文字中。');
      if (key === 'opening') {
        self.splashLayer.visible = true; self.productionMap.hidden = false; self.productionHint.hidden = false;
        self.app.view.setAttribute('aria-label', '人、工具与生产的动态网络：人物、新旧机器、齿轮、传送带、电脑、AI及技术品牌混合相连。普通工具可以重复，连线会逐渐断开和重连；带箭头的符号可打开官网。');
        self.syncSplashPins(); self.paintSplash();
      } else if (key === 'bakery'||key==='bakery-upgrade') {
        self.app.view.setAttribute('aria-label', '面包店：厨师在老烤炉旁，戴单片眼镜的老板收到司机的10枚金币，然后给厨师5枚。司机把一车面包拉走。');
        if (changed&&(key!==self.bakery.sceneKey||!continuingBakery)) self.bakery.open(w,reduced.matches,key==='bakery-upgrade'?'upgrade':'old');
        else {self.bakery.time=bakeryTime;self.bakery.playing=bakeryPlaying;self.bakery.graphics.visible=true;self.bakery.resize(w);}
        self.bakery.sceneKey=key;
        if(key==='bakery-upgrade'){self.app.view.setAttribute('aria-label','更大的双层烤炉烤出更多面包，司机支付15枚金币。厨师最低拿3枚，老板不允许厨师拿得比自己多；越界后会退回。');self.bakery.configureUpgrade(p.bakeryWage,p.bakeryCommitted,p.bakeryBoundary,p.bakeryBoundarySerial);}
      } else if(key==='bakery-expansion'){
        self.app.view.setAttribute('aria-label','第一幕的扩张过程：左侧厨师与烤炉从1组倍增到64组，镜头拉远。右侧老板旁的金山增长，最后画面模糊并提出能否持续的问题。');
        if(changed&&!continuingExpansion)self.expansion.open(w,reduced.matches,p.bakeryWage);
        else {self.expansion.time=expansionTime;self.expansion.playing=expansionPlaying;self.expansion.graphics.visible=true;self.expansion.resize(w);}
      } else if(key==='street'||key==='street-economy'){
        if(key==='street-economy'||p.streetMode==='sandbox')self.street.update(p.street,w,reduced.matches);else self.street.close();
      } else if (key === 'allocation') {
        var firm = s.firms.find(function (f) { return f.id === p.activeFirmId; });
        var share = p.allocationPlans[firm.id].laborShare;
        var firmIndex = s.firms.indexOf(firm);
        var worker = self.person(firmIndex, w * .18, 275, 1.2, 12, 1);
        var boss = self.person(4 + firmIndex, w * .82, 275, 1.2, firm.hat === 12 ? 14 : firm.hat, -1);
        self.desk.position.set(center, 171); self.desk.scale.set(w <= 640 ? .4 : .52); self.desk.visible = true;
        if (changed) {
          self.label('工人', w * .18, 58, '#4089dd'); self.label('你 · 老板', w * .82, 58, '#dd4040');
          self.label('备用资金', center, 151, '#ffffff', 'body');
        }
        react(worker, band(share)); react(boss, -band(share));
        var parts = share / 10;
        self.coins.forEach(function (c, i) {
          var target = i < parts ? { x: w * .18 + ((i % 5) - 2) * 29, y: 326 - Math.floor(i / 5) * 28 } : { x: w * .82 + (((i - parts) % 5) - 2) * 29, y: 326 - Math.floor((i - parts) / 5) * 28 };
          if (!c.visible) { c.x = center; c.y = 180; } c.visible = true; move(c, target, .55, i * .018);
        });
      } else if (key.indexOf('market/') === 0) {
        var account = s.market, chosen = s.firms.findIndex(function (f) { return f.id === p.activeFirmId; });
        if (p.marketMode === 'single') {
          var singleWorker = self.person(chosen, w * .16, 217, .8, 12, 1);
          var singleBoss = self.person(4 + chosen, w * .84, 217, .85, s.firms[chosen].hat === 12 ? 14 : s.firms[chosen].hat, -1);
          react(singleWorker, band(p.allocationPlans[p.activeFirmId].laborShare));
          react(singleBoss, account.firm.receiptsMinusWages > 5 ? 2 : -1);
          self.machine.texture = machineTextures.new; self.machine.visible = true;
          self.machine.width = w <= 640 ? 210 : 270; self.machine.height = self.machine.width / 2; self.machine.position.set(center, 100);
          self.label('工人', w * .16, 229); self.label('你 · 老板', w * .84, 229);
          self.label('只有你先换了新机器', center, 181);
          self.arrow(w * .28, 275, w * .73, 275, 0x999999);
          self.label('顾客的钱，来自其他公司，也来自你', center, 295);
        } else {
          s.firms.forEach(function (f, i) {
            var x = w * (.125 + i * .25);
            self.product(x, 29, f.product);
            var worker = self.person(i, x - 29, 184, .43, 12, 1);
            var owner = self.person(4 + i, x + 29, 184, .48, f.hat === 12 ? 14 : f.hat, -1);
            react(worker, p.marketCuts ? -2 : band(p.marketDemoShare === null ? p.allocationPlans[p.activeFirmId].laborShare : p.marketDemoShare));
            react(owner, account.unsold > 0 ? -1 : 1);
            if (i < 3) self.arrow(x + 55, 127, x + w * .25 - 55, 127, 0xaaaaaa);
          });
          self.marketBar('做了', account.output, 60, 234, true);
          self.marketBar('订单', account.demand, 60, 302, false);
        }
      } else if (key === 'network/customers') {
        var selected = s.firms.find(function (f) { return f.id === p.customerFirmId; });
        var customer = self.person(s.firms.indexOf(selected), center, 230, .75, 12, 1); react(customer, band(s.plans[selected.id].laborShare));
        self.label('工人', center, 239, '#4089dd');
        var points = [[w * .14, 64], [w * .86, 64], [w * .14, 240], [w * .86, 240]];
        s.firms.forEach(function (f, i) { var pt = points[i]; self.product(pt[0], pt[1], f.product); self.label(f.product, pt[0], pt[1] + 44, '#666'); self.arrow(center + (pt[0] < center ? -50 : 50), 168, pt[0] + (pt[0] < center ? 56 : -56), pt[1] + 10, 0xaaaaaa); });
        self.coins.forEach(function (coin, i) {
          if (i >= s.plans[selected.id].laborShare / 10) return;
          var from = beforeCoins[i], target = { x: center + (i % 5 - 2) * 27, y: 305 - Math.floor(i / 5) * 26 };
          coin.visible = true; coin.position.set(from ? from.x * w / previousWidth : center, from ? from.y : 260); move(coin, target, .4, i * .02);
        });
      } else if (key.indexOf('network/') === 0 || key === 'concept') {
        var currentFirm = s.firms.find(function (f) { return f.id === p.activeFirmId; }), currentIndex = s.firms.indexOf(currentFirm);
        var jobPositions = [w * .12, w * .36, w * .64, w * .88], jobs = ['原料', '零件', '加工', '运输'];
        var jobIds = [10, 11, currentIndex, 12], paused = key === 'network/cooperation' && p.workPaused;
        self.machine.texture = machineTextures.new; self.machine.visible = true; self.machine.width = w <= 640 ? 195 : 260; self.machine.height = self.machine.width / 2; self.machine.position.set(center, 141);
        jobIds.forEach(function (id, i) {
          var person = self.person(id, jobPositions[i], 265, .62, 12, i > 1 ? -1 : 1);
          self.label(jobs[i], jobPositions[i], 280, '#555');
          if (paused && i === 1) { person.graphics.alpha = .25; }
          else self.arrow(jobPositions[i], 186, center + (i < 2 ? -55 : 55), 166, 0x888888);
        });
        if (paused) self.label('还没做完', center, 34, '#555');
        else self.product(center, 28, currentFirm.product);
        if (key !== 'network/cooperation') {
          self.person(4 + currentIndex, w * .88, 107, .48, currentFirm.hat === 12 ? 14 : currentFirm.hat, -1);
          self.label('老板', w * .88, 117, '#555'); self.key(w * .77, 140);
          if (key === 'network/control') self.arrow(w * .77, 157, center + 50, 132, 0x555555, 'control');
          else if (key === 'network/payment') self.label(p.allocationPlans[currentFirm.id].laborShare + '%给工人', center, 217, '#555');
          else self.arrow(w * .77, 140, center + 65, 126, 0x555555);
        }
      } else if (key === 'ending') {
        var father = self.person(8, center - 95, 271, .9, null, 1);
        var daughter = self.person(9, center + 22, 271, .59, null, -1);
        react(father, -1); react(daughter, -1);
        self.label('面包师父', center - 95, 286, '#888', 19); self.label('女儿', center + 22, 286, '#888', 19);
        [[-23,0],[4,-18],[23,6],[-4,18]].forEach(function(offset){var bread=new PIXI.Sprite(bakeryTextures.bread);bread.anchor.set(.5);bread.width=46;bread.height=29;bread.position.set(center+170+offset[0],232+offset[1]);self.labels.addChild(bread);});
        self.app.view.setAttribute('aria-label','失业的面包师父和女儿，旁边还有卖不掉的面包。');
        if (!reduced.matches) { [father, daughter].forEach(function (person) { Tween_get(person.animated).to({ x: -2 }, 5).to({ x: 2 }, 5).to({ x: -2 }, 5).to({ x: 0 }, 5); }); }
      } else if (key === 'routes') {
        self.person(0, w * .3, 247, 1, 13, 1);
        self.person(4, w * .7, 247, 1, 14, -1);
      } else if (key === 'machine') {
        var account = s.account, newMachine = account.technology;
        var wp = self.person(0, w * .13, 230, .74, 13, 1);
        self.person(1, w * .27, 230, .74, 12, 1);
        var owner = self.person(4, w * .85, 230, .88, 14, -1);
        if (s.machine.phase === 'compare' && s.machine.contract !== 'unchanged') react(wp, 1);
        if (newMachine) react(owner, 1);
        self.label(s.entrance === 'individual' ? '你和同事' : '工人', w * .2, 242, '#4089dd');
        self.label(s.entrance === 'enterprise' ? '你 · 老板' : '老板', w * .85, 242, '#dd4040');
        self.machine.texture = newMachine ? machineTextures.new : machineTextures.old;
        self.machine.visible = true; self.machine.width = w <= 640 ? 195 : 280; self.machine.height = self.machine.width / 2; self.machine.position.set(center + 15, 180);
        self.label(newMachine ? '新机器' : '旧机器', center + 15, 242, '#777', 20);
        for (var b = 0; b < account.produced; b++) {
          var box = new PIXI.Graphics(); box.lineStyle(2.5, 0x555555); box.beginFill(0xffffff); box.drawRect(-10, -10, 20, 20); box.endFill(); box.moveTo(0, -10); box.lineTo(0, -3);
          box.position.set(center + (b % 8 - 3.5) * 29, 301 + Math.floor(b / 8) * 28); self.boxes.addChild(box);
          if (s.machine.phase === 'result' && b >= 8 && changedMachineResult) { var tx = box.x, ty = box.y; box.position.set(center + 50, 170); box.alpha = 0; if (reduced.matches) { box.position.set(tx, ty); box.alpha = 1; } else Tween_get(box).wait(_s(.3 + (b - 8) * .065)).to({ x: tx, y: ty, alpha: 1 }, _s(.35), Ease.quadOut); }
        }
        if (s.machine.phase === 'result' && changedMachineResult && !reduced.matches) Tween_get(self.machine).to({ rotation: -.016 }, 5).to({ rotation: .016 }, 5).to({ rotation: -.016 }, 5).to({ rotation: 0 }, 5);
      }
      if (changed && key !== 'allocation' && !reduced.matches) {
        self.people.forEach(function (person, index) {
          if (!person.graphics.visible) return;
          var from = before[index], target = { x: person.graphics.x, y: person.graphics.y };
          if (from) { person.graphics.position.set(from.x * w / previousWidth, from.y); move(person.graphics.position, target, .45); }
          else { var alpha = person.graphics.alpha; person.graphics.alpha = 0; move(person.graphics, { alpha: alpha }, .4); }
        });
        self.linkProgress.value = 0; move(self.linkProgress, { value: 1 }, .45, .08);
      } else self.linkProgress.value = 1;
      self.drawLinks(); self.app.renderer.render(self.app.stage);
    };
    self.app.ticker.add(function (delta) {
      Tween.tick();
      self.bakery.tick(delta);
      self.expansion.tick(delta);
      self.street.tick(delta);
      self.drawLinks();
      if (!reduced.matches) {
        self.people.forEach(function (p) { if (p.graphics.visible) p.update(delta); });
        if (self.splashLayer.visible && !transitioning) {
          self.splashClock += delta;
          // Decoration must not run catch-up steps ahead of input on a slow frame.
          self.syncSplashPins(); self.splashNetwork.step(Math.min(delta / 60, 1 / 120));
          self.paintSplash();
        }
      }
    });
    self.add = function () { _add(self); };
    self.remove = function () { self.clearScene(); self.productionHint.remove(); self.app.destroy(true, { children: true, texture: false, baseTexture: false }); _remove(self); };
  };
  var machineTextures = {}, bakeryTextures = {}, changedMachineResult = false;
  var ids = ['opening','bakery','bakery-upgrade','bakery-expansion','street','street-economy','street-summary','allocation','market/single','market/all','network/customers','network/cooperation','network/ownership','network/control','network/payment','concept','ending','relief/menu','relief/consumption','relief/investment','relief/exports','epilogue','assumptions','technology','needs-technology','ownership-technology','market-rules','routes','machine/quote','machine/predict','machine/ready','machine/result','machine/compare'];
  function drawCurrent() { updateUI(); stage.draw(state); }
  function bootSlides() {
    var slides = ids.map(function (id) { return { id: id, onstart: function (self) {
      if (!self.objects.stage) {
        self.add({ id: 'heading', type: 'TextBox', text: '饥馑的盛宴' }); self.objects.heading.dom.id = 'heading'; self.objects.heading.dom.setAttribute('role', 'heading'); self.objects.heading.dom.setAttribute('aria-level', '1'); self.objects.heading.dom.tabIndex = -1;
        self.add({ id: 'situation', type: 'TextBox', text: '' }); self.objects.situation.dom.id = 'situation';
        self.add({ id: 'stage', type: 'TrustStage' }); stage = self.objects.stage; window.__trustStage = stage;
      }
      drawCurrent();
    } }; });
    slideshow = new Slideshow({ dom: headings, slides: slides }); window.slideshow = slideshow;
    // Parent state remains authoritative. Forward steps use the actual original lifecycle.
    // Backtracking can change the index without resetting this long-lived stage.
  }
  function setTitle(words, situation) { slideshow.objects.heading.setText(words); slideshow.objects.situation.setText(situation || ''); }
  function fitMainHeight() {
    var chapterHeight=document.querySelector('.chapter-navigation').offsetHeight;
    var minimum=document.body.dataset.scene==='opening'?0:496;
    document.documentElement.style.setProperty('--screen-main-height',Math.max(minimum,openingViewportHeight()-footerNavigationHeight()-chapterHeight)+'px');
  }
  function updateUI() {
    var s = state, p = s.prologue;
    if(s.section!=='prologue'||p.scene!=='street'||p.streetMode==='sandbox')closeBattleAct();
    GestureBoard.cancel();
    if(window.clearPreservationGeometry)window.clearPreservationGeometry();
    cancelPrologueEnding();
    if(window.closeReliefReading)window.closeReliefReading();
    // Parent viewport is stable; using the iframe's own height would create a
    // resize feedback loop. Taller scenes and expanded notes may scroll naturally.
    document.body.dataset.scene = s.section === 'machine' ? 'machine' : p.scene;
    document.body.dataset.streetMode=p.streetMode||'battle';
    document.body.dataset.streetReview=String(p.scene==='street-economy'&&['social','private','overproduction','limits'].includes(p.street.phase));
    document.body.dataset.firm = p.activeFirmId; document.body.dataset.machinePhase = s.machine.phase;
    document.body.dataset.role = s.entrance === 'individual' ? 'worker' : 'producer';
    document.body.dataset.relation = p.relationFocus;
    document.body.dataset.marketMode = p.marketMode; document.body.dataset.marketCuts = p.marketCuts;
    document.body.dataset.reliefRoute = p.reliefRoute || 'menu';
    if(stage.street.closeBriefing)stage.street.closeBriefing();
    controls.innerHTML = ''; readout.innerHTML = ''; notes.innerHTML = '';
    var previousDialogue=document.getElementById('bakery-dialogue');if(previousDialogue)previousDialogue.remove();
    ['expansion-question','expansion-thought'].forEach(function(id){var previous=document.getElementById(id);if(previous)previous.remove();});
    if (keyOf(s) !== lastKey) document.getElementById('notes').open = false;
    document.getElementById('notes').hidden = ['opening','bakery'].includes(keyOf(s));
    var currentChapter=STORY_CHAPTERS.find(function(chapter){return chapter.id===(s.section==='machine'?'machine':p.scene==='technology'?'automation':p.scene==='needs-technology'?'needs':p.scene==='ownership-technology'?'ownership':p.scene==='market-rules'?'rules':s.section);})||STORY_CHAPTERS[0];
    document.getElementById('notes').style.display = currentChapter.id === 'prologue' ? 'none' : '';
    document.getElementById('chapter').textContent=currentChapter.title;
    document.querySelectorAll('#chapter-list button').forEach(function(choice){
      choice.disabled=false;choice.title='';
      if(choice.dataset.chapter===currentChapter.id)choice.setAttribute('aria-current','page');else choice.removeAttribute('aria-current');
    });
    var navScene=['bakery-upgrade','bakery-expansion'].includes(p.scene)?'bakery':['ending','street-summary','concept','network','market'].includes(p.scene)?'street-economy':p.scene==='routes'?'relief':['technology','needs-technology','ownership-technology','market-rules'].includes(p.scene)?'assumptions':p.scene;
    var step=s.section==='machine'?STORY_STAGES.length-1:STORY_STAGES.findIndex(function(act){return act.scene===navScene;});
    var dots = document.getElementById('dots'); dots.innerHTML = '';
    function navigate(target) { post('action', { channel: 'host', action: { type: 'NAVIGATE_STAGE', stage: target } }); }
    STORY_STAGES.forEach(function (chapter, i) {
      var dot = node('button', '', i === step ? 'current' : '');
      dot.type = 'button'; dot.dataset.stage = i;
      dot.title = i === 0 ? '返回首页' : chapter.label;
      dot.setAttribute('aria-label', i === 0 ? '返回首页' : '转到' + chapter.label);
      dot.onclick = function () { navigate(i); };
      var locked=chapter.scene==='epilogue'&&!s.reliefEndingAccessible||chapter.scene==='assumptions'&&!p.chapterBrowsing&&(!s.reliefEndingAccessible||p.epilogueBeat!==3);
      dot.disabled=locked;if(locked)dot.title=chapter.scene==='epilogue'?'在药方页选择继续故事':'先看完序章尾声';
      if (i === step) dot.setAttribute('aria-current', 'step');
      dots.appendChild(dot);
    });
    var previousStage = document.getElementById('previous-stage'), nextStage = document.getElementById('next-stage');
    previousStage.disabled = step === 0; nextStage.disabled = step === STORY_STAGES.length - 1||step===4&&!s.reliefEndingAccessible||step===5&&p.epilogueBeat!==3;
    previousStage.onclick = function () { if(['technology','needs-technology','ownership-technology','market-rules'].includes(p.scene))send('prologue',{type:'BACK_ASSUMPTIONS'});else navigate(step - 1); };
    nextStage.onclick = function () { navigate(step + 1); };
    fitMainHeight();
    if (s.section === 'machine') { machineUI(); return; }
    if(p.scene==='relief'){document.getElementById('notes').hidden=true;renderReliefExperiment({state:s,reduced:reduced.matches,readout:readout,controls:controls,title:setTitle,send:function(a){send('prologue',a);}});return;}
    if(p.scene==='epilogue'){document.getElementById('notes').hidden=false;renderPrologueEnding({state:s,readout:readout,controls:controls,notes:notes,title:setTitle,reduced:reduced.matches,send:function(a){send('prologue',a);}});return;}
    if(p.scene==='assumptions'){document.getElementById('notes').hidden=true;renderPrologueAssumptions({state:s,readout:readout,title:setTitle,send:function(a){send('prologue',a);}});return;}
    if(p.scene==='technology'){document.getElementById('notes').hidden=true;var branchContext={state:s,readout:readout,controls:controls,title:setTitle,send:function(a){send('prologue',a);}};renderTechnologyExperiment(branchContext);renderBranchReview(branchContext,p.technology);return;}
    if(p.scene==='needs-technology'){document.getElementById('notes').hidden=true;var branchContext={state:s,readout:readout,controls:controls,title:setTitle,send:function(a){send('prologue',a);}};renderNeedsExperiment(branchContext);renderBranchReview(branchContext,p.needsTechnology);return;}
    if(p.scene==='ownership-technology'){document.getElementById('notes').hidden=true;var branchContext={state:s,readout:readout,controls:controls,title:setTitle,send:function(a){send('prologue',a);}};renderOwnershipExperiment(branchContext);renderBranchReview(branchContext,p.ownershipTechnology);return;}
    if(p.scene==='market-rules'){document.getElementById('notes').hidden=true;var branchContext={state:s,readout:readout,controls:controls,title:setTitle,send:function(a){send('prologue',a);}};renderMarketRules(branchContext);renderBranchReview(branchContext,p.marketRules);return;}
    if(p.scene==='street-economy'){
      document.getElementById('notes').hidden=true;
      renderStreetUI({game:p.street,economyAct:true,evidence:s.streetContradiction,scene:stage.street,controls:controls,readout:readout,notes:document.getElementById('notes'),notesContent:notes,title:function(){var review=['social','private','overproduction','limits'].includes(p.street.phase);setTitle(review?'第三幕·全街的结果':'第三幕·各家的算盘',review?'':p.street.world.round?'本店省下的钱，会怎样改变别家的销路？':'六家厂商各自作主，生产和生意却连在一起。先开一天。');},send:function(a){send('prologue',{type:'STREET',action:a});},ending:function(words){return action(words,'FINISH_STREET_ECONOMY');}});
      return;
    }
    if(p.scene==='street-summary'){document.getElementById('notes').hidden=true;renderStreetSummary({readout:readout,controls:controls,title:setTitle,send:function(a){send('prologue',a);}});return;}
    if(p.scene==='street'){
      document.getElementById('notes').hidden=true;
      if(p.streetMode==='sandbox'){
        renderStreetUI({game:p.street,scene:stage.street,controls:controls,readout:readout,notes:document.getElementById('notes'),notesContent:notes,title:function(){setTitle('第二幕·把镜头拉远','六家店，新的独立账本。点店看账，点人看钱。');},send:function(a){send('prologue',{type:'STREET',action:a});},ending:function(words){return action(words,'FINISH_BATTLE');}});
        action('回到两店对战 ↩','BACK_BATTLE');action('继续看故事 →','FINISH_BATTLE');return;
      }
      setTitle('第二幕·面包店对决','');
      renderBattleAct({snapshot:p.battle,height:height,send:function(a){post('action',{channel:'prologue',action:a});}});return;
    }
    if (p.scene === 'opening') {
      setTitle('饥馑的<br><strong>盛宴</strong>');
      action('开始 →', 'START');
      notes.appendChild(node('p', '一个关于机器、钱与人的可玩故事。'));
      notes.appendChild(node('p', '开场是“人、工具与生产”的图景。人物、机器、芯片、服务器、机械臂、卫星、电池等共同组成网络，普通工具可以重复。Codex、DeepSeek、宇树、小米、Tesla、DJI沿用本作示意图；新增GitHub、Python、Git、Rust的有来源标志，出处与许可见页底。名称只在悬停或选中时出现，标志不表示合作、赞助或背书，国内外品牌并列不代表国家制度相同。'));
      notes.appendChild(node('p', '这些元素在同一张网络里运动：彼此排斥，连接后又相互牵引。以X为自然间距，未连接的元素在1.5X—3X间可成键，已连接的元素在0—2X间可断键。重叠区间由当前连接状态和冷却时间区分，连线逐渐显现或淡去。这是开场的视觉规则，不是真实经济关系或企业合作关系。悬停或键盘选中链接时，节点暂时停住；减少动态模式保留静态网络。'));
      notes.appendChild(node('p', '点击带箭头的名称或图形，在新标签页打开对应官网，当前进度保留。官网需要联网；图标均内嵌，不会自动打开外站或提交选择。AI只在这里预告，历史故事仍从工厂开始。'));
      notes.appendChild(node('p', '情节改编自遨游之舟：你是老板，你的工人也是别人家的顾客。先做一家公司的决定，再把镜头拉远，最后试试消费、投资、出口三条路。数字是有条件的教学设定，不是历史统计或完整经济预测。'));
      action('直接选角色 →', 'SKIP_PROLOGUE', null, 'secondary', notes);
    } else if (p.scene === 'bakery') {
      setTitle('第一幕·更大的烤炉');
      var caption=node('p', '', 'bakery-caption');caption.id='bakery-caption';readout.appendChild(caption);
      var playback=row('bakery-transport');
      if (reduced.matches) {var stepButton=button('下一步 →',function(){var t=stage.bakery.time;var next=BakeryTimeline.captions.find(function(c){return c.at>t+.01;});stage.bakery.seek(next?next.at:BakeryTimeline.duration);},'secondary',playback);stepButton.id='bakery-step';}
      else {var play=button('暂停',function(){stage.bakery.playing=!stage.bakery.playing;stage.bakery.render();},'secondary',playback);play.id='bakery-play';}
      button('重播 ↺',function(){stage.bakery.restart(reduced.matches);},'secondary',playback);
      var skip=button('看完这一幕',function(){stage.bakery.seek(BakeryTimeline.duration);},'secondary',playback);skip.id='bakery-skip';
    } else if(p.scene==='bakery-upgrade') {
      setTitle('第一幕·更大的烤炉');
      var caption=node('p','','bakery-caption');caption.id='bakery-caption';readout.appendChild(caption);
      var dialogue=node('div','','bakery-dialogue');dialogue.id='bakery-dialogue';dialogue.hidden=true;dialogue.setAttribute('aria-live','polite');stage.dom.appendChild(dialogue);
      var complaint=node('p',p.bakeryComplaintIndex===null?'':('厨师：“'+s.bakeryComplaints[p.bakeryComplaintIndex]+'”'),'speech-bubble chef-complaint');complaint.id='chef-complaint';complaint.hidden=true;dialogue.appendChild(complaint);
      var bossPool=p.bakeryBoundary==='low'?s.bakeryBossDeflections:s.bakeryBossRefusals;
      var bossReply=node('p',p.bakeryBossQuoteIndex===null?'':('老板：“'+bossPool[p.bakeryBossQuoteIndex]+'”'),'speech-bubble boss-reply');bossReply.id='boss-reply';bossReply.hidden=true;dialogue.appendChild(bossReply);
      function chooseWage(wage){
        if(stage.bakery.sample.reactionActive)return;
        var extra={wage:wage,complaintIndex:null};
        if(wage<5&&Math.random()<(wage<3?s.bakeryReactionProbability.heated:s.bakeryReactionProbability.ordinary)){var pool=s.bakeryComplaints.length;var index=Math.floor(Math.random()*pool);if(index===p.bakeryComplaintIndex)index=(index+1)%pool;extra.complaintIndex=index;}
        if(wage<3||wage>7){var pool=wage<3?s.bakeryBossDeflections:s.bakeryBossRefusals;extra.bossQuoteIndex=Math.floor(Math.random()*pool.length);}
        send('prologue',Object.assign({type:'SET_BAKERY_WAGE'},extra));
      }
      var choices=row('upgrade-choices');choices.id='upgrade-choices';choices.hidden=true;
      var split=node('div','','row bakery-split');choices.appendChild(split);
      var adjust=node('div','','split-control');split.appendChild(adjust);
      var less=button('−',function(){chooseWage(p.bakeryWage-1);},'step',adjust);less.setAttribute('aria-label','给厨师减少1枚');
      var wage=node('output','厨师 · '+p.bakeryWage+'枚');wage.dataset.testid='bakery-wage';wage.setAttribute('aria-label','分给厨师的金币');adjust.appendChild(wage);
      var more=button('+',function(){chooseWage(p.bakeryWage+1);},'step',adjust);more.setAttribute('aria-label','给厨师增加1枚');
      var retained=node('output','老板 · '+(15-p.bakeryWage)+'枚');retained.dataset.testid='bakery-retained';split.appendChild(retained);
      var confirm=action('就这样分 →','CONFIRM_BAKERY_WAGE');confirm.id='upgrade-confirm';confirm.disabled=true;confirm.hidden=p.bakeryCommitted;
      var result=row('upgrade-result');result.id='upgrade-result';result.hidden=true;
      action('重新分配 ↺','RETRY_BAKERY_WAGE',null,'secondary',result);
      action('若是再买些烤炉呢 →','OPEN_BAKERY_EXPANSION',null,'primary',result);
      var playback=row('bakery-transport');
      if(reduced.matches){var stepButton=button('下一步 →',function(){var t=stage.bakery.time;var next=BakeryTimeline.upgradeCaptions.find(function(c){return c.at>t+.01;});stage.bakery.seek(next?next.at:BakeryTimeline.upgradeDuration);},'secondary',playback);stepButton.id='bakery-step';}
      else {var play=button('暂停',function(){stage.bakery.playing=!stage.bakery.playing;stage.bakery.render();},'secondary',playback);play.id='bakery-play';}
      button('重播 ↺',function(){stage.bakery.restart(reduced.matches);},'secondary',playback);
      var skip=button('看完这一幕',function(){stage.bakery.seek(stage.bakery.duration());},'secondary',playback);skip.id='bakery-skip';
      notes.appendChild(node('p','原来卖了10枚，厨师拿5枚；现在这车卖了15枚，你来决定分多少。多卖的钱不是自动加薪，也不是净利润。这里暂不核算烤炉、电费、面粉和房租，台词是人物的情绪，不是成本核算。'));
      notes.appendChild(node('p','这一幕最终可分3—7枚。上下限和人物反应都是剧情设定。第二幕重新开账，不把这15枚当作同一笔资金。'));
      if(p.bakeryPreviousWage!==null)notes.appendChild(node('p','旧存档的'+p.bakeryPreviousWage+'枚选择已保留为历史记录。本幕规则更新后请在3—7枚内重新确认。'));
    } else if(p.scene==='bakery-expansion'){
      setTitle('第一幕·更大的烤炉');
      var thought=node('p','','speech-bubble expansion-thought');thought.id='expansion-thought';thought.setAttribute('aria-label','老板的心声');stage.dom.appendChild(thought);
      var question=node('div','','expansion-question');question.id='expansion-question';question.hidden=true;question.setAttribute('role','dialog');question.setAttribute('aria-modal','false');question.setAttribute('aria-label','但是，这个过程可以一直持续下去吗？');question.appendChild(node('p','但是，这个过程可以一直持续下去吗？'));stage.dom.appendChild(question);
      var caption=node('p','','bakery-caption');caption.id='expansion-caption';readout.appendChild(caption);
      var next=action('继续看看 →','EXPANSION_CONTINUE');next.id='expansion-next';next.hidden=true;
      var playback=row('bakery-transport');
      if(reduced.matches){var stepButton=button('下一步 →',function(){var t=stage.expansion.time,next=BakeryExpansionTimeline.checkpoints.find(function(c){return c>t+.01;});stage.expansion.seek(next===undefined?BakeryExpansionTimeline.duration:next);},'secondary',playback);stepButton.id='expansion-step';}
      else {var play=button('暂停',function(){stage.expansion.playing=!stage.expansion.playing;stage.expansion.render();},'secondary',playback);play.id='expansion-play';}
      button('重播 ↺',function(){stage.expansion.restart();},'secondary',playback);
      var skip=button('看完这一段',function(){stage.expansion.seek(BakeryExpansionTimeline.duration);},'secondary',playback);skip.id='expansion-skip';
      notes.appendChild(node('p','这是老板的扩张设想，先假定面包一直卖得出去、价格和每位厨师工资不变。左侧的烤炉与厨师从1组到2、4、8、16、32、64组，右侧是老板和留下的钱。'));
      notes.appendChild(node('p','金山表示公司留下的现金，不是老板个人净财富。第二幕进入两家面包店的竞争：重新开账，不继承这段设想中的金山、人手和炉子；第一幕的分配选择仍保存在记录里。'));
    } else if (p.scene === 'allocation') {
      var firm = s.firms.find(function (f) { return f.id === p.activeFirmId; }), plan = p.allocationPlans[firm.id];
      setTitle('先定工资，再看卖得怎样。', '你们的产品上个季度销量不错。');
      textLine('新机器已装好。这10份备用钱，拿多少发工资？', 'small');
      var rr = row('shares-row'), adjust = node('div', '', 'split-control'); rr.appendChild(adjust);
      var less = action('−', 'ADJUST_SHARE', { delta: -10 }, 'step', adjust); less.setAttribute('aria-label', '工资减少1份'); less.disabled = plan.laborShare === 0;
      var output = node('output'); output.setAttribute('aria-label', '本期工资'); output.innerHTML = '<strong data-testid="labor-share">' + plan.laborShare / 10 + '份</strong>'; adjust.appendChild(output);
      var more = action('+', 'ADJUST_SHARE', { delta: 10 }, 'step', adjust); more.setAttribute('aria-label', '工资增加1份'); more.disabled = plan.laborShare === 100;
      var retained = node('output', '', 'retained-share'); retained.setAttribute('aria-label', '留在公司的备用钱'); retained.innerHTML = '<strong data-testid="retained-share">' + plan.retainedShare / 10 + '份</strong>'; rr.appendChild(retained);
      action('先看我这家 →', 'SHOW_MARKET');
      notes.appendChild(node('p', '你现在经营' + firm.name + '。每枚钱是一份工资预算，未发部分仍是公司备用钱，不是老板个人消费。新机器已在此前购入，其他消费与设备订单有另外的预备资金；这10份不是全部营业收入，也不包含所有成本。表情只反映眼前所得或保留资金，不代表善恶或实际利润。'));
      notes.appendChild(node('p', '想换家公司试试？这是可选对照，不必完成。各家的选择分别保存。'));
      var firms = node('div', '', 'row company-row'); notes.appendChild(firms);
      s.firms.forEach(function (f) { var b = action(f.id + ' · ' + f.name, 'SELECT_FIRM', { firmId: f.id }, 'firm', firms); b.setAttribute('aria-pressed', f.id === firm.id ? 'true' : 'false'); });
    } else if (p.scene === 'market') {
      var a = s.market, wage = p.marketDemoShare === null ? p.allocationPlans[p.activeFirmId].laborShare : p.marketDemoShare;
      var smithCopy = node('p', '斯密视角（概括）：');
      smithCopy.appendChild(node('strong', '劳动分工提高生产效率，市场竞争推动改进，自由贸易扩大交换范围'));
      notes.appendChild(smithCopy);
      if (p.marketMode === 'single') {
        setTitle('只看我这家，好像行得通？', '别家公司先不变。你的机器多做了，工资按你定的发。');
        var comparison = node('table', '', 'market-comparison');
        comparison.innerHTML = '<thead><tr><th></th><th>原来</th><th>现在</th></tr></thead><tbody>' +
          [['卖出收款', 10, a.firm.sales], ['付工资', 5, a.firm.wages], ['收款扣工资', 5, a.firm.receiptsMinusWages]].map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td><td>' + number(r[2]) + '</td></tr>'; }).join('') + '</tbody>';
        readout.appendChild(comparison);
        textLine('还没扣其他成本，不是净利润。', 'small');
        action('其他老板也这样做呢？ →', 'OTHER_FIRMS_COPY');
        action('回去调工资', 'BACK_TO_ALLOCATION', null, 'secondary', notes);
      } else {
        setTitle(p.marketCuts ? '少开工，也少了顾客的钱。' : a.unsold > 0 ? '大家都多做，谁来多买？' : '这一次，真的卖完了。');
        metrics([['工人消费', a.workerDemand], ['老板消费', a.ownerDemand], ['设备订单', a.investmentDemand]]);
        textLine(p.marketCuts ? '本期又剩' + number(a.unsold) + '份。累计积压' + number(a.inventory) + '份。' : a.unsold > 0 ? '订单一共' + number(a.demand) + '份，剩下' + number(a.unsold) + '份。' : '购买力跟上了。不是换机器就一定卖不掉。');
        if (!p.marketCuts && s.marketSingle) textLine('你的收款扣工资：' + number(s.marketSingle.firm.receiptsMinusWages) + ' → ' + number(a.firm.receiptsMinusWages) + '。别人的决定，也改变了你的结果。', 'small');
        if (p.marketDemoShare !== null) textLine('对照实验：每家原定工资' + wage / 10 + '份；没有改掉你的选择。', 'small');
        if (p.marketCuts) textLine('这是第' + p.marketCuts + '轮缩减：产量少一成，工资总额少两成。', 'small');
        if (a.unsold > 0 && p.marketCuts < 2) action(p.marketCuts ? '再少开工一次 →' : '各家都少开工 →', 'MARKET_CUT');
        else action('为什么会互相影响？ →', 'MARKET_CONTINUE');
        var variants = row('experiment-row');
        [[20, '每家只发2份'], [80, '每家发8份']].forEach(function (v) { var b = action(v[1], 'MARKET_TRY', { laborShare: v[0] }, 'secondary', variants); b.setAttribute('aria-pressed', p.marketDemoShare === v[0] ? 'true' : 'false'); });
        if (p.marketDemoShare !== null || p.marketCuts) action('还原我的方案', 'MARKET_RESTORE', null, 'secondary', notes);
        if (a.unsold > 0 && p.marketCuts < 2) action('先往下看 →', 'MARKET_CONTINUE', null, 'secondary', notes);
        notes.appendChild(node('p', '四家从同一基准采用你的工资方案与新机器。它们不是依次要求你再玩四遍。各家默认工资5份时：最终产品50份，工人消费20＋老板消费5＋计划设备投资15＝购买订单40，新增积压10。投资订单已包括在总需求中，不会漏掉利润形成的购买力。'));
        notes.appendChild(node('p', '缩减是可选政策实验，不是自动失业预测。每轮产量减10%、工资总额减20%，别的订单先不变；本期新增积压可能变小，累计库存仍会增加。这里忽略库存再售、损耗、价格调整和新企业进入，仅演示收入—订单—缩减的反馈。'));
      }
      notes.appendChild(node('p', '统一按不变价格的金额单位记数，不是把一辆车、一部手机和一块面包当成等价实物。行业图标代表许多企业；商品篮子包含消费品和资本品，并假定订单品类匹配。工资预先支付、工人将其全部消费；老板消费5和计划投资15暂固定，订单按供货占比分配。市场份额算法是教学设定，不是市场定律。'));
      notes.appendChild(node('p', '这里只算在给定假设下的购买订单、当期销售和积压，不是完整国民经济核算或剩余价值核算。初始旧设备场景是40份产品、40份订单，全部售出。技术提高供给并不必然减少就业，危机也不能只用低工资解释。'));
    } else if (p.scene === 'network') {
      if (p.relationFocus === 'customers') {
        var f = s.firms.find(function (f) { return f.id === p.customerFirmId; });
        setTitle('工人，也是别人家的顾客。');
        var budget = s.plans[f.id].laborShare;
        textLine((p.demoActive ? '换个分法：' : '按你的分法：') + '这一笔，工人拿到' + budget + '%。');
        textLine('只比这一笔，别的钱和价格先不变。', 'small');
        var experiment = row('experiment-row');
        [[20, '少分一些'], [80, '多分一些']].forEach(function (variant) {
          var b = action(variant[1], 'SHOW_DEMO', { laborShare: variant[0] }, 'secondary', experiment);
          b.setAttribute('aria-pressed', p.demoActive && p.demoLaborShare === variant[0] ? 'true' : 'false');
        });
        if (p.demoActive) action('还原分法', 'LEAVE_DEMO', null, 'secondary', experiment);
        notes.appendChild(node('p', f.id + '公司的工人，这一笔分到了' + s.plans[f.id].laborShare + '%。其他收入和价格不变时，分得的变化才可用来比较购买能力。'));
        var fr = node('div', '', 'row company-row'); notes.appendChild(fr); s.firms.forEach(function (f) { var b = action(f.id + '公司的工人', 'SELECT_CUSTOMER', { firmId: f.id }, 'firm', fr); b.setAttribute('aria-label', '看看' + f.id + f.name + '的工人'); b.setAttribute('aria-pressed', f.id === p.customerFirmId ? 'true' : 'false'); });
        action('再看怎么生产 →', 'SHOW_RELATION', { relation: 'cooperation' });
        notes.appendChild(node('p', '灰色箭头是可能的购买去向，不表示已成交。20%的例子是独立对照，不覆盖你的分法；百分比也不是实际收入或销量。需求不足是一种压力，不等于自动崩溃。'));
      } else if (p.relationFocus === 'cooperation') {
        setTitle('做东西，少一环会怎样？');
        textLine(p.workPaused ? '零件没送来，这件东西还做不完。' : '原料、零件、加工、运输，接成一条线。');
        textLine('先假设这里没有备用供货。', 'small');
        action(p.workPaused ? '恢复零件供货' : '暂停零件供货', 'TOGGLE_WORK', null, 'secondary');
        action('看看谁作主 →', 'SHOW_RELATION', { relation: 'ownership' });
        notes.appendChild(node('p', '这是四道必要工序的示意。暂时缺少零件且没有替代供货时，当前产品无法做完；不计算产量或失业。恢复供货后继续。材料、零件和运输可能来自别家企业：这些人不一定受雇于同一个老板。'));
      } else {
        setTitle('一起做，谁作主？');
        textLine('厂房和机器，归这家公司的老板。');
        notes.appendChild(node('p', '生产资料归各自的资本所有者掌握。钥匙表示拥有；粗箭头表示控制；钱表示付款。拥有和控制影响投资、工作安排及分配。'));
        action('继续 →', 'SHOW_CONCEPT');
      }
      var relations = node('div', '', 'row'); notes.appendChild(relations);
      [['customers','顾客'],['cooperation','协作'],['ownership','产权'],['control','控制'],['payment','付款']].forEach(function (pair) { var b = action(pair[1], 'SHOW_RELATION', { relation: pair[0] }, 'secondary', relations); b.setAttribute('aria-pressed', p.relationFocus === pair[0] ? 'true' : 'false'); });
      action('回去改分法 ↺', 'BACK_TO_ALLOCATION', null, 'secondary', notes);
    } else if (p.scene === 'concept') {
      setTitle('大家一起生产，各家分别占有。');
      var d = node('p', '', 'definition'); d.textContent = s.definition; readout.appendChild(d);
      quote('不患寡而患不均。', '《论语·季氏》', notes); action('继续 →', 'SHOW_ENDING');
      notes.appendChild(node('p', '你作出的工资、投资、开工决定，改变了别家公司面对的条件；但这些互相依赖的生产活动由各家资本分别作主。需求压力是这种矛盾的一种表现，不是基本矛盾的全部，也不是每期必然滞销。社会主义国家也有分配、需求和技术治理问题，但不能因为现象相似就认定具有同一资本主义基本矛盾。'));
    } else if (p.scene === 'ending') {
      setTitle('面包很多，家里却没得吃。');
      var dialogue = node('div', '', 'dialogue'); readout.appendChild(dialogue);
      var pairs = p.endingViewMode === 'all' ? s.ending : [s.ending[p.endingPairIndex]];
      pairs.forEach(function (pair) { var a = node('p'), b = node('p'); a.appendChild(node('b', '女儿：')); a.appendChild(node('span', pair.daughter)); b.appendChild(node('b', '父亲：')); b.appendChild(node('span', pair.father)); dialogue.appendChild(a); dialogue.appendChild(b); });
      if (p.endingPairIndex < 2 && p.endingViewMode !== 'all') action('继续听 →', 'NEXT_PAIR', { expectedIndex: p.endingPairIndex });
      else action('再看看这条街 →', 'SHOW_STREET_SUMMARY');
      notes.appendChild(node('p',p.street&&p.street.campaign&&p.street.campaign.beat==='closed'?'对话改编自煤矿父女故事。积蓄耗尽是故事中的时间跳跃，不是模拟的一天。':'独立改编故事，不是本局算出的结局。需要面包，不等于有钱买面包。'));
      action('看完整对话', 'SHOW_ALL', null, 'secondary', notes);
    } else if (p.scene === 'relief') {
      if (!p.reliefRoute) {
        setTitle('剩下的10份，谁来买？', '三条路，都从同一个缺口重新开始。');
        textLine('不沿用刚才的工资和库存。这是新的对照实验。', 'small');
        [['consumption','增加消费'],['investment','增加投资'],['exports','增加出口']].forEach(function (route) {
          action(route[1] + (p.reliefVisited.includes(route[0]) ? ' ↺' : ' →'), 'CHOOSE_RELIEF', { route: route[0] }, 'choice');
        });
        if (p.reliefVisited.length) {
          textLine('已试' + p.reliefVisited.length + '条路。每条都要多看一期。', 'small');
          action('带着这个问题，继续 →', 'FINISH_RELIEF', null, 'secondary');
        }
      } else {
        var r = s.relief;
        setTitle(({ consumption: '让顾客手里有钱。', investment: '今天的订单，明天的产能。', exports: '卖给远方，钱从哪里来？' })[p.reliefRoute]);
        textLine(({ consumption: '企业先垫付10份工资，顾客再花出去。', investment: '企业用留存的钱，连续两期各多买10份设备。', exports: '海外顾客用自己的收入，多买10份。' })[p.reliefRoute], 'small');
        metrics([['这期卖出', r.sold], ['下期卖出', r.nextSold], ['下期剩下', r.nextUnsold]]);
        textLine(p.reliefSustained ? '多出来的产品，这次有买家了。' : ({ consumption: '只发一次，下期的钱又不够了。', investment: '订单仍是50份，新产能却到了60份。', exports: '海外订单一停，缺口又回来了。' })[p.reliefRoute]);
        var condition = ({ consumption: '试试：下期工资也增加', investment: '试试：下游消费也多10份', exports: '试试：海外订单持续' })[p.reliefRoute];
        action(p.reliefSustained ? '还原原来的条件 ↺' : condition, 'RELIEF_CONDITION', { sustained: !p.reliefSustained }, 'secondary');
        action('换条路比较 →', 'RELIEF_MENU');
        notes.appendChild(node('p', r.funding)); notes.appendChild(node('p', r.now)); notes.appendChild(node('p', r.next)); notes.appendChild(node('p', r.condition)); notes.appendChild(node('p', r.cost));
        notes.appendChild(node('p', '按钮改变的是下一期的假设，不会凭空创造收入、订单或资金；能连续两期卖完也不等于永久消除危机。每条路各自从50份供给、40份订单出发，既不叠加，也不自动延续前一条路的结果。'));
      }
      notes.appendChild(node('p', '这三条路分别问：收入如何分、投资投向何处、外部购买力从哪里来。它们能真正缓解压力，也有成本与条件，不应一概写成“拖延术”。政府购买、公共服务、价格、信贷与产业结构等因素在本实验外，三条路不是穷尽全部政策。'));
      notes.appendChild(node('p', '原文的50个面包改为按不变价格计的50份最终产品，含消费品与资本品。不能把面包直接变成设备，也不能把社会总产品中的资本补偿删掉：总商品价值可分c＋v＋s，新增价值是v＋s。未售库存计入事后GDP中的投资，不等于产品已经卖出。'));
      [['《资本论》第二卷第20章', 'https://www.marxists.org/archive/marx/works/1885-c2/ch20_01.htm'], ['BEA：库存核算', 'https://www.bea.gov/resources/methodologies/nipa-handbook/pdf/chapter-07.pdf'], ['IMF：投资的当期与长期作用', 'https://www.imf.org/en/blogs/articles/2014/09/30/now-is-a-good-time-to-invest-in-infrastructure']].forEach(function (source) { var line = node('p'), a = node('a', source[0] + ' ↗'); a.href = source[1]; a.target = '_blank'; a.rel = 'noreferrer'; line.appendChild(a); notes.appendChild(line); });
    } else if (p.scene === 'routes') {
      setTitle('附录：换个位置，看看新机器。');
      quote('工欲善其事，必先利其器。', '《论语·卫灵公》', notes);
      var routeRow = row();
      [['individual','我是工人 →'],['enterprise','我是老板 →']].forEach(function (route) { button(route[1], function () { send('host', { type: 'EXPERIMENT', entrance: route[0] }); }, 'choice', routeRow); });
      notes.appendChild(node('p', '两人小工厂是可选实验：换个身份，比较同一台机器下的三种约定。八条条件分支在假设目录中；这里不重开它们的账本。'));
      action('回到分一笔钱 ↺', 'BACK_TO_ALLOCATION', null, 'secondary', notes);
      button('打开旧版完整小工厂 →', function () { send('host', { type: 'LEGACY' }); }, 'secondary', notes);
    }
  }
  function machineUI() {
    var s = state, m = s.machine, a = s.account, worker = s.entrance === 'individual', q = s.questions[m.questionIndex];
    var title = m.phase === 'quote' ? '换台机器，会怎样？' : m.phase === 'predict' ? ['产量，会更多吗？', '工资，会跟着涨吗？', '能早点下班吗？'][m.questionIndex] : m.phase === 'ready' ? '开动机器，看看。' : m.phase === 'result' ? '产量翻倍，工资没变。' : '同一台机器，试试三种约定。';
    var act=m.phase==='quote'?'第一幕':m.phase==='predict'?'第二幕':m.phase==='compare'?'第四幕':'第三幕';
    setTitle(act+' · '+title);
    quote('工欲善其事，必先利其器。', '《论语·卫灵公》', notes);
    if (m.phase === 'quote') { machineAction('去工厂 →', 'BEGIN'); }
    else {
      var metrics = node('div', '', 'metrics'); readout.appendChild(metrics);
      [['products','产量',a.produced,'件'],['wages','工资',a.wageEach,'枚'],['hours','工时',a.hours,'小时']].forEach(function (metric) {
        var el = node('div', '', m.phase === 'predict' && q.id === metric[0] ? 'focus' : ''); el.dataset.metric = metric[0];
        el.appendChild(node('span', metric[1] + ' ')); el.appendChild(node('strong', String(metric[2]))); el.appendChild(node('span', metric[3])); metrics.appendChild(el);
      });
      if (m.phase === 'predict') { q.choices.forEach(function (c) { machineAction(c.label, 'PREDICT', { questionIndex: m.questionIndex, value: c.value }, 'choice'); }); }
      if (m.phase === 'ready') machineAction('换上新机器 →', 'RUN');
      if (m.phase === 'result') { var next = machineAction('试试别的约定 →', 'COMPARE');
        if (changedMachineResult && !reduced.matches) { busy = true; next.disabled = true; next.textContent = '机器运行中…'; later(function () { busy = false; next.disabled = false; next.textContent = '试试别的约定 →'; }, 1100); }
      }
      if (m.phase === 'compare') {
        var r = row('contract-row'); [['unchanged','照旧'],['pay','加薪'],['time','缩时']].forEach(function (contract) { var b = machineAction(contract[1], 'CONTRACT', { contract: contract[0] }, 'secondary', r); b.setAttribute('aria-pressed', m.contract === contract[0] ? 'true' : 'false'); });
        notes.appendChild(node('p', '机器让改变成为可能，钱和时间还要看怎样约定。加薪对照保留原工时；缩时对照保持工资、做原来那么多。各自从同一基准比较，不叠加。'));
        machineAction('再试一次 ↺', 'RESTART', null, 'secondary', notes); button('返回 →', function () { send('host', { type: 'BACK' }); });
      }
      notes.appendChild(node('p', '这是人为设定的教学工厂，不是现实测量。每厂两人，每件3枚，先假定全部售出。合同对照各从同一新机基准出发，不叠加。序章分配比例不进入本账。'));
      notes.appendChild(node('p', '收入' + a.revenue + '－材料' + a.materials + '－设备' + a.equipment + '－工资' + a.wages + '＝公司结余' + a.surplus + '。结余不是剩余价值率，也不是老板个人财富。'));
    }
    notes.appendChild(node('p', worker ? '你是工厂工人，可以提出愿望，但不能一个人改合同。这里是条件对照，不代表已经谈成。' : '你经营这家工厂。这里是合同条件的假设对照，不代表现实中已经谈成。'));
    button('← 回到入口', function () { send('host', { type: 'BACK' }); }, 'secondary', notes);
  }
  function keyOf(s) {
    if (s.section === 'machine') return 'machine/' + s.machine.phase;
    var p = s.prologue;
    return p.scene + (p.scene === 'network' ? '/' + p.relationFocus : p.scene === 'market' ? '/' + p.marketMode : p.scene === 'relief' ? '/' + (p.reliefRoute || 'menu') : '');
  }
  function commitState(payload) {
    var previous = state; state = payload;
    if (!slideshow) bootSlides();
    var key = keyOf(state);
    changedMachineResult = state.section === 'machine' && state.machine.phase === 'result' && (!previous || previous.section !== 'machine' || previous.machine.phase !== 'result');
    if (key !== lastKey) {
      busy = false; timers.forEach(clearTimeout); timers.clear();
      var wanted = ids.indexOf(key);
      if (wanted === slideshow.slideIndex + 1) slideshow.nextSlide();
      else { if (slideshow.currentSlide && slideshow.currentSlide.onend) slideshow.currentSlide.onend(slideshow); slideshow.slideIndex = wanted; slideshow.currentSlide = slideshow.slides[wanted]; slideshow.currentSlide.onstart(slideshow); publish('slideshow/slideChange', [key]); }
      slideshow.objects.heading.dom.focus({ preventScroll: true }); window.scrollTo(0, 0);
    } else drawCurrent();
    lastKey = key; height();
    if (!active || document.hidden) stage.app.stop();
  }
  function finishTransition() {
    transitioning = false; pendingState = null;
    delete document.body.dataset.transition;
    document.querySelector('main').removeAttribute('aria-busy');
    var next = queuedState; queuedState = null;
    if (next) acceptState(next);
  }
  function enterStreet(payload) {
    // Preserve the last rendered kitchen as a temporary camera layer. Shrink it
    // into our shop while revealing the five neighbors. This bitmap is a frame
    // of our own canvas, not an external asset or another simulated economy.
    var view=stage.app.view,source=view.getBoundingClientRect(),ghost=document.createElement('canvas');
    ghost.className='street-camera';ghost.setAttribute('aria-hidden','true');
    ghost.width=view.width;ghost.height=view.height;ghost.getContext('2d').drawImage(view,0,0);
    ghost.style.cssText='left:'+source.left+'px;top:'+source.top+'px;width:'+source.width+'px;height:'+source.height+'px;';
    document.body.appendChild(ghost);
    document.body.dataset.transition='street-camera';
    commitState(payload);
    var start=null;
    function frame(now){
      if(start===null)start=now;
      var p=reduced.matches?1:Math.min(1,(now-start)/800),ease=p*p*(3-2*p);
      var target=document.getElementById('prologue-battle').getBoundingClientRect();
      var width=source.width+(target.width*.35-source.width)*ease,ratio=width/source.width;
      // Re-read the target during iframe/layout resize; the camera lands on the
      // actual dashed frame on phones too, never an assumed desktop coordinate.
      ghost.style.left=source.left+(target.left-source.left)*ease+'px';
      ghost.style.top=source.top+(target.top+230-source.top)*ease+'px';
      ghost.style.width=width+'px';ghost.style.height=source.height*ratio+'px';
      ghost.style.opacity=String(1-Math.max(0,(p-.67)/.33));
      document.body.dataset.streetEntrance=p.toFixed(3);
      if(p<1)requestAnimationFrame(frame);
      else {ghost.remove();height();finishTransition();}
    }
    requestAnimationFrame(frame);
  }
  function acceptState(payload) {
    if (transitioning) { queuedState = payload; return; }
    var changing = state && keyOf(payload) !== keyOf(state);
    if (!changing || reduced.matches || !active || document.hidden) { commitState(payload); return; }
    transitioning = true; pendingState = payload;
    document.querySelector('main').setAttribute('aria-busy', 'true');
    if(keyOf(payload)==='street'&&['bakery','bakery-upgrade','bakery-expansion'].includes(keyOf(state))){enterStreet(payload);return;}
    var chapter = (keyOf(state) === 'opening' && keyOf(payload) === 'bakery')
      || (keyOf(state) === 'concept' && keyOf(payload) === 'ending');
    if (chapter) {
      // Original artwork, with a shorter silent sequence. Cover the old scene
      // before changing it; the second atlas column reveals the new one.
      document.body.dataset.transition = 'chapter';
      var scratch = document.getElementById('scene-scratch'), uncovering = false;
      var started = performance.now(), animation = ++chapterAnimation, half = 180;
      scratch.style.backgroundPosition = '0% 0%';
      function scratchFrame(now) {
        if (animation !== chapterAnimation || !transitioning || document.body.dataset.transition !== 'chapter') return;
        var elapsed = now - started;
        if (elapsed >= half && !uncovering) { commitState(pendingState); uncovering = true; }
        if (elapsed >= half * 2) { finishTransition(); return; }
        var frame = Math.min(19, Math.floor((elapsed % half) * 20 / half));
        scratch.style.backgroundPosition = (uncovering ? '100%' : '0%') + ' ' + (frame * 100 / 19) + '%';
        requestAnimationFrame(scratchFrame);
      }
      requestAnimationFrame(scratchFrame);
    } else {
      // Keep the canvas visible: the same actors move while the question changes.
      document.body.dataset.transition = 'out';
      later(function () {
        commitState(pendingState); document.body.dataset.transition = 'in';
        later(function () { document.body.dataset.transition = 'settling'; later(finishTransition, 180); }, 20);
      }, 140);
    }
  }
  function receive(event) {
    if (event.source !== parent || !event.data || event.data.app !== 'trust-adaptation') return;
    if (event.data.type === 'visibility') { active = event.data.active !== false; if (stage) active && !document.hidden ? stage.app.start() : stage.app.stop(); return; }
    if (event.data.type === 'state') acceptState(event.data.payload);
  }
  function height() {
    // Measure natural content, never the iframe viewport (100vh creates feedback).
    var bottom = document.querySelector('footer').getBoundingClientRect().bottom + window.scrollY;
    post('height', { height: Math.ceil(bottom) });
  }
  // Load the embedded handwriting before Pixi caches its first text textures.
  // The portable copy uses data assets; no original XHR loader or audio starts.
  var fontReady = document.fonts ? document.fonts.load('14px "WorkshopHand"', '工人老板新机器') : Promise.resolve();
  Promise.all([register('iterated_peep', TRUST_ASSETS.peep, TRUST_ASSETS.peepAtlas), register('iterated_coin', TRUST_ASSETS.coin, TRUST_ASSETS.coinAtlas), loadImage(TRUST_ASSETS.old), loadImage(TRUST_ASSETS.new), register('iterated_machine', TRUST_ASSETS.desk, TRUST_ASSETS.deskAtlas), register('splash_peep', TRUST_ASSETS.splash, TRUST_ASSETS.splashAtlas), register('connection', TRUST_ASSETS.connection, TRUST_ASSETS.connectionAtlas), fontReady,
    loadImage(TRUST_ASSETS.bakery.chefHat),loadImage(TRUST_ASSETS.bakery.oven),loadImage(TRUST_ASSETS.bakery.truck),loadImage(TRUST_ASSETS.bakery.bread),
    register('bakery_hatguy',TRUST_ASSETS.bakery.hat,TRUST_ASSETS.bakery.hatAtlas),register('bakery_body',TRUST_ASSETS.bakery.body,TRUST_ASSETS.bakery.bodyAtlas),register('bakery_face',TRUST_ASSETS.bakery.face,TRUST_ASSETS.bakery.faceAtlas),
    loadImage(TRUST_ASSETS.bakery.newOven),register('bakery_angry',TRUST_ASSETS.bakery.angry,TRUST_ASSETS.bakery.angryAtlas),register('bakery_nervous',TRUST_ASSETS.bakery.nervous,TRUST_ASSETS.bakery.nervousAtlas),
    loadImage(TRUST_ASSETS.street.clothes),loadImage(TRUST_ASSETS.street.cars),loadImage(TRUST_ASSETS.street.inputs),loadImage(TRUST_ASSETS.street.emptyOven)
  ]).then(function (loaded) {
    machineTextures.old = loaded[2]; machineTextures.new = loaded[3];
    bakeryTextures={chefHat:loaded[8],oven:loaded[9],truck:loaded[10],bread:loaded[11],newOven:loaded[15],clothesShop:loaded[18],carFactory:loaded[19],inputsShop:loaded[20],emptyOven:loaded[21]};
    window.addEventListener('message', receive); document.body.dataset.ready = 'true';
    new ResizeObserver(height).observe(document.body);
    function resizeStage() {
      if (!stage || !state) return;
      // Hidden panels and full-page capture can briefly report a 1px iframe.
      // Keep the valid world until real layout returns instead of packing into it.
      if (window.innerWidth < 240) return;
      fitMainHeight();
      var desiredWidth = keyOf(state) === 'opening' ? window.innerWidth : keyOf(state)==='street'?960:window.innerWidth <= 600 ? 640 : 960;
      // Iframe height changes when notes open or the host fits its content.
      // They must not restart a distribution, production animation or face.
      if (stage.width !== desiredWidth || stage.viewportWidth !== window.innerWidth || (keyOf(state) === 'opening' && stage.splashViewportHeight !== openingViewportHeight())) {
        // A shop ledger locks the host scroll. Classic desktop scrollbars then
        // change the iframe width. This is a layout resize, not a scene exit:
        // invalidating the street key would clearScene() and close the ledger
        // immediately after the user clicked it. StreetScene.update relayouts
        // its own geometry while preserving the open inspector and game state.
        if (!['street','street-economy'].includes(keyOf(state))) stage.viewKey = '';
        stage.draw(state);
      }
      height();
    }
    window.addEventListener('resize', resizeStage);
    parent.addEventListener('resize', resizeStage);
    if (parent.visualViewport) parent.visualViewport.addEventListener('resize', resizeStage);
    document.addEventListener('visibilitychange', function () { if (stage) document.hidden || !active ? stage.app.stop() : stage.app.start(); });
    reduced.addEventListener('change', function () {
      if (!stage || !state) return;
      if (reduced.matches && stage.bakery.graphics.visible) stage.bakery.playing=false;
      if(stage.expansion.graphics.visible){stage.expansion.reduced=reduced.matches;if(reduced.matches)stage.expansion.playing=false;}
      if(stage.street.graphics.visible&&reduced.matches)stage.street.finish();
      busy = false; timers.forEach(clearTimeout); timers.clear(); changedMachineResult = false;
      var next = queuedState || pendingState; queuedState = null; pendingState = null; transitioning = false;
      delete document.body.dataset.transition; document.querySelector('main').removeAttribute('aria-busy');
      stage.viewKey = ''; if (next) commitState(next); else drawCurrent();
    });
    window.addEventListener('pagehide', function () { timers.forEach(clearTimeout); if (stage) stage.app.stop(); Tween.removeAllTweens(); });
    post('ready');
  }).catch(function (error) { console.error('Trust stage failed to load', error); post('error'); });
  window.addEventListener('error', function () { post('error'); });
})();
