import { soundManager } from '../audio/SoundManager.js';
import { SWIMMERS_DATA } from '../game/SwimmerData.js';

/**
 * 올림픽 중계 그래픽 및 배팅 UI 관리자 (UIManager)
 * - 내기 참가자 이름 태깅
 * - 올림픽 선수 소개 인트로 오버레이
 * - 돌발 상황 스택 피드 (Multi-Incident Stack)
 */
export class UIManager {
  constructor() {
    this.callbacks = {};

    // DOM 요소 캐싱
    this.walletDisplay = document.getElementById('wallet-coins');
    this.bettingScreen = document.getElementById('betting-screen');
    this.introScreen = document.getElementById('intro-screen');
    this.raceHud = document.getElementById('race-hud');
    this.resultModal = document.getElementById('result-modal');
    this.announcement = document.getElementById('race-announcement');
    this.incidentStack = document.getElementById('incident-stack');
    this.swimmerCardsContainer = document.getElementById('swimmer-cards');
    this.leaderboardContainer = document.getElementById('race-leaderboard');
    this.minimapTracksContainer = document.getElementById('minimap-lanes');
    this.liveTimerDisplay = document.getElementById('live-timer');
    this.betAmountInput = document.getElementById('bet-amount-input');
    this.selectedSwimmerName = document.getElementById('selected-swimmer-name');
    this.selectedSwimmerQuote = document.getElementById('selected-swimmer-quote');
    this.potentialWinDisplay = document.getElementById('potential-win');

    // 인트로 오버레이 요소들
    this.introLaneTag = document.getElementById('intro-lane-tag');
    this.introAvatar = document.getElementById('intro-avatar');
    this.introName = document.getElementById('intro-name');
    this.introAgeGender = document.getElementById('intro-age-gender');
    this.introBettorBadge = document.getElementById('intro-bettor-badge');
    this.introNickname = document.getElementById('intro-nickname');
    this.introQuote = document.getElementById('intro-quote');

    // 상단 빠른 내기 등록 바 컨테이너
    this.bettorQuickContainer = document.getElementById('bettor-quick-inputs');
    this.dockBettorInput = document.getElementById('dock-bettor-input');

    this.currentSelectedLane = 4;
  }

  setCallbacks(callbacks) {
    this.callbacks = callbacks;
    this.bindEvents();
  }

