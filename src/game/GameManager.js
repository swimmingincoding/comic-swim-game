import { generateRacePlan } from './ComicIncidents.js';
import { SWIMMERS_DATA } from './SwimmerData.js';
import { soundManager } from '../audio/SoundManager.js';
import { voiceCaster } from '../audio/VoiceCaster.js';
import confetti from 'canvas-confetti';

/**
 * 게임 메인 로직 및 상태 관리자 (GameManager)
 * - 내기 참가자 이름(Bettor Name) 태깅 지원
 * - 올림픽 공식 결승 선수 소개 인트로 (Athlete Lineup Presentation)
 * - 올림픽 공식 출발 시퀀스 (호각 -> 스타트대 승강 -> Take your marks -> BEEP!)
 * - 돌발 상황 스택 알림 및 시간차 분산
 * - 7등까지 무조건 완영 후 순위 확정
 */
export class GameManager {
  constructor(sceneManager, uiManager) {
    this.sceneManager = sceneManager;
    this.uiManager = uiManager;

    this.playerCoins = 10000;
    this.selectedLane = 4;
    this.betAmount = 1000;

    // 경기 상태: 'BETTING', 'INTRO', 'CALL_TO_BLOCKS', 'TAKE_MARKS', 'RACING', 'FINISHED'
    this.state = 'BETTING';
    this.raceTime = 0;
    this.racePlan = null;
    this.finishOrder = [];

    // 인트로 씬 상태
    this.introLaneIndex = 0; // 0 (레인 1) ~ 7 (레인 8)
    this.introTimer = 0;
    this.introPerSwimmer = 3.2; // 1.4초 백스테이지 워킹 + 1.8초 시그니처 포징

    // 출발 시퀀스 상태
    this.startSequenceTimer = 0;
    this.startStep = 0;

    this.sprintClimaxTriggered = false;
    this.wakeLock = null;
    this.currentPenalty = '☕ 커피 쏘기';
  }

  loadSavedBettors() {
    try {
      this.currentPenalty = localStorage.getItem('comic_swim_penalty') || '☕ 커피 쏘기';
      const saved = localStorage.getItem('comic_swim_bettors');
      if (saved) {
        const map = JSON.parse(saved);
        SWIMMERS_DATA.forEach(s => {
          if (map[s.lane] !== undefined && map[s.lane].trim() !== '') {
            s.bettorName = map[s.lane];
          }
        });
      }
    } catch (e) {}
  }

  saveBettorNames() {
    try {
      const map = {};
      SWIMMERS_DATA.forEach(s => {
        map[s.lane] = s.bettorName || '';
      });
      localStorage.setItem('comic_swim_bettors', JSON.stringify(map));
    } catch (e) {}
  }

  init() {
    this.loadSavedBettors();
    this.resetForNewRace();
  }

  resetForNewRace() {
    this.state = 'BETTING';
    this.raceTime = 0;
    this.finishOrder = [];
    this.introLaneIndex = 0;
    this.introTimer = 0;
    this.lastIncidentTime = -999;
    this.sprintClimaxTriggered = false;

    // 레이스 계획 생성 (1등 선정 및 겹치지 않는 돌발 상황 Z 배정)
    this.racePlan = generateRacePlan(SWIMMERS_DATA);

    // 선수들 데크 바닥 대기 자세로 초기화
    this.sceneManager.swimmers.forEach(s => s.setDeckStand());
    this.sceneManager.pool.resetTouchPads();
    this.sceneManager.pool.updateScoreboard({
      statusText: "BETTING & LINEUP",
      time: "00:00.00",
      leaderName: "READY",
      newsText: "선수별 내기 이름을 태깅하고 [경기 시작]을 누르세요!"
    });

    this.uiManager.updateWallet(this.playerCoins);
    this.uiManager.showBettingScreen(SWIMMERS_DATA, this.selectedLane, this.betAmount, this.currentPenalty);
  }

