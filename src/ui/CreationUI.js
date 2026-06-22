import './CreationUI.css';
import { PITCH_LIST } from '../constants/PitchTypes';

export class CreationUI {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.container = null;
        
        // 초기 상태
        this.state = {
            name: '신인선수',
            role: 'batter', // 'batter' | 'pitcher'
            position: '유격수',
            points: 15,
            stats: {
                batter: { power: 15, contact: 15, speed: 10, fielding: 10 },
                pitcher: { velocity: 135, control: 15, stamina: 15, movement: 10 }
            },
            selectedPitches: ['four_seam'] // 기본으로 포심 패스트볼 선택
        };

        this.positions = {
            batter: ['포수', '1루수', '2루수', '3루수', '유격수', '좌익수', '중견수', '우익수'],
            pitcher: ['선발 투수', '중간 계투', '마무리 투수']
        };

        this.statLabels = {
            batter: { power: '파워', contact: '콘택트', speed: '주력', fielding: '수비' },
            pitcher: { velocity: '구속(km/h)', control: '제구', stamina: '스태미나', movement: '변화' }
        };
    }

    mount(parentElement) {
        this.container = document.createElement('div');
        this.container.className = 'creation-overlay';
        parentElement.appendChild(this.container);
        this.render();
    }

    unmount() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    render() {
        const { role, points, stats, name, position, selectedPitches } = this.state;
        const currentStats = stats[role];
        const labels = this.statLabels[role];
        const positionOptions = this.positions[role].map(p => 
            `<option value="${p}" ${p === position ? 'selected' : ''}>${p}</option>`
        ).join('');

        let pitchSelectionHTML = '';
        if (role === 'pitcher') {
            pitchSelectionHTML = `
                <div class="pitch-selection-container">
                    <div class="pitch-selection-header">초기 구종 선택 (1~3개)</div>
                    <div class="pitch-grid">
                        ${PITCH_LIST.map(pitch => `
                            <div class="pitch-item ${selectedPitches.includes(pitch.id) ? 'selected' : ''}" data-pitch="${pitch.id}">
                                ${pitch.name}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        this.container.innerHTML = `
            <div class="creation-header">나만의 선수 생성</div>
            
            <div class="form-group">
                <label>이름</label>
                <input type="text" id="player-name" value="${name}">
            </div>

            <div class="tabs">
                <div class="tab ${role === 'batter' ? 'active' : ''}" data-role="batter">타자</div>
                <div class="tab ${role === 'pitcher' ? 'active' : ''}" data-role="pitcher">투수</div>
            </div>

            <div class="form-group">
                <label>포지션</label>
                <select id="player-position">
                    ${positionOptions}
                </select>
            </div>

            <div class="stats-container">
                <div class="points-display">남은 보너스 포인트: <span id="points-left">${points}</span> P</div>
                <div id="stats-list">
                    ${Object.keys(currentStats).map(key => `
                        <div class="stat-row">
                            <span>${labels[key]}</span>
                            <div class="stat-controls">
                                <button class="btn-stat btn-minus" data-stat="${key}">-</button>
                                <span class="stat-value">${currentStats[key]}</span>
                                <button class="btn-stat btn-plus" data-stat="${key}" ${points <= 0 ? 'disabled' : ''}>+</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${pitchSelectionHTML}

            <button class="submit-btn" id="submit-creation">생성 완료 및 입단</button>
        `;

        this.attachEvents();
    }

    attachEvents() {
        // 이름 변경
        const nameInput = this.container.querySelector('#player-name');
        nameInput.addEventListener('input', (e) => {
            this.state.name = e.target.value;
        });

        // 포지션 변경
        const positionSelect = this.container.querySelector('#player-position');
        positionSelect.addEventListener('change', (e) => {
            this.state.position = e.target.value;
        });

        // 역할(타자/투수) 탭 전환
        this.container.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const newRole = e.target.getAttribute('data-role');
                if (this.state.role !== newRole) {
                    this.state.role = newRole;
                    this.state.position = this.positions[newRole][0]; // 포지션 초기화
                    this.render();
                }
            });
        });

        // 스탯 증감 버튼
        this.container.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const statKey = e.target.getAttribute('data-stat');
                const roleStats = this.state.stats[this.state.role];
                
                // 최소치 제한
                if (roleStats[statKey] > 1) {
                    roleStats[statKey] -= 1;
                    this.state.points += 1;
                    this.render();
                }
            });
        });

        this.container.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.state.points > 0) {
                    const statKey = e.target.getAttribute('data-stat');
                    this.state.stats[this.state.role][statKey] += 1;
                    this.state.points -= 1;
                    this.render();
                }
            });
        });

        // 구종 선택 버튼
        if (this.state.role === 'pitcher') {
            this.container.querySelectorAll('.pitch-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const pitchId = e.target.getAttribute('data-pitch');
                    const isSelected = this.state.selectedPitches.includes(pitchId);

                    if (isSelected) {
                        if (this.state.selectedPitches.length > 1) {
                            this.state.selectedPitches = this.state.selectedPitches.filter(id => id !== pitchId);
                            this.render();
                        } else {
                            alert('최소 1개의 구종은 선택해야 합니다.');
                        }
                    } else {
                        if (this.state.selectedPitches.length < 3) {
                            this.state.selectedPitches.push(pitchId);
                            this.render();
                        } else {
                            alert('최대 3개의 구종만 선택할 수 있습니다.');
                        }
                    }
                });
            });
        }

        // 완료 버튼
        this.container.querySelector('#submit-creation').addEventListener('click', () => {
            if (this.state.name.trim() === '') {
                alert('이름을 입력해주세요!');
                return;
            }
            
            // 최종 데이터 조립
            const finalData = {
                name: this.state.name,
                role: this.state.role,
                position: this.state.position,
                stats: { ...this.state.stats[this.state.role] }
            };
            
            if (this.state.role === 'pitcher') {
                finalData.pitches = [...this.state.selectedPitches];
            }
            
            this.onComplete(finalData);
        });
    }
}
