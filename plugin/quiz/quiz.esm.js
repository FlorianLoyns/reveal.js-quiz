/*!
 * reveal.js-quiz 1.2.0
 * Interactive exercises for reveal.js — single choice, multiple choice,
 * true/false and ordering. Touch / smartboard friendly, ships its own CSS,
 * colours and labels are easy to theme. Long-press a question to reset it.
 * @author  Florian Loyns
 * @license MIT
 * Companion to touchcontrols and glossary. Docs & options: see README.
 */

'use strict';

  function injectCSS(o){
    if (document.getElementById('quiz-css')) return;
    var css =
      ".reveal .quiz{max-width:840px;margin:0 auto;text-align:left}"
    + ".reveal .quiz-q{font-size:26px;font-weight:700;line-height:1.3;color:#0B1818;margin:0 0 16px}.quiz-tf-item .quiz-q{line-height:1.38;margin:0 0 18px}"
    + ".reveal .quiz-options{display:flex;flex-direction:column;gap:10px}"
    + ".reveal .quiz-opt{font-family:inherit;text-align:left;font-size:19px;line-height:1.22;color:#22312f;background:#fff;"
      + "border:1.5px solid " + o.line + ";border-radius:12px;padding:11px 16px;cursor:pointer;display:flex;align-items:center;gap:13px;transition:.13s}"
    + ".reveal .quiz-opt::before{content:'';flex:0 0 auto;width:23px;height:23px;border-radius:50%;border:2px solid " + o.line + ";"
      + "display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:800;transition:.13s}"
    + ".reveal .quiz-opt:hover{border-color:" + o.accent + ";background:rgba(44,74,110,.04)}"
    + ".reveal .quiz-opt.selected{border-color:" + o.accent + ";background:rgba(44,74,110,.06)}"
    + ".reveal .quiz-opt.selected::before{content:'\\2713';border-color:" + o.accent + ";background:" + o.accent + "}"
    + ".reveal .quiz-opt.correct{border-color:" + o.ok + ";background:rgba(99,153,34,.10)}"
    + ".reveal .quiz-opt.correct::before{content:'\\2713';border-color:" + o.ok + ";background:" + o.ok + "}"
    + ".reveal .quiz-opt.missed{border-color:" + o.ok + "}"
    + ".reveal .quiz-opt.missed::before{content:'\\2713';border-color:" + o.ok + ";background:transparent;color:" + o.ok + "}"
    + ".reveal .quiz-opt.wrong{border-color:" + o.bad + ";background:rgba(209,74,74,.10)}"
    + ".reveal .quiz-opt.wrong::before{content:'\\2717';border-color:" + o.bad + ";background:" + o.bad + "}"
    + ".reveal .quiz.quiz-done .quiz-opt{cursor:default}"
    + ".reveal .quiz.quiz-done .quiz-opt:not(.correct):not(.wrong):not(.missed){opacity:.45}"
    + ".reveal .quiz-tf{flex-direction:row;gap:14px}"
    + ".reveal .quiz-tf .quiz-opt{flex:1;justify-content:center;font-weight:600;font-size:22px}"
    + ".reveal .quiz-tf .quiz-opt::before{display:none}"
    /* Mehrfach-Wahr/Falsch: Fragen deckungsgleich übereinander, Überblenden ohne Verrutschen */
    + ".reveal .quiz-tf-stage{position:relative;width:840px;max-width:100%;margin:0 auto;min-height:230px}"
    + ".reveal .quiz-tf-item{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;opacity:0;pointer-events:none;transition:opacity .45s ease}"
    + ".reveal .quiz-tf-item.active{opacity:1;pointer-events:auto}"
    /* --- Reihenfolge (order): umbrechendes Raster mit Zieh-Karten --- */
    + ".reveal .quiz-grid{counter-reset:qord;flex-direction:row;flex-wrap:wrap;justify-content:center;gap:12px}"
    + ".reveal .quiz-grid .quiz-opt{counter-increment:qord;flex:0 0 auto;width:auto;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none}"
    + ".reveal .quiz-grid .quiz-opt::before{content:counter(qord);border-radius:8px;border:none;background:" + o.accent + ";color:#fff;font-size:15px;font-weight:700}"
    + ".reveal .quiz-grid .quiz-opt.picked{border-color:" + o.accent + ";background:rgba(44,74,110,.06);box-shadow:0 12px 28px -12px rgba(0,0,0,.45);transform:translateY(-3px)}"
    + ".reveal .quiz-grid .quiz-opt.correct{border-color:" + o.ok + ";background:rgba(99,153,34,.10)}"
    + ".reveal .quiz-grid .quiz-opt.correct::before{content:counter(qord);background:" + o.ok + "}"
    + ".reveal .quiz-grid .quiz-opt.wrong{border-color:" + o.bad + ";background:rgba(209,74,74,.10)}"
    + ".reveal .quiz-grid .quiz-opt.wrong::before{content:counter(qord);background:" + o.bad + "}"
    + ".reveal .quiz-actions{display:flex;gap:12px;margin-top:16px}"
    + ".reveal .quiz[data-type=order] .quiz-actions{justify-content:center;margin-top:20px}"
    + ".reveal .quiz-actions button{font-family:inherit;font-size:18px;font-weight:600;padding:9px 20px;border-radius:11px;cursor:pointer;border:1.5px solid " + o.accent + ";background:" + o.accent + ";color:#fff;transition:.12s}"
    + ".reveal .quiz-actions button.ghost{background:transparent;color:" + o.accent + "}"
    + ".reveal .quiz-actions button:active{transform:translateY(1px)}"
    /* ---- Zuordnung: Karten in Kategorien einsortieren ---- */
    + ".reveal .quiz[data-type=match]{max-width:1180px}"
    + ".reveal .quiz-pool{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-content:flex-start;"
      + "min-height:64px;padding:12px;margin:0 0 16px;border:2px dashed " + o.line + ";border-radius:14px;transition:.13s}"
    + ".reveal .quiz-pool.target,.reveal .quiz-bin.target{border-color:" + o.accent + ";background:rgba(44,74,110,.05)}"
    + ".reveal .quiz-bins{display:grid;grid-template-columns:repeat(var(--qb,3),minmax(0,1fr));gap:14px;align-items:stretch}"
    + ".reveal .quiz-bin{display:flex;flex-direction:column;gap:9px;min-height:150px;padding:10px;"
      + "border:2px solid " + o.line + ";border-radius:14px;transition:.13s}"
    + ".reveal .quiz-bin-h{font-size:16px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:" + o.accent + ";"
      + "text-align:center;padding-bottom:7px;border-bottom:1px solid " + o.line + "}"
    + ".reveal .quiz-match .quiz-opt{font-size:18px;line-height:1.2;padding:9px 13px;gap:0;flex:0 0 auto}"
    + ".reveal .quiz-match .quiz-opt::before{display:none}"
    + ".reveal .quiz-match .quiz-opt.picked{box-shadow:0 0 0 3px rgba(44,74,110,.14)}"
    /* im Pool liegen gebliebene Karten sind nicht richtig, sondern unerledigt */
    + ".reveal .quiz-match .quiz-opt.missed{border-color:#D9930A;background:rgba(217,147,10,.10)}"
    /* Altbestand: frühere Decks enthalten noch .quiz-feedback-Kästen – bewusst ausgeblendet */
    + ".reveal .quiz-feedback{display:none}";
    var s = document.createElement('style');
    s.id = 'quiz-css'; s.textContent = css;
    document.head.appendChild(s);
  }

  function stopP(e){ e.stopPropagation(); }
  /* verhindert, dass ein angetippter Button den Fokus bekommt – sonst
     scrollt reveal die skalierte Folie minimal und alles "verzieht" sich. */
  function noFocus(el){ el.addEventListener('mousedown', function(e){ e.preventDefault(); }); }

  /* Ergebnisklasse + aria-label setzen (Farbe allein reicht Screenreadern nicht) */
  function markResult(opt, kind){
    opt.classList.add(kind);
    var lab = kind === 'correct' ? 'richtig'
            : kind === 'wrong'   ? 'falsch'
            : 'richtige Antwort – nicht ausgewählt';
    opt.setAttribute('aria-label', (opt.textContent || '').trim() + ' – ' + lab);
  }
  function clearResults(opts){
    opts.forEach(function(o2){
      o2.classList.remove('correct', 'wrong', 'missed', 'selected');
      o2.removeAttribute('aria-label');
    });
  }

  /* Langdruck (~0,6 s) auf die Frage setzt die Aufgabe zurück – für die nächste Gruppe */
  function wireReset(quiz, resetFn){
    var targets = [].slice.call(quiz.querySelectorAll('.quiz-q'));
    if (!targets.length) targets = [quiz];
    targets.forEach(function(q){
      var lp = null;
      q.addEventListener('contextmenu', function(e){ e.preventDefault(); });
      q.addEventListener('pointerdown', function(e){
        e.stopPropagation();
        lp = setTimeout(function(){ lp = null; resetFn(); }, 600);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev){
        q.addEventListener(ev, function(){ if (lp){ clearTimeout(lp); lp = null; } });
      });
    });
  }

  /* mischt, ohne die schon richtige Reihenfolge zu erwischen */
  function shuffle(cards){
    var a = cards.slice();
    for (var attempt = 0; attempt < 8; attempt++){
      for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      var sorted = a.every(function(c, idx){ return String(c.getAttribute('data-order')) === String(idx + 1); });
      if (!sorted || a.length < 2) break;
    }
    return a;
  }
  /* ---- single-choice ---- */
  function setupSingle(quiz){
    var opts = [].slice.call(quiz.querySelectorAll('.quiz-opt'));
    opts.forEach(function(opt){
      noFocus(opt);
      opt.addEventListener('pointerdown', stopP);
      opt.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if (quiz.classList.contains('quiz-done')) return;
        quiz.classList.add('quiz-done');
        var correct = opt.hasAttribute('data-correct');
        markResult(opt, correct ? 'correct' : 'wrong');
        if (!correct) opts.forEach(function(o){ if (o.hasAttribute('data-correct')) markResult(o, 'correct'); });
        opt.blur();
      });
    });
    wireReset(quiz, function(){
      quiz.classList.remove('quiz-done');
      clearResults(opts);
    });
  }

  /* ---- Mehrfachauswahl ---- */
  function setupMultiple(quiz, o){
    var opts = [].slice.call(quiz.querySelectorAll('.quiz-opt'));
    opts.forEach(function(opt){
      noFocus(opt);
      opt.addEventListener('pointerdown', stopP);
      opt.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if (quiz.classList.contains('quiz-done')) return;
        opt.classList.toggle('selected');
        opt.blur();
      });
    });
    var actions = document.createElement('div'); actions.className = 'quiz-actions';
    var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = o.checkLabel;
    noFocus(btn);
    btn.addEventListener('pointerdown', stopP);
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      if (quiz.classList.contains('quiz-done')) return;
      quiz.classList.add('quiz-done');
      opts.forEach(function(opt){
        var correct = opt.hasAttribute('data-correct');
        var selected = opt.classList.contains('selected');
        opt.classList.remove('selected');
        if (correct && selected) markResult(opt, 'correct');
        else if (!correct && selected) markResult(opt, 'wrong');
        else if (correct && !selected) markResult(opt, 'missed');
      });
      btn.blur();
    });
    actions.appendChild(btn);
    quiz.appendChild(actions);
    wireReset(quiz, function(){
      quiz.classList.remove('quiz-done');
      clearResults(opts);
    });
  }

  /* ---- Wahr/Falsch ---- */
  function isTrueAns(ans){ ans = (ans || '').toLowerCase(); return ans === 'true' || ans === 'wahr' || ans === '1' || ans === 'richtig'; }

  function makeTF(o, trueCorrect){
    var wrap = document.createElement('div'); wrap.className = 'quiz-options quiz-tf';
    var bT = document.createElement('button'); bT.type = 'button'; bT.className = 'quiz-opt'; bT.textContent = o.trueLabel;  if (trueCorrect) bT.setAttribute('data-correct', '');
    var bF = document.createElement('button'); bF.type = 'button'; bF.className = 'quiz-opt'; bF.textContent = o.falseLabel; if (!trueCorrect) bF.setAttribute('data-correct', '');
    wrap.appendChild(bT); wrap.appendChild(bF);
    return wrap;
  }
  /* eine Wahr/Falsch-Frage verdrahten; onAnswered() nach dem ersten Antippen.
     Gibt einen Controller mit reset() zurück. */
  function wireTF(wrap, onAnswered){
    var opts = [].slice.call(wrap.querySelectorAll('.quiz-opt'));
    var state = { done: false };
    opts.forEach(function(opt){
      noFocus(opt);
      opt.addEventListener('pointerdown', stopP);
      opt.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if (state.done) return; state.done = true;
        var correct = opt.hasAttribute('data-correct');
        markResult(opt, correct ? 'correct' : 'wrong');
        if (!correct) opts.forEach(function(o2){ if (o2.hasAttribute('data-correct')) markResult(o2, 'correct'); });
        opt.blur();
        if (onAnswered) onAnswered();
      });
    });
    return { reset: function(){ state.done = false; clearResults(opts); } };
  }

  function setupTrueFalse(quiz, o, sizers){
    var items = [].slice.call(quiz.querySelectorAll('.quiz-tf-item'));

    /* Einzelfrage (abwärtskompatibel): data-answer direkt am .quiz */
    if (!items.length){
      var wrap = makeTF(o, isTrueAns(quiz.getAttribute('data-answer')));
      quiz.appendChild(wrap);
      var ctl = wireTF(wrap, null);
      wireReset(quiz, function(){ ctl.reset(); });
      return;
    }

    /* Mehrere Fragen auf einer Folie: beantworten → kurz stehen lassen →
       automatisch in die nächste überblenden (kein Klick nötig). */
    quiz.classList.add('quiz-tf-stage');
    var ctls = [], pending = null;
    items.forEach(function(item, i){
      var wrap = makeTF(o, isTrueAns(item.getAttribute('data-answer')));
      item.appendChild(wrap);
      ctls.push(wireTF(wrap, function(){
        if (i >= items.length - 1) return;         // letzte Frage: stehen lassen
        pending = setTimeout(function(){
          pending = null;
          items[i].classList.remove('active');
          items[i + 1].classList.add('active');
        }, o.tfHold);
      }));
      item.classList.toggle('active', i === 0);
    });

    wireReset(quiz, function(){
      if (pending){ clearTimeout(pending); pending = null; }
      ctls.forEach(function(ctl){ ctl.reset(); });
      items.forEach(function(item, i){ item.classList.toggle('active', i === 0); });
    });

    /* Bühne auf die höchste Frage setzen statt fester 230 px – lange Fragen
       laufen sonst unten raus. Auf versteckten Folien ist noch nichts messbar;
       dann wird es beim nächsten Folienwechsel erneut versucht (sizers). */
    function sizeStage(){
      if (sizeStage.done) return;
      var maxH = 0;
      items.forEach(function(item){
        var prev = item.style.position;
        item.style.position = 'static';
        var h = item.offsetHeight;
        item.style.position = prev;
        if (h > maxH) maxH = h;
      });
      var lead = null;
      for (var li = 0; li < quiz.children.length; li++){
        if (quiz.children[li].classList.contains('quiz-q')){ lead = quiz.children[li]; break; }
      }
      var leadH = 0;
      if (lead){
        leadH = lead.offsetHeight + 14;
      }
      if (maxH > 0){
        items.forEach(function(item){ item.style.top = leadH + 'px'; });
        quiz.style.minHeight = (leadH + maxH + 10) + 'px';
        sizeStage.done = true;
      }
    }
    sizeStage();
    if (sizers) sizers.push(sizeStage);
    if (document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ sizeStage.done = false; sizeStage(); });
    }
  }

  /* setzt alle Order-Karten auf die Breite der breitesten – für ein
     gleichmäßiges Raster. Misst per Canvas, klappt auch auf noch
     unsichtbaren Folien (unabhängig vom Layout). */
  function equalizeCards(cards){
    if (!cards.length) return;
    var cs = window.getComputedStyle(cards[0]);
    var canvas = equalizeCards._c || (equalizeCards._c = document.createElement('canvas'));
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var maxText = 0;
    cards.forEach(function(c){ var w = ctx.measureText(c.textContent).width; if (w > maxText) maxText = w; });
    var extra = 26 + 14 + 18 + 18 + 3;   // Nummern-Badge + gap + padding links/rechts + Rahmen
    var w = Math.ceil(maxText + extra + 6);
    cards.forEach(function(c){ c.style.width = w + 'px'; });
  }

  /* tauscht zwei Elemente sicher im DOM (auch wenn benachbart) */
  function swapNodes(a, b){
    var tmp = document.createElement('span');
    a.parentNode.insertBefore(tmp, a);
    b.parentNode.insertBefore(a, b);
    tmp.parentNode.insertBefore(b, tmp);
    tmp.parentNode.removeChild(tmp);
  }

  /* ---- Reihenfolge (Tippen zum Tauschen) ---- */
  function setupOrder(quiz, o){
    var list = quiz.querySelector('.quiz-options');
    if (!list) return;
    list.classList.add('quiz-grid');
    var cards = [].slice.call(list.querySelectorAll('.quiz-opt'));
    if (!cards.length) return;
    shuffle(cards).forEach(function(card){ list.appendChild(card); });
    equalizeCards(cards);

    var picked = null;
    function clearColors(){ cards.forEach(function(c){ c.classList.remove('correct', 'wrong'); c.removeAttribute('aria-label'); }); }

    cards.forEach(function(card){
      card.type = 'button';
      noFocus(card);
      card.addEventListener('pointerdown', stopP);
      card.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if (!picked){
          picked = card; card.classList.add('picked');
        } else if (picked === card){
          picked.classList.remove('picked'); picked = null;         // Auswahl aufheben
        } else {
          swapNodes(picked, card);                                  // tauschen
          picked.classList.remove('picked'); picked = null;
          clearColors();                                            // Färbung ist nach dem Tausch veraltet
        }
        card.blur();
      });
    });

    function check(){
      [].slice.call(list.children).forEach(function(card, i){
        card.classList.remove('correct', 'wrong');
        markResult(card, String(card.getAttribute('data-order')) === String(i + 1) ? 'correct' : 'wrong');
      });
    }
    function reset(){
      if (picked){ picked.classList.remove('picked'); picked = null; }
      shuffle(cards).forEach(function(card){ card.classList.remove('correct', 'wrong'); card.removeAttribute('aria-label'); list.appendChild(card); });
    }

    var actions = document.createElement('div'); actions.className = 'quiz-actions';
    var bCheck = document.createElement('button'); bCheck.type = 'button'; bCheck.textContent = o.checkLabel;
    var bReset = document.createElement('button'); bReset.type = 'button'; bReset.className = 'ghost'; bReset.textContent = o.resetLabel;
    noFocus(bCheck); noFocus(bReset);
    bCheck.addEventListener('pointerdown', stopP); bReset.addEventListener('pointerdown', stopP);
    bCheck.addEventListener('click', function(e){ e.stopPropagation(); check(); bCheck.blur(); });
    bReset.addEventListener('click', function(e){ e.stopPropagation(); reset(); bReset.blur(); });
    actions.appendChild(bCheck); actions.appendChild(bReset);
    quiz.appendChild(actions);
    wireReset(quiz, reset);   // Langdruck auf die Frage wie bei den anderen Typen
  }

  /* ---- Zuordnung (Karten in Kategorien einsortieren) ----
     Autor schreibt nur die Karten mit data-bin; die Koerbe entstehen daraus.
     Bedienung am Board: Karte antippen, dann Korb antippen. Zurueck in den Pool
     genauso. Kein Ziehen - Drag ist auf einem Smartboard unzuverlaessig. */
  function setupMatch(quiz, o){
    var list = quiz.querySelector('.quiz-options');
    if (!list) return;
    var cards = [].slice.call(list.querySelectorAll('.quiz-opt'));
    if (!cards.length) return;

    var bins = (quiz.getAttribute('data-bins') || '').split('|')
                 .map(function(x){ return x.trim(); }).filter(Boolean);
    if (!bins.length){
      cards.forEach(function(c){
        var b = (c.getAttribute('data-bin') || '').trim();
        if (b && bins.indexOf(b) < 0) bins.push(b);
      });
    }
    if (bins.length < 2) return;

    quiz.classList.add('quiz-match');
    var pool = document.createElement('div'); pool.className = 'quiz-pool';
    var wrap = document.createElement('div'); wrap.className = 'quiz-bins';
    wrap.style.setProperty('--qb', Math.min(bins.length, 4));
    var drops = {};
    bins.forEach(function(name){
      var bin = document.createElement('div');
      bin.className = 'quiz-bin'; bin.setAttribute('data-bin', name);
      var h = document.createElement('div'); h.className = 'quiz-bin-h'; h.textContent = name;
      bin.appendChild(h); wrap.appendChild(bin); drops[name] = bin;
    });
    list.parentNode.insertBefore(pool, list);
    list.parentNode.insertBefore(wrap, list);
    list.parentNode.removeChild(list);

    var picked = null;
    function highlight(on){
      pool.classList.toggle('target', !!on);
      bins.forEach(function(n){ drops[n].classList.toggle('target', !!on); });
    }
    function unpick(){
      if (picked){ picked.classList.remove('picked'); picked = null; }
      highlight(false);
    }
    function clearColors(){
      cards.forEach(function(c){
        c.classList.remove('correct', 'wrong', 'missed');
        c.removeAttribute('aria-label');
      });
    }

    cards.forEach(function(card){
      card.type = 'button';
      noFocus(card);
      card.addEventListener('pointerdown', stopP);
      card.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if (picked === card){ unpick(); }
        else { unpick(); picked = card; card.classList.add('picked'); highlight(true); }
        card.blur();
      });
    });

    function dropOn(container){
      return function(e){
        e.stopPropagation();
        if (!picked) return;
        var c = picked; unpick();
        container.appendChild(c);
        clearColors();
      };
    }
    pool.addEventListener('pointerdown', stopP);
    pool.addEventListener('click', dropOn(pool));
    bins.forEach(function(n){
      drops[n].addEventListener('pointerdown', stopP);
      drops[n].addEventListener('click', dropOn(drops[n]));
    });

    function check(){
      unpick();
      cards.forEach(function(card){
        card.classList.remove('correct', 'wrong', 'missed');
        card.removeAttribute('aria-label');
        var txt = (card.textContent || '').trim();
        if (card.parentNode === pool){
          card.classList.add('missed');
          card.setAttribute('aria-label', txt + ' – noch nicht einsortiert');
          return;
        }
        var soll = (card.getAttribute('data-bin') || '').trim();
        var ist  = card.parentNode.getAttribute('data-bin');
        if (ist === soll){
          card.classList.add('correct');
          card.setAttribute('aria-label', txt + ' – richtig einsortiert');
        } else {
          card.classList.add('wrong');
          card.setAttribute('aria-label', txt + ' – gehört zu ' + soll);
        }
      });
    }
    function reset(){
      unpick(); clearColors();
      shuffle(cards).forEach(function(card){ pool.appendChild(card); });
    }

    var actions = document.createElement('div'); actions.className = 'quiz-actions';
    var bCheck = document.createElement('button'); bCheck.type = 'button'; bCheck.textContent = o.checkLabel;
    var bReset = document.createElement('button'); bReset.type = 'button'; bReset.className = 'ghost'; bReset.textContent = o.resetLabel;
    noFocus(bCheck); noFocus(bReset);
    bCheck.addEventListener('pointerdown', stopP); bReset.addEventListener('pointerdown', stopP);
    bCheck.addEventListener('click', function(e){ e.stopPropagation(); check(); bCheck.blur(); });
    bReset.addEventListener('click', function(e){ e.stopPropagation(); reset(); bReset.blur(); });
    actions.appendChild(bCheck); actions.appendChild(bReset);
    quiz.appendChild(actions);
    wireReset(quiz, reset);
    reset();
  }

  var Plugin = {
    id: 'quiz',
    init: function (deck) {
      var d = document;
      var c = deck.getConfig().quiz || {};
      var o = {
        accent: c.accent || '#2C4A6E', ok: c.ok || '#639922', bad: c.bad || '#D14A4A', line: c.line || '#E7EBEF',
        checkLabel: c.checkLabel || 'Prüfen', trueLabel: c.trueLabel || 'Wahr', falseLabel: c.falseLabel || 'Falsch',
        resetLabel: c.resetLabel || 'Zurücksetzen', tfHold: (c.tfHold != null) ? c.tfHold : 1200
      };
      injectCSS(o);
      var sizers = [];   // TF-Bühnen, die auf versteckten Folien noch nicht messbar waren
      var TYPES = {
        single: setupSingle,
        multiple: function(q){ setupMultiple(q, o); },
        truefalse: function(q){ setupTrueFalse(q, o, sizers); },
        order: function(q){ setupOrder(q, o); },
        match: function(q){ setupMatch(q, o); }
      };

      function build(){
        d.querySelectorAll('.quiz[data-type]').forEach(function(quiz){
          if (quiz.getAttribute('data-quiz-init')) return;
          var fn = TYPES[quiz.getAttribute('data-type')];
          if (!fn) return;
          quiz.setAttribute('data-quiz-init', '1');
          fn(quiz);
        });
      }
      build();
      if (deck.on) deck.on('slidechanged', function(){
        build();
        sizers.forEach(function(f){ f(); });
      });
    }
  };

export default Plugin;
