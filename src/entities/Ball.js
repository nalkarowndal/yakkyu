import Phaser from 'phaser';

export class Ball extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        // 투수 마운드 위치에서 초기화
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 공의 초기 설정
        this.setScale(0.3); // 처음엔 멀리 있으므로 작게
        this.setDepth(10);  // 캐릭터들보다 앞에 렌더링되도록
        this.isPitched = false;
        
        // 투구 궤적용 변수
        this.currentPitch = null;
        this.trailTimer = null;
    }

    /**
     * 공을 던지는 함수
     * @param {number} startX - 투수 손 위치 X
     * @param {number} startY - 투수 손 위치 Y
     * @param {number} targetX - 포수 미트(스트라이크 존) 목표 X
     * @param {number} targetY - 포수 미트(스트라이크 존) 목표 Y
     * @param {number} speedVal - 투수의 구속 스탯 기반 실제 속도
     * @param {object} pitchData - 구종 데이터 (PITCH_TYPES의 객체)
     * @param {function} onCompleteCallback - 포수 미트에 닿았을 때 실행할 콜백 (타격 판정 종료)
     */
    pitch(startX, startY, targetX, targetY, speedVal, pitchData, onCompleteCallback) {
        this.setPosition(startX, startY);
        this.setScale(0.3);
        this.setAlpha(1);
        this.isPitched = true;
        this.currentPitch = pitchData;

        // 잔상 효과(Trail) 타이머 시작 (30ms 간격으로 잔상 생성)
        if (this.trailTimer) {
            this.trailTimer.remove();
        }
        this.trailTimer = this.scene.time.addEvent({
            delay: 20, // 잔상 생성 간격을 줄여 더 촘촘하게 (프레임 단위)
            callback: this.createTrail,
            callbackScope: this,
            loop: true
        });

        // 구종별 기준 속도를 현재 구속(speedVal)에 비례하게 조정
        // 구속이 높을수록(예: 150) 시간이 짧아짐
        // 만약 speed 값이 undefined라면 speedRatio를 사용해 계산하도록 안전장치 추가
        const baseSpeed = pitchData.speed || (2000 / (pitchData.speedRatio || 1));
        const duration = baseSpeed * (40 / Math.max(speedVal, 1));

        // 1. 공 회전 및 크기(원근감) 극대화 애니메이션
        this.scene.tweens.add({
            targets: this,
            angle: 360 * 6, // 6바퀴 회전으로 역동성 강화
            scale: { from: 0.15, to: 1.5 }, // 시작 크기를 더 작게, 다가올수록 커지게 (원근감 극대화)
            duration: duration,
            ease: 'Quad.easeIn' // 카메라를 향해 점진적으로 가속하며 날아오는 3D 느낌
        });

        // 2. 물리 궤적 계산용 가상 진행률(pitchT) 트윈
        // MatchScene에서 killTweensOf(this.ball) 호출 시 궤적 업데이트도 함께 멈추도록 this를 target으로 설정
        this.pitchT = 0;
        this.scene.tweens.add({
            targets: this,
            pitchT: 1,
            duration: duration,
            ease: 'Linear',
            onUpdate: (tween, target) => {
                const t = target.pitchT;

                // 기본 직선 보간 (투수 손 -> 포수 미트)
                let currentX = Phaser.Math.Linear(startX, targetX, t);
                let currentY = Phaser.Math.Linear(startY, targetY, t);

                // 변화구 무브먼트 Ease 함수 가져오기
                let easeFunc = Phaser.Math.Easing.Linear;
                const easeName = pitchData.curveEase;
                if (easeName === 'Sine.easeIn') easeFunc = Phaser.Math.Easing.Sine.In;
                else if (easeName === 'Cubic.easeIn') easeFunc = Phaser.Math.Easing.Cubic.In;
                else if (easeName === 'Quad.easeIn') easeFunc = Phaser.Math.Easing.Quadratic.In;
                else if (easeName === 'Cubic.easeInOut') easeFunc = Phaser.Math.Easing.Cubic.InOut;
                else if (easeName === 'Expo.easeIn') easeFunc = Phaser.Math.Easing.Expo.In;

                const breakT = easeFunc(t);
                
                // 무브먼트 적용
                currentX += pitchData.breakX * breakT;
                currentY += pitchData.dropY * breakT;

                this.setPosition(currentX, currentY);
            },
            onComplete: () => {
                this.isPitched = false;
                if (this.trailTimer) this.trailTimer.remove();
                if (onCompleteCallback) onCompleteCallback();
            }
        });
    }

    createTrail() {
        if (!this.isPitched) return;

        // 현재 위치에 잔상 스프라이트 생성
        const trail = this.scene.add.sprite(this.x, this.y, this.texture.key);
        trail.setScale(this.scale * 0.8);
        trail.setAngle(this.angle); // ⚾ 공의 실시간 회전 각도를 그대로 복사! (실밥이 도는 느낌)
        trail.setDepth(this.depth - 1); // 공보다 뒤에 렌더링
        trail.setTint(this.currentPitch.color || 0xffffff); // 구종별 잔상 색상
        trail.setAlpha(0.7);
        trail.setBlendMode(Phaser.BlendModes.ADD); // 빛나는 효과

        // 잔상이 연기나 불꽃처럼 흩어지며 사라지는 역동적인 이펙트
        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            scale: 0,
            angle: trail.angle + Phaser.Math.Between(-60, 60), // 회전하면서 흩어짐
            x: trail.x + Phaser.Math.Between(-3, 3), // 주변으로 미세하게 퍼지는 흔들림
            y: trail.y + Phaser.Math.Between(-3, 3),
            duration: 400,
            ease: 'Quad.easeOut',
            onComplete: () => trail.destroy()
        });
    }

    // 타격 성공 시 타구 궤적 처리
    hit(power, angle) {
        this.isPitched = false;
        if (this.trailTimer) this.trailTimer.remove();
        this.scene.tweens.killTweensOf(this); // 날아오던 투구 애니메이션 정지
        
        // 타격 속도 제한 (최대 1500으로 클램프하여 공이 화면 밖으로 순식간에 사라지는 현상 방지)
        const hitVelocity = Math.min(power * 10, 1500);
        this.scene.physics.velocityFromAngle(angle, hitVelocity, this.body.velocity);
        
        this.scene.tweens.add({
            targets: this,
            scale: 0.2, // 멀리 날아가며 작아짐
            duration: 2000,
            ease: 'Quad.easeOut'
        });
    }
}