  // 벌칙 설정 (커스텀 벌칙 선택기)
  setPenalty(penalty) {
    this.currentPenalty = penalty || '☕ 커피 쏘기';
    try {
      localStorage.setItem('comic_swim_penalty', this.currentPenalty);
    } catch (e) {}
  }

  // 내기 참가자 이름 8개 레인에 무작위 셔플
  shuffleBettorNames() {
    const defaultNames = ['철수', '영희', '부장님', '과장님', '대리님', '막내', '민수', '팀장님'];
    let currentNames = SWIMMERS_DATA.map(s => s.bettorName).filter(n => n && n.trim() !== '');
    if (currentNames.length < 2) {
      currentNames = [...defaultNames];
    }
    // Fisher-Yates shuffle
    for (let i = currentNames.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentNames[i], currentNames[j]] = [currentNames[j], currentNames[i]];
    }
    SWIMMERS_DATA.forEach((s, idx) => {
      s.bettorName = currentNames[idx % currentNames.length] || '';
    });
    this.saveBettorNames();
    this.uiManager.renderQuickBettorBar(SWIMMERS_DATA);
  }

  // 배팅 레인 선택
  selectLane(lane) {
    this.selectedLane = lane;
    this.sceneManager.setBetLane(lane);
    this.uiManager.setSelectedLane(lane);
    soundManager.playClick();
  }

  // 내기 참가자 이름 설정
  setBettorName(lane, name) {
    const swimmer = SWIMMERS_DATA.find(s => s.lane === lane);
    if (swimmer) {
      swimmer.bettorName = name.trim();
      this.saveBettorNames();
    }
  }

  setBetAmount(amount) {
    this.betAmount = Math.max(100, Math.min(amount, this.playerCoins));
    this.uiManager.updateBetAmount(this.betAmount);
    soundManager.playClick();
  }

  // 경기 시작 버튼 클릭 -> 올림픽 선수 소개 인트로(INTRO)로 진입!
  startRace() {
    if (this.state !== 'BETTING') return;
    if (this.betAmount > this.playerCoins) {
      alert("보유 코인이 부족합니다!");
      return;
    }

    this.playerCoins -= this.betAmount;
    this.uiManager.updateWallet(this.playerCoins);

    // 모바일 오디오 언락
    voiceCaster.unlock();

    // 1. 올림픽 선수 소개 인트로 시작!
    this.state = 'INTRO';
    this.introLaneIndex = 0;
    this.introTimer = 0;

    // 모든 선수를 백스테이지(Z = -6.5) 대기 상태로 초기화
    this.sceneManager.swimmers.forEach(s => s.setBackstageWait());

    const firstSwimmer = SWIMMERS_DATA[0];
    this.sceneManager.setCameraMode('INTRO');
    this.sceneManager.setIntroLane(firstSwimmer.lane);

    this.uiManager.showIntroScreen(firstSwimmer);
    soundManager.playApplause();
    soundManager.playClick();
  }

  // 다음 선수 소개로 즉시 이동
  nextIntroSwimmer() {
    if (this.state !== 'INTRO') return;

    // 방금 소개를 마친 선수는 스타트대 앞 대기 위치(Z = -2.0)로 정렬
    const currentSwimmerData = SWIMMERS_DATA[this.introLaneIndex];
    if (currentSwimmerData) {
      const currentModel = this.sceneManager.getSwimmerByLane(currentSwimmerData.lane);
      if (currentModel) {
        currentModel.setDeckStand();
      }
    }

    this.introLaneIndex++;
    this.introTimer = 0;

    if (this.introLaneIndex < SWIMMERS_DATA.length) {
      const nextSwimmer = SWIMMERS_DATA[this.introLaneIndex];
      this.sceneManager.setIntroLane(nextSwimmer.lane);
      this.uiManager.showIntroScreen(nextSwimmer);
      soundManager.playApplause();
      soundManager.playClick();
    } else {
      // 8명 모두 소개 완료 -> 호각 단계로 이동
      this.beginCallToBlocks();
    }
  }

  // 인트로 전체 스킵 버튼: 모든 선수를 스타트대 앞으로 정렬하고 즉시 경기 준비 돌입
  skipIntro() {
    if (this.state === 'INTRO') {
      this.sceneManager.swimmers.forEach(s => s.setDeckStand());
      this.beginCallToBlocks();
    }
  }

  // 2. 심판 호각 소리 & 스타트대 위로 올라섬 (Call to Blocks)
  beginCallToBlocks() {
    this.state = 'CALL_TO_BLOCKS';
    this.startSequenceTimer = 0;
    // 모든 선수가 정확히 스타트대 앞 데크에 위치하도록 보장
    this.sceneManager.swimmers.forEach(s => s.setDeckStand());

    // 인트로 카메라가 끝난 경우에만 기본 BROADCAST 카메라로 복귀 (유저가 선택한 OVERVIEW 등 유지)
    if (this.sceneManager.cameraMode === 'INTRO') {
      this.sceneManager.setCameraMode('BROADCAST');
      this.uiManager.setActiveCamButton('BROADCAST');
    }
    this.uiManager.showRaceHUD();
    this.uiManager.showAnnouncement("STEP UP TO THE BLOCKS");

    // 심판 호각: 삑-삑-삑-삑 ➡️ 삐ーーーー!
    soundManager.playCallToBlocksWhistles(() => {
      // 호각 끝난 후 'Take your marks' 단계로 이동
      this.beginTakeMarks();
    });
  }

  // 3. "Take your marks..." (크라우칭 자세)
  beginTakeMarks() {
    this.state = 'TAKE_MARKS';
    this.startSequenceTimer = 0;
    this.uiManager.showAnnouncement("TAKE YOUR MARKS...");
    soundManager.playTakeYourMarksVoice();

    // 1.6초간 긴장감 넘치는 정적 후 스타트 버저 BEEP!
    setTimeout(() => {
      this.beginRaceStart();
    }, 1600);
  }

  // 4. 출발 비프 버저 (BEEP!) & 다이빙
  beginRaceStart() {
    this.state = 'RACING';
    this.raceTime = 0;
    this.uiManager.showAnnouncement("GO! GO! GO!");
    soundManager.playStartBeep();

    // AI 스포츠 캐스터 출발 중계
    voiceCaster.unlock();
    voiceCaster.speakRaceStart();

    // 모바일 햅틱 진동 (출발 버저 비프)
    if ('vibrate' in navigator) {
      try { navigator.vibrate([120]); } catch (e) {}
    }

    // 모바일 화면 꺼짐 방지 (Screen Wake Lock)
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => {
        this.wakeLock = lock;
      }).catch(() => {});
    }

    // 8명 일제히 다이빙!
    this.sceneManager.swimmers.forEach(s => s.startDive());
    setTimeout(() => {
      soundManager.playDivingSplash();
    }, 320);

    setTimeout(() => this.uiManager.hideAnnouncement(), 1200);
  }

  update(delta) {
    // 1. 선수 소개 인트로 씬 진행 루프 (백스테이지 워킹 + 8인 8색 시그니처 포징)
    if (this.state === 'INTRO') {
      this.introTimer += delta;
      const currentSwimmer = SWIMMERS_DATA[this.introLaneIndex];

      // 해당 선수의 백스테이지 레드카펫 워킹 및 개성 만점 시그니처 포즈 실행
      const swimmerModel = this.sceneManager.getSwimmerByLane(currentSwimmer.lane);
      if (swimmerModel) {
        swimmerModel.playAthleteWalkAndPose(this.introTimer, this.introPerSwimmer);
      }

      // 시간 초과 시 다음 선수로 전환
      if (this.introTimer >= this.introPerSwimmer) {
        this.nextIntroSwimmer();
      }
      return;
    }

    // 2. 스타트대 승강 애니메이션 루프
    if (this.state === 'CALL_TO_BLOCKS') {
      this.startSequenceTimer += delta;
      const t = Math.min(this.startSequenceTimer / 1.5, 1.0);
      this.sceneManager.swimmers.forEach(s => s.stepOntoBlock(t));
      return;
    }

    // 3. Take your marks 크라우칭 준비 자세 애니메이션 루프
    if (this.state === 'TAKE_MARKS') {
      this.startSequenceTimer += delta;
      const t = Math.min(this.startSequenceTimer / 0.8, 1.0);
      this.sceneManager.swimmers.forEach(s => s.takeMarks(t));
      return;
    }

    // 4. 실제 레이스 루프
    if (this.state === 'RACING') {
      this.raceTime += delta;

      const minutes = Math.floor(this.raceTime / 60);
      const seconds = Math.floor(this.raceTime % 60);
      const millis = Math.floor((this.raceTime * 100) % 100);
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;

      // 8명 선수 업데이트 및 시간차 돌발 상황 검사
      this.sceneManager.swimmers.forEach(swimmer => {
        const plan = this.racePlan.swimmerPlans.find(p => p.lane === swimmer.lane);

        // 돌발 상황 트리거 체크: 목표 시간 도달 & 이전 돌발과 최소 3.2초 안전 간격 보장
        const timeSinceLast = this.raceTime - this.lastIncidentTime;
        const reachedTrigger = (this.raceTime >= plan.scheduledTime);

        if (!plan.isWinner && !plan.incidentTriggered && swimmer.state === 'SWIMMING' && reachedTrigger && timeSinceLast >= 3.2) {
          plan.incidentTriggered = true;
          this.lastIncidentTime = this.raceTime;
          swimmer.triggerIncident(plan.incident);

          soundManager.playIncidentSfx(plan.incident.id);
          if ('vibrate' in navigator) {
            try { navigator.vibrate([60, 40, 60]); } catch (e) {}
          }

          const commentTemplate = plan.incident.commentary[Math.floor(Math.random() * plan.incident.commentary.length)];
          const comment = commentTemplate.replace('{name}', swimmer.data.name);

          // 전광판 및 스택 피드 알림
          const bettorTag = swimmer.data.bettorName ? `[${swimmer.data.bettorName}]` : '';
          this.sceneManager.pool.updateScoreboard({
            statusText: "🚨 INCIDENT REPORT",
            time: timeStr,
            leaderName: `${plan.incident.emoji} ${swimmer.data.name} ${bettorTag}`,
            newsText: comment
          });

          // AI 캐스터 돌발 상황 속보 음성 중계
          voiceCaster.speakIncident(swimmer.data.name, swimmer.data.bettorName, plan.incident.id);

          // 돌발 상황 알림 (3.8초 표시 후 퇴장, 오버레이 방지)
          this.uiManager.pushIncidentAlert(swimmer.data.name, swimmer.lane, plan.incident, comment, swimmer.data.bettorName);
        }

        // 3D 수영선수 애니메이션 업데이트 (리커버리 후 완영 포함)
        swimmer.update(delta, plan);

        // 결승선(50m) 터치패드 터치 판정
        if (swimmer.progressZ >= 50.0 && !this.finishOrder.includes(swimmer.lane)) {
          this.finishOrder.push(swimmer.lane);
          const rank = this.finishOrder.length;
          plan.finishRank = rank;

          const isFirst = (rank === 1);
          this.sceneManager.pool.triggerTouchPad(swimmer.lane, isFirst);
          soundManager.playTouchPad();

          if (isFirst && 'vibrate' in navigator) {
            try { navigator.vibrate([180, 80, 240]); } catch (e) {}
          }

          const bettorTag = swimmer.data.bettorName ? `(${swimmer.data.bettorName})` : '';

          if (isFirst) {
            this.sceneManager.pool.updateScoreboard({
              statusText: "🥇 1ST PLACE WINNER!",
              time: timeStr,
              leaderName: `1ST: L${swimmer.lane} ${swimmer.data.name} ${bettorTag}`,
              newsText: `1위 골인! ${swimmer.data.name} 선수가 우승을 차지했습니다!`
            });
            voiceCaster.speakWinner(swimmer.data.name, swimmer.data.bettorName);
          } else {
            this.sceneManager.pool.updateScoreboard({
              statusText: `TOUCHPAD: ${rank}위 통과`,
              time: timeStr,
              leaderName: `${rank}위: L${swimmer.lane} ${swimmer.data.name} ${bettorTag}`,
              newsText: `${swimmer.data.name} 선수, ${rank}위로 결승선을 터치했습니다!`
            });
          }
        }
      });

      // 실시간 순위 계산
      const currentRanks = [...this.sceneManager.swimmers].sort((a, b) => b.progressZ - a.progressZ);
      const leader = currentRanks[0];

      // 결승 10m 구간(40m 돌파) 관중 함성 고조 및 심장 박동 긴장감 비트
      if (!this.sprintClimaxTriggered && leader && leader.progressZ >= 40.0) {
        this.sprintClimaxTriggered = true;
        soundManager.playSprintClimax();
        voiceCaster.speakClimax(leader.data.name);
        if ('vibrate' in navigator) {
          try { navigator.vibrate([80, 50, 80]); } catch (e) {}
        }
      }

      this.uiManager.updateRaceHUD({
        timeStr,
        ranks: currentRanks,
        leader,
        selectedLane: this.selectedLane
      });

      // 종료 조건:
      // "어떻게 되든간에 7등까지 무조건 완영은 해야 8등이 못 들어오더라도 최종 순위는 다 알 수 있을 것 같아."
      // -> 최소 7명이 실제로 50m 터치패드를 통과했을 때 8등 자동 확정 및 경기 종료!
      if (this.finishOrder.length >= 7 || this.raceTime > 65) {
        this.finishRace();
      }
    }
  }

  // 레이스 종료 및 최종 1~8위 확정
  finishRace() {
    this.state = 'FINISHED';

    if (this.wakeLock) {
      try { this.wakeLock.release(); } catch (e) {}
      this.wakeLock = null;
    }

    // 아직 못 들어온 마지막 선수(8등) 자동 확정
    const unFinished = this.sceneManager.swimmers
      .filter(s => !this.finishOrder.includes(s.lane))
      .sort((a, b) => b.progressZ - a.progressZ);
    unFinished.forEach(s => this.finishOrder.push(s.lane));

    const userRank = this.finishOrder.indexOf(this.selectedLane) + 1;
    let multiplier = 0;
    if (userRank === 1) multiplier = 8.0;
    else if (userRank === 2) multiplier = 2.5;
    else if (userRank === 3) multiplier = 1.5;
    else if (userRank === 4) multiplier = 1.0;

    const winCoins = Math.round(this.betAmount * multiplier);
    this.playerCoins += winCoins;
    this.uiManager.updateWallet(this.playerCoins);

    if (userRank <= 3) {
      soundManager.playFanfare();
      confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 } });
    } else {
      soundManager.playSadTrombone();
    }

    const rankedSwimmers = this.finishOrder.map(lane => this.sceneManager.getSwimmerByLane(lane));
    const loser = rankedSwimmers[rankedSwimmers.length - 1];
    voiceCaster.speakPenalty(loser?.data?.name, loser?.data?.bettorName, this.currentPenalty);

    this.uiManager.showResultModal({
      userLane: this.selectedLane,
      userRank: userRank,
      betAmount: this.betAmount,
      winCoins: winCoins,
      multiplier: multiplier,
      rankedSwimmers: rankedSwimmers,
      totalCoins: this.playerCoins,
      currentPenalty: this.currentPenalty
    });
  }

  getLeaderSwimmer() {
    if (!this.sceneManager || !this.sceneManager.swimmers) return null;
    return [...this.sceneManager.swimmers].sort((a, b) => b.progressZ - a.progressZ)[0];
  }
}
