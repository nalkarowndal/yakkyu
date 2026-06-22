import Phaser from 'phaser';
import { PITCH_LIST } from '../constants/PitchTypes';

export class CreationScene extends Phaser.Scene {
  constructor() {
    super('CreationScene');
  }

  create() {
    // 배경색 설정 (나노바나나로 뽑은 배경 이미지가 있다면 이 부분을 이미지로 교체)
    this.cameras.main.setBackgroundColor('#1b263b');

    // 초기 상태(State) 설정
    this.playerName = '';
    this.playerTeam = 'KIA 타이거즈'; // 팀 기본값
    this.playerRole = 'pitcher'; // 'pitcher' or 'batter'
    this.playerPosition = '선발 투수';
    this.bonusPoints = 15;
    this.statLabels = {
      velocity: '구속', control: '제구', stamina: '스태미나', movement: '변화',
      power: '파워', contact: '콘택트', speed: '주력', fielding: '수비'
    };
    
    // ⚾ 포지션별 기본 스탯 보너스 매핑
    this.positionBonuses = {
      '포수': { fielding: 2 },
      '1루수': { power: 2 },
      '2루수': { fielding: 1, speed: 1 },
      '3루수': { power: 1, fielding: 1 },
      '유격수': { speed: 2 },
      '좌익수': { power: 1, contact: 1 },
      '중견수': { speed: 1, fielding: 1 },
      '우익수': { power: 2 },
      '선발 투수': { stamina: 2 },
      '중간 계투': { control: 1, movement: 1 },
      '마무리 투수': { velocity: 2 }
    };

    this.stats = { pitcher: {}, batter: {} };
    this.statBase = {};
    this.resetStats(); // 초기 스탯 및 보너스 세팅

    this.availablePitches = PITCH_LIST;
    this.selectedPitches = []; // 투수일 경우 최대 3개 선택

    // DOM UI 생성
    this.createDOMUI();

    // 씬 전환(shutdown) 시 DOM 요소 자동 정리 (메모리 누수 방지)
    this.events.on('shutdown', () => {
      if (this.uiContainer) {
        this.uiContainer.remove();
        this.uiContainer = null;
      }
    });
  }

  resetStats() {
    this.bonusPoints = 15; // 포지션이 바뀌면 분배한 포인트를 초기화
    const basePitcher = { velocity: 40, control: 40, stamina: 40, movement: 40 };
    const baseBatter = { power: 40, contact: 40, speed: 40, fielding: 40 };
    
    const bonus = this.positionBonuses[this.playerPosition] || {};
    
    if (this.playerRole === 'pitcher') {
      this.stats.pitcher = { ...basePitcher };
      for (let key in bonus) {
        if (this.stats.pitcher[key] !== undefined) this.stats.pitcher[key] += bonus[key];
      }
      this.statBase = { ...this.stats.pitcher };
    } else {
      this.stats.batter = { ...baseBatter };
      for (let key in bonus) {
        if (this.stats.batter[key] !== undefined) this.stats.batter[key] += bonus[key];
      }
      this.statBase = { ...this.stats.batter };
    }
  }

