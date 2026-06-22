import Phaser from 'phaser';

import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { CreationScene } from './scenes/CreationScene';
import { TownScene } from './scenes/TownScene';
import { MatchScene } from './scenes/MatchScene';

// 게임 전역 설정 및 루프 진입점
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    pixelArt: true, // 2D 도트 감성을 살리기 위한 설정
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // 기본 중력 설정 (야구공 궤적 계산 시 조정)
            debug: false
        }
    },
    // 등록된 Scene들. 가장 먼저 선언된 BootScene부터 실행됩니다.
    scene: [
        BootScene,
        TitleScene,
        CreationScene,
        TownScene,
        MatchScene
    ]
};

const game = new Phaser.Game(config);
