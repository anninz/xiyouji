
PG.NetPlayer = function (seat, game) {
    PG.Player.call(this, seat, game);
    this._pokerPic = [];
    this.score = 0;
};

PG.NetPlayer.prototype = Object.create(PG.Player.prototype);
PG.NetPlayer.prototype.constructor = PG.NetPlayer;

PG.NetPlayer.prototype.pushAPoker = function (poker) {
    this._pokerPic.push(poker);
    this.updateLeftPoker();
};

PG.NetPlayer.prototype.removeAPoker = function (pid) {
    for (var i = this.pokerInHand.length - 1; i >= 0; i--) {
        if (this.pokerInHand[i] === pid) {
            this.pokerInHand.splice(i, 1);
            break
        }
    }
    if (i == -1) {
        this.pokerInHand.pop();
    }
    for (var i = this._pokerPic.length - 1; i >= 0; i--) {
        if (this._pokerPic[i].id === pid) {
            this._pokerPic.splice(i, 1);
            break
        }
    }
    if (i == -1) {
        this._pokerPic.pop();
    }
    this.updateLeftPoker();
};

PG.NetPlayer.prototype.arrangePoker = function () {
    if (this.pokerInHand.length > 0 && this.pokerInHand[0] < 54) {
        // PG.Player.prototype.arrangePoker.call(this);
        this.reDealPoker();
    }
};

PG.NetPlayer.prototype.replacePoker = function (pokers, start) {
    if (this.pokerInHand.length !== pokers.length - start) {
        console.log("ERROR ReplacePoker:", this.pokerInHand, pokers);
    }
    if (this._pokerPic.length !== pokers.length - start) {
        console.log("ERROR ReplacePoker:", this._pokerPic, pokers);
    }
    var length = this.pokerInHand.length;
    for (var i = 0; i < length; i++) {
        this.pokerInHand[i] = pokers[start + i];
        this._pokerPic[i].id = pokers[start + i];
        this._pokerPic[i].frame = pokers[start + i];
    }
};

PG.NetPlayer.prototype.findAPoker = function (pid) {
    for (var i = this._pokerPic.length - 1; i >= 0; i--) {
        if (this._pokerPic[i].id == pid) {
            return this._pokerPic[i];
        }
    }
    return this._pokerPic[this._pokerPic.length - 1];
};

PG.NetPlayer.prototype.reDealPoker = function () {
    this.sortPoker();
    var length = this.pokerInHand.length;
    for (var i = 0; i < length; i++) {
        var pid = this.pokerInHand[i];
        var p = this.findAPoker(pid);
        p.bringToTop();
        this.dealPokerAnim(p, this.seat == 1 ? length-1-i : i);
    }
};

PG.NetPlayer.prototype.dealPokerAnim = function (p, i) {
    var width = this.game.world.width;
    if (p.id > 53) {
        this.game.add.tween(p).to({
            x: this.sx,
            y: this.uiHead.y + PG.PH/2 + 10
        }, 500, Phaser.Easing.Default, true, 25 + 50 * i);
    } else {
        this.game.add.tween(p).to({
            x: this.sx,
            y: this.uiHead.y + PG.PH * 1.5 + 20
        }, 500, Phaser.Easing.Default, true, 50 * i);
    }
};

PG.NetPlayer.prototype.initUI = function (sx, sy) {
    PG.Player.prototype.initUI.call(this, sx, sy);
    this.sx = sx;
    this.sy = sy;
    /*
    if (this.seat == 1) {
        this.uiName = this.game.add.text(sx - 40, sy - 80, '等待玩家加入', style);
        this.uiName.anchor.set(1, 0);
    } else {
        this.uiName = this.game.add.text(sx + 40, sy - 80, '等待玩家加入', style);
        this.uiName.anchor.set(0, 0);
    }*/
};


PG.NetPlayer.prototype.updateInfo = function (uid, name, realseat) {
    PG.Player.prototype.updateInfo.call(this, uid, name, realseat);
    /*if (uid == -1) {
        this.uiName.text = '等待玩家加入';
    } else {
        this.uiName.text = name;
    }*/
};

PG.NetPlayer.prototype.updateScore = function (score) {
    PG.Player.prototype.updateScore.call(this, score);
};

PG.NetPlayer.prototype.updateLeftPoker = function () {
    var len = this.pokerInHand.length;
    if (len > 0) {
        this.uiLeftPoker.text = "" + this.pokerInHand.length;
        this.uiLeftPoker.revive();
    } else {
        this.uiLeftPoker.kill();
    }
};
