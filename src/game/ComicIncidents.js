/**
 * 코믹 돌발 상황 시스템 (Comic Incident Engine)
 * - 1등(Winner)만 유일하게 완벽한 정석 자유형으로 완주!
 * - 나머지 7명은 레이스 도중 (15m ~ 43m) 시간차를 두고 순차적으로 돌발 상황 발생!
 * - 돌발 상황 후 일정 시간(3.5초~5.5초) 뒤 복구되어 50m 결승선을 향해 수영 재개 (7등까지 완영 필수)
 */

export const INCIDENT_TYPES = {
  ROPE_REST: {
    id: "ROPE_REST",
    name: "로프 잡고 휴식",
    emoji: "🛑",
    icon: "rope",
    duration: 5.0, // 5초간 헉헉대다 복귀
    commentary: [
      "{name} 선수, 갑자기 레인 로프를 부여잡고 숨을 헐떡입니다!",
      "아이고 힘들어라! {name}, 로프에 매달려 숨고르기!",
      "{name}: '이봐 심판, 나 여기서 커피 한 잔만 하고 갈게~'"
    ],
    recoveryComment: "{name} 선수, 심기일전하고 다시 로프를 놓고 출발합니다!"
  },
  U_TURN: {
    id: "U_TURN",
    name: "가스불 유턴 (역주행)",
    emoji: "↩️",
    icon: "uturn",
    duration: 4.8, // 4.8초간 역주행 후 다시 턴해서 전진
    commentary: [
      "어어?! {name} 선수, 갑자기 180도 유턴해서 출발점으로 되돌아갑니다!",
      "속보: {name} 선수, '집에 가스불 켜놓고 왔다'며 역주행 시작!",
      "충격 역주행! {name}, 출발선을 향해 맹렬히 헤엄칩니다!"
    ],
    recoveryComment: "{name} 선수, '아 맞다 가스불 껐지!' 깨닫고 다시 결승선으로 턴!"
  },
  SLOW_DOWN: {
    id: "SLOW_DOWN",
    name: "체력 방전 (거북이 수영)",
    emoji: "🐢",
    icon: "battery_empty",
    duration: 6.0,
    commentary: [
      "{name} 선수, 오버페이스의 대가! 배터리가 방전되어 거북이 모드로 전환!",
      "모터보트 같던 {name}, 갑자기 목욕탕 개헤엄으로 속도가 뚝 떨어집니다!",
      "{name}: '에라 모르겠다, 풍류나 즐기자~' 초저속 유람 수영!"
    ],
    recoveryComment: "{name} 선수, 막판 스퍼트를 올리며 다시 페이스를 올립니다!"
  },
  CRAMP: {
    id: "CRAMP",
    name: "다리에 쥐 남!",
    emoji: "⚡",
    icon: "cramp",
    duration: 4.5,
    commentary: [
      "비상사태! {name} 선수, 종아리에 극심한 쥐가 났습니다!",
      "{name}: '아악 내 다리! 쥐 났다 쥐!' 물 위에 대자로 둥둥 뜹니다!",
      "{name} 선수, 다리를 부여잡고 회전목마처럼 뱅글뱅글 돕니다!"
    ],
    recoveryComment: "{name} 선수, 다리를 주무르고 다시 물장구를 시작합니다!"
  },
  GOGGLES_LOST: {
    id: "GOGGLES_LOST",
    name: "물안경 분실",
    emoji: "👓",
    icon: "goggles",
    duration: 4.2,
    commentary: [
      "어이쿠! {name} 선수, 수경이 벗겨져 목에 걸렸습니다! 앞이 안 보여요!",
      "{name}: '누가 불 껐어?! 내 수경 어디 갔어?!' 제자리에서 더듬더듬!",
      "시야 확보 실패! {name} 선수가 제자리에서 물을 더듬으며 멈춰 섭니다!"
    ],
    recoveryComment: "{name} 선수, 수경을 다시 이마에 걸쳐 쓰고 전진합니다!"
  },
  EARLY_CELEBRATION: {
    id: "EARLY_CELEBRATION",
    name: "설레발 조기 세레머니",
    emoji: "🎉",
    icon: "trophy",
    duration: 4.0,
    commentary: [
      "이게 무슨 일입니까! {name} 선수, 아직 한참 남았는데 1등인 줄 알고 세레머니!",
      "{name}: '엄마 나 1등 먹었어!!' 관중석에 손 흔들다 뒤차들에게 추월당합니다!",
      "설레발 필패! {name} 선수의 샴페인이 너무 일찍 터졌습니다!"
    ],
    recoveryComment: "{name} 선수, '어라 아직 안 끝났어?!' 깜짝 놀라 맹렬히 다시 헤엄칩니다!"
  },
  BELLY_FLOP: {
    id: "BELLY_FLOP",
    name: "접영 흉내 배치기",
    emoji: "💥",
    icon: "splash",
    duration: 4.0,
    commentary: [
      "퍽!! {name} 선수, 갑자기 폼 잡고 접영 뛰려다 수면에 초대형 배치기!",
      "{name} 선수, 가슴과 배가 빨갛게 부어오른 채 기절하듯 멈춥니다!",
      "물보라와 함께 침묵! {name} 선수, 배치기 충격으로 멍하니 표류 중!"
    ],
    recoveryComment: "{name} 선수, 충격을 털어내고 어기적어기적 수영을 재개합니다!"
  }
};