  createDOMUI() {
    // UI를 담을 메인 컨테이너 생성
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'creation-ui';
    this.uiContainer.style.position = 'absolute';
    this.uiContainer.style.top = '50%';
    this.uiContainer.style.left = '50%';
    this.uiContainer.style.transform = 'translate(-50%, -50%)';
    this.uiContainer.style.width = '600px';
    this.uiContainer.style.backgroundColor = 'rgba(13, 27, 42, 0.9)';
    this.uiContainer.style.border = '2px solid #00b4d8';
    this.uiContainer.style.borderRadius = '15px';
    this.uiContainer.style.padding = '20px';
    this.uiContainer.style.color = '#fff';
    this.uiContainer.style.fontFamily = 'sans-serif';
    this.uiContainer.style.display = 'flex';
    this.uiContainer.style.flexDirection = 'column';
    this.uiContainer.style.gap = '15px';
    this.uiContainer.style.boxShadow = '0px 10px 30px rgba(0,0,0,0.5)';

    // game-container가 없으면 문서의 기본 body에 UI를 부착하도록 안전하게 변경
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(this.uiContainer);

    // 전역 스타일 추가 (호버 애니메이션 등)
    const style = document.createElement('style');
    style.innerHTML = `
      #creation-ui input, #creation-ui select { background: #1b263b; border: 1px solid #00b4d8; color: #fff; border-radius: 4px; outline: none; transition: border-color 0.2s; }
      #creation-ui input:focus, #creation-ui select:focus { border-color: #ccff00; }
      #creation-ui .btn-stat { width: 30px; height: 30px; font-weight: bold; cursor: pointer; border: none; border-radius: 5px; transition: all 0.2s; }
      #creation-ui .btn-minus { background: #ff4d4d; color: white; }
      #creation-ui .btn-plus { background: #ccff00; color: black; }
      #creation-ui .btn-stat:hover { filter: brightness(1.2); transform: scale(1.1); }
      #creation-ui .pitch-label { display: inline-block; background: #273e5c; padding: 8px 12px; border-radius: 8px; margin: 5px 5px 0 0; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; user-select: none; }
      #creation-ui .pitch-label:hover { border-color: #00b4d8; background: #334d70; }
      #creation-ui .pitch-checkbox:checked + span { color: #ccff00; font-weight: bold; text-shadow: 0 0 5px rgba(204,255,0,0.5); }
      #creation-ui .start-btn { background: linear-gradient(135deg, #00b4d8, #0077b6); transition: all 0.2s; }
      #creation-ui .start-btn:hover { background: linear-gradient(135deg, #0077b6, #00b4d8); transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,180,216,0.5); }
    `;
    this.uiContainer.appendChild(style);

    this.renderUI();
  }

  renderUI() {
    // 기존 내용 삭제 (style 태그 제외)
    Array.from(this.uiContainer.children).forEach(child => {
      if (child.tagName !== 'STYLE') child.remove();
    });

    // ⚾ 역할(투수/타자)에 따른 세부 보직(포지션) 드롭다운 HTML 생성
    let positionSelectHTML = '';
    if (this.playerRole === 'pitcher') {
      positionSelectHTML = `
        <select id="playerPosition" style="padding: 10px; font-size: 16px;">
          <option value="선발 투수" ${this.playerPosition === '선발 투수' ? 'selected' : ''}>선발 투수</option>
          <option value="중간 계투" ${this.playerPosition === '중간 계투' ? 'selected' : ''}>중간 계투</option>
          <option value="마무리 투수" ${this.playerPosition === '마무리 투수' ? 'selected' : ''}>마무리 투수</option>
        </select>
      `;
    } else {
      const batterPos = ['포수', '1루수', '2루수', '3루수', '유격수', '좌익수', '중견수', '우익수'];
      let options = batterPos.map(p => `<option value="${p}" ${this.playerPosition === p ? 'selected' : ''}>${p}</option>`).join('');
      positionSelectHTML = `
        <select id="playerPosition" style="padding: 10px; font-size: 16px;">
          ${options}
        </select>
      `;
    }

    // KBO 10개 구단 선택 옵션 생성
    const kboTeams = ['KIA 타이거즈', '삼성 라이온즈', 'LG 트윈스', '두산 베어스', 'KT 위즈', 'SSG 랜더스', '롯데 자이언츠', '한화 이글스', 'NC 다이노스', '키움 히어로즈'];
    const teamOptions = kboTeams.map(t => `<option value="${t}" ${this.playerTeam === t ? 'selected' : ''}>${t}</option>`).join('');

    // 1. 이름, 소속 팀 입력 및 역할 선택
    const headerDiv = document.createElement('div');
    headerDiv.innerHTML = `
      <h2 style="margin:0 0 15px 0; color: #ccff00; text-align: center; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">나만의 선수 생성</h2>
      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <input type="text" id="playerName" placeholder="선수 이름 입력" value="${this.playerName}" style="flex:1; padding: 10px; font-size: 16px;">
        <select id="playerTeam" style="padding: 10px; font-size: 16px;">
          ${teamOptions}
        </select>
        <select id="playerRole" style="padding: 10px; font-size: 16px;">
          <option value="pitcher" ${this.playerRole === 'pitcher' ? 'selected' : ''}>투수</option>
          <option value="batter" ${this.playerRole === 'batter' ? 'selected' : ''}>타자</option>
        </select>
        ${positionSelectHTML}
      </div>
    `;
    this.uiContainer.appendChild(headerDiv);

    // 이벤트 리스너 부착 (이름, 역할)
    this.uiContainer.querySelector('#playerName').addEventListener('input', (e) => {
      this.playerName = e.target.value;
    });
    this.uiContainer.querySelector('#playerTeam').addEventListener('change', (e) => {
      this.playerTeam = e.target.value;
    });
    this.uiContainer.querySelector('#playerRole').addEventListener('change', (e) => {
      this.playerRole = e.target.value;
      this.playerPosition = this.playerRole === 'pitcher' ? '선발 투수' : '유격수'; // 역할 변경 시 기본 보직 초기화
      this.resetStats(); // 포지션 변경 시 스탯 초기화 및 보너스 재적용
      this.renderUI(); // 역할이 바뀌면 UI 다시 렌더링 (스탯창 변경)
    });
    this.uiContainer.querySelector('#playerPosition').addEventListener('change', (e) => {
      this.playerPosition = e.target.value;
      this.resetStats(); // 포지션 변경 시 스탯 초기화 및 보너스 재적용
      this.renderUI();
    });

    // 2. 보너스 포인트 및 스탯 분배
    const statsDiv = document.createElement('div');
    statsDiv.style.backgroundColor = '#415a77';
    statsDiv.style.padding = '15px';
    statsDiv.style.borderRadius = '10px';
    statsDiv.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.3)';
    
