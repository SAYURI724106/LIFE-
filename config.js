// LIFE ゲームテキスト・設定一元管理ファイル
const GAME_CONFIG = {
  // タイマー設定 (ミリ秒)
  timer: {
    totalDuration: 6500,   // 総時間 6.5秒
    disableDuration: 2600, // 最初の2.6秒はボタン無効 (カウント5, 4の間)
    shakeStart: 2600,      // 2.6秒経過後 (カウント3) にシェイク＆ノイズ開始
    countStart: 5,         // カウントダウン開始値
    countDuration: 1300    // 1カウントあたりの秒数 (1.3秒)
  },

  // 画面遷移時間設定 (ミリ秒)
  transitions: {
    screen02To03: 3000,    // ②問い画面から③への自動遷移 (3秒)
    trainDuration: 8500    // ⑤電車通過画面の合計演出時間 (8.5秒 = 5秒電車 + 0.5秒フラッシュ + 3秒ノイズ)
  },

  // 登場人物の名前設定 (2言語対応)
  characters: {
    mother: {
      nameEn: "Your mother",
      nameJa: "あなたの母親"
    },
    child: {
      nameEn: "Unfamiliar child",
      nameJa: "みしらぬ子供"
    }
  },

  // 各画面のテキスト設定 (2言語対応)
  screens: {
    // ⓪ スタート画面
    screen00: {
      title: "LIFE",
      startLabelEn: "tap the cow to start",
      startLabelJa: "牛をタップして開始"
    },
    // ① 導入画面
    screen01: {
      en: "Important decision of your life comes suddenly.",
      ja: "人生における重大な決断は、ある日突然やってくる。"
    },
    // ② 問い画面
    screen02: {
      en: "Which one will you save?",
      ja: "あなたはどちらを助ける？"
    },
    // ③・④ 選択画面
    selectScreen: {
      motherEn: "Your mother",
      motherJa: "あなたの母親",
      childEn: "Unfamiliar child",
      childJa: "みしらぬ子供",
      cantMoveEn: "I can't move",
      cantMoveJa: "動けない"
    },
    // ⑥ 結果画面
    resultScreen: {
      savedTemplateEn: "{saved} is saved.",
      savedTemplateJa: "{saved}が助かりました。",
      lostTemplateEn: "{lost}'s life was lost.",
      lostTemplateJa: "{lost}の命は失われました。",
      warningEn: "There is no second time.",
      warningJa: "二度目はありません。"
    },
    // ⑦ 動けないエンド画面
    cantMoveEnd: {
      titleEn: "I couldn't move",
      titleJa: "動けなかった",
      bodyEn: "You couldn't move.\nBoth of them were caught in the train.",
      bodyJa: "あなたは動けなかった。\n二人とも、電車に巻き込まれた。",
      footerEn: "Sometimes people are frozen in extreme moments.\nDo you call that weakness?",
      footerJa: "人は、極限の瞬間に体が動かなくなることがある。\nそれを弱さと呼ぶのか。"
    },
    // ⑧ 二度目画面
    secondTime: {
      en: "There is no second time.",
      ja: "二度目はありません。"
    }
  }
};

// ブラウザ環境でモジュールまたはグローバル変数としてエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GAME_CONFIG;
} else {
  window.GAME_CONFIG = GAME_CONFIG;
}
