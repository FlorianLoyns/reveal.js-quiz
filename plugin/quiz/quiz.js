/*!
 * reveal.js-quiz 1.8.2
 * Interactive exercises for reveal.js — single choice, multiple choice,
 * true/false, ordering, matching, fill-in-the-blank and estimate. Touch / smartboard friendly, ships its own CSS,
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
    var badge = "box-sizing:border-box;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;"
              + "color:#fff;font-size:13px;font-weight:700;line-height:1;pointer-events:none;";
    var css =
      /* Einheitliches Maß für alle Aufgabentypen: volle Inhaltsbreite, linksbündig.
       (Früher max-width + margin:auto – in Flex-Layouts schrumpfte das Quiz dann auf
       den längsten Antworttext, und jede Folie war anders breit.) */
      ".reveal .quiz{box-sizing:border-box;width:100%;max-width:" + o.maxWidth + ";margin:0" + (o.align === 'center' ? ' auto' : '') + ";text-align:left;align-self:stretch;flex-shrink:0}"
    + ".reveal .quiz-q{font-size:26px;font-weight:700;line-height:1.3;color:#0B1818;margin:0 0 16px}.quiz-tf-item .quiz-q{line-height:1.38;margin:0 0 18px}"
    + ".reveal .quiz-options{display:flex;flex-direction:column;gap:12px}"
    /* EINE Karte für alle Typen: gleiche Schrift, Mindesthöhe, Innenabstand, Rahmen, Radius */
    + ".reveal .quiz-opt{box-sizing:border-box;font-family:inherit;text-align:left;font-size:20px;font-weight:400;line-height:1.25;color:#22312f;background:#fff;"
      + "border:1.5px solid " + o.line + ";border-radius:12px;min-height:56px;padding:10px 20px;margin:0;cursor:pointer;display:flex;align-items:center;gap:14px;transition:.13s}"
    + ".reveal .quiz-opt::before{content:'';flex:0 0 auto;box-sizing:border-box;width:24px;height:24px;border-radius:50%;border:2px solid " + o.line + ";"
      + "display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;transition:.13s}"
    /* kurze Antworten: gleich große Kacheln im Raster statt schmaler, ungleicher Kästen */
    + ".reveal .quiz-options.quiz-tiles{display:grid;grid-template-columns:repeat(var(--qc,4),minmax(0,1fr));gap:12px}"
    /* gewählte / angetippte Karte: überall dieselbe Rückmeldung (Rahmen, Fläche, Ring) */
    + ".reveal .quiz-opt.picked{border-color:" + o.accent + ";background:" + tint(o.accent, .06) + ";box-shadow:0 0 0 3px " + tint(o.accent, .14) + "}"
    + ".reveal .quiz-opt:hover{border-color:" + o.accent + ";background:" + tint(o.accent, .04) + "}"
    + ".reveal .quiz-opt.selected{border-color:" + o.accent + ";background:" + tint(o.accent, .06) + "}"
    + ".reveal .quiz-opt.selected::before{content:'\\2713';border-color:" + o.accent + ";background:" + o.accent + "}"
    /* Ergebnis: nur Rahmen und Zeichen farbig, Fläche bleibt weiß – ruhig, auch wenn alle Karten gleichzeitig ausgewertet werden.
       Der innere Ring macht den Rahmen kräftiger, ohne die Kartengröße zu ändern. */
    + ".reveal .quiz-opt.correct{border-color:" + o.ok + ";background:#fff;box-shadow:inset 0 0 0 1px " + o.ok + "}"
    + ".reveal .quiz-opt.correct::before{content:'\\2713';border-color:" + o.ok + ";background:" + o.ok + "}"
    + ".reveal .quiz-opt.missed{border-color:" + o.ok + "}"
    + ".reveal .quiz-opt.missed::before{content:'\\2713';border-color:" + o.ok + ";background:transparent;color:" + o.ok + "}"
    + ".reveal .quiz-opt.wrong{border-color:" + o.bad + ";background:#fff;box-shadow:inset 0 0 0 1px " + o.bad + "}"
    + ".reveal .quiz-opt.wrong::before{content:'\\2717';border-color:" + o.bad + ";background:" + o.bad + "}"
    + ".reveal .quiz.quiz-done .quiz-opt{cursor:default}"
    + ".reveal .quiz.quiz-done .quiz-opt:not(.correct):not(.wrong):not(.missed){opacity:.45}"
    + ".reveal .quiz-tf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}"
    + ".reveal .quiz-tf .quiz-opt{justify-content:center;font-weight:600}"
    + ".reveal .quiz-tf-progress{display:flex;align-items:center;gap:8px;margin:0 0 14px;font-size:15px;font-weight:600;color:#5A6A75}"
    + ".reveal .quiz-tf-progress i{display:block;width:22px;height:6px;border-radius:3px;background:" + o.line + "}"
    + ".reveal .quiz-tf-progress i.on{background:" + o.accent + "}"
    + ".reveal .quiz-tf-progress span{margin-left:6px}"
    + ".reveal .quiz-tf .quiz-opt::before{display:none}"
    /* Mehrfach-Wahr/Falsch: Fragen deckungsgleich übereinander, Überblenden ohne Verrutschen */
    + ".reveal .quiz-tf-stage{position:relative;min-height:230px}"
    + ".reveal .quiz-tf-item{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:flex-start;opacity:0;pointer-events:none;transition:opacity .45s ease}"
    + ".reveal .quiz-tf-item.active{opacity:1;pointer-events:auto}"
    /* --- Reihenfolge (order): umbrechendes Raster mit Zieh-Karten --- */
    + ".reveal .quiz-grid{counter-reset:qord;flex-direction:column;gap:12px}"
    + ".reveal .quiz-grid .quiz-opt{counter-increment:qord;width:auto;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none}"
    + ".reveal .quiz-grid .quiz-opt::before{content:counter(qord);border:none;background:" + o.accent + ";color:#fff}"
    + ".reveal .quiz-grid .quiz-opt.correct::before{content:counter(qord);background:" + o.ok + "}"
    + ".reveal .quiz-grid .quiz-opt.wrong::before{content:counter(qord);background:" + o.bad + "}"
    + ".reveal .quiz-actions{display:flex;gap:12px;margin-top:20px;justify-content:" + (o.align === 'center' ? 'center' : 'flex-start') + "}"
    + ".reveal .quiz-actions button{font-family:inherit;font-size:18px;font-weight:600;height:46px;padding:0 24px;border-radius:11px;cursor:pointer;border:1.5px solid " + o.accent + ";background:" + o.accent + ";color:#fff;transition:.12s}"
    + ".reveal .quiz-actions button.ghost{background:transparent;color:" + o.accent + "}"
    + ".reveal .quiz-actions button:active{transform:translateY(1px)}"
    /* ---- Zuordnung: Karten in Kategorien einsortieren ---- */
    + ".reveal .quiz-pool{display:grid;grid-template-columns:repeat(var(--qp,3),minmax(0,1fr));gap:10px;align-content:start;"
      + "box-sizing:border-box;min-height:84px;padding:12px;margin:0 0 16px;border:2px dashed " + o.line + ";border-radius:14px;transition:.13s}"
    + ".reveal .quiz-pool.target,.reveal .quiz-bin.target{border-color:" + o.accent + ";background:" + tint(o.accent, .05) + "}"
    + ".reveal .quiz-bins{display:grid;grid-template-columns:repeat(var(--qb,3),minmax(0,1fr));gap:12px;align-items:stretch}"
    + ".reveal .quiz-bin{box-sizing:border-box;display:flex;flex-direction:column;gap:9px;min-height:140px;padding:10px;"
      + "border:2px solid " + o.line + ";border-radius:14px;transition:.13s}"
    + ".reveal .quiz-bin-h{font-size:15px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:" + o.accent + ";"
      + "text-align:center;padding-bottom:7px;border-bottom:1px solid " + o.line + "}"
    + ".reveal .quiz-match .quiz-opt{justify-content:center;text-align:center;padding:8px 16px;gap:0;flex:0 0 auto}"
    + ".reveal .quiz-match .quiz-opt::before{display:none}"
    /* im Pool liegen gebliebene Karten sind nicht falsch, sondern unerledigt: sie treten nur zurück
       (wie nicht gewählte Antworten) – es gibt im ganzen Plugin nur zwei Ergebnisfarben */
    + ".reveal .quiz-match .quiz-opt.missed{border-color:" + o.line + ";opacity:.45}"
    /* ---- Lückentext: Wörter aus dem Pool in Lücken setzen ----
       Die Lücke ist ein leerer, leicht getönter Schlitz mit Nummer; eine
       eingesetzte Wortkarte ersetzt ihn optisch (Rahmen und Fläche der Lücke
       werden transparent, die Karte behält ihren eigenen Rahmen). Breite und
       Höhe der Lücke sind fest (sizeBlanks), darum verschiebt sich beim
       Einsetzen, Prüfen und Zurücklegen keine Zeile. */
    + ".reveal .quiz-fill{counter-reset:qblank}"
    + ".reveal .quiz-fill > p{font-size:24px;line-height:2.25;color:#22312f;margin:0 0 18px}"
      /* 1.8.1: Lückentext auch direkt in .quiz-q – dann als Fließtext mit genug Zeilenhöhe,
         sonst stoßen die Lücken zweier Zeilen aneinander */
    + ".reveal .quiz-fill .quiz-q:has(.quiz-blank){font-size:24px;font-weight:500;line-height:2.25;color:#22312f;margin:0 0 18px}"
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
    /* leer gebliebene Lücken bleiben einfach leer – keine eigene Ergebnisfarbe */
    + ".reveal .quiz-fill .quiz-pool{margin:0;grid-template-columns:repeat(auto-fill,minmax(min(100%,max(170px,var(--qp-min,170px))),1fr))}"
    + ".reveal .quiz-fill .quiz-opt{justify-content:center;text-align:center;padding:8px 16px;gap:0;touch-action:manipulation;-webkit-user-select:none;user-select:none}"
    + ".reveal .quiz-blank .quiz-opt{min-height:44px;padding:4px 14px}"
    + ".reveal .quiz-fill .quiz-opt::before{display:none}"
      /* eingesetzte Karte "setzt sich" kurz; nach dem Prüfen treten die übrigen Pool-Karten zurück */
    + ".reveal .quiz-blank.filled>.quiz-opt{animation:quiz-pop .22s cubic-bezier(.2,.9,.3,1.25)}"
    + "@keyframes quiz-pop{from{transform:scale(.88)}to{transform:scale(1)}}"
    + "@media (prefers-reduced-motion:reduce){.reveal .quiz-blank.filled>.quiz-opt{animation:none}}"
    + ".reveal .quiz-fill.quiz-checked .quiz-pool .quiz-opt:not(.picked){opacity:.45}"
    /* ---- Schätzen (estimate): eine große, feine Zahl trägt die Aufgabe, darunter nur eine
       dünne Linie mit Punkt (ziehen oder antippen), − / + als schlichte Zeichen mit großer Tippfläche.
       Nach dem Prüfen: echter Wert als grüne Linie mit zartem Toleranzstreifen, daneben ein
       knapper Text. Ein Treffer wird grün mit ✓, daneben bleibt neutral (Schätzen ist nicht "falsch"). ---- */
    + ".reveal .quiz-est{display:flex;flex-direction:column;gap:16px}"
    + ".reveal .quiz-est-row{display:flex;align-items:flex-end;gap:28px}"
    + ".reveal .quiz-est-val{display:flex;align-items:baseline;gap:14px;font-variant-numeric:tabular-nums}"
    + ".reveal .quiz-est-num{font-size:104px;font-weight:300;line-height:.95;letter-spacing:-.04em;color:#0B1818}"
    + ".reveal .quiz-est-unit{font-size:20px;font-weight:400;color:#9AA8B4}"
    + ".reveal .quiz-est-pm{display:flex;gap:10px;margin-left:auto;padding-bottom:6px}"
    /* − / + wie Antwortkarten: 56 px, feiner Rahmen, runde Ecken */
    + ".reveal .quiz-est-btn{box-sizing:border-box;width:56px;height:56px;padding:0;margin:0;font-family:inherit;font-size:32px;font-weight:300;line-height:1;"
      + "color:" + o.accent + ";background:#fff;border:1.5px solid " + o.line + ";border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;"
      + "touch-action:manipulation;-webkit-user-select:none;user-select:none;transition:background .13s}"
    + ".reveal .quiz-est-btn:hover{border-color:" + o.accent + ";background:" + tint(o.accent, .04) + "}"
    + ".reveal .quiz-est-note{display:none;flex-direction:column;gap:6px;padding-bottom:12px}"
    + ".reveal .quiz-est-cap{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:" + o.ok + "}"
    + ".reveal .quiz-est-cap i{display:none;flex:none;width:20px;height:20px;border-radius:50%;background:" + o.ok + ";color:#fff;font-style:normal;font-size:11px;font-weight:700;letter-spacing:0;align-items:center;justify-content:center}"
    + ".reveal .quiz-est-cap i::before{content:'\\2713'}"
    + ".reveal .quiz-est-detail{font-size:18px;line-height:1.3;color:#5A6A75}"
    + ".reveal .quiz-est-scale{position:relative;height:64px;cursor:pointer;touch-action:none;-webkit-user-select:none;user-select:none}"
    /* Linie wie der Fortschrittsbalken bei Wahr/Falsch (6 px, runde Enden), Punkt so groß wie die Antwortkreise */
    + ".reveal .quiz-est-track,.reveal .quiz-est-fill{position:absolute;left:0;top:27px;height:6px;border-radius:3px}"
    + ".reveal .quiz-est-track{right:0;background:" + o.line + "}"
    + ".reveal .quiz-est-fill{background:" + o.accent + ";transition:opacity .2s}"
    + ".reveal .quiz-est-band{display:none;position:absolute;top:25px;height:10px;border-radius:5px;background:" + tint(o.ok, .28) + "}"
    + ".reveal .quiz-est-truth{display:none;position:absolute;top:13px;width:3px;height:34px;margin-left:-1.5px;border-radius:2px;background:" + o.ok + "}"
    + ".reveal .quiz-est-thumb{position:absolute;top:18px;width:24px;height:24px;margin-left:-12px;border-radius:50%;background:" + o.accent + ";box-shadow:0 0 0 3px #fff;"
      + "display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;transition:background .13s}"
    + ".reveal .quiz-est-tick{position:absolute;top:46px;font-size:13px;color:#9AA8B4;white-space:nowrap}"
    + ".reveal .quiz-est-tick.l{left:0}.reveal .quiz-est-tick.r{right:0}"
    + ".reveal .quiz-est.done .quiz-est-note{display:flex}"
    + ".reveal .quiz-est.done .quiz-est-pm{display:none}"
    + ".reveal .quiz-est.done .quiz-est-band,.reveal .quiz-est.done .quiz-est-truth{display:block}"
    + ".reveal .quiz-est.done .quiz-est-fill{opacity:.35}"
    + ".reveal .quiz-est.done .quiz-est-scale{cursor:default}"
    + ".reveal .quiz-est.hit .quiz-est-thumb{background:" + o.ok + "}"
    + ".reveal .quiz-est.hit .quiz-est-thumb::after{content:'\\2713'}"
    + ".reveal .quiz-est.solution .quiz-est-thumb,.reveal .quiz-est.solution .quiz-est-fill{display:none}"
    /* ---- Ergebnis-Zeichen ✓ / ✗ bei allen Aufgabentypen – Farbe allein reicht bei
       Rot-Grün-Schwäche nicht. Die Zeichen liegen absolut, darum verschiebt sich nichts.
       Regel: in Listen (Single, Multiple, Wahr/Falsch, Reihenfolge) steht das Zeichen im Kreis
       vorn in der Karte – bei der Reihenfolge wird die Positionsnummer dazu; kleine Wortkarten
       (Zuordnung, Lückentext) tragen es in gleicher Größe auf der Ecke. ---- */
    + ".reveal .quiz:not(.quiz-print) .quiz-tf .quiz-opt{position:relative}"
    + ".reveal .quiz:not(.quiz-print) .quiz-tf .quiz-opt.correct::before,.reveal .quiz:not(.quiz-print) .quiz-tf .quiz-opt.wrong::before{display:flex;position:absolute;left:20px;top:50%;margin-top:-12px}"
    + ".reveal .quiz:not(.quiz-print) .quiz-grid .quiz-opt.correct::before{content:'\\2713'}"
    + ".reveal .quiz:not(.quiz-print) .quiz-grid .quiz-opt.wrong::before{content:'\\2717'}"
    + ".reveal .quiz-match:not(.quiz-print) .quiz-opt,.reveal .quiz-fill:not(.quiz-print) .quiz-opt{position:relative}"
    + ".reveal .quiz-match:not(.quiz-print) .quiz-opt.correct::after,.reveal .quiz-match:not(.quiz-print) .quiz-opt.wrong::after,"
      + ".reveal .quiz-fill:not(.quiz-print) .quiz-opt.correct::after,.reveal .quiz-fill:not(.quiz-print) .quiz-opt.wrong::after"
      + "{position:absolute;top:-10px;right:-10px;" + badge + "box-shadow:0 0 0 2px #fff}"
    + [".quiz-match:not(.quiz-print)", ".quiz-fill:not(.quiz-print)"].map(function(t){
        return ".reveal " + t + " .quiz-opt.correct::after{content:'\\2713';background:" + o.ok + "}"
             + ".reveal " + t + " .quiz-opt.wrong::after{content:'\\2717';background:" + o.bad + "}";
      }).join('')
    /* ---- Platz sparen, wenn eine Aufgabe zu hoch ist ----
       fitQuiz() misst jede Aufgabe beim ersten Anzeigen. Ragt sie in den Bereich der
       Steuerleiste (unterste bottomSpace px der Folie), wird sie stufenweise verdichtet:
       quiz-fit1 = flachere Karten, engere Abstände; quiz-fit2 = zusätzlich etwas kleinere
       Schrift; danach als Notlösung leicht verkleinert. Was passt, bleibt unverändert. */
    /* während des Messens keine Übergänge, sonst misst man die alten Größen */
    + ".reveal .quiz.quiz-fitting,.reveal .quiz.quiz-fitting *{transition:none !important;animation:none !important}"
    + ".reveal .quiz.quiz-fit1 .quiz-q{margin-bottom:10px}"
    + ".reveal .quiz.quiz-fit1 .quiz-opt{min-height:46px;padding-top:5px;padding-bottom:5px}"
    + ".reveal .quiz.quiz-fit1 .quiz-options,.reveal .quiz.quiz-fit1 .quiz-tf,.reveal .quiz.quiz-fit1 .quiz-bins{gap:9px}"
    + ".reveal .quiz.quiz-fit1 .quiz-pool{min-height:62px;padding:8px;gap:8px;margin-bottom:10px}"
    + ".reveal .quiz.quiz-fit1 .quiz-bin{min-height:96px;padding:8px;gap:7px}"
    + ".reveal .quiz.quiz-fit1 .quiz-bin-h{padding-bottom:5px}"
    + ".reveal .quiz.quiz-fit1 .quiz-tf-progress{margin-bottom:10px}"
    + ".reveal .quiz.quiz-fit1 .quiz-actions{margin-top:12px}"
    + ".reveal .quiz.quiz-fit1 .quiz-actions button{height:42px}"
    + ".reveal .quiz.quiz-fit1 .quiz-est-num{font-size:84px}"
    + ".reveal .quiz.quiz-fit2 .quiz-q{font-size:22px;margin-bottom:8px}"
    + ".reveal .quiz.quiz-fit2 .quiz-opt{min-height:40px;font-size:18px;padding-top:3px;padding-bottom:3px}"
    + ".reveal .quiz.quiz-fit2 .quiz-options,.reveal .quiz.quiz-fit2 .quiz-tf,.reveal .quiz.quiz-fit2 .quiz-bins{gap:6px}"
    + ".reveal .quiz.quiz-fit2 .quiz-pool{min-height:50px;padding:6px;gap:6px;margin-bottom:8px}"
    + ".reveal .quiz.quiz-fit2 .quiz-bin{min-height:72px;padding:6px;gap:6px}"
    + ".reveal .quiz.quiz-fit2 .quiz-fill > p{font-size:21px;line-height:2.1}"
    + ".reveal .quiz.quiz-fit2 .quiz-fill .quiz-q:has(.quiz-blank){font-size:21px;line-height:2.1}"
    + ".reveal .quiz.quiz-fit2 .quiz-actions{margin-top:8px}"
    + ".reveal .quiz.quiz-fit2 .quiz-actions button{height:40px;font-size:17px}"
    + ".reveal .quiz.quiz-fit2 .quiz-est-num{font-size:68px}"
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
    + ".reveal .quiz.quiz-print .quiz-opt.correct{border-color:var(--print-ok," + o.ok + ");color:var(--print-ink,#0B1818);background:" + tint(o.ok, .10) + "}"
    + ".reveal .quiz.quiz-print .quiz-opt.correct::before{border-color:var(--print-ok," + o.ok + ");background:var(--print-ok," + o.ok + ")}"
    + ".reveal .quiz.quiz-print .quiz-actions,.reveal .quiz.quiz-print .quiz-tf-progress{display:none}"
    + ".reveal .quiz.quiz-print .quiz-opt{min-height:0}"
      /* Wahr/Falsch: alle Aussagen untereinander – Aussage links, Antwort rechts */
    + ".reveal .quiz.quiz-print.quiz-tf-stage{width:auto;min-height:0 !important}"
    + ".reveal .quiz.quiz-print .quiz-tf-item{position:static;opacity:1;pointer-events:none;display:grid;"
      + "grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:24px;"
      + "padding:9px 0;border-bottom:1px solid var(--print-line,#D9E0E7)}"
    + ".reveal .quiz.quiz-print .quiz-tf-item:first-child{border-top:1px solid var(--print-line,#D9E0E7)}"
    + ".reveal .quiz.quiz-print .quiz-tf-item .quiz-q{font-size:var(--print-body,19px);font-weight:600;line-height:1.3;margin:0}"
    + ".reveal .quiz.quiz-print .quiz-tf{display:flex;gap:8px;justify-content:flex-start}"
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
    /* Schätzen im Druck: Lösungswert mit Einheit, echte Zahl als Linie auf der Skala */
    + ".reveal .quiz.quiz-print .quiz-est-pm{display:none}"
    + ".reveal .quiz.quiz-print .quiz-est-num{font-size:56px;font-weight:300}"
    + ".reveal .quiz.quiz-print .quiz-est-detail{font-size:var(--print-body,19px)}"
    + ".reveal .quiz.quiz-print .quiz-est-cap,.reveal .quiz.quiz-print .quiz-est-tick{font-size:var(--print-label,14px)}"
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
    } else if (type === 'estimate'){
      if (quiz.__quizSolve) quiz.__quizSolve();
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
  /* Zahl am Anfang einer Antwort ("20 Minuten", "< 5 %", "1,5 l") – sonst NaN */
  function leadNumber(t){
    var m = (t || '').trim().match(/^[<>≤≥~±+\-−\s]*(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(',', '.')) : NaN;
  }
  /* Antworten von Single/Multiple Choice bei jedem Aufruf (und nach Langdruck-Reset)
     neu mischen, damit sich niemand "die dritte" statt des Inhalts merkt.
     Reine Zahlen-Antworten werden stattdessen aufsteigend sortiert (5 · 10 · 20 · 40).
     data-shuffle="false" am .quiz behält die Reihenfolge, data-fixed hält eine
     einzelne Antwort an ihrem Platz. Im Druck bleibt die geschriebene Reihenfolge. */
  function mixOptions(quiz, o){
    if (o.print || !o.shuffle) return;
    var want = (quiz.getAttribute('data-shuffle') || '').toLowerCase();
    if (want === 'false' || want === 'no' || want === 'nein' || want === 'off') return;
    var list = quiz.querySelector('.quiz-options');
    if (!list) return;
    var opts = [].slice.call(list.children).filter(function(x){ return x.classList.contains('quiz-opt'); });
    if (opts.length < 2) return;
    var order;
    if (opts.every(function(x){ return !isNaN(leadNumber(x.textContent)); })){
      order = opts.slice().sort(function(a, b){ return leadNumber(a.textContent) - leadNumber(b.textContent); });
    } else {
      var free = opts.filter(function(x){ return !x.hasAttribute('data-fixed'); });
      for (var i = free.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = free[i]; free[i] = free[j]; free[j] = t; }
      order = opts.map(function(x){ return x.hasAttribute('data-fixed') ? x : free.shift(); });
    }
    order.forEach(function(x){ list.appendChild(x); });
  }

  /* Kurze Antworten (z. B. "25 %", "Herz") als gleich große Kacheln im Raster,
     lange als Liste in voller Breite. Pro Aufgabe überschreibbar:
     data-layout="tiles" | "list". */
  function applyLayout(quiz, o){
    var list = quiz.querySelector('.quiz-options');
    if (!list) return;
    var opts = [].slice.call(list.querySelectorAll('.quiz-opt'));
    var want = (quiz.getAttribute('data-layout') || '').toLowerCase();
    var n = opts.length;
    var short = n >= 2 && n <= 8 && opts.every(function(x){ return (x.textContent || '').trim().length <= o.tileMaxChars; });
    var tiles = want === 'tiles' || (want !== 'list' && o.tiles !== false && short);
    if (!tiles) return;
    list.classList.add('quiz-tiles');
    list.style.setProperty('--qc', n <= 4 ? n : (n % 3 === 0 ? 3 : 4));
  }

  /* ---- single-choice ---- */
  function setupSingle(quiz, o){
    mixOptions(quiz, o);
    applyLayout(quiz, o);
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
      mixOptions(quiz, o);
    });
  }

  /* ---- Mehrfachauswahl ---- */
  function setupMultiple(quiz, o){
    mixOptions(quiz, o);
    applyLayout(quiz, o);
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
      mixOptions(quiz, o);
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
      if (items.length > 1 && o.tfProgress){
        var prog = document.createElement('div'); prog.className = 'quiz-tf-progress'; prog.setAttribute('aria-hidden', 'true');
        for (var k = 0; k < items.length; k++){ var bar = document.createElement('i'); if (k <= i) bar.className = 'on'; prog.appendChild(bar); }
        var lab = document.createElement('span'); lab.textContent = o.tfProgress.replace('{i}', i + 1).replace('{n}', items.length);
        prog.appendChild(lab);
        item.insertBefore(prog, item.firstChild);
      }
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
    quiz.__quizResize = function(){ sizeStage.done = false; sizeStage(); };
    if (document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ sizeStage.done = false; sizeStage(); });
    }
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
    pool.style.setProperty('--qp', Math.min(bins.length, 4));   // Karten so breit wie die Körbe darunter
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
      /* 1.8.2: Wortkarten im Pool mindestens so breit wie das längste Wort –
         sonst überlappen lange Fachwörter („Organmanifestation“) die Nachbarkarte. */
      var card = Math.ceil(maxText + px(cs.paddingLeft) + px(cs.paddingRight)
               + px(cs.borderLeftWidth) + px(cs.borderRightWidth) + 6);
      pool.style.setProperty('--qp-min', card + 'px');
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
    quiz.__quizResize = sizeBlanks;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeBlanks);
  }

  /* ---- Schätzen (estimate) ----
     <div class="quiz" data-type="estimate" data-min="0" data-max="200000" data-step="1000"
          data-answer="100800" data-unit="Schläge" data-tolerance="10%">
     Bedienung: auf die Skala tippen oder ziehen (grob), − / + für einzelne Schritte –
     gedrückt halten wiederholt, nach einer Weile in Zehnerschritten. */
  function numAttr(v, d){
    if (v == null || v === '') return d;
    var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? d : n;
  }
  function decimals(n){ var s = String(n); var i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }

  function setupEstimate(quiz, o){
    var min  = numAttr(quiz.getAttribute('data-min'), 0);
    var max  = numAttr(quiz.getAttribute('data-max'), 100);
    var step = numAttr(quiz.getAttribute('data-step'), 1); if (!(step > 0)) step = 1;
    var ans  = numAttr(quiz.getAttribute('data-answer'), NaN);
    if (isNaN(ans) || !(max > min)) return;
    var unit = quiz.getAttribute('data-unit') || '';
    var L = o.estimateLabels;
    var tolS = String(quiz.getAttribute('data-tolerance') || o.estimateTolerance || '').trim();
    var pctTol = /%$/.test(tolS);
    var tol = pctTol ? Math.abs(ans) * numAttr(tolS.slice(0, -1), 0) / 100 : numAttr(tolS, 0);
    var dec = Math.max(decimals(step), decimals(min));
    var decA = Math.max(dec, decimals(ans));
    function nf(d){ try { return new Intl.NumberFormat(o.locale, { minimumFractionDigits: d, maximumFractionDigits: d }); } catch (e) { return { format: function(v){ return v.toFixed(d); } }; } }
    var fV = nf(dec), fA = nf(decA);
    var u = unit ? ' ' + unit : '';
    function snap(v){
      v = min + Math.round((v - min) / step) * step;
      return +Math.min(max, Math.max(min, v)).toFixed(dec);
    }
    function pct(v){ return Math.min(100, Math.max(0, (v - min) / (max - min) * 100)); }
    /* Start am Skalenanfang – die Mitte läge oft zufällig nah an der Lösung (data-start ändert das) */
    var start = snap(numAttr(quiz.getAttribute('data-start'), min));
    var tolText = !tol ? '' : L.tolerance + ' ±' + (pctTol ? fA.format(numAttr(tolS.slice(0, -1), 0)).replace(/,0+$/, '') + ' %' : fA.format(tol) + u);

    function el(tag, cls, txt){ var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
    var wrap = el('div', 'quiz-est');
    var row = el('div', 'quiz-est-row');
    var bMinus = el('button', 'quiz-est-btn', '−'); bMinus.type = 'button'; bMinus.setAttribute('aria-label', '−' + fV.format(step));
    var bPlus  = el('button', 'quiz-est-btn', '+');      bPlus.type = 'button';  bPlus.setAttribute('aria-label', '+' + fV.format(step));
    var val = el('div', 'quiz-est-val'); var numEl = el('span', 'quiz-est-num'); val.appendChild(numEl);
    if (unit) val.appendChild(el('span', 'quiz-est-unit', unit));
    var note = el('div', 'quiz-est-note'); var cap = el('div', 'quiz-est-cap'); var capTxt = el('span'); var ns = el('div', 'quiz-est-detail');
    cap.appendChild(el('i')); cap.appendChild(capTxt); note.appendChild(cap); note.appendChild(ns);
    var pm = el('div', 'quiz-est-pm'); pm.appendChild(bMinus); pm.appendChild(bPlus);
    row.appendChild(val); row.appendChild(note); row.appendChild(pm);

    var sc = el('div', 'quiz-est-scale');
    sc.setAttribute('data-prevent-swipe', '');
    sc.setAttribute('role', 'slider');
    sc.setAttribute('aria-valuemin', min); sc.setAttribute('aria-valuemax', max);
    var track = el('div', 'quiz-est-track'), fill = el('div', 'quiz-est-fill'), bandEl = el('div', 'quiz-est-band'),
        truth = el('div', 'quiz-est-truth'), thumb = el('div', 'quiz-est-thumb');
    [track, bandEl, fill, truth, thumb].forEach(function(x){ sc.appendChild(x); });
    sc.appendChild(el('div', 'quiz-est-tick l', fV.format(min)));
    sc.appendChild(el('div', 'quiz-est-tick r', fV.format(max)));
    wrap.appendChild(row); wrap.appendChild(sc);
    quiz.appendChild(wrap);

    var v = start, done = false, dragging = false;
    function render(){
      var p = pct(v);
      thumb.style.left = p + '%'; fill.style.width = p + '%';
      numEl.textContent = fV.format(v);
      sc.setAttribute('aria-valuenow', v); sc.setAttribute('aria-valuetext', fV.format(v) + u);
    }
    function place(){
      var pT = pct(ans);
      truth.style.left = pT + '%';
      if (tol){
        var lo = pct(ans - tol), hi = pct(ans + tol);
        bandEl.style.left = lo + '%'; bandEl.style.width = (hi - lo) + '%'; bandEl.style.visibility = '';
      } else bandEl.style.visibility = 'hidden';
    }
    function fromEvent(e){
      var r = sc.getBoundingClientRect();
      return snap(min + (e.clientX - r.left) / r.width * (max - min));
    }
    sc.addEventListener('pointerdown', function(e){
      e.stopPropagation(); e.preventDefault();
      if (done) return;
      dragging = true;
      try { sc.setPointerCapture(e.pointerId); } catch (_) {}
      v = fromEvent(e); render();
    });
    sc.addEventListener('pointermove', function(e){ if (!dragging) return; e.stopPropagation(); v = fromEvent(e); render(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(ev){ sc.addEventListener(ev, function(){ dragging = false; }); });
    /* die Wischgeste von reveal.js (Folie weiter) darf beim Ziehen nicht greifen */
    ['touchstart', 'touchmove', 'touchend', 'click'].forEach(function(ev){ sc.addEventListener(ev, stopP); });

    function hold(btn, dir){
      var t1 = null, t2 = null;
      function stop(){ clearTimeout(t1); clearInterval(t2); t1 = t2 = null; }
      noFocus(btn);
      btn.addEventListener('pointerdown', function(e){
        e.stopPropagation(); e.preventDefault();
        if (done) return;
        stop();
        v = snap(v + dir * step); render();
        t1 = setTimeout(function(){
          var n = 0;
          t2 = setInterval(function(){ n++; v = snap(v + dir * step * (n > 15 ? 10 : 1)); render(); }, 70);
        }, 420);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev){ btn.addEventListener(ev, stop); });
      ['touchstart', 'click'].forEach(function(ev){ btn.addEventListener(ev, stopP); });
    }
    hold(bMinus, -1); hold(bPlus, 1);

    function check(){
      if (done) return;
      done = true; place();
      var d = +Math.abs(v - ans).toFixed(decA);
      var hit = d <= tol + 1e-9;
      wrap.classList.add('done'); wrap.classList.toggle('hit', hit);
      var truthTxt = L.truth + ' ' + fA.format(ans) + u;
      if (d === 0){ capTxt.textContent = L.exact; ns.textContent = tolText; }
      else {
        var p = ans ? Math.round(d / Math.abs(ans) * 100) : null;
        capTxt.textContent = (hit ? L.hit + ' \u00b7 ' : '') + truthTxt;
        ns.textContent = [fA.format(d) + ' ' + L.off,
                          p === null ? '' : (p < 1 ? '< 1' : p) + '\u00a0% ' + (v < ans ? L.low : L.high),
                          tolText].filter(Boolean).join(' \u00b7 ');
      }
      sc.setAttribute('aria-valuetext', fV.format(v) + u + ' – ' + capTxt.textContent + ', ' + ns.textContent);
    }
    function reset(){
      done = false; v = start;
      wrap.classList.remove('done', 'hit', 'solution');
      render();
    }
    quiz.__quizSolve = function(){
      done = true; place();
      wrap.classList.add('done', 'solution');
      numEl.textContent = fA.format(ans);
      capTxt.textContent = L.solution; ns.textContent = tolText;
    };

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
    render();
  }

  /* ---- Aufgabe in die Folie einpassen ----
     Gemessen wird in Folienpixeln (offsetTop-Kette bis .slides, unabhängig von der Skalierung).
     Grenze: Folienhöhe minus bottomSpace – darunter liegen Steuerleiste und Pfeile. */
  function layoutBottom(el, root){
    var y = 0, e = el;
    while (e && e !== root){ y += e.offsetTop; e = e.offsetParent; }
    /* Unterkante des Inhalts (falls etwas über das Element hinausragt), in Folienpixel umgerechnet */
    var r = el.getBoundingClientRect(), f = el.offsetHeight ? r.height / el.offsetHeight : 1, maxB = r.bottom;
    for (var i = 0; i < el.children.length; i++){
      var cr = el.children[i].getBoundingClientRect();
      if (cr.height) maxB = Math.max(maxB, cr.bottom);
    }
    return { top: y, bottom: y + (maxB - r.top) / (f || 1) };
  }
  function fitQuiz(quiz, deck, o){
    if (o.print || !o.fit || quiz.__quizFitted) return;
    if (!quiz.offsetParent || !quiz.offsetHeight) return;          // Folie noch nicht sichtbar
    var root = deck.getSlidesElement ? deck.getSlidesElement() : quiz.closest('.slides');
    var limit = (deck.getConfig().height || 720) - o.bottomSpace;
    function over(){ return layoutBottom(quiz, root).bottom > limit; }
    function resize(){ if (quiz.__quizResize) quiz.__quizResize(); }
    quiz.__quizFitted = true;
    if (!over()) return;
    quiz.classList.add('quiz-fitting');
    try {
      quiz.classList.add('quiz-fit1'); resize();
      if (!over()) return;
      quiz.classList.add('quiz-fit2'); resize();
      if (!over()) return;
    /* Notlösung: gleichmäßig verkleinern (nicht unter 75 %), Breite bleibt voll */
    var b = layoutBottom(quiz, root);
    var k = Math.max(0.75, Math.min(1, (limit - b.top) / (b.bottom - b.top)));
    quiz.style.transformOrigin = '0 0';
    quiz.style.transform = 'scale(' + k.toFixed(3) + ')';
    quiz.style.width = (100 / k).toFixed(2) + '%';
    } finally {
      /* Klasse erst nach dem nächsten Frame entfernen, damit nichts nachträglich animiert */
      (window.requestAnimationFrame || setTimeout)(function(){ quiz.classList.remove('quiz-fitting'); });
    }
  }
  function fitSlide(slide, deck, o){
    if (!slide) return;
    [].forEach.call(slide.querySelectorAll('.quiz[data-quiz-init]'), function(q){ fitQuiz(q, deck, o); });
  }

  var Plugin = {
    id: 'quiz',
    init: function (deck) {
      var d = document;
      var c = deck.getConfig().quiz || {};
      var printMode = isPrintView(deck);
      var o = {
        print: printMode,
        shuffle: c.shuffle !== false,                               // Single/Multiple-Antworten mischen
        accent: c.accent || '#2C4A6E', ok: c.ok || '#639922', bad: c.bad || '#D14A4A', line: c.line || '#E7EBEF',
        checkLabel: c.checkLabel || 'Prüfen', trueLabel: c.trueLabel || 'Wahr', falseLabel: c.falseLabel || 'Falsch',
        resetLabel: c.resetLabel || 'Zurücksetzen', tfHold: (c.tfHold != null) ? c.tfHold : 1200,
        align: c.align === 'center' ? 'center' : 'left',            // linksbündig unter der Überschrift (Standard)
        maxWidth: c.maxWidth || (c.align === 'center' ? '880px' : 'none'),
        tiles: c.tiles !== false, tileMaxChars: c.tileMaxChars || 24,   // kurze Antworten als Kacheln
        tfProgress: (c.tfProgress === false) ? '' : (c.tfProgress || 'Aussage {i} von {n}'),
        locale: c.locale || 'de-DE',
        fit: c.fit !== false,                                       // zu hohe Aufgaben automatisch verdichten
        bottomSpace: (c.bottomSpace != null) ? c.bottomSpace : 96,  // unten frei für Steuerleiste/Pfeile
        estimateTolerance: (c.estimateTolerance != null) ? String(c.estimateTolerance) : '10%',
        estimateLabels: (function(l){
          var d = { off: 'daneben', low: 'zu niedrig', high: 'zu hoch', hit: 'Treffer', exact: 'Genau getroffen',
                    truth: 'tatsächlich', tolerance: 'Toleranz', solution: 'Lösung' };
          for (var k in (l || {})) d[k] = l[k];
          return d;
        })(c.estimateLabels)
      };
      injectCSS(o);
      var sizers = [];   // TF-Bühnen, die auf versteckten Folien noch nicht messbar waren
      var TYPES = {
        single: function(q){ setupSingle(q, o); },
        multiple: function(q){ setupMultiple(q, o); },
        truefalse: function(q){ setupTrueFalse(q, o, sizers); },
        order: function(q){ setupOrder(q, o); },
        match: function(q){ setupMatch(q, o); },
        'fill-blank': function(q){ setupFillBlank(q, o); },
        estimate: function(q){ setupEstimate(q, o); }
      };

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
      function fitNow(){
        var cur = deck.getCurrentSlide && deck.getCurrentSlide();
        if (!cur) return;
        /* einen Frame warten, bis reveal die Folie angezeigt und andere Plugins
           (z. B. sequence) ihre Karten eingesetzt haben */
        (window.requestAnimationFrame || setTimeout)(function(){ fitSlide(cur, deck, o); });
      }
      if (deck.on){
        deck.on('ready', fitNow);
        deck.on('slidechanged', function(){
          build();
          sizers.forEach(function(f){ f(); });
          fitNow();
        });
      }
      if (deck.isReady && deck.isReady()) fitNow();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNow);
    }
  };

  return Plugin;
})));
