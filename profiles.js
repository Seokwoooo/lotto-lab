/** Playful labels based on this experiment's actual outcome, not personality scores. */
const profiles = {
  ZERO: { title: '완벽한\n비껴가기형', color: '#ece9ff', friend: '한 끗 수집가', description: '마지막 회차의 구매 번호가 당첨번호를 전부 비껴갔어요. 여섯 숫자와 인연이 없던 한 회차, 여기서는 돈 대신 호기심만 썼습니다.', lines: ['당첨번호와 철저하게 거리 두기.', '스쳐 지나간 숫자도 없었다.', '번호들의 단체 숨바꼭질.', '이번 회차는 관객석에서 봤습니다.', '이 정도면 피하기도 재능?', '빈손이어도 영수증은 남는다.'] },
  WARM: { title: '오늘은\n예열 중', color: '#ffe9cf', friend: '소소한 행운 수집가', description: '마지막 회차에서는 한 게임당 당첨번호를 최대 한 개까지 맞혔어요. 5등은 세 개부터라 아직 당첨은 없지만, 숫자 하나의 반가움은 확인했습니다.', lines: ['숫자 하나랑은 눈이 마주쳤다.', '운도 시동 거는 시간이 필요해.', '엔진은 켰는데, 아직 출발 전.', '오늘의 하이라이트: 한 숫자.', '복권과 어색한 첫인사를 나눴다.', '설렘은 만 원어치, 당첨은 다음에.'] },
  EDGE: { title: '꽤 대단할지도...?\n모르는 사람', color: '#e4edff', friend: '운수 좋은 날의 사나이', description: '마지막 회차에 당첨번호 두 개와 보너스를 맞힌 게임이 있어요. 다만 보너스는 기본 당첨번호 세 개를 대신하지 못해서 낙첨입니다. 보기에는 꽤 가까웠던 영수증!', lines: ['보너스까지 왔는데, 문이 안 열렸다.', '분명 뭔가 있긴 있는데…?', '당첨 같은 분위기만 가져갔다.', '로또가 나를 알아본 것 같기도.', '숫자는 친한데 등수는 안 친함.', '내가 봐도 좀 아까운 조합.'] },
  NEAR: { title: '한 끗\n수집가', color: '#fff0b9', friend: '본전 지킴이', description: '마지막 회차에 두 개를 맞힌 게임이 여러 개 있었어요. 가까운 줄은 많았지만, 세 개라는 당첨 문턱은 넘지 못했습니다. 영수증을 자꾸 다시 보게 되는 타입입니다.', lines: ['두 개, 또 두 개. 세 번째는 어디에?', '가까운 줄만 잔뜩 수집했다.', '딱 하나씩 모자라는 미스터리.', '아쉬움도 모으면 한 장쯤 될까요.', '맞은 숫자를 합치면 안 되나요?', '영수증을 세 번 확인하는 사람.'] },
  NORM: { title: '평범한\n로또인', color: '#ffe449', friend: '진짜 행운아', description: '당첨된 게임은 없었어요. 번호를 한 줄씩 확인하다 잠깐 기대했을 수도 있겠네요. 이번 결과는 이번 결과일 뿐, 다음 독립 추첨의 확률은 그대로입니다.', lines: ['영수증은 길고, 당첨금은 짧았다.', '상상 속 퇴사는 다음 회차로.', '번호 확인할 때만 잠깐 부자였다.', '이번에도 일단 출근합니다.', '꿈은 크게, 실제 지출은 0원.', '평범함도 이 정도면 정체성.'] },
  SYNC: { title: '확신의\n한 번호파', color: '#d6f1e8', friend: '한 끗 수집가', description: '고정한 같은 번호를 여러 게임 샀고, 그 번호가 당첨됐어요. 같은 회차의 복권들이 함께 웃었습니다. 같은 번호를 여러 게임 사는 건 당첨 확률을 늘리는 방식은 아닙니다.', lines: ['한 번호에 모두가 같이 웃었다.', '같은 운명, 여러 줄의 영수증.', '흩어지지 않고 한곳에 모인 행운.', '번호는 하나, 기쁨은 여러 게임.', '오늘만큼은 내 번호가 정답.', '한 줄을 고집한 보람이 있었다.'] },
  BACK: { title: '본전\n지킴이', color: '#ddf2cf', friend: '소소한 행운 수집가', description: '예시 당첨금과 가상 구매 비용이 정확히 같았어요. 큰 이익은 없지만 숫자가 깔끔하게 제자리로 돌아왔습니다. 실제로 쓴 돈은 애초에 0원이었고요.', lines: ['만 원이 만 원으로 돌아왔다.', '오늘의 수익: 경험과 영수증.', '손익계산서가 예쁘게 0.', '호기심을 돌려받은 기분.', '본전도 이렇게 보면 꽤 짜릿해.', '가상 지갑을 철통 방어했다.'] },
  GAIN: { title: '은근히\n실속파', color: '#d7f1e4', friend: '운수 좋은 날의 사나이', description: '최고 등수는 5등이지만 여러 당첨이 쌓여 가상 구매 비용을 넘겼어요. 작은 행운들이 만든 흑자입니다. 이번의 예시 손익이며 실제 복권의 수익률을 뜻하지는 않습니다.', lines: ['큰 한 방 없이도, 오늘은 흑자.', '소소한 줄 알았는데 합치니 쏠쏠.', '티 안 나게 잘되는 타입.', '오천 원들이 열심히 일했다.', '작은 행운의 팀플레이.', '영수증 끝에서 조용히 웃었다.'] },
  COLL: { title: '작은 행운\n모으는 사람', color: '#f8e1ed', friend: '본전 지킴이', description: '5등이 여러 게임에서 나왔어요. 가상 구매 비용을 모두 회수하지는 못했지만, 번호 세 개가 맞아떨어지는 순간을 여러 번 만났습니다.', lines: ['한 번만 웃고 끝내긴 아쉬웠다.', '작은 당첨을 차곡차곡.', '오천 원짜리 기쁨이 여러 번.', '영수증에 동그라미가 늘었다.', '큰 행운 대신 작은 행운 여러 개.', '당첨 확인 버튼을 다시 누르는 맛.'] },
  MINI: { title: '소소한 행운\n수집가', color: '#e8f4d9', friend: '평범한 로또인', description: '번호 세 개가 맞아 5등을 만났어요. 한 게임의 5등 당첨금은 5천 원입니다. 이번 가상 실험에서는 구매 비용보다 당첨금이 작지만, 아무 일도 없던 영수증은 아니었어요.', lines: ['퇴사는 못 해도, 당첨은 했다.', '작지만 확실한 동그라미 세 개.', '이 영수증, 완전 빈손은 아니다.', '상상 속 커피값은 생겼다.', '무심히 확인했는데 5등.', '이것도 당첨은 당첨이다.'] },
  PEAK: { title: '최고 등수와\n손익은 별개형', color: '#e0ebff', friend: '은근히 실속파', description: '4등까지 만났지만 실험한 게임이 많아 예시 당첨금보다 가상 구매 비용이 컸어요. 당첨의 기쁨과 전체 손익을 같이 볼 줄 아는 영수증입니다.', lines: ['좋은 등수, 길어진 영수증.', '당첨은 반가웠고 계산은 냉정했다.', '많이 돌리면 비용도 같이 돈다.', '최고 기록과 결산은 따로 확인.', '성적표는 좋지만 지갑은 다른 얘기.', '행운과 가성비 사이에서.'] },
  GOOD: { title: '오… 운수 좋은 날의\n사나이', color: '#cfeee7', friend: '꽤 대단할지도...? 모르는 사람', description: '번호 네 개가 맞아 4등을 만났어요. 한 게임의 4등 당첨금은 5만 원이고, 이번 가상 실험에서는 구매 비용 이상을 회수했습니다. 영수증을 저장하고 싶은 날이네요.', lines: ['잠깐, 네 개나 맞았다고?', '오늘 영수증은 버리기 아깝다.', '숫자 네 개가 분위기를 바꿨다.', '나 오늘 좀 괜찮은데?', '확인하고 한 번 더 확인했다.', '이 정도면 친구에게 보여줘야지.'] },
  RARE: { title: '운 좋은 줄은 알았는데\n이 정도일 줄이야', color: '#ecdfff', friend: '평범한 로또인', description: '번호 다섯 개를 맞혀 3등을 만났어요. 여섯 개까지는 한 숫자가 남았지만 이미 눈을 크게 뜨게 되는 결과입니다. 표시한 당첨금은 실제 회차 금액이 아닌 고정 예시예요.', lines: ['다섯 개에서 화면을 멈췄다.', '이건 캡처부터 해야 해.', '평소의 나와는 다른 영수증.', '한 숫자가 더 왔다면…!', '기대 안 했을 때 찾아온 큰 숫자.', '친구의 “진짜?”를 부르는 결과.'] },
  EPIC: { title: '로또 세계관\n주인공', color: '#ffd7df', friend: '한 끗 수집가', description: '번호 다섯 개에 보너스까지 맞아 2등입니다. 1등은 아니지만 아주 특별한 조합을 만났어요. 표시한 금액은 세전 예시이며 실제 2등 금액은 회차마다 달라집니다.', lines: ['보너스가 진짜 보너스였다.', '숫자 다섯 개, 그리고 결정적인 하나.', '이 영수증에는 서사가 있다.', '오늘의 주연은 일단 나.', '한 끗 차이로, 엄청난 결과.', '누가 봐도 자랑할 만한 장면.'] },
  LUCK: { title: '진짜\n행운아', color: '#ffe449', friend: '평범한 로또인', description: '당첨번호 여섯 개를 모두 맞혔어요. 한 게임의 1등 확률은 정확히 8,145,060분의 1입니다. 가상 실험에서 만난 1등, 영수증으로 남겨두세요. 당첨금은 세전 고정 예시입니다.', lines: ['여섯 숫자가 전부 내 편이었다.', '1등을 여기서 만났다.', '오늘의 영수증은 액자 후보.', '누르면 나온다? 이번에는 진짜 나왔다.', '가상인데도 손이 떨리는 숫자.', '이 화면은 저장해도 됩니다.'] },
  ICON: { title: '한 번호로\n전설 찍은 사람', color: '#ffe449', friend: '확신의 한 번호파', description: '같은 번호를 여러 게임 구매했고 여섯 개를 전부 맞혔어요. 모든 동일 번호 게임이 함께 1등입니다. 구매 게임 수가 같은 회차의 당첨 확률을 높인 것은 아니며, 금액은 세전 예시입니다.', lines: ['한 번호, 여러 줄의 1등.', '같은 운명이 전부 전설이 됐다.', '고정 번호의 상상 가능한 최고 장면.', '같은 번호를 택한 오늘의 결말.', '영수증 전체에 1등이 찍혔다.', '한 번의 조합이 여러 게임을 바꿨다.'] }
};

