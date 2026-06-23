import Phaser from 'phaser';

export class FielderManager {
    constructor(scene) {
        this.scene = scene;
        this.fielders = [];
        this.fieldersContainer = null;
        
        // 투수와 포수
        this.pitcher = null;
        this.catcher = null;
    }

    createFielders() {
        const fielderCoords = [
            {x:980, y:460, role:'1B', name:'1루수'},
            {x:800, y:395, role:'2B', name:'2루수'},
            {x:300, y:460, role:'3B', name:'3루수'},
            {x:480, y:395, role:'SS', name:'유격수'},
            {x:300, y:150, role:'LF', name:'좌익수'},
            {x:640, y:100, role:'CF', name:'중견수'},
            {x:980, y:150, role:'RF', name:'우익수'}
        ];

        this.fieldersContainer = this.scene.add.container(0, 0).setDepth(51).setVisible(false);

        fielderCoords.forEach(coord => {
            const fielder = this.scene.add.sprite(coord.x, coord.y, 'pitcher').setScale(0.5).setAlpha(0).setDepth(4);
            fielder.originalX = coord.x;
            fielder.originalY = coord.y;
            fielder.role = coord.role;
            fielder.roleName = coord.name;
            this.fielders.push(fielder);
            this.fieldersContainer.add(fielder);
        });

        // 투수
        this.pitcher = this.scene.add.sprite(640, 480, 'pitcher').setScale(0.5);
        this.pitcher.originalX = this.pitcher.x;
        this.pitcher.originalY = this.pitcher.y;
        this.pitcher.role = 'P';
        
        // 포수
        this.catcher = this.scene.add.sprite(640, 650 + 40, 'batter').setScale(0.5); 
        this.catcher.setTint(0x5555ff); 
        this.catcher.originalX = this.catcher.x;
        this.catcher.originalY = this.catcher.y;
        this.catcher.role = 'C';
        
        this.fieldersContainer.add([this.pitcher, this.catcher]);
        this.fielders.push(this.pitcher, this.catcher);
    }

    resetFielders() {
        if (!this.fieldersContainer) return;
        this.fieldersContainer.setVisible(true);
        this.fielders.forEach(f => {
            if (f.originalX && f.originalY) f.setPosition(f.originalX, f.originalY);
            f.setAlpha(1); 
        });
    }

    hideFielders() {
        if (this.fieldersContainer) {
            this.fieldersContainer.setVisible(false);
            this.fielders.forEach(f => f.setAlpha(0));
        }
    }

    moveFieldersToBall(targetX, targetY, isHomeRun) {
        if (isHomeRun) {
            // 홈런일 경우 외야수들만 담장 쪽으로 달리는 연출
            this.fielders.forEach(fielder => {
                if (['LF', 'CF', 'RF'].includes(fielder.role)) {
                    this.scene.tweens.add({
                        targets: fielder,
                        y: targetY + 100, // 공보다 조금 앞까지 뛰어감
                        duration: 1500,
                        ease: 'Power2'
                    });
                }
            });
            return;
        }

        // 공과 가장 가까운 수비수 찾기
        let closestFielder = null;
        let minDistance = Infinity;

        this.fielders.forEach(fielder => {
            const dist = Phaser.Math.Distance.Between(fielder.x, fielder.y, targetX, targetY);
            if (dist < minDistance) {
                minDistance = dist;
                closestFielder = fielder;
            }
        });

        if (closestFielder) {
            const duration = Phaser.Math.Clamp(minDistance * 2, 500, 2000);
            this.scene.tweens.add({
                targets: closestFielder,
                x: targetX,
                y: targetY,
                duration: duration,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    this.scene.playFielderCatchEffect(targetX, targetY, closestFielder);
                }
            });
        }
    }
}
