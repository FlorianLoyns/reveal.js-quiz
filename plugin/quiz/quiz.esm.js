/*!
 * reveal.js-quiz 1.0.0
 * Interactive exercises for reveal.js — single choice, multiple choice,
 * true/false and ordering. Touch / smartboard friendly, ships its own CSS,
 * colours and labels are easy to theme.
 * @author  Florian Loyns
 * @license MIT
 * Companion to touchcontrols and glossary. Docs & options: see README.
 */

'use strict';


  function injectCSS(o){
    if (document.getElementById('quiz-css')) return;
    var css =
      ".reveal .quiz{max-width:840px;margin:0 auto;text-align:left}"
    + ".reveal .quiz-q{font-size:26px;font-weight:700;line-height:1.2;color:#0B1818;margin:0 0 16px}"
    + ".reveal .quiz-options{display:flex;flex-direction:column;gap:12px}"
    + ".reveal .quiz-opt{font-family:inherit;text-align:left;font-size:21px;line-height:1.25;color:#22312f;background:#fff;"
      + "border:1.5px solid " + o.line + ";border-radius:14px;padding:14px 18px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:.13s}"
    + ".reveal .quiz-opt::before{content:'';flex:0 0 auto;width:26px;height:26px;border-radius:50%;border:2px solid " + o.line + ";"
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
    /* multi true/false: questions stacked, cross-fade without shifting */
    + ".reveal .quiz-tf-stage{position:relative;width:840px;max-width:100%;margin:0 auto;min-height:230px}"
    + ".reveal .quiz-tf-item{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;opacity:0;pointer-events:none;transition:opacity .45s ease}"
    + ".reveal .quiz-tf-item.active{opacity:1;pointer-events:auto}"
    /* order: wrapping grid of cards */
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
    + ".reveal .quiz-feedback{display:none}";
    var s = document.createElement('style');
    s.id = 'quiz-css'; s.textContent = css;
    document.head.appendChild(s);
  }

  function stopP(e){ e.stopPropagation(); }
  /* keep a tapped button from taking focus, otherwise reveal scroll-nudges
     the scaled slide and everything appears to shift. */
  function noFocus(el){ el.addEventListener('mousedown', function(e){ e.preventDefault(); }); }

  /* shuffle without accidentally landing on the already-correct order */
  function shuffle(cards){
    var a = cards.slice();
    for (var attempt = 0; attempt < 8; attempt++){
      for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      var sorted = a.every(function(c, idx){ return String(c.getAttribute('data-order')) === String(idx + 1); });
      if (!sorted || a.length < 2) break;
    }
    return a;
  }

  /* ---- single choice (also used by true/false) ---- */
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
        opt.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) opts.forEach(function(o){ if (o.hasAttribute('data-correct')) o.classList.add('correct'); });
        opt.blur();
      });
    });
  }

  /* ---- multiple choice ---- */
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
        if (correct && selected) opt.classList.add('correct');
        else if (!correct && selected) opt.classList.add('wrong');
        else if (correct && !selected) opt.classList.add('missed');
      });
      btn.blur();
    });
    actions.appendChild(btn);
    quiz.appendChild(actions);
  }

  /* ---- true / false ---- */
  function isTrueAns(ans){ ans = (ans || '').toLowerCase(); return ans === 'true' || ans === 'wahr' || ans === '1' || ans === 'yes' || ans === 'richtig'; }

  function makeTF(o, trueCorrect){
    var wrap = document.createElement('div'); wrap.className = 'quiz-options quiz-tf';
    var bT = document.createElement('button'); bT.type = 'button'; bT.className = 'quiz-opt'; bT.textContent = o.trueLabel;  if (trueCorrect) bT.setAttribute('data-correct', '');
    var bF = document.createElement('button'); bF.type = 'button'; bF.className = 'quiz-opt'; bF.textContent = o.falseLabel; if (!trueCorrect) bF.setAttribute('data-correct', '');
    wrap.appendChild(bT); wrap.appendChild(bF);
    return wrap;
  }
  /* wire one true/false question; onAnswered() fires after the first tap */
  function wireTF(wrap, onAnswered){
    var opts = [].slice.call(wrap.querySelectorAll('.quiz-opt'));
    var done = false;
    opts.forEach(function(opt){
      noFocus(opt);
      opt.addEventListener('pointerdown', stopP);
      opt.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if (done) return; done = true;
        var correct = opt.hasAttribute('data-correct');
        opt.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) opts.forEach(function(o2){ if (o2.hasAttribute('data-correct')) o2.classList.add('correct'); });
        opt.blur();
        if (onAnswered) onAnswered();
      });
    });
  }

  function setupTrueFalse(quiz, o){
    var items = [].slice.call(quiz.querySelectorAll('.quiz-tf-item'));

    /* single question (backwards compatible): data-answer on the .quiz */
    if (!items.length){
      var wrap = makeTF(o, isTrueAns(quiz.getAttribute('data-answer')));
      quiz.appendChild(wrap);
      wireTF(wrap, null);
      return;
    }

    /* several questions on one slide: answer → hold briefly →
       automatically cross-fade to the next (no click needed). */
    quiz.classList.add('quiz-tf-stage');
    items.forEach(function(item, i){
      var wrap = makeTF(o, isTrueAns(item.getAttribute('data-answer')));
      item.appendChild(wrap);
      wireTF(wrap, function(){
        if (i >= items.length - 1) return;         // last question: keep it on screen
        setTimeout(function(){
          items[i].classList.remove('active');
          items[i + 1].classList.add('active');
        }, o.tfHold);
      });
      item.classList.toggle('active', i === 0);
    });
  }

  /* size every order card to the widest one, for a tidy grid. Measures with
     a canvas, so it works even on slides that are not visible yet
     (independent of layout). */
  function equalizeCards(cards){
    if (!cards.length) return;
    var cs = window.getComputedStyle(cards[0]);
    var canvas = equalizeCards._c || (equalizeCards._c = document.createElement('canvas'));
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var maxText = 0;
    cards.forEach(function(c){ var w = ctx.measureText(c.textContent).width; if (w > maxText) maxText = w; });
    var extra = 26 + 14 + 18 + 18 + 3;   // number badge + gap + left/right padding + border
    var w = Math.ceil(maxText + extra + 6);
    cards.forEach(function(c){ c.style.width = w + 'px'; });
  }

  /* swap two elements in the DOM safely (even when adjacent) */
  function swapNodes(a, b){
    var tmp = document.createElement('span');
    a.parentNode.insertBefore(tmp, a);
    b.parentNode.insertBefore(a, b);
    tmp.parentNode.insertBefore(b, tmp);
    tmp.parentNode.removeChild(tmp);
  }

  /* ---- order (tap two cards to swap) ---- */
  function setupOrder(quiz, o){
    var list = quiz.querySelector('.quiz-options');
    if (!list) return;
    list.classList.add('quiz-grid');
    var cards = [].slice.call(list.querySelectorAll('.quiz-opt'));
    if (!cards.length) return;
    shuffle(cards).forEach(function(card){ list.appendChild(card); });
    equalizeCards(cards);

    var picked = null;
    function clearColors(){ cards.forEach(function(c){ c.classList.remove('correct', 'wrong'); }); }

    cards.forEach(function(card){
      card.type = 'button';
      noFocus(card);
      card.addEventListener('pointerdown', stopP);
      card.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if (!picked){
          picked = card; card.classList.add('picked');
        } else if (picked === card){
          picked.classList.remove('picked'); picked = null;         // deselect
        } else {
          swapNodes(picked, card);                                  // swap
          picked.classList.remove('picked'); picked = null;
          clearColors();                                            // colours are stale after a swap
        }
        card.blur();
      });
    });

    function check(){
      [].slice.call(list.children).forEach(function(card, i){
        card.classList.remove('correct', 'wrong');
        card.classList.add(String(card.getAttribute('data-order')) === String(i + 1) ? 'correct' : 'wrong');
      });
    }
    function reset(){
      if (picked){ picked.classList.remove('picked'); picked = null; }
      shuffle(cards).forEach(function(card){ card.classList.remove('correct', 'wrong'); list.appendChild(card); });
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
  }

  var Plugin = {
    id: 'quiz',
    init: function (deck) {
      var d = document;
      var c = deck.getConfig().quiz || {};
      var o = {
        accent: c.accent || '#2C4A6E', ok: c.ok || '#639922', bad: c.bad || '#D14A4A', line: c.line || '#E7EBEF',
        checkLabel: c.checkLabel || 'Check', trueLabel: c.trueLabel || 'True', falseLabel: c.falseLabel || 'False',
        resetLabel: c.resetLabel || 'Reset', tfHold: c.tfHold || 1200
      };
      injectCSS(o);
      var TYPES = {
        single: setupSingle,
        multiple: function(q){ setupMultiple(q, o); },
        truefalse: function(q){ setupTrueFalse(q, o); },
        order: function(q){ setupOrder(q, o); }
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
      if (deck.on) deck.on('slidechanged', build);
    }
  };

export default Plugin;
