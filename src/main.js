import './style.css?v=3';
import { SceneManager } from './three/SceneManager.js';
import { UIManager } from './ui/UIManager.js';
import { GameManager } from './game/GameManager.js';
import { soundManager } from './audio/SoundManager.js';
import { voiceCaster } from './audio/VoiceCaster.js';

function init() {
  const container = document.getElementById('canvas-container');
  const sceneManager = new SceneManager(container);
  const uiManager = new UIManager();
  const gameManager = new GameManager(sceneManager, uiManager);

  window.sceneManager = sceneManager;
  window.uiManager = uiManager;
  window.gameManager = gameManager;

  // UI 이벤트 콜백 등록
  uiManager.setCallbacks({
    onSelectLane: (lane) => {
      gameManager.selectLane(lane);
    },
    onSetBettorName: (lane, name) => {
      gameManager.setBettorName(lane, name);
    },
    onSetBetAmount: (amount) => {
      gameManager.setBetAmount(amount);
    },
    onStartRace: () => {
      soundManager.init();
      gameManager.startRace();
    },
    onNextIntro: () => {
      gameManager.nextIntroSwimmer();
    },
    onSkipIntro: () => {
      gameManager.skipIntro();
    },
    onResetRace: () => {
      gameManager.resetForNewRace();
    },
    onChangeCamera: (mode) => {
      sceneManager.setCameraMode(mode);
    },
    onFocusSwimmer: (lane) => {
      sceneManager.focusSwimmerTemporarily(lane, 3.0);
    },
    onMuteToggle: () => {
      const isMuted = soundManager.toggleMute();
      voiceCaster.setMuted(isMuted);
      return isMuted;
    },
    onToggleVoice: () => {
      return voiceCaster.toggleVoice();
    },
    onSetPenalty: (penalty) => {
      gameManager.setPenalty(penalty);
    },
    onShuffleBettors: () => {
      gameManager.shuffleBettorNames();
    },
    onRefillCoins: () => {
      if (gameManager.playerCoins < 500) {
        gameManager.playerCoins += 5000;
        uiManager.updateWallet(gameManager.playerCoins);
        soundManager.playFanfare();
        alert("🪙 5,000 코인이 무료 충전되었습니다!");
      } else {
        alert("아직 코인이 충분합니다! (500 코인 이하일 때 충전 가능)");
      }
    }
  });

  // 게임 매니저 초기화
  gameManager.init();

  // 렌더 및 물리 루프 (requestAnimationFrame)
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const time = now / 1000;

    // 게임 로직 업데이트
    gameManager.update(delta);

    // Three.js 렌더링
    const leader = gameManager.getLeaderSwimmer();
    sceneManager.render(time, delta, leader);
  }

  requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
