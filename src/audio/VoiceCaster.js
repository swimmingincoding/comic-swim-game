/**
 * Web Speech API 기반 AI 스포츠 중계 캐스터 (VoiceCaster)
 * - 브라우저 내장 음성 합성(SpeechSynthesis)으로 외부 라이브러리/비용 0원
 * - 긴박하고 흥미진진한 올림픽 스포츠 캐스터 한국어 음성 톤 (빠른 속도, 활기찬 톤)
 * - 출발, 돌발 상황 속보, 마지막 10m 스퍼트, 1위 골인, 8위 벌칙 당첨자 실시간 음성 중계
 */

export class VoiceCaster {
  constructor() {
    this.enabled = true;
    this.synth = (typeof window !== 'undefined' && 'speechSynthesis' in window) ? window.speechSynthesis : null;
    this.koreanVoice = null;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const findVoice = () => {
      try {
        const voices = this.synth.getVoices();
        // 한국어 음성 우선 검색 (Google 한국어, Yuna, Heami, ko-KR 등)
        this.koreanVoice = voices.find(v => v.lang === 'ko-KR' || v.lang === 'ko_KR') ||
                           voices.find(v => v.lang.startsWith('ko')) ||
                           null;
      } catch (e) {}
    };

    findVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  // 브라우저 오디오 언락 (첫 터치/클릭 시 호출)
  unlock() {
    if (!this.synth || !this.enabled) return;
    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch (e) {}
  }

  toggleVoice() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.synth) {
      this.synth.cancel();
    }
    return this.enabled;
  }

  setMuted(isMuted) {
    if (isMuted && this.synth) {
      this.synth.cancel();
    }
  }

  speak(text, priority = false) {
    if (!this.enabled || !this.synth) return;

    try {
      if (priority) {
        this.synth.cancel(); // 새로운 긴급 속보 발생 시 이전 발화 즉시 중단
      }

      const utter = new SpeechSynthesisUtterance(text);
      if (this.koreanVoice) {
        utter.voice = this.koreanVoice;
      }
      utter.lang = 'ko-KR';
      utter.rate = 1.16; // 스포츠 중계 특유의 속도감 (1.16배속)
      utter.pitch = 1.05; // 살짝 높은 에너지 톤
      utter.volume = 1.0;

      this.synth.speak(utter);
    } catch (e) {
      console.warn("SpeechSynthesis error:", e);
    }
  }

  cancel() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }

  // 1. 경기 출발 중계
  speakRaceStart() {
    this.speak("제 50미터 자유형 결승전, 힘차게 출발합니다!", true);
  }

  // 2. 돌발 상황 발생 속보 중계
  speakIncident(swimmerName, bettorName, incidentId) {
    const target = bettorName ? `${swimmerName}, 즉 ${bettorName} 선수` : `${swimmerName} 선수`;

    const messages = {
      CRAMP: `비상사태! ${target}, 다리에 극심한 쥐가 났습니다!`,
      U_TURN: `어어?! ${target}, 가스불 끄러 출발선으로 역주행합니다!`,
      ROPE_REST: `체력 고갈! ${target}, 레인 로프를 잡고 헐떡입니다!`,
      SLOW_DOWN: `이럴 수가! ${target}, 배터리 방전으로 거북이 모드입니다!`,
      GOGGLES_LOST: `시야 확보 실패! ${target}, 물안경이 벗겨졌습니다!`,
      EARLY_CELEBRATION: `설레발 주의! ${target}, 너무 일찍 세레머니를 펼칩니다!`,
      BELLY_FLOP: `퍽! ${target}, 수면에 초대형 배치기 폭발!`
    };

    const text = messages[incidentId] || `속보! ${target}에게 돌발 상황 발생!`;
    this.speak(text, true);
  }

  // 3. 결승선 10m 막판 스퍼트
  speakClimax(leaderName) {
    this.speak(`마지막 10미터! ${leaderName} 선수의 맹렬한 스퍼트!`, true);
  }

  // 4. 1위 골인 터치패드
  speakWinner(winnerName, bettorName) {
    const who = bettorName ? `${winnerName}, 배터 ${bettorName}` : `${winnerName} 선수`;
    this.speak(`1위 골인! ${who}, 기적의 우승 터치패드를 찍습니다!`, true);
  }

  // 5. 8위 꼴찌 벌칙 당첨 발표
  speakPenalty(loserName, bettorName, penaltyName) {
    const target = bettorName || loserName;
    this.speak(`오늘의 꼴찌 벌칙 당첨자는 ${target} 님입니다! ${penaltyName} 당첨을 축하합니다!`, false);
  }
}

export const voiceCaster = new VoiceCaster();