/**
 * 레이스 플랜 생성
 * - 7명의 돌발 상황이 겹치지 않도록 Z 지점을 15m부터 43m까지 순차적으로 분산(Staggered)!
 * - 각 돌발 상황 후 리커버리하여 7등까지 무조건 완영하도록 보장!
 */
export function generateRacePlan(swimmers) {
  // 1. 순수 랜덤 1등(Winner) 선정 (1~8번 중 1명)
  const winnerIndex = Math.floor(Math.random() * swimmers.length);
  const winner = swimmers[winnerIndex];

  // 2. 패자 7명 인덱스 목록
  const loserIndices = [];
  for (let i = 0; i < swimmers.length; i++) {
    if (i !== winnerIndex) loserIndices.push(i);
  }

  // 3. 40초 레이스 기준: 7명의 돌발 상황을 10.5초부터 36.5초까지 3.5~4.5초 간격으로 순차 분산!
  // 참가자들이 어느 영자에게 무슨 일이 일어났는지 충분히 보고 웃을 수 있는 황금 간격 배정
  const baseScheduledTimes = [10.5, 14.5, 19.0, 23.5, 28.0, 32.5, 36.5];
  // 약간의 자연스러운 랜덤 지터(±0.5초) 부여
  const jitteredTimes = baseScheduledTimes.map(t => Number((t + (Math.random() * 1.0 - 0.5)).toFixed(1)));
  // 어느 레인이 몇 번째로 터질지는 순수 랜덤!
  const shuffledTimes = [...jitteredTimes].sort(() => Math.random() - 0.5);

  const incidentKeys = Object.keys(INCIDENT_TYPES).sort(() => Math.random() - 0.5);

  const swimmerPlans = swimmers.map((swimmer, idx) => {
    const isWinner = (idx === winnerIndex);

    if (isWinner) {
      // 1등 선수: 50m 완주 시간 약 39.5~40.5초 (초당 약 1.18~1.21m 정밀 페이스)
      return {
        lane: swimmer.lane,
        name: swimmer.name,
        bettorName: swimmer.bettorName || "",
        isWinner: true,
        baseSpeed: 1.18 + (Math.random() * 0.03),
        incident: null,
        scheduledTime: 999,
        incidentTriggerZ: 999,
        incidentTriggered: false,
        recovered: false,
        finishRank: 1
      };
    } else {
      // 패자 7명: 순차적 시간표에 맞춰 차례대로 돌발 상황 발생
      const loserRankOrder = loserIndices.indexOf(idx);
      const scheduledTime = shuffledTimes[loserRankOrder];
      // 해당 시간에 대략 도달하는 Z 거리 (약 12m ~ 43m)
      const triggerZ = Number((scheduledTime * 1.16).toFixed(1));
      const incidentKey = incidentKeys[loserRankOrder % incidentKeys.length];
      const incident = INCIDENT_TYPES[incidentKey];

      // 초반 위장 선두 경쟁 속도 (1등과 팽팽하거나 살짝 앞서는 연출)
      const initialSpeed = 1.16 + (Math.random() * 0.09);
      // 리커버리 후 완영 속도 (1등보다 느리지만 43~53초 내 7등까지 무조건 골인)
      const recoverSpeed = 0.90 + (Math.random() * 0.18);

      return {
        lane: swimmer.lane,
        name: swimmer.name,
        bettorName: swimmer.bettorName || "",
        isWinner: false,
        baseSpeed: initialSpeed,
        recoverSpeed: recoverSpeed,
        incident: incident,
        scheduledTime: scheduledTime,
        incidentTriggerZ: triggerZ,
        incidentTriggered: false,
        recovered: false,
        state: "swimming",
        finishRank: null
      };
    }
  });

  return {
    winnerLane: winner.lane,
    winnerName: winner.name,
    swimmerPlans
  };
}
