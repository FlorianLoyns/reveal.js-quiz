/*!
 * reveal.js-quiz 1.5.0
 * Interactive exercises for reveal.js — single choice, multiple choice,
 * true/false, ordering, matching and fill-in-the-blank. Touch / smartboard friendly, ships its own CSS,
 * colours and labels are easy to theme. Long-press a question to reset it.
 * @author  Florian Loyns
 * @license MIT
 * Companion to touchcontrols and glossary. Docs & options: see README.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.RevealQuiz = factory());
}(this, (function () {
  'use strict';

  /* ---- Druck: überall gleich erkannt und gleich ausgegeben ----
     reveal.js baut die Druckansicht mit ?print-pdf in der URL (oder view:'print'
     in der Konfiguration) und setzt dann nur Klassen an <html>; @media print greift
     erst im Druckdialog. Darum jede Druckregel zweimal: für den Druckdialog und
     für die ?print-pdf-Ansicht – so sieht die Vorschau im Browser aus wie das PDF. */
  function isPrintView(deck){
    if (/(?:\?|&)print-pdf\b/i.test(window.location.search)) return true;
    var c = deck && deck.getConfig ? deck.getConfig() : null;
    return !!(c && c.view === 'print');
  }
  function printCSS(css){
    var pdf = css.replace(/(^|\})([^{}]+)\{/g, function (m, vor, sel) {
      return vor + sel.split(',').map(function (s) { return 'html.print-pdf ' + s.trim(); }).join(',') + '{';
    });
    return '@media print{' + css + '}' + pdf;
  }

  /* Tönung einer Konfigurationsfarbe (#rgb/#rrggbb → rgba) für Flächen und
     Ringe; andere Schreibweisen gehen über color-mix (moderne Browser). */
  function tint(color, alpha){
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((color || '').trim());
    if (!m) return 'color-mix(in srgb,' + color + ' ' + Math.round(alpha * 100) + '%,transparent)';
    var h = m[1]; if (h.length === 3) h = h.replace(/./g, function(ch){ return ch + ch; });
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function injectCSS(o){
    if (document.getElementById('quiz-css')) return;
    var warn = '#D9930A';   // "unerledigt" (Pool-Rest bei match, leere Lücke bei fill-blank)
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
    + ".reveal .quiz-match .quiz-opt.missed{border-color:" + warn + ";background:" + tint(warn, .10) + "}"
    + ".reveal .quiz[data-type=match] .quiz-actions{justify-content:center;margin-top:20px}"
    /* ---- Lückentext: Wörter aus dem Pool in Lücken setzen ----
       Die Lücke ist ein leerer, leicht getönter Schlitz mit Nummer; eine
       eingesetzte Wortkarte ersetzt ihn optisch (Rahmen und Fläche der Lücke
       werden transparent, die Karte behält ihren eigenen Rahmen). Breite und
       Höhe der Lücke sind fest (sizeBlanks), darum verschiebt sich beim
       Einsetzen, Prüfen und Zurücklegen keine Zeile. */
    + ".reveal .quiz[data-type=fill-blank]{max-width:1000px}"
    + ".reveal .quiz-fill{counter-reset:qblank}"
    + ".reveal .quiz-fill > p{font-size:24px;line-height:2.25;color:#22312f;margin:0 0 18px}"
    + ".reveal .quiz-blank{counter-increment:qblank;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;"
      + "box-sizing:border-box;min-width:90px;min-height:52px;padding:2px;margin:0 2px;"
      + "border:2px dashed " + tint(o.accent, .40) + ";border-radius:12px;background:" + tint(o.accent, .04) + ";"
      + "cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;"
      + "transition:border-color .13s,background-color .13s,box-shadow .13s}"
      /* Nummer der leeren Lücke – damit man am Board über "Lücke 2" sprechen kann */
    + ".reveal .quiz-blank::before{content:counter(qblank);font-size:14px;font-weight:800;line-height:1;color:" + o.accent + ";opacity:.5;transition:opacity .13s}"
    + ".reveal .quiz-blank:not(.filled):hover{border-color:" + o.accent + "}"
    + ".reveal .quiz-blank.filled{border-color:transparent;background:transparent}"
    + ".reveal .quiz-blank.filled::before{display:none}"
      /* Wort gewählt: alle Lücken (auch belegte) sind mögliche Ziele */
    + ".reveal .quiz-blank.target{border-color:" + o.accent + ";background:" + tint(o.accent, .07) + "}"
    + ".reveal .quiz-blank.target::before{opacity:.8}"
      /* Lücke zuerst gewählt: wartet auf ein Wort */
    + ".reveal .quiz-blank.picked{border-style:solid;border-color:" + o.accent + ";background:" + tint(o.accent, .10) + ";box-shadow:0 0 0 3px " + tint(o.accent, .14) + "}"
    + ".reveal .quiz-blank.picked::before{opacity:1}"
    /* leer gebliebene Lücken sind nicht falsch, sondern unerledigt (wie im Pool bei match) */
    + ".reveal .quiz-blank.missed{border-color:" + warn + ";background:" + tint(warn, .10) + "}"
    + ".reveal .quiz-blank.missed::before{color:" + warn + ";opacity:1}"
    + ".reveal .quiz-fill .quiz-pool{margin:0;padding:14px;gap:10px 12px}"
    + ".reveal .quiz-fill .quiz-opt{font-size:20px;line-height:1.22;padding:8px 16px;gap:0;flex:0 0 auto;touch-action:manipulation;-webkit-user-select:none;user-select:none}"
    + ".reveal .quiz-fill .quiz-opt::before{display:none}"
    + ".reveal .quiz-fill .quiz-opt.picked{border-color:" + o.accent + ";background:" + tint(o.accent, .06) + ";"
      + "box-shadow:0 0 0 3px " + tint(o.accent, .14) + ",0 10px 22px -12px rgba(0,0,0,.45);transform:translateY(-2px)}"
      /* eingesetzte Karte "setzt sich" kurz; nach dem Prüfen treten die übrigen Pool-Karten zurück */
    + ".reveal .quiz-blank.filled>.quiz-opt{animation:quiz-pop .22s cubic-bezier(.2,.9,.3,1.25)}"
    + "@keyframes quiz-pop{from{transform:scale(.88)}to{transform:scale(1)}}"
    + "@media (prefers-reduced-motion:reduce){.reveal .quiz-blank.filled>.quiz-opt{animation:none}}"
    + ".reveal .quiz-fill.quiz-checked .quiz-pool .quiz-opt:not(.picked){opacity:.5}"
    + ".reveal .quiz[data-type=fill-blank] .quiz-actions{justify-content:center;margin-top:20px}"
    /* ================= Druck / PDF-Export (?print-pdf) =================
       Gilt nur, wenn revealSolution() die Klasse .quiz-print gesetzt hat.
       Schriftgrößen, Farben und Abstände kommen aus der gemeinsamen
       Druckskala (--print-*), die ein Theme einmal für alle Plugins setzt;
       ohne Theme greifen die Werte hinter dem Komma. Im Druck steht jede
       Aufgabe linksbündig in voller Breite – wie Tabellen und Karten. */
    + ".reveal .quiz.quiz-print{max-width:none;margin:0;color:var(--print-text,#22312f)}"
    + ".reveal .quiz.quiz-print .quiz-q{font-size:var(--print-lead,22px);line-height:1.3;color:var(--print-ink,#0B1818)}"
    + ".reveal .quiz.quiz-print .quiz-options{gap:var(--print-gap,10px)}"
    + ".reveal .quiz.quiz-print .quiz-opt{font-size:var(--print-body,19px);line-height:1.3;padding:9px 14px;"
      + "color:var(--print-text,#22312f);border-color:var(--print-line,#D9E0E7);box-shadow:none;transform:none}"
    + ".reveal .quiz.quiz-print .quiz-opt::before{width:21px;height:21px;font-size:var(--print-label,14px)}"
      /* nicht gewählte Optionen: lesbar grau statt fast unsichtbar (Schwarz-Weiß-Druck) */
    + ".reveal .quiz.quiz-print.quiz-done .quiz-opt:not(.correct):not(.wrong):not(.missed){opacity:1;color:var(--print-muted,#5A6A75)}"
    + ".reveal .quiz.quiz-print .quiz-opt.correct{border-color:var(--print-ok," + o.ok + ");color:var(--print-ink,#0B1818)}"
    + ".reveal .quiz.quiz-print .quiz-opt.correct::before{border-color:var(--print-ok," + o.ok + ");background:var(--print-ok," + o.ok + ")}"
    + ".reveal .quiz.quiz-print .quiz-actions{display:none}"
      /* Wahr/Falsch: alle Aussagen untereinander – Aussage links, Antwort rechts */
    + ".reveal .quiz.quiz-print.quiz-tf-stage{width:auto;min-height:0 !important}"
    + ".reveal .quiz.quiz-print .quiz-tf-item{position:static;opacity:1;pointer-events:none;display:grid;"
      + "grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:24px;"
      + "padding:9px 0;border-bottom:1px solid var(--print-line,#D9E0E7)}"
    + ".reveal .quiz.quiz-print .quiz-tf-item:first-child{border-top:1px solid var(--print-line,#D9E0E7)}"
    + ".reveal .quiz.quiz-print .quiz-tf-item .quiz-q{font-size:var(--print-body,19px);font-weight:600;line-height:1.3;margin:0}"
    + ".reveal .quiz.quiz-print .quiz-tf{gap:8px;justify-content:flex-start}"
    + ".reveal .quiz.quiz-print .quiz-tf .quiz-opt{flex:0 0 auto;width:118px;font-size:var(--print-label,14px);font-weight:600;padding:6px 10px;gap:6px}"
    + ".reveal .quiz.quiz-print .quiz-tf .quiz-opt.correct::before{display:flex;width:16px;height:16px;font-size:11px}"
      /* Reihenfolge: links beginnen; Platznummer in der Akzentfarbe – Grün
         bleibt der Lösung vorbehalten (Rand und Fläche der Karte). */
    + ".reveal .quiz.quiz-print .quiz-grid{justify-content:flex-start}"
    + ".reveal .quiz.quiz-print .quiz-grid .quiz-opt.correct::before{background:var(--print-accent," + o.accent + ")}"
      /* Zuordnung: leerer Ablagebereich entfällt, Körbe ohne Mindesthöhe */
    + ".reveal .quiz.quiz-print[data-type=match]{max-width:none}"
    + ".reveal .quiz.quiz-print .quiz-pool.quiz-pool-empty{display:none}"
    + ".reveal .quiz.quiz-print .quiz-bin{min-height:0}"
    + ".reveal .quiz.quiz-print .quiz-bin-h{font-size:var(--print-label,14px)}"
    + ".reveal .quiz.quiz-print .quiz-match .quiz-opt{font-size:var(--print-body,19px)}"
      /* Lückentext: Lösung steht im Text, die Wortkarten entfallen */
    + ".reveal .quiz.quiz-print[data-type=fill-blank]{max-width:none}"
    + ".reveal .quiz.quiz-print .quiz-fill > p{font-size:var(--print-lead,22px);line-height:2.1;color:var(--print-ink,#0B1818)}"
    + ".reveal .quiz.quiz-print .quiz-blank{min-width:0 !important;min-height:0;padding:0;margin:0 2px;border-color:transparent;background:transparent;box-shadow:none;cursor:default}"
    + ".reveal .quiz.quiz-print .quiz-blank::before{display:none}"
    + ".reveal .quiz.quiz-print .quiz-blank>.quiz-opt{animation:none}"
    + ".reveal .quiz.quiz-print .quiz-fill .quiz-opt{font-size:var(--print-body,19px);padding:2px 10px}"
    + ".reveal .quiz.quiz-print .quiz-fill .quiz-pool{display:none}"
    /* Altbestand: frühere Decks enthalten noch .quiz-feedback-Kästen – bewusst ausgeblendet */
    + ".reveal .quiz-feedback{display:none}"
    /* Browser unterdrücken beim Drucken standardmäßig Hintergrundfarben
       ("Hintergrundgrafiken drucken" ist meist aus) – ohne das hier wäre
       die komplette Farb-Kodierung (richtig/falsch, Zahlen-Badges, Körbe)
       im PDF-Export unsichtbar. */
    + ".reveal .quiz,.reveal .quiz *{-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}";
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
  function markCorrectIn(scope){
    [].slice.call(scope.querySelectorAll('.quiz-opt')).forEach(function(opt){
      if (opt.hasAttribute('data-correct')) markResult(opt, 'correct');
    });
  }
  function hideActions(quiz){
    var actions = quiz.querySelector('.quiz-actions');
    if (actions) actions.style.display = 'none';
  }

  /* Beim PDF-Export passiert kein Klick – also auch keine "richtig/falsch"
     Logik. Darum wird beim Export die Lösung direkt statisch eingeblendet,
     statt (wie sonst) erst nach Antippen durch den Betrachter. */
  function revealSolution(quiz, type){
    quiz.classList.add('quiz-print');
    if (type === 'single' || type === 'multiple'){
      quiz.classList.add('quiz-done');
      markCorrectIn(quiz);
      hideActions(quiz);
    } else if (type === 'truefalse'){
      var items = [].slice.call(quiz.querySelectorAll('.quiz-tf-item'));
      if (!items.length){
        markCorrectIn(quiz);
      } else {
        /* im Druck werden alle Aussagen gleichzeitig gestapelt statt
           einzeln überzublenden – mit den großen Touch-Buttons würde das
           bei vielen Aussagen auf einer Folie die Seite sprengen, darum
           ein eigenes, kompaktes Layout nur für diesen Fall. */
        quiz.style.minHeight = '';
        items.forEach(function(item){ markCorrectIn(item); });
      }
    } else if (type === 'order'){
      var list = quiz.querySelector('.quiz-options');
      if (list){
        var cards = [].slice.call(list.querySelectorAll('.quiz-opt'));
        cards.sort(function(a, b){ return (+a.getAttribute('data-order')) - (+b.getAttribute('data-order')); });
        cards.forEach(function(card){ list.appendChild(card); markResult(card, 'correct'); });
      }
      hideActions(quiz);
    } else if (type === 'match'){
      var bins = [].slice.call(quiz.querySelectorAll('.quiz-bin'));
      [].slice.call(quiz.querySelectorAll('.quiz-opt')).forEach(function(card){
        var soll = (card.getAttribute('data-bin') || '').trim();
        var target = bins.filter(function(b){ return b.getAttribute('data-bin') === soll; })[0];
        if (target) target.appendChild(card);
        markResult(card, 'correct');
      });
      /* liegt nichts mehr im Ablagebereich, wird er im Druck ausgeblendet */
      var pool = quiz.querySelector('.quiz-pool');
      if (pool && !pool.querySelector('.quiz-opt')) pool.classList.add('quiz-pool-empty');
      hideActions(quiz);
    } else if (type === 'fill-blank'){
      var cardsF = [].slice.call(quiz.querySelectorAll('.quiz-opt'));
      [].slice.call(quiz.querySelectorAll('.quiz-blank')).forEach(function(blank){
        var soll = (blank.getAttribute('data-answer') || '').trim();
        var card = cardsF.filter(function(c){ return c.getAttribute('data-word') === soll && c.parentNode.className.indexOf('quiz-blank') < 0; })[0];
        if (!card) return;
        blank.appendChild(card);
        blank.classList.add('filled');
        markResult(card, 'correct');
      });
      hideActions(quiz);
    }
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

  /* ---- Lückentext (Wörter aus dem Pool in Lücken setzen) ----
     Autor schreibt den Text mit <span class="quiz-blank" data-answer="Wort">;
     der Pool entsteht aus den Antworten plus data-distractors="a|b" am .quiz.
     Bedienung wie bei match: Wort antippen, dann Lücke antippen (oder erst die
     Lücke, dann das Wort). Ein platziertes Wort antippen legt es zurück. */
  function setupFillBlank(quiz, o){
    var blanks = [].slice.call(quiz.querySelectorAll('.quiz-blank')).filter(function(b){
      return (b.getAttribute('data-answer') || '').trim();
    });
    if (!blanks.length) return;
    quiz.classList.add('quiz-fill');

    var words = blanks.map(function(b){ return b.getAttribute('data-answer').trim(); });
    (quiz.getAttribute('data-distractors') || '').split('|').forEach(function(w){
      w = w.trim(); if (w) words.push(w);
    });
    var pool = document.createElement('div'); pool.className = 'quiz-pool';
    var cards = words.map(function(w){
      var c = document.createElement('button'); c.type = 'button'; c.className = 'quiz-opt';
      c.textContent = w; c.setAttribute('data-word', w);
      return c;
    });
    quiz.appendChild(pool);

    /* Lücken auf die Breite des längsten Worts setzen, damit beim Einsetzen
       nichts umbricht (Messung per Canvas, klappt auch auf versteckten Folien).
       Rahmen und Innenabstand von Karte und Lücke kommen aus dem Stylesheet,
       damit die Zahl hier nicht mit dem CSS auseinanderläuft. */
    function sizeBlanks(){
      var canvas = sizeBlanks._c || (sizeBlanks._c = document.createElement('canvas'));
      var ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx) return;
      var cs = window.getComputedStyle(cards[0]), bs = window.getComputedStyle(blanks[0]);
      ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var maxText = 0;
      words.forEach(function(w){ var m = ctx.measureText(w).width; if (m > maxText) maxText = m; });
      function px(v){ return parseFloat(v) || 0; }
      var frame = px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth)
                + px(bs.paddingLeft) + px(bs.paddingRight) + px(bs.borderLeftWidth) + px(bs.borderRightWidth);
      if (!frame) frame = 32 + 3 + 4 + 4;   // Rückfall, falls noch nichts berechnet ist
      var w = Math.ceil(maxText + frame + 6);
      blanks.forEach(function(b){ b.style.minWidth = w + 'px'; });
    }

    var picked = null, pickedBlank = null;
    function inBlank(card){ return card.parentNode !== pool; }
    function refresh(){
      blanks.forEach(function(b){ b.classList.toggle('filled', !!b.querySelector('.quiz-opt')); });
    }
    /* Ziele markieren: bei gewähltem Wort alle Lücken (der Pool nur, wenn das
       Wort schon in einer Lücke steckt), bei gewählter Lücke den Pool. */
    function highlight(){
      blanks.forEach(function(b){ b.classList.toggle('target', !!picked); });
      pool.classList.toggle('target', !!pickedBlank || !!(picked && inBlank(picked)));
    }
    function unpick(){
      if (picked){ picked.classList.remove('picked'); picked = null; }
      if (pickedBlank){ pickedBlank.classList.remove('picked'); pickedBlank = null; }
      highlight();
    }
    function clearColors(){
      quiz.classList.remove('quiz-checked');
      cards.forEach(function(c){ c.classList.remove('correct', 'wrong'); c.removeAttribute('aria-label'); });
      blanks.forEach(function(b){ b.classList.remove('missed'); b.removeAttribute('aria-label'); });
    }
    function place(card, blank){
      var prev = blank.querySelector('.quiz-opt');
      if (prev && prev !== card) pool.appendChild(prev);
      blank.appendChild(card);
      refresh(); clearColors();
    }

    cards.forEach(function(card){
      noFocus(card);
      card.addEventListener('pointerdown', stopP);
      card.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if (pickedBlank){
          var b = pickedBlank; unpick(); place(card, b);
        } else if (picked && picked !== card && inBlank(card)){
          var target = card.parentNode, c = picked; unpick(); place(c, target);   // auf ein belegtes Feld gesetzt
        } else if (picked === card){
          unpick();
        } else if (!picked && inBlank(card)){
          pool.appendChild(card); refresh(); clearColors();                       // platziertes Wort zurücklegen
        } else {
          unpick(); picked = card; card.classList.add('picked'); highlight();
        }
        card.blur();
      });
    });
    blanks.forEach(function(blank){
      blank.addEventListener('pointerdown', stopP);
      blank.addEventListener('click', function(e){
        e.stopPropagation();
        var inside = blank.querySelector('.quiz-opt');
        if (picked){ var c = picked; unpick(); place(c, blank); }
        else if (pickedBlank === blank){ unpick(); }
        else if (inside){ pool.appendChild(inside); refresh(); clearColors(); }
        else { unpick(); pickedBlank = blank; blank.classList.add('picked'); highlight(); }
      });
    });
    pool.addEventListener('pointerdown', stopP);
    pool.addEventListener('click', function(e){
      e.stopPropagation();
      if (!picked) return;
      var c = picked; unpick();
      pool.appendChild(c); refresh(); clearColors();
    });

    function check(){
      unpick(); clearColors();
      quiz.classList.add('quiz-checked');
      blanks.forEach(function(b, i){
        var card = b.querySelector('.quiz-opt');
        var soll = b.getAttribute('data-answer').trim();
        if (!card){
          b.classList.add('missed');
          b.setAttribute('aria-label', 'Lücke ' + (i + 1) + ' – nicht ausgefüllt');
        } else if (card.getAttribute('data-word') === soll){
          card.classList.add('correct');
          card.setAttribute('aria-label', soll + ' – richtig');
        } else {
          card.classList.add('wrong');
          card.setAttribute('aria-label', card.getAttribute('data-word') + ' – falsch, richtig wäre ' + soll);
        }
      });
    }
    function reset(){
      unpick(); clearColors();
      shuffle(cards).forEach(function(card){ pool.appendChild(card); });
      refresh();
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
    sizeBlanks();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeBlanks);
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
        match: function(q){ setupMatch(q, o); },
        'fill-blank': function(q){ setupFillBlank(q, o); }
      };

      var printMode = isPrintView(deck);
      function build(){
        d.querySelectorAll('.quiz[data-type]').forEach(function(quiz){
          if (quiz.getAttribute('data-quiz-init')) return;
          var type = quiz.getAttribute('data-type');
          var fn = TYPES[type];
          if (!fn) return;
          quiz.setAttribute('data-quiz-init', '1');
          fn(quiz);
          if (printMode) revealSolution(quiz, type);
        });
      }
      build();
      if (deck.on) deck.on('slidechanged', function(){
        build();
        sizers.forEach(function(f){ f(); });
      });
    }
  };

  return Plugin;
})));
