// LIFE ゲーム進行・制御ロジック (第3イテレーション)
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM要素の取得 ---
  const container = document.getElementById('game-container');
  const timerContainer = document.getElementById('global-timer-container');
  const timerBar = document.getElementById('timer-bar');
  const countdownEl = document.getElementById('countdown-number');
  const globalSilhouetteLayer = document.getElementById('global-silhouette-layer');
  const globalSilhouetteMother = document.getElementById('silhouette-mother');
  const globalSilhouetteChild = document.getElementById('silhouette-child');
  const noiseOverlay = document.getElementById('noise-overlay');
  const canvas = document.getElementById('train-canvas');
  const screen06 = document.getElementById('screen-06');
  const screen07 = document.getElementById('screen-07');
  
  // ボタン
  const btnStartCow = document.getElementById('btn-start-cow');
  const btnChoiceMother = document.getElementById('btn-choice-mother');
  const btnChoiceChild = document.getElementById('btn-choice-child');
  const btnCantMove = document.getElementById('btn-choice-cantmove');
  const debugResetBtn = document.getElementById('debug-reset-btn');

  // --- 変数定義 ---
  let trainAnimation = null;
  let timerInterval = null;
  let timerStartTime = 0;
  let isTimerRunning = false;
  let currentChoice = null;
  
  // デバッグモード判定
  const urlParams = new URLSearchParams(window.location.search);
  const isDebug = urlParams.get('debug') === 'true';

  if (isDebug) {
    debugResetBtn.style.display = 'block';
    debugResetBtn.addEventListener('click', () => {
      sessionStorage.removeItem('life_game_played_v2');
      localStorage.removeItem('life_game_played_v2');
      window.location.href = window.location.pathname + '?debug=true';
    });
  }

  // --- 初期化処理 ---
  function init() {
    // 1. 一回限りプレイ制御のチェック
    const playedSession = sessionStorage.getItem('life_game_played_v2');
    const playedLocal = localStorage.getItem('life_game_played_v2');
    
    if ((playedSession || playedLocal) && !isDebug) {
      setupSecondScreen();
      changeScreen('screen-08');
      return;
    }

    // 2. テキスト設定の流し込み
    setupTexts();

    // 3. 電車アニメーションの初期化
    trainAnimation = new TrainAnimation(canvas);

    // 4. 初回画面（⓪スタート画面）を表示
    changeScreen('screen-00');
    setupScreen00Events();
  }

  // --- テキストの設定 (2言語対応) ---
  function setupTexts() {
    const config = window.GAME_CONFIG;
    if (!config) return;

    // ⓪ スタート画面
    document.getElementById('s00-title').textContent = config.screens.screen00.title;
    document.getElementById('s00-sub-en').textContent = config.screens.screen00.startLabelEn;
    document.getElementById('s00-sub-ja').textContent = config.screens.screen00.startLabelJa;

    // ① 導入画面
    document.getElementById('s01-message-en').textContent = config.screens.screen01.en;
    document.getElementById('s01-message-ja').textContent = config.screens.screen01.ja;
    document.getElementById('s01-tap').textContent = `▶ tap to continue`;

    // ② 問い画面
    document.getElementById('s02-message-en').textContent = config.screens.screen02.en;
    document.getElementById('s02-message-ja').textContent = config.screens.screen02.ja;

    // ③ 選択画面
    document.getElementById('s03-mother-en').textContent = config.screens.selectScreen.motherEn;
    document.getElementById('s03-mother-ja').textContent = config.screens.selectScreen.motherJa;
    document.getElementById('s03-child-en').textContent = config.screens.selectScreen.childEn;
    document.getElementById('s03-child-ja').textContent = config.screens.selectScreen.childJa;
    
    document.getElementById('s03-cantmove-en').textContent = config.screens.selectScreen.cantMoveEn;
    document.getElementById('s03-cantmove-ja').textContent = config.screens.selectScreen.cantMoveJa;

    // ⑧ 二度目画面
    document.getElementById('s08-message-en').textContent = config.screens.secondTime.en;
    document.getElementById('s08-message-ja').textContent = config.screens.secondTime.ja;
  }

  // --- 画面遷移制御 ---
  function changeScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    // 共通UIアセットの表示制御
    if (screenId === 'screen-03') {
      // 選択画面: 共通シルエットレイヤーは非表示（画面内のシルエットボタンを使うため）
      globalSilhouetteLayer.style.display = 'none';
      timerContainer.style.display = 'block';
      countdownEl.style.display = 'block';
      countdownEl.textContent = '5';
      countdownEl.classList.remove('urgent');
      
      // 最初から選べるようにするため、背景を screen04.jpg にする
      targetScreen.style.backgroundImage = "url('img/screen04.jpg')";
    } else if (screenId === 'screen-05') {
      // 電車通過画面: 共通シルエットレイヤーを表示（電車で隠すため）
      globalSilhouetteLayer.style.display = 'block';
      globalSilhouetteMother.style.opacity = '0.9';
      globalSilhouetteChild.style.opacity = '0.9';
      
      timerContainer.style.display = 'none';
      countdownEl.style.display = 'none';
      container.classList.remove('shake-active');
      noiseOverlay.classList.remove('active');
    } else if (screenId === 'screen-06') {
      // 結果画面: 共通シルエットレイヤーを表示（生存者のみ表示するため）
      globalSilhouetteLayer.style.display = 'block';
      timerContainer.style.display = 'none';
      countdownEl.style.display = 'none';
      container.classList.remove('shake-active');
      noiseOverlay.classList.remove('active');
    } else {
      // その他の画面 (スタート画面、導入画面、問い画面など)
      globalSilhouetteLayer.style.display = 'none';
      timerContainer.style.display = 'none';
      countdownEl.style.display = 'none';
      container.classList.remove('shake-active');
      noiseOverlay.classList.remove('active');
    }
  }

  // --- ⓪ スタート画面の処理 ---
  function setupScreen00Events() {
    const startTransition = () => {
      btnStartCow.removeEventListener('click', startTransition);
      btnStartCow.removeEventListener('touchstart', startTransition);
      
      changeScreen('screen-01');
      setupScreen01Events();
    };

    btnStartCow.addEventListener('click', startTransition);
    btnStartCow.addEventListener('touchstart', startTransition);
  }

  // --- ① 導入画面の処理 ---
  function setupScreen01Events() {
    const s01 = document.getElementById('screen-01');
    
    const transitionTo02 = () => {
      s01.removeEventListener('click', transitionTo02);
      s01.removeEventListener('touchstart', transitionTo02);
      
      changeScreen('screen-02');
      setupScreen02Events();
    };

    s01.addEventListener('click', transitionTo02);
    s01.addEventListener('touchstart', transitionTo02);
  }

  // --- ② 問い画面の処理 ---
  function setupScreen02Events() {
    const config = window.GAME_CONFIG;
    const delay = config ? config.transitions.screen02To03 : 3000;
    
    setTimeout(() => {
      changeScreen('screen-03');
      startSelectionTimer();
    }, delay);
  }

  // --- ③ 選択画面のタイマー制御 ---
  function startSelectionTimer() {
    const config = window.GAME_CONFIG;
    const duration = config.timer.totalDuration;         // 6500ms
    const countStart = config.timer.countStart;         // 5
    const countDur = config.timer.countDuration;         // 1300ms
    
    timerStartTime = performance.now();
    isTimerRunning = true;
    currentChoice = null;
    let preSelectedChoice = null;

    // 最初からすべての選択肢を選べるように有効化
    btnChoiceMother.disabled = false;
    btnChoiceChild.disabled = false;
    btnCantMove.disabled = false;
    
    // ハイライト状態の初期化
    btnCantMove.classList.remove('selected');

    // 背景画像を screen04.jpg に切り替える
    const s03 = document.getElementById('screen-03');
    s03.style.backgroundImage = "url('img/screen04.jpg')";

    function updateTimer() {
      if (!isTimerRunning) return;

      const now = performance.now();
      const elapsed = now - timerStartTime;
      const remaining = Math.max(0, duration - elapsed);
      const progress = remaining / duration;

      // 1. タイマーバーの更新
      timerBar.style.transform = `scaleX(${progress})`;

      // 2. カウントダウン数字の更新 (5 -> 4 -> 3 -> 2 -> 1 -> 0)
      const currentCount = Math.max(0, countStart - Math.floor(elapsed / countDur));
      countdownEl.textContent = currentCount;

      // 3. タイムアウト (6500ms到達時)
      if (elapsed >= duration) {
        isTimerRunning = false;
        handleChoice('cantmove');
      } else {
        requestAnimationFrame(updateTimer);
      }
    }

    requestAnimationFrame(updateTimer);

    // シルエットボタン・動けないボタンクリックイベントの設定
    btnChoiceMother.onclick = () => handleChoice('mother');
    btnChoiceChild.onclick = () => handleChoice('child');
    
    // 「選べない/動けない」を押した場合はハイライトするが、カウントダウンが終わるまで他の選択肢も選べるようにする
    btnCantMove.onclick = () => {
      preSelectedChoice = 'cantmove';
      btnCantMove.classList.add('selected');
    };
  }

  // --- 選択ボタン押下時の処理 ---
  function handleChoice(choice) {
    isTimerRunning = false;
    currentChoice = choice;

    // 即座にボタンを無効化し、二重選択を防止
    btnChoiceMother.disabled = true;
    btnChoiceChild.disabled = true;
    btnCantMove.disabled = true;

    // プレイ結果の保存 (リロード対策)
    savePlayResult(choice);

    // 画面⑤（電車通過）へ遷移
    changeScreen('screen-05');
    
    // 電車通過アニメーション開始
    trainAnimation.start(choice, () => {
      if (choice === 'mother' || choice === 'child') {
        setupResultScreen(choice);
        changeScreen('screen-06');
        startResultScreenInteraction();
      } else {
        setupCantMoveEndScreen();
        changeScreen('screen-07');
        startCantMoveEndInteraction();
      }
    });
  }

  // --- 結果画面 (screen-06) のタップ遷移制御 (マルチページ対応) ---
  function startResultScreenInteraction() {
    let screen06Step = 1;
    
    // 初期状態: 生存者テキストのみ表示、死亡した側のコメントは非表示
    document.getElementById('s06-saved-ja').style.display = '';
    document.getElementById('s06-saved-en').style.display = '';
    document.getElementById('s06-lost-ja').style.display = 'none';
    document.getElementById('s06-lost-en').style.display = 'none';

    const onScreen06Click = (e) => {
      // debug-reset-btn などのクリック時は遷移を防ぐ
      if (e.target && e.target.id === 'debug-reset-btn') return;

      if (screen06Step === 1) {
        screen06Step = 2;
        // 生存者テキストを非表示にし、死亡側のコメントを表示
        document.getElementById('s06-saved-ja').style.display = 'none';
        document.getElementById('s06-saved-en').style.display = 'none';
        document.getElementById('s06-lost-ja').style.display = '';
        document.getElementById('s06-lost-en').style.display = '';
      } else if (screen06Step === 2) {
        // 二度目はありません（screen-08）へ遷移
        screen06.removeEventListener('click', onScreen06Click);
        screen06.removeEventListener('touchstart', onScreen06Click);
        setupSecondScreen();
        changeScreen('screen-08');
      }
    };

    screen06.addEventListener('click', onScreen06Click);
    screen06.addEventListener('touchstart', onScreen06Click);
  }

  // --- 動けないエンド画面 (screen-07) のタップ遷移制御 (マルチページ対応) ---
  function startCantMoveEndInteraction() {
    let screen07Step = 1;

    // 初期状態: タイトルと「どちらも選べなかった」旨の本文を表示、後半の哲学的な問い(footer)は非表示
    document.querySelector('.cantmove-end-title').style.display = '';
    document.querySelector('.cantmove-end-body').style.display = '';
    document.querySelector('.cantmove-end-footer').style.display = 'none';

    const onScreen07Click = (e) => {
      if (e.target && e.target.id === 'debug-reset-btn') return;

      if (screen07Step === 1) {
        screen07Step = 2;
        // 前半部分を非表示にし、後半のコメント「人は、極限の瞬間…」を表示
        document.querySelector('.cantmove-end-title').style.display = 'none';
        document.querySelector('.cantmove-end-body').style.display = 'none';
        document.querySelector('.cantmove-end-footer').style.display = '';
      } else if (screen07Step === 2) {
        // 二度目はありません（screen-08）へ遷移
        screen07.removeEventListener('click', onScreen07Click);
        screen07.removeEventListener('touchstart', onScreen07Click);
        setupSecondScreen();
        changeScreen('screen-08');
      }
    };

    screen07.addEventListener('click', onScreen07Click);
    screen07.addEventListener('touchstart', onScreen07Click);
  }

  // --- プレイ記録の永続化 ---
  function savePlayResult(choice) {
    const playData = {
      played: true,
      choice: choice,
      timestamp: new Date().getTime()
    };
    const dataStr = JSON.stringify(playData);
    
    sessionStorage.setItem('life_game_played_v2', dataStr);
    localStorage.setItem('life_game_played_v2', dataStr);
  }

  // --- 結果画面の設定 (2言語対応・中央寄せ) ---
  function setupResultScreen(choice) {
    const config = window.GAME_CONFIG;
    const ch = config.characters;

    let savedEn = '';
    let savedJa = '';
    let lostEn = '';
    let lostJa = '';

    if (choice === 'mother') {
      savedEn = ch.mother.nameEn;
      savedJa = ch.mother.nameJa;
      lostEn = ch.child.nameEn;
      lostJa = ch.child.nameJa;
      
      // 共通シルエットレイヤー: お母さんのみ表示、子どもは非表示
      globalSilhouetteMother.style.opacity = '0.9';
      globalSilhouetteChild.style.opacity = '0';
      
      // 結果画面の背景
      document.getElementById('screen-06').style.backgroundImage = "url('img/screen06a.jpg')";
    } else {
      savedEn = ch.child.nameEn;
      savedJa = ch.child.nameJa;
      lostEn = ch.mother.nameEn;
      lostJa = ch.mother.nameJa;
      
      // 共通シルエットレイヤー: 子どものみ表示、お母さんは非表示
      globalSilhouetteMother.style.opacity = '0';
      globalSilhouetteChild.style.opacity = '0.9';
      
      // 結果画面の背景
      document.getElementById('screen-06').style.backgroundImage = "url('img/screen06b.jpg')";
    }

    // テキスト挿入 (英語2行、日本語2行のグループへ流し込み)
    const s06 = config.screens.resultScreen;
    document.getElementById('s06-saved-en').textContent = s06.savedTemplateEn.replace('{saved}', savedEn);
    document.getElementById('s06-saved-ja').textContent = s06.savedTemplateJa.replace('{saved}', savedJa);
    document.getElementById('s06-lost-en').textContent = s06.lostTemplateEn.replace('{lost}', lostEn);
    document.getElementById('s06-lost-ja').textContent = s06.lostTemplateJa.replace('{lost}', lostJa);
  }

  // --- 動けないエンド画面の設定 (2言語対応) ---
  function setupCantMoveEndScreen() {
    const config = window.GAME_CONFIG;
    const s07 = config.screens.cantMoveEnd;
    
    // 動けないエンドはシルエット非表示
    globalSilhouetteMother.style.opacity = '0';
    globalSilhouetteChild.style.opacity = '0';

    document.getElementById('s07-title-en').textContent = s07.titleEn;
    document.getElementById('s07-title-ja').textContent = s07.titleJa;
    
    document.getElementById('s07-body-en').innerHTML = s07.bodyEn.replace('\n', '<br>');
    document.getElementById('s07-body-ja').innerHTML = s07.bodyJa.replace('\n', '<br>');
    
    document.getElementById('s07-footer-en').innerHTML = s07.footerEn.replace('\n', '<br>');
    document.getElementById('s07-footer-ja').innerHTML = s07.footerJa.replace('\n', '<br>');
  }

  // --- 二度目画面の設定 (2言語対応) ---
  function setupSecondScreen() {
    const config = window.GAME_CONFIG;
    document.getElementById('s08-message-en').textContent = config.screens.secondTime.en;
    document.getElementById('s08-message-ja').textContent = config.screens.secondTime.ja;
  }

  // 初期化実行
  init();
});