  bindEvents() {
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = this.callbacks.onMuteToggle();
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    const voiceBtn = document.getElementById('btn-voice');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        const isVoiceOn = this.callbacks.onToggleVoice ? this.callbacks.onToggleVoice() : true;
        voiceBtn.classList.toggle('active', isVoiceOn);
        voiceBtn.textContent = isVoiceOn ? '🎙️' : '🔇';
        voiceBtn.title = isVoiceOn ? 'AI 스포츠 캐스터 음성 중계: ON' : 'AI 스포츠 캐스터 음성 중계: OFF';
        this.showToast(isVoiceOn ? '🎙️ AI 스포츠 캐스터 음성 중계가 켜졌습니다!' : '🔇 AI 음성 중계가 꺼졌습니다.');
        soundManager.playClick();
      });
    }

    const shuffleBtn = document.getElementById('btn-shuffle-bettors');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        if (this.callbacks.onShuffleBettors) {
          this.callbacks.onShuffleBettors();
          this.showToast('🎲 참가자 이름이 8개 레인에 무작위 셔플되었습니다!');
          soundManager.playClick();
        }
      });
    }

    // 벌칙 프리셋 버튼들
    const penaltyBtns = document.querySelectorAll('.penalty-preset-btn');
    const customPenaltyInput = document.getElementById('custom-penalty-input');

    penaltyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        penaltyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const penalty = btn.dataset.penalty;

        if (penalty === 'custom') {
          if (customPenaltyInput) {
            customPenaltyInput.classList.remove('hidden');
            customPenaltyInput.focus();
            if (this.callbacks.onSetPenalty) {
              this.callbacks.onSetPenalty(customPenaltyInput.value.trim() || '벌칙 당첨');
            }
          }
        } else {
          if (customPenaltyInput) {
            customPenaltyInput.classList.add('hidden');
          }
          if (this.callbacks.onSetPenalty) {
            this.callbacks.onSetPenalty(penalty);
          }
        }
        soundManager.playClick();
      });
    });

    if (customPenaltyInput) {
      customPenaltyInput.addEventListener('pointerdown', (e) => e.stopPropagation());
      customPenaltyInput.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      customPenaltyInput.addEventListener('click', (e) => {
        e.stopPropagation();
        customPenaltyInput.focus();
      });
      customPenaltyInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (this.callbacks.onSetPenalty) {
          this.callbacks.onSetPenalty(val || '벌칙 당첨');
        }
      });
    }

    const refillBtn = document.getElementById('btn-refill');
    if (refillBtn) {
      refillBtn.addEventListener('click', () => {
        if (this.callbacks.onRefillCoins) this.callbacks.onRefillCoins();
      });
    }

    // 모바일 전체화면 (Fullscreen) 토글 버튼
    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          fsBtn.textContent = '🗗';
        } else {
          document.exitFullscreen().catch(() => {});
          fsBtn.textContent = '⛶';
        }
        soundManager.playClick();
      });
    }

    // 모바일 가로 모드 토글 (PC/모바일 공용 시뮬레이터)
    const mobileToggleBtn = document.getElementById('btn-toggle-mobile');
    if (mobileToggleBtn) {
      mobileToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('mobile-landscape-mode');
        const isActive = document.body.classList.contains('mobile-landscape-mode');
        mobileToggleBtn.style.borderColor = isActive ? '#38bdf8' : '';
        mobileToggleBtn.style.background = isActive ? 'rgba(56, 189, 248, 0.3)' : '';
        soundManager.playClick();
      });
    }

    // 모바일 가로 화면 자동 감지 (터치 기기 및 640px 이하 뷰포트)
    const autoDetectMobile = () => {
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobileSize = (window.innerHeight <= 640) || (window.innerWidth <= 1024 && isLandscape && isTouch);
      if (isMobileSize) {
        document.body.classList.add('mobile-landscape-mode');
      }
    };
    window.addEventListener('resize', autoDetectMobile);
    window.addEventListener('orientationchange', autoDetectMobile);
    autoDetectMobile();

    // 세로 모드 안내 닫기 버튼
    const dismissOriBtn = document.getElementById('btn-dismiss-orientation');
    if (dismissOriBtn) {
      dismissOriBtn.addEventListener('click', () => {
        const overlay = document.getElementById('orientation-overlay');
        if (overlay) overlay.style.display = 'none';
        soundManager.playClick();
      });
    }

    // 예시 이름 자동 채우기 버튼
    const autoFillBtn = document.getElementById('btn-auto-fill-bettors');
    if (autoFillBtn) {
      autoFillBtn.addEventListener('click', () => {
        const sampleNames = ["철수", "영희", "민수", "부장님", "과장님", "김대리", "박팀장", "막내인턴"];
        for (let lane = 1; lane <= 8; lane++) {
          const sample = sampleNames[lane - 1];
          this.callbacks.onSetBettorName(lane, sample);
          this.syncBettorInputs(lane, sample);
        }
        soundManager.playClick();
      });
    }

    // 8인 명단 일괄 입력 버튼 (쉼표로 구분하여 한번에 세팅)
    const batchPasteBtn = document.getElementById('btn-batch-paste-bettors');
    if (batchPasteBtn) {
      batchPasteBtn.addEventListener('click', () => {
        const input = prompt("쉼표(,)나 줄바꿈으로 8명의 참가자 이름을 입력하세요:\n(예: 지훈, 수진, 현우, 민아, 승우, 은지, 도현, 태희)");
        if (input && input.trim()) {
          const names = input.split(/[,，\n]+/).map(n => n.trim()).filter(n => n.length > 0);
          if (names.length > 0) {
            for (let lane = 1; lane <= 8; lane++) {
              const name = names[lane - 1] || "";
              if (name) {
                this.callbacks.onSetBettorName(lane, name);
                this.syncBettorInputs(lane, name);
              }
            }
            soundManager.playClick();
          }
        }
      });
    }

    // 하단 독 내기 참가자 인풋 연동
    if (this.dockBettorInput) {
      this.dockBettorInput.addEventListener('pointerdown', (e) => e.stopPropagation());
      this.dockBettorInput.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      this.dockBettorInput.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dockBettorInput.focus();
      });
      this.dockBettorInput.addEventListener('input', (e) => {
        const val = e.target.value;
        this.callbacks.onSetBettorName(this.currentSelectedLane, val);
        this.syncBettorInputs(this.currentSelectedLane, val);
      });
    }

    // 카메라 전환 버튼
    const camButtons = document.querySelectorAll('.cam-btn');
    camButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        camButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.cam;
        this.callbacks.onChangeCamera(mode);
        soundManager.playClick();
      });
    });

    // 배팅 금액 칩 버튼들
    const chipButtons = document.querySelectorAll('.chip-btn');
    chipButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        let current = parseInt(this.betAmountInput.value) || 1000;
        let next = current;

        if (val === 'half') {
          next = Math.max(100, Math.floor(current / 2));
        } else if (val === 'max') {
          next = 999999;
        } else {
          next = current + parseInt(val);
        }
        this.callbacks.onSetBetAmount(next);
      });
    });

    if (this.betAmountInput) {
      this.betAmountInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) || 100;
        this.callbacks.onSetBetAmount(val);
      });
    }

    // 경기 시작 버튼
    const startBtn = document.getElementById('btn-start-race');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        // 배팅 화면 즉각 차단 (어떤 기기/브라우저 환경에서도 잔류 불가)
        this.setElementVisible(this.bettingScreen, false);
        if (this.callbacks.onStartRace) {
          this.callbacks.onStartRace();
        }
      });
    }

    // 인트로 스킵 버튼들 (상단 플로팅 바 & 하단 카드 도크)
    const skipAllBtns = [
      document.getElementById('btn-skip-intro'),
      document.getElementById('btn-dock-skip')
    ];
    skipAllBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.callbacks.onSkipIntro) this.callbacks.onSkipIntro();
        });
      }
    });

    // 다음 선수 소개 버튼들 (상단 플로팅 바 & 하단 카드 도크)
    const nextBtns = [
      document.getElementById('btn-next-intro'),
      document.getElementById('btn-dock-next')
    ];
    nextBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.callbacks.onNextIntro) this.callbacks.onNextIntro();
        });
      }
    });

    // 결과 모달 다음 경기 버튼
    const nextRaceBtn = document.getElementById('btn-next-race');
    if (nextRaceBtn) {
      nextRaceBtn.addEventListener('click', () => {
        this.callbacks.onResetRace();
      });
    }

    // 결과 단톡방 클립보드 복사 버튼
    const copyResultBtn = document.getElementById('btn-copy-result');
    if (copyResultBtn) {
      copyResultBtn.addEventListener('click', () => {
        this.copyResultToClipboard();
      });
    }
  }

  setActiveCamButton(mode) {
    const camButtons = document.querySelectorAll('.cam-btn');
    camButtons.forEach(btn => {
      if (btn.dataset.cam === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateWallet(coins) {
    if (this.walletDisplay) {
      this.walletDisplay.textContent = coins.toLocaleString();
    }
  }

  setElementVisible(el, isVisible, displayType = 'block') {
    if (!el) return;
    if (isVisible) {
      el.classList.remove('hidden');
      el.style.setProperty('display', displayType, 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('pointer-events', 'auto', 'important');
    } else {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    }
  }

  showBettingScreen(swimmers, selectedLane, betAmount, currentPenalty) {
    this.setElementVisible(this.bettingScreen, true, 'flex');
    this.setElementVisible(this.introScreen, false);
    this.setElementVisible(this.raceHud, false);
    this.setElementVisible(this.resultModal, false);
    if (this.incidentStack) this.incidentStack.innerHTML = '';

    this.currentSelectedLane = selectedLane;
    this.renderQuickBettorBar(swimmers);
    this.renderSwimmerCards(swimmers, selectedLane);
    this.updateBetAmount(betAmount);

    // 벌칙 프리셋 버튼 동기화
    if (currentPenalty) {
      const penaltyBtns = document.querySelectorAll('.penalty-preset-btn');
      const customInput = document.getElementById('custom-penalty-input');
      let foundPreset = false;
      penaltyBtns.forEach(btn => {
        const p = btn.dataset.penalty;
        const isMatch = (p === currentPenalty);
        btn.classList.toggle('active', isMatch);
        if (isMatch) foundPreset = true;
      });
      if (!foundPreset && customInput) {
        const customBtn = document.querySelector('.penalty-preset-btn[data-penalty="custom"]');
        if (customBtn) customBtn.classList.add('active');
        customInput.classList.remove('hidden');
        customInput.value = currentPenalty;
      } else if (customInput) {
        customInput.classList.add('hidden');
      }
    }
  }

  // 상단 8인 빠른 내기 명단 등록 바 렌더링
  renderQuickBettorBar(swimmers) {
    if (!this.bettorQuickContainer) return;
    this.bettorQuickContainer.innerHTML = '';

    swimmers.forEach(s => {
      const isSelected = (s.lane === this.currentSelectedLane);
      const item = document.createElement('div');
      item.className = `registry-item ${isSelected ? 'selected-bet-lane' : ''}`;
      item.dataset.lane = s.lane;
      item.innerHTML = `
        <div class="reg-lane-label" title="터치하여 ${s.lane}번 레인을 배팅 선수로 선택">
          <span class="lane-tag-${s.lane}">L${s.lane} ${s.name}</span>
        </div>
        <input type="text" class="reg-lane-input" data-lane="${s.lane}" placeholder="이름 입력" value="${s.bettorName || ''}">
      `;

      // 라벨 터치 시 해당 레인 배팅 선수로 즉시 선택!
      const label = item.querySelector('.reg-lane-label');
      label.addEventListener('click', () => {
        this.callbacks.onSelectLane(s.lane);
      });

      const input = item.querySelector('.reg-lane-input');
      input.addEventListener('pointerdown', (e) => e.stopPropagation());
      input.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      input.addEventListener('click', (e) => {
        e.stopPropagation();
        input.focus();
      });
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        this.callbacks.onSetBettorName(s.lane, val);
        this.syncBettorInputs(s.lane, val);
      });

      this.bettorQuickContainer.appendChild(item);
    });
  }

  // 상단 바, 카드, 하단 독 간의 내기 참가자 이름 양방향 동기화
  syncBettorInputs(lane, val) {
    // 1. 상단 빠른 등록 바 인풋 동기화
    const quickInput = document.querySelector(`.reg-lane-input[data-lane="${lane}"]`);
    if (quickInput && quickInput.value !== val) quickInput.value = val;

    // 2. 카드 내부 인풋 동기화
    const cardInput = document.querySelector(`.bettor-name-input[data-lane="${lane}"]`);
    if (cardInput && cardInput.value !== val) cardInput.value = val;

    // 3. 하단 독 인풋 동기화 (선택된 레인일 때)
    if (this.currentSelectedLane === lane && this.dockBettorInput && this.dockBettorInput.value !== val) {
      this.dockBettorInput.value = val;
    }

    // 4. 독 텍스트 갱신
    const swimmer = SWIMMERS_DATA ? SWIMMERS_DATA.find(s => s.lane === lane) : null;
    if (swimmer && this.currentSelectedLane === lane) {
      swimmer.bettorName = val;
      this.updateSelectedCardInfo(swimmer);
    }
  }

  renderSwimmerCards(swimmers, selectedLane) {
    this.swimmerCardsContainer.innerHTML = '';

    swimmers.forEach(s => {
      const card = document.createElement('div');
      card.className = `swimmer-card ${s.lane === selectedLane ? 'selected' : ''}`;
      card.dataset.lane = s.lane;
      const laneColorClass = `lane-color-${s.lane}`;

      card.innerHTML = `
        <div class="card-header">
          <span class="lane-badge ${laneColorClass}">LANE ${s.lane}</span>
          <span class="odds-tag">1등 시 8.0x</span>
        </div>
        <div class="card-body">
          <div class="swimmer-avatar">${s.flag}</div>
          <div class="swimmer-info">
            <h3 class="swimmer-name">${s.name} <span class="swimmer-age">${s.age}세 (${s.gender === 'male' ? '남' : '여'})</span></h3>
            <p class="swimmer-nick">"${s.nickname}"</p>
          </div>
        </div>

        <!-- 내기 건 사람 이름 태깅 인풋 -->
        <div class="bettor-input-row" onclick="event.stopPropagation()">
          <span class="bettor-label">🏷️ 내기 건 사람:</span>
          <input type="text" class="bettor-name-input" data-lane="${s.lane}" placeholder="이름 입력 (예: 철수)" value="${s.bettorName || ''}">
        </div>

        <div class="fake-stats">
          <div class="stat-row">
            <span>속도</span>
            <div class="stat-bar"><div class="stat-fill speed" style="width: ${s.fakeStats.speed}%"></div></div>
            <span>${s.fakeStats.speed}</span>
          </div>
          <div class="stat-row">
            <span>지구력</span>
            <div class="stat-bar"><div class="stat-fill stamina" style="width: ${s.fakeStats.stamina}%"></div></div>
            <span>${s.fakeStats.stamina}</span>
          </div>
          <div class="stat-row">
            <span>멘탈</span>
            <div class="stat-bar"><div class="stat-fill mental" style="width: ${s.fakeStats.mental}%"></div></div>
            <span>${s.fakeStats.mental}</span>
          </div>
        </div>
        <p class="swimmer-quote">"${s.quote}"</p>
      `;

      // 카드 클릭 시 레인 선택
      card.addEventListener('click', () => {
        this.callbacks.onSelectLane(s.lane);
      });

      // 내기 건 사람 이름 입력 이벤트
      const bettorInput = card.querySelector('.bettor-name-input');
      bettorInput.addEventListener('pointerdown', (e) => e.stopPropagation());
      bettorInput.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      bettorInput.addEventListener('click', (e) => {
        e.stopPropagation();
        bettorInput.focus();
      });
      bettorInput.addEventListener('input', (e) => {
        const val = e.target.value;
        this.callbacks.onSetBettorName(s.lane, val);
      });

      this.swimmerCardsContainer.appendChild(card);
    });

    this.updateSelectedCardInfo(swimmers.find(s => s.lane === selectedLane));
  }

  setSelectedLane(lane) {
    this.currentSelectedLane = lane;
    const cards = document.querySelectorAll('.swimmer-card');
    cards.forEach(c => {
      c.classList.toggle('selected', parseInt(c.dataset.lane) === lane);
    });

    // 상단 8인 바 선택 하이라이트 동기화
    const regItems = this.bettorQuickContainer?.querySelectorAll('.registry-item');
    regItems?.forEach(item => {
      const iLane = parseInt(item.dataset.lane, 10);
      item.classList.toggle('selected-bet-lane', iLane === lane);
    });

    const swimmer = SWIMMERS_DATA ? SWIMMERS_DATA.find(s => s.lane === lane) : null;
    if (swimmer) {
      this.updateSelectedCardInfo(swimmer);
    }
    this.updatePotentialWin();
  }

  updateSelectedCardInfo(swimmer) {
    if (!swimmer) return;
    if (this.selectedSwimmerName) {
      const bettorText = swimmer.bettorName ? ` [내기: ${swimmer.bettorName}]` : '';
      this.selectedSwimmerName.textContent = `[${swimmer.lane}번 레인] ${swimmer.name}${bettorText} (${swimmer.nickname})`;
    }
    if (this.dockBettorInput && this.dockBettorInput.value !== (swimmer.bettorName || '')) {
      this.dockBettorInput.value = swimmer.bettorName || '';
    }
    if (this.selectedSwimmerQuote) {
      this.selectedSwimmerQuote.textContent = `"${swimmer.quote}"`;
    }
    this.updatePotentialWin();
  }

  updateBetAmount(amount) {
    if (this.betAmountInput) {
      this.betAmountInput.value = amount;
    }
    this.updatePotentialWin();
  }

  updatePotentialWin() {
    const amount = parseInt(this.betAmountInput.value) || 1000;
    const win1 = Math.round(amount * 8.0);
    const win2 = Math.round(amount * 2.5);
    const win3 = Math.round(amount * 1.5);

    if (this.potentialWinDisplay) {
      this.potentialWinDisplay.innerHTML = `
        <span>1등 적중 시: <strong>+${win1.toLocaleString()}</strong> C (8배)</span>
        <span class="sub-odds">2등: +${win2.toLocaleString()} (2.5x) | 3등: +${win3.toLocaleString()} (1.5x)</span>
      `;
    }
  }

  // --- 올림픽 선수 소개 인트로 오버레이 표시 ---
  showIntroScreen(swimmer) {
    this.setElementVisible(this.bettingScreen, false);
    this.setElementVisible(this.introScreen, true, 'block');
    this.setElementVisible(this.raceHud, false);
    this.setElementVisible(this.resultModal, false);

    if (this.introLaneTag) {
      this.introLaneTag.textContent = `LANE ${swimmer.lane}`;
      this.introLaneTag.className = `intro-lane-tag lane-color-${swimmer.lane}`;
    }
    if (this.introAvatar) this.introAvatar.textContent = swimmer.flag;
    if (this.introName) this.introName.textContent = swimmer.name;
    if (this.introAgeGender) {
      this.introAgeGender.textContent = `${swimmer.age}세 (${swimmer.gender === 'male' ? '남' : '여'})`;
    }
    if (this.introBettorBadge) {
      const bName = swimmer.bettorName || "지정 안 됨";
      this.introBettorBadge.innerHTML = `🏷️ 내기 참가자: <strong>${bName}</strong>`;
    }
    if (this.introNickname) this.introNickname.textContent = `"${swimmer.nickname}"`;
    if (this.introQuote) this.introQuote.textContent = `"${swimmer.quote}"`;
  }

  showRaceHUD() {
    this.setElementVisible(this.bettingScreen, false);
    this.setElementVisible(this.introScreen, false);
    this.setElementVisible(this.raceHud, true, 'block');
    this.setElementVisible(this.resultModal, false);
    this.buildMinimapLanes();
  }

  buildMinimapLanes() {
    if (!this.minimapTracksContainer) return;
    this.minimapTracksContainer.innerHTML = '';
    for (let lane = 1; lane <= 8; lane++) {
      const track = document.createElement('div');
      track.className = 'minimap-track';
      track.innerHTML = `
        <span class="m-lane-num">${lane}</span>
        <div class="m-lane-line">
          <div class="m-dot dot-lane-${lane}" id="minimap-dot-${lane}"></div>
        </div>
      `;
      this.minimapTracksContainer.appendChild(track);
    }
  }

  showAnnouncement(text) {
    if (this.announcement) {
      this.announcement.textContent = text;
      this.announcement.classList.remove('hidden');
      this.announcement.classList.add('pop-anim');
    }
  }

  hideAnnouncement() {
    if (this.announcement) {
      this.announcement.classList.add('hidden');
      this.announcement.classList.remove('pop-anim');
    }
  }

  // --- 돌발 상황 누적 피드 스택 (Multi-Incident Stack) ---
  // 여러 돌발 상황이 겹쳐도 이전 알림이 사라지지 않고 차곡차곡 쌓임!
  pushIncidentAlert(name, lane, incident, comment, bettorName = "") {
    if (!this.incidentStack) return;

    const bettorHtml = bettorName ? `<span class="feed-bettor">🏷️ ${bettorName}</span>` : '';

    const alertCard = document.createElement('div');
    alertCard.className = 'incident-feed-card slide-in-feed';
    alertCard.innerHTML = `
      <div class="feed-left">
        <span class="feed-emoji">${incident.emoji}</span>
      </div>
      <div class="feed-content">
        <div class="feed-header">
          <span class="feed-lane-tag lane-color-${lane}">L${lane}</span>
          <strong class="feed-name">${name}</strong>
          ${bettorHtml}
          <span class="feed-incident-name">${incident.name}</span>
        </div>
        <p class="feed-comment">${comment}</p>
      </div>
    `;

    alertCard.style.cursor = 'pointer';
    alertCard.title = '탭하여 이 선수의 돌발 상황 클로즈업!';
    alertCard.addEventListener('click', () => {
      if (this.callbacks.onFocusSwimmer) {
        this.callbacks.onFocusSwimmer(lane);
        soundManager.playClick();
      }
    });

    this.incidentStack.appendChild(alertCard);

    // 3.8초 동안 유지 후 부드럽게 퇴장 (다음 돌발 상황과 겹침 원천 차단)
    setTimeout(() => {
      alertCard.classList.add('fade-out');
      setTimeout(() => alertCard.remove(), 350);
    }, 3800);
  }

  // 실시간 레이스 HUD (타이머, 순위표, 미니맵) 갱신
  updateRaceHUD({ timeStr, ranks, leader, selectedLane, finishOrder = [] }) {
    if (this.liveTimerDisplay) {
      this.liveTimerDisplay.textContent = timeStr;
    }

    // 미니맵 점 위치 업데이트 (우측 0m -> 좌측 50m)
    ranks.forEach(s => {
      const dot = document.getElementById(`minimap-dot-${s.lane}`);
      if (dot) {
        const percent = Math.min(100, Math.max(0, (s.progressZ / 50.0) * 100));
        dot.style.right = `${percent}%`;
        if (s.lane === selectedLane) {
          dot.classList.add('my-bet-dot');
        }
      }
    });

    // 좌측 실시간 리더보드 (가독성 극대화 & 골인 순위 100% 확정 고정)
    if (this.leaderboardContainer) {
      this.leaderboardContainer.innerHTML = ranks.map((s, idx) => {
        const isBet = (s.lane === selectedLane);
        const isFinished = finishOrder.includes(s.lane);
        const finishRank = isFinished ? (finishOrder.indexOf(s.lane) + 1) : null;
        const dist = Math.min(50, Math.max(0, s.progressZ)).toFixed(1);

        // 순위 표시 (1~3위 메달, 8위 벌칙 경고)
        let rankBadge = `${idx + 1}`;
        if (idx === 0) rankBadge = '🥇 1';
        else if (idx === 1) rankBadge = '🥈 2';
        else if (idx === 2) rankBadge = '🥉 3';
        else if (idx === 7) rankBadge = '😈 8';

        // 상태 및 골인 확정 표기
        let statusBadge = '<span class="status-swimming">🏊</span>';
        let distBadge = `<span class="lb-dist">${dist}m</span>`;

        if (isFinished) {
          statusBadge = '<span class="status-finish">🏁 터치</span>';
          distBadge = `<span class="lb-dist lb-goal">🏁 ${finishRank}위 확정</span>`;
        } else if (s.state === 'INCIDENT') {
          statusBadge = `<span class="status-incident" title="${s.incident.name}">${s.incident.emoji}</span>`;
        }

        // 배터 이름 최우선 가독성 표시
        let nameHtml = '';
        if (s.data.bettorName) {
          nameHtml = `
            <span class="lb-bettor-tag" title="배터: ${s.data.bettorName}">[${s.data.bettorName}]</span>
            <span class="lb-swimmer-name">${s.data.name}</span>
          `;
        } else {
          nameHtml = `<span class="lb-swimmer-name">${s.data.name}</span>`;
        }

        return `
          <div class="leaderboard-item ${isBet ? 'highlight-bet' : ''} ${isFinished ? 'is-finished' : ''} rank-${idx + 1}">
            <span class="lb-rank">${rankBadge}</span>
            <span class="lb-lane lane-tag-${s.lane}">L${s.lane}</span>
            <div class="lb-name-wrapper">
              ${isBet ? '<span class="lb-my-tag">MY</span>' : ''}
              ${nameHtml}
            </div>
            <span class="lb-status">${statusBadge}</span>
            ${distBadge}
          </div>
        `;
      }).join('');
    }
  }

  // 경기 결과 모달
  showResultModal({ userLane, userRank, betAmount, winCoins, multiplier, rankedSwimmers, totalCoins, currentPenalty }) {
    this.lastResultData = { userLane, userRank, betAmount, winCoins, multiplier, rankedSwimmers, totalCoins, currentPenalty };
    this.setElementVisible(this.resultModal, true, 'flex');

    const titleEl = document.getElementById('result-title');
    const msgEl = document.getElementById('result-msg');
    const payoutEl = document.getElementById('result-payout');
    const podiumEl = document.getElementById('result-podium');
    const rankListEl = document.getElementById('result-full-ranks');

    const isWin = (userRank <= 4 && winCoins > 0);

    if (userRank === 1) {
      titleEl.innerHTML = `🥇 1위 적중 대박!! 🥇`;
      titleEl.className = 'result-title gold';
      msgEl.textContent = `축하합니다! ${userLane}번 레인이 완벽한 정석 자유형으로 1위를 차지했습니다!`;
    } else if (userRank === 2) {
      titleEl.innerHTML = `🥈 아쉬운 2위! 🥈`;
      titleEl.className = 'result-title silver';
      msgEl.textContent = `아깝습니다! ${userLane}번 레인이 2위로 결승선을 통과했습니다.`;
    } else if (userRank === 3) {
      titleEl.innerHTML = `🥉 3위 입상! 🥉`;
      titleEl.className = 'result-title bronze';
      msgEl.textContent = `${userLane}번 레인이 3위로 시상대에 올랐습니다!`;
    } else if (userRank === 4) {
      titleEl.innerHTML = `🏅 4위 본전 환급! 🏅`;
      titleEl.className = 'result-title neutral';
      msgEl.textContent = `4위로 배팅 원금을 안전하게 환급받았습니다.`;
    } else {
      titleEl.innerHTML = `💥 배팅 실패 (${userRank}위) 💥`;
      titleEl.className = 'result-title fail';
      msgEl.textContent = `돌발 상황의 벽을 넘지 못하고 ${userRank}위로 레이스를 마쳤습니다!`;
    }

    payoutEl.innerHTML = `
      <div class="payout-row">
        <span>배팅 금액:</span> <strong>${betAmount.toLocaleString()} C</strong>
      </div>
      <div class="payout-row">
        <span>배당 배율:</span> <strong>${multiplier.toFixed(1)}x</strong>
      </div>
      <div class="payout-row highlight">
        <span>획득 코인:</span> <strong class="${isWin ? 'text-win' : 'text-lose'}">+${winCoins.toLocaleString()} C</strong>
      </div>
      <div class="payout-row total">
        <span>현재 총 보유 코인:</span> <strong>${totalCoins.toLocaleString()} C</strong>
      </div>
    `;

    // 1, 2, 3위 포디움 시상대 (배터 이름 대문짝 강조)
    if (podiumEl) {
      const s1 = rankedSwimmers[0];
      const s2 = rankedSwimmers[1];
      const s3 = rankedSwimmers[2];

      const b1 = s1?.data.bettorName ? `<div class="podium-bettor">🏷️ ${s1.data.bettorName}</div>` : '';
      const b2 = s2?.data.bettorName ? `<div class="podium-bettor">🏷️ ${s2.data.bettorName}</div>` : '';
      const b3 = s3?.data.bettorName ? `<div class="podium-bettor">🏷️ ${s3.data.bettorName}</div>` : '';

      podiumEl.innerHTML = `
        <div class="podium-col rank-2">
          ${b2}
          <div class="podium-swimmer">${s2 ? s2.data.flag : ''} ${s2 ? s2.data.name : ''}</div>
          <div class="podium-step step-2">2위 (L${s2 ? s2.lane : ''})</div>
        </div>
        <div class="podium-col rank-1">
          <div class="podium-crown">👑</div>
          ${b1}
          <div class="podium-swimmer">${s1 ? s1.data.flag : ''} ${s1 ? s1.data.name : ''}</div>
          <div class="podium-step step-1">1위 (L${s1 ? s1.lane : ''})</div>
        </div>
        <div class="podium-col rank-3">
          ${b3}
          <div class="podium-swimmer">${s3 ? s3.data.flag : ''} ${s3 ? s3.data.name : ''}</div>
          <div class="podium-step step-3">3위 (L${s3 ? s3.lane : ''})</div>
        </div>
      `;
    }

    // 8위(최하위 꼴찌) 내기 벌칙 당첨자 특별 박제 카드
    const penaltyEl = document.getElementById('result-penalty-box');
    if (penaltyEl && rankedSwimmers.length >= 8) {
      const loser = rankedSwimmers[rankedSwimmers.length - 1]; // 8등 최하위
      const loserBettor = loser?.data.bettorName ? loser.data.bettorName : '익명의 배터';
      const loserSwimmer = `${loser?.data.flag || '🏊'} ${loser?.data.name || ''} (L${loser?.lane || ''})`;
      const incidentDesc = loser?.incident ? `${loser.incident.emoji} ${loser.incident.name}` : '체력 방전 거북이 수영';
      const isUserLoser = (loser?.lane === userLane);
      const penaltyName = currentPenalty || '☕ 커피 쏘기';

      penaltyEl.innerHTML = `
        <div class="penalty-badge">😈 오늘의 8위 꼴찌 【 ${penaltyName} 】 당첨자! 💸</div>
        <div class="penalty-card-inner ${isUserLoser ? 'penalty-my-bet' : ''}">
          <div class="penalty-left-icon">😈</div>
          <div class="penalty-body">
            <div class="penalty-target-row">
              <span class="penalty-bettor-name">🏷️ 【 ${loserBettor} 】 당첨!</span>
              <span class="penalty-swimmer-name">${loserSwimmer}</span>
            </div>
            <div class="penalty-reason">
              💥 사유: <strong>${incidentDesc}</strong>의 늪에 빠져 끝내 8등 침몰!
            </div>
            <div class="penalty-quote">
              ${isUserLoser ? `😱 "아이고 배터님! 오늘 [${penaltyName}]은 당신의 몫입니다... 💸"` : `🎉 "축하합니다(?) 오늘 [${penaltyName}] 잘 먹겠습니다! 👏"`}
            </div>
          </div>
        </div>
      `;
    }

    // 8인 전체 순위표 (배터 이름 & 돌발 상황 복구 요약)
    if (rankListEl) {
      rankListEl.innerHTML = rankedSwimmers.map((s, idx) => {
        const isBet = (s.lane === userLane);
        const bettorStr = s.data.bettorName ? `<strong class="fr-bettor">[배터: ${s.data.bettorName}]</strong>` : '';
        const incidentDesc = s.incident ? `${s.incident.emoji} ${s.incident.name} (회복완영)` : '✨ 정석 질주 완주';

        return `
          <div class="full-rank-row ${isBet ? 'my-pick' : ''}">
            <span class="fr-num">${idx + 1}등</span>
            <span class="fr-lane">LANE ${s.lane}</span>
            <span class="fr-name">${s.data.flag} ${s.data.name} ${bettorStr}</span>
            <span class="fr-incident">${incidentDesc}</span>
          </div>
        `;
      }).join('');
    }
  }

  // 토스트 메시지 안내 (3초)
  showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
  }

  // 단톡방(카카오톡/슬랙) 공유용 결과 텍스트 클립보드 복사
  copyResultToClipboard() {
    if (!this.lastResultData) return;
    const { rankedSwimmers, currentPenalty, userLane, userRank } = this.lastResultData;
    const penalty = currentPenalty || '☕ 커피 쏘기';

    let text = `🏊‍♂️ [올림픽 코믹 수영 50m 레이스 결과] 🏊‍♂️\n`;
    text += `🎯 오늘의 8위 꼴찌 벌칙: 【 ${penalty} 】\n\n`;

    rankedSwimmers.forEach((s, idx) => {
      const rank = idx + 1;
      const medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `${rank}위`));
      const bettor = s.data.bettorName ? `[배터: ${s.data.bettorName}]` : '';
      const myTag = (s.lane === userLane) ? ' ⭐(내 픽)' : '';
      const note = rank === 1 ? '✨ 우승!' : (rank === 8 ? `😈 ${penalty} 당첨!` : '');
      text += `${medal} L${s.lane} ${s.data.name} ${bettor}${myTag} ${note}\n`;
    });

    const loser = rankedSwimmers[rankedSwimmers.length - 1];
    const loserBettor = loser?.data.bettorName ? `【 ${loser.data.bettorName} 】` : `L${loser?.lane} ${loser?.data?.name}`;
    text += `\n👉 ${loserBettor} 님! [ ${penalty} ] 당첨을 축하(?)합니다! 🎉\n`;
    text += `🎮 게임 링크: https://swimmingincoding.github.io/comic-swim-game/`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('📋 단톡방 공유용 결과가 복사되었습니다! 카톡/슬랙에 붙여넣기(Ctrl+V)하세요!');
        soundManager.playClick();
      }).catch(() => {
        this.fallbackCopyText(text);
      });
    } else {
      this.fallbackCopyText(text);
    }
  }

  fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast('📋 단톡방 공유용 결과가 복사되었습니다! 카톡/슬랙에 붙여넣기(Ctrl+V)하세요!');
      soundManager.playClick();
    } catch (e) {
      alert('클립보드 복사 권한이 없습니다.');
    }
    document.body.removeChild(ta);
  }
}