export const PROFILE_COUNT = Object.keys(profiles).length;

export function getProfile(result) {
  const rank = result.best?.rank ?? 0;
  const wins = result.games - result.counts[0];
  const balance = result.prize - result.games * 1000;
  const tickets = result.last?.tickets ?? [];
  const closest = Math.max(0, ...tickets.map(t => t.matches));
  let code;
  if (rank === 1) code = result.config.mode === 'fixed' && result.config.tickets > 1 ? 'ICON' : 'LUCK';
  else if (rank === 2) code = 'EPIC';
  else if (rank === 3) code = 'RARE';
  else if (rank === 4) code = balance < 0 ? 'PEAK' : 'GOOD';
  else if (rank === 5) {
    if (result.config.mode === 'fixed' && result.config.tickets > 1) code = 'SYNC';
    else if (balance === 0) code = 'BACK';
    else if (balance > 0) code = 'GAIN';
    else code = wins > 1 ? 'COLL' : 'MINI';
  } else if (closest === 0) code = 'ZERO';
  else if (closest === 1) code = 'WARM';
  else if (tickets.some(t => t.matches === 2 && t.bonusMatch)) code = 'EDGE';
  else code = tickets.filter(t => t.matches === 2).length > 1 ? 'NEAR' : 'NORM';
  const profile = profiles[code];
  // A shared experiment always receives the same copy, including after reloading.
  const variant = parseInt(result.config.seed.slice(0, 8), 16) % profile.lines.length;
  return { ...profile, code, line: profile.lines[variant], rank, wins, balance, closest };
}
