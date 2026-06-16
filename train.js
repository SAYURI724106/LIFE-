// Canvas 電車通過アニメーション (リアル画像使用・黒透過処理版)
class TrainAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animationFrameId = null;
    this.isActive = false;
    
    // 電車のリアル画像アセットの管理
    this.trainImage = null;
    this.imageLoaded = false;
    this.trainImageAspect = 3.3; // デフォルトの比率 (幅/高さ)

    // 電車のパラメータ
    this.train = {
      x: -1500,
      y: 0,
      width: 1200,
      height: 300
    };

    // リアルな電車の画像をロードし、リアルタイムで黒背景を透過処理
    const img = new Image();
    img.src = 'img/train.png';
    img.onload = () => {
      try {
        // 透過処理用テンポラリCanvasの作成
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        
        const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;
        
        // 暗い黒ピクセル (RGBがすべて30以下) を完全に透明化するクロマキー処理
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r < 30 && g < 30 && b < 30) {
            data[i + 3] = 0; // 不透明度を0に (透明化)
          }
        }
        tempCtx.putImageData(imgData, 0, 0);
        
        // 透過済みのテンポラリCanvasをイメージソースとして保持
        this.trainImage = tempCanvas;
      } catch (e) {
        console.warn("Chroma key processing failed (likely CORS/file:// protocol restriction). Falling back to raw image.", e);
        this.trainImage = img;
      }
      this.trainImageAspect = img.width / img.height;
      this.imageLoaded = true;
      
      // サイズの再計算
      this.resize();
    };

    // 演出状態
    this.phase = 'init'; // 'init' | 'train' | 'flash' | 'noise' | 'done'
    this.flashOpacity = 0;
    this.noiseIntensity = 0;
    this.onCompleteCallback = null;
    this.choice = null;
    
    // リサイズハンドラ
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // 電車サイズと位置の巨大化 (高さを画面高の300% = 3.0倍に設定し画面全体に電車しか見えないようにする)
    this.train.height = this.canvas.height * 3.0; 
    this.train.width = this.train.height * this.trainImageAspect; // 1両分の幅 (アスペクト比維持)
    
    // 縦位置：画面全体の中央に配置し、上下にはみ出して完全に覆い隠す
    this.train.y = (this.canvas.height - this.train.height) / 2; 
  }

  start(choice, onComplete) {
    this.isActive = true;
    this.choice = choice;
    this.onCompleteCallback = onComplete;
    this.phase = 'train';
    
    this.startTime = performance.now();
    
    // 電車通過演出開始前に、両方のシルエットの表示をリセット
    const motherDom = document.getElementById('silhouette-mother');
    const childDom = document.getElementById('silhouette-child');
    if (motherDom) motherDom.style.opacity = '0.9';
    if (childDom) childDom.style.opacity = '0.9';

    // 連結の重なりを考慮した1両ごとの間隔を計算
    const W = this.train.width;
    const spacing = W - 15;

    // 基準速度の算出: 以前の「10両編成が700msで通過するときの高速なスピード」を維持
    const baseDistance = this.canvas.width + 9 * spacing + W + 400;
    const speed = baseDistance / 700; // px/ms

    // 5秒間 (5000ms) でスライド移動する目標総距離
    const targetDistance = speed * 5000;

    // 目標総距離をカバーするために必要な車両数 N を逆算して決定 (~73両編成)
    const N = Math.ceil((targetDistance - this.canvas.width - W - 400) / spacing) + 1;
    this.numCars = N;

    // 電車の開始位置 (最初の1両目が画面の左端より外にいる位置) と終了位置 (全車両が画面の右端より外に出る位置)
    this.startX = -W - 200;
    this.endX = this.startX + targetDistance;
    this.train.x = this.startX;

    this.tick();
  }

  stop() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  tick() {
    if (!this.isActive) return;
    
    this.update();
    this.draw();
    
    if (this.phase !== 'done') {
      this.animationFrameId = requestAnimationFrame(() => this.tick());
    } else {
      this.stop();
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    }
  }

  update() {
    const config = window.GAME_CONFIG;
    const totalDuration = config ? config.transitions.trainDuration : 8500;
    
    const now = performance.now();
    const elapsed = now - this.startTime;

    // 1. 電車通過フェーズ (0ms 〜 5000ms: 5秒かけて超高速の長大編成が通過)
    if (elapsed < 5000) {
      this.phase = 'train';
      const progress = elapsed / 5000;
      this.train.x = this.startX + (this.endX - this.startX) * progress;
      this.flashOpacity = 0;
      this.noiseIntensity = 0;

      // --- シルエットのリアルタイム消去 (ショッキングな轢殺演出) ---
      // 電車がお母さんの左端(20%)を通過した瞬間 (母死亡ルート時: choice = child または cantmove)
      const motherThreshold = this.canvas.width * 0.2 + 80;
      if (this.choice === 'child' || this.choice === 'cantmove') {
        if (this.train.x + this.train.width >= motherThreshold) {
          const motherDom = document.getElementById('silhouette-mother');
          if (motherDom) motherDom.style.opacity = '0';
        }
      }
      
      // 電車が子どもの左端(左から約82%)を通過した瞬間 (子ども死亡ルート時: choice = mother または cantmove)
      const childThreshold = this.canvas.width * 0.82 + 80;
      if (this.choice === 'mother' || this.choice === 'cantmove') {
        if (this.train.x + this.train.width >= childThreshold) {
          const childDom = document.getElementById('silhouette-child');
          if (childDom) childDom.style.opacity = '0';
        }
      }
    }
    // 2. フラッシュフェーズ (5000ms 〜 5500ms: 0.5秒の閃光)
    else if (elapsed >= 5000 && elapsed < 5500) {
      this.phase = 'flash';
      // 電車を完全に画面外へ
      const W = this.train.width;
      const N = this.numCars || 10;
      const totalTrainLength = W + (N - 1) * (W - 15);
      this.train.x = this.endX + totalTrainLength;
      
      this.flashOpacity = 1.0 - ((elapsed - 5000) / 500);
      this.noiseIntensity = 0.8;
    }
    // 3. ノイズ減衰フェーズ (5500ms 〜 8500ms: 残り3秒で砂嵐が晴れる)
    else if (elapsed >= 5500 && elapsed < totalDuration) {
      this.phase = 'noise';
      this.train.x = this.endX + this.train.width * (this.numCars || 10);
      this.flashOpacity = 0;
      const noiseProgress = (elapsed - 5500) / (totalDuration - 5500);
      this.noiseIntensity = 0.8 * (1.0 - noiseProgress);
    }
    // 4. 演出終了
    else {
      this.phase = 'done';
      this.flashOpacity = 0;
      this.noiseIntensity = 0;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.phase === 'train') {
      this.drawTrain();
    }

    if (this.flashOpacity > 0) {
      this.drawFlash();
    }

    if (this.noiseIntensity > 0) {
      this.drawNoise();
    }
  }

  // リアルな電車連結スライド描画
  drawTrain() {
    if (!this.imageLoaded || !this.trainImage) return;

    const ctx = this.ctx;
    const t = this.train;

    ctx.save();
    
    // t.x (先頭車両の左端) から、後続車両を左方向に N 両描画する
    const W = t.width;
    const spacing = W - 15; // 連結の重なり
    const N = this.numCars || 10;
    
    for (let i = 0; i < N; i++) {
      const x = t.x - i * spacing;
      
      // 画面内に描画される範囲にある場合のみ描画
      if (x + W > -200 && x < this.canvas.width + 200) {
        ctx.drawImage(this.trainImage, x, t.y, W, t.height);
      }
    }
    
    ctx.restore();
  }

  // ホワイトアウト/フラッシュ演出
  drawFlash() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  // ノイズ・ざらつき演出 (砂嵐)
  drawNoise() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.save();
    ctx.globalAlpha = this.noiseIntensity;

    // 1. 横方向の走査線
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'; // 黒い走査線に変更して古びた感じを強調
    ctx.lineWidth = 1;
    const step = 4;
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. ランダムな砂嵐ノイズ
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    const size = w * h * 4;
    const threshold = 0.95 - (this.noiseIntensity * 0.1);

    for (let i = 0; i < size; i += 4) {
      if (Math.random() > threshold) {
        const val = Math.random() > 0.5 ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = Math.random() * 40;
      }
    }
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);

    ctx.restore();
  }
}

window.TrainAnimation = TrainAnimation;