    const bonus = this.positionBonuses[this.playerPosition] || {};
    const bonusArr = Object.keys(bonus).map(key => `${this.statLabels[key]} +${bonus[key]}`);
    
    let statsHTML = `<h3 style="margin: 0 0 5px 0; border-bottom: 1px solid #778da9; padding-bottom: 5px;">잔여 스탯 포인트: <span id="points" style="color:#ccff00;">${this.bonusPoints}</span>P</h3>`;
    if (bonusArr.length > 0) {
      statsHTML += `<p style="margin: 0 0 15px 0; font-size: 14px; color: #a8d8ea;">💪 포지션 보너스: ${bonusArr.join(', ')}</p>`;
    } else {
      statsHTML += `<div style="margin-bottom: 15px;"></div>`;
    }
    const currentStats = this.stats[this.playerRole];
    
    for (const [statName, value] of Object.entries(currentStats)) {
      const label = this.statLabels[statName];
      statsHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 16px;">${label}</span>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn-stat btn-minus" data-stat="${statName}">-</button>
            <span style="display:inline-block; width: 40px; text-align:center; font-size: 18px; font-weight: bold;">${value}</span>
            <button class="btn-stat btn-plus" data-stat="${statName}">+</button>
          </div>
        </div>
      `;
    }
    statsDiv.innerHTML = statsHTML;
    this.uiContainer.appendChild(statsDiv);

    // 스탯 증감 이벤트 리스너
    statsDiv.querySelectorAll('.btn-minus').forEach(btn => {
      btn.addEventListener('click', (e) => this.adjustStat(e.target.dataset.stat, -1));
    });
    statsDiv.querySelectorAll('.btn-plus').forEach(btn => {
      btn.addEventListener('click', (e) => this.adjustStat(e.target.dataset.stat, 1));
    });

    // 3. 구종 선택 (투수일 경우에만 표시)
    if (this.playerRole === 'pitcher') {
      const pitchDiv = document.createElement('div');
      pitchDiv.style.backgroundColor = '#1b263b';
      pitchDiv.style.padding = '15px';
      pitchDiv.style.borderRadius = '10px';
      pitchDiv.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.3)';
      
      let pitchHTML = `<h3 style="margin: 0 0 10px 0; font-size: 16px; color: #00b4d8;">초기 구종 선택 (최대 3개) <span style="float:right; color:#fff;">[${this.selectedPitches.length}/3]</span></h3>`;
      pitchHTML += `<div style="display: flex; flex-wrap: wrap;">`;
      
      this.availablePitches.forEach(pitch => {
        const isChecked = this.selectedPitches.includes(pitch.id);
        pitchHTML += `
          <label class="pitch-label" title="${pitch.desc}">
            <input type="checkbox" class="pitch-checkbox" value="${pitch.id}" style="display:none;" ${isChecked ? 'checked' : ''}>
            <span>${pitch.name}</span>
          </label>
        `;
      });
      pitchHTML += `</div>`;
      pitchDiv.innerHTML = pitchHTML;
      this.uiContainer.appendChild(pitchDiv);

      // 구종 선택 이벤트 리스너 (최대 3개 제한)
      pitchDiv.querySelectorAll('.pitch-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          if (e.target.checked) {
            if (this.selectedPitches.length >= 3) {
              e.target.checked = false; // 3개 초과시 체크 해제
              alert('구종은 최대 3개까지만 선택 가능합니다.');
            } else {
              this.selectedPitches.push(e.target.value);
            }
          } else {
            this.selectedPitches = this.selectedPitches.filter(p => p !== e.target.value);
          }
          this.renderUI(); // 카운트 갱신을 위해 재렌더링
        });
      });
    }

    // 4. 게임 시작 버튼
    const startBtn = document.createElement('button');
    startBtn.className = 'start-btn';
    startBtn.innerText = '선수 생성 및 게임 시작';
    startBtn.style.padding = '15px';
    startBtn.style.fontSize = '18px';
    startBtn.style.color = '#fff';
    startBtn.style.border = 'none';
    startBtn.style.borderRadius = '8px';
    startBtn.style.cursor = 'pointer';
    startBtn.style.fontWeight = 'bold';
    startBtn.style.marginTop = '10px';
    
    startBtn.addEventListener('click', () => this.startGame());
    this.uiContainer.appendChild(startBtn);
  }

  adjustStat(statName, amount) {
    const currentStats = this.stats[this.playerRole];
    const baseValue = this.statBase[statName];
    
    if (amount > 0 && this.bonusPoints > 0) {
      currentStats[statName] += amount;
      this.bonusPoints -= amount;
    } else if (amount < 0 && currentStats[statName] > baseValue) { // 기본값 밑으로는 못 내림
      currentStats[statName] += amount;
      this.bonusPoints -= amount; // 포인트 반환
    }
    this.renderUI();
  }

  startGame() {
    if (!this.playerName.trim()) {
      alert('선수 이름을 입력해주세요!');
      return;
    }
    if (this.playerRole === 'pitcher' && this.selectedPitches.length === 0) {
      alert('최소 1개의 구종을 선택해주세요!');
      return;
    }

    // KBO 144경기 스케줄 생성
    const kboTeams = ['KIA 타이거즈', '삼성 라이온즈', 'LG 트윈스', '두산 베어스', 'KT 위즈', 'SSG 랜더스', '롯데 자이언츠', '한화 이글스', 'NC 다이노스', '키움 히어로즈'];
    const opponents = kboTeams.filter(t => t !== this.playerTeam);
    let schedule = [];
    for (let i = 0; i < 16; i++) { // 나머지 9개 팀과 16번씩 맞붙어 총 144경기 (144 + 타 팀 경기수 = 리그 전체 720경기)
      schedule = schedule.concat(opponents);
    }
    schedule.sort(() => Math.random() - 0.5); // 무작위로 일정 섞기

    // KBO 10개 구단 리그 순위표 초기화
    const leagueStandings = {};
    kboTeams.forEach(t => leagueStandings[t] = { w: 0, l: 0, d: 0 });

    // 완성된 데이터를 Phaser Registry에 전역 저장
    this.registry.set('playerData', {
      name: this.playerName,
      team: this.playerTeam,
      schedule: schedule,
      leagueStandings: leagueStandings,
      currentMatchIndex: 0,
      role: this.playerRole,
      position: this.playerPosition,
      stats: this.stats[this.playerRole],
      pitches: this.playerRole === 'pitcher' ? this.selectedPitches : null,
      gold: 0,
      popularity: 0
    });

    // DOM UI 삭제
    if (this.uiContainer) {
      this.uiContainer.remove();
    }

    // 다음 씬(마을 또는 경기)으로 전환 (씬 이름은 상황에 맞게 변경)
    console.log('생성된 데이터:', this.registry.get('playerData'));
    this.scene.start('TownScene'); 
  }
}