
PG.Game = function(game) {

    this.roomId = 1;
    this.players = [];

    this.titleBar = null;
    this.tableId = 0;
    this.shotLayer = null;

    this.tablePoker = [];//最后三张牌
    this.tablePokerPic = {};
    this.lastValidPoker = null;
    this.lastPoker = null;

    this.lastShotPlayer = null;

    this.PlayedCardX = 200;
    this.PlayedCardY = 350;

    this.whoseTurn = 0;
};

PG.Game.prototype = {

    init: function(roomId) {
        this.roomId = roomId;
    },

	create: function () {
        this.stage.backgroundColor = '#182d3b';
        this.needLoadPlayers = 0;
        if (this.roomId == 1) {
          this.players.push(PG.createPlay(0, this));
          this.players.push(PG.createPlay(1, this));
          this.players.push(PG.createPlay(2, this));

          this.players[0].updateInfo(PG.playerInfo.uid, PG.playerInfo.username);
          this.createTitleBar();

        } else {
            this.needLoadPlayers = 1;
            this.onRoomMrg();
        }
        PG.Socket.connect(this.onopen.bind(this), this.onmessage.bind(this), this.onerror.bind(this));

	},

	onopen: function() {
	    console.log('socket onopen');
        PG.Socket.send([PG.Protocol.REQ_JOIN_ROOM, this.roomId]);
	},

    onerror: function() {
        console.log('socket connect onerror');
    },

	send_message: function(request) {
        PG.Socket.send(request);
	},

	onmessage: function(packet) {
	    var opcode = packet[0];
	    switch(opcode) {
            case PG.Protocol.RSP_JOIN_ROOM:
                if (this.roomId == 1) {
                    PG.Socket.send([PG.Protocol.REQ_JOIN_TABLE, -1]);
                } else {
                    this.createTableLayer(packet[1]);
                }
                break;
            case PG.Protocol.RSP_TABLE_LIST:
                this.createTableLayer(packet[1]);
                break;
            case PG.Protocol.RSP_NEW_TABLE:
                this.tableId = packet[1];
                this.titleBar.text = '房间:' + this.tableId;
                break;
	        case PG.Protocol.RSP_JOIN_TABLE:
                this.tableId = packet[1];
                this.playerNums = packet[3][0];
                this.pokerNums = packet[3][1];
                if (this.needLoadPlayers) {
                  this.onRmCreateView();
                  this.onInitPlayers(this.playerNums);
                }
                this.titleBar.text = '房间:' + this.tableId;
                var playerIds = packet[2];
                console.log('RSP_JOIN_TABLE  '+ this.playerNums + '-----' + this.pokerNums +'----'+playerIds);
                for (var i = 0; i < playerIds.length; i++) {
                    if (playerIds[i][0] == this.players[0].uid) {
                        for (var j = 1; j < playerIds.length; j++) {
                        //console.log('RSP_JOIN_TABLE  '+ ((i+ j)%this.playerNums));
                          var info_1 = playerIds[(i+ j)%playerIds.length];
                          this.players[j].updateInfo(info_1[0], info_1[1]);
                        }

                        /*var info_1 = playerIds[(i+1)%3];
                        var info_2 = playerIds[(i+2)%3];
                        this.players[1].updateInfo(info_1[0], info_1[1]);
                        this.players[2].updateInfo(info_2[0], info_2[1]);*/
                        break;
                    }
                }
                break;
            case PG.Protocol.RSP_DEAL_POKER:
                var playerId = packet[1];
                var pokers = packet[2];
                this.dealPoker(pokers);
                this.whoseTurn = this.uidToSeat(playerId);
		            this.lastShotPlayer = this.players[this.whoseTurn];
                this.lastValidPoker = null;
                if (this.whoseTurn == 0) {
                    this.startPlay();
                }
                //this.startCallScore(0);
                break;
            case PG.Protocol.RSP_CALL_SCORE:
                var playerId = packet[1];
                var score = packet[2];
                var callend = packet[3];
                this.whoseTurn = this.uidToSeat(playerId);

                var hanzi = ['不叫', "一分", "两分", "三分"];
                this.players[this.whoseTurn].say(hanzi[score]);
                if (!callend) {
                    this.whoseTurn = (this.whoseTurn + 1) % 3;
                    this.startCallScore(score);
                }
                break;
            case PG.Protocol.RSP_SHOW_POKER:
                this.whoseTurn = this.uidToSeat(packet[1]);
                this.tablePoker[0] = packet[2][0];
                this.tablePoker[1] = packet[2][1];
                this.tablePoker[2] = packet[2][2];
                this.players[this.whoseTurn].setLandlord();
                this.showLastThreePoker();
                break;
            case PG.Protocol.RSP_SHOT_POKER:
                this.handleShotPoker(packet);
                break;
            case PG.Protocol.RSP_GAME_OVER:
                var winner = packet[1];
                var coin = packet[2];

                var loserASeat = this.uidToSeat(packet[3][0]);
                this.players[loserASeat].replacePoker(packet[3], 1);
                this.players[loserASeat].reDealPoker();

                var loserBSeat = this.uidToSeat(packet[4][0]);
                this.players[loserBSeat].replacePoker(packet[4], 1);
                this.players[loserBSeat].reDealPoker();

                this.whoseTurn = this.uidToSeat(winner);
                function gameOver() {
                    alert(this.players[this.whoseTurn].isLandlord ? "帅的赢" : "漂亮的赢");
                    this.state.start('MainMenu');
                }
                this.game.time.events.add(1000, gameOver, this);
                break;
            case PG.Protocol.RSP_CHEAT:
                var seat = this.uidToSeat(packet[1]);
                this.players[seat].replacePoker(packet[2], 0);
                this.players[seat].reDealPoker();
                break;
            default:
                console.log("UNKNOWN PACKET:", packet)
	    }
	},

	update: function () {
	},

	uidToSeat: function (uid) {
	    for (var i = 0; i < this.players.length; i++) {
	        if (uid == this.players[i].uid)
	            return i;
	    }
	    console.log('ERROR uidToSeat:' + uid);
	    return -1;
	},

  dealPoker: function(pokers) {
  /*
        for (var i = 0; i < 3; i++) {
            var p = new PG.Poker(this, 54, 54);
            this.game.world.add(p);
            //this.tablePoker[i] = p.id;
            //this.tablePoker[i + 3] = p;
        }*/
        length = pokers.length
        for (var i = 0; i < length; i++) {
            for (var j = 1; j < this.playerNums; j++) {
                this.players[j].pokerInHand.push(54);
            }
            this.players[0].pokerInHand.push(pokers.pop());
        }

        for (var i = 0; i < this.playerNums; i++) {
            this.players[i].dealPoker();
        }
        //this.game.time.events.add(1000, function() {
        //    this.send_message([PG.Protocol.REQ_CHEAT, this.players[1].uid]);
        //    this.send_message([PG.Protocol.REQ_CHEAT, this.players[2].uid]);
        //}, this);
    },

    showLastThreePoker: function() {/*
        /for (var i = 0; i < 3; i++) {
            var pokerId = this.tablePoker[i];
            var p = this.tablePoker[i + 3];
            p.id = pokerId;
            p.frame = pokerId;
            this.game.add.tween(p).to({ x: this.game.world.width/2 + (i - 1) * 60}, 600, Phaser.Easing.Default, true);
        }
        this.game.time.events.add(1500, this.dealLastThreePoker, this);
    */},

    dealLastThreePoker: function() {/*
	    var turnPlayer = this.players[this.whoseTurn];

        for (var i = 0; i < 3; i++) {
            var pid = this.tablePoker[i];
            var poker = this.tablePoker[i + 3];
            turnPlayer.pokerInHand.push(pid);
            turnPlayer.pushAPoker(poker);
        }
        turnPlayer.sortPoker();
        if (this.whoseTurn == 0) {
            turnPlayer.arrangePoker();
            for (var i = 0; i < 3; i++) {
                var p = this.tablePoker[i + 3];
                var tween = this.game.add.tween(p).to({y: this.game.world.height - PG.PH * 0.8 }, 400, Phaser.Easing.Default, true);
                function adjust(p) {
                    this.game.add.tween(p).to({y: this.game.world.height - PG.PH /2}, 400, Phaser.Easing.Default, true, 400);
                };
                tween.onComplete.add(adjust, this, p);
            }
        } else {
            var first = turnPlayer.findAPoker(54);
            for (var i = 0; i < 3; i++) {
                var p = this.tablePoker[i + 3];
                p.frame = 54;
                p.frame = 54;
                this.game.add.tween(p).to({ x: first.x, y: first.y}, 200, Phaser.Easing.Default, true);
            }
        }

        this.tablePoker = [];
        this.lastShotPlayer = turnPlayer;
        if (this.whoseTurn == 0) {
            this.startPlay();
        }
    */},

    handleShotPoker: function(packet) {
        this.whoseTurn = this.uidToSeat(packet[1]);
        var turnPlayer = this.players[this.whoseTurn];
        var pokers = packet[2];
        if (pokers.length == 0) {
            this.players[this.whoseTurn].say("不出");
            var length = this.tablePoker.length;
            for (var i = 0; i < length; i++) {
                var p = this.tablePoker.pop();
                 p.kill();
                 p.destroy();
            }
            this.players[this.whoseTurn].updateScore(length);
            this.tablePoker = [];
            this.lastValidPoker = null;
            this.PlayedCardX = 200;
            this.PlayedCardY = 350;
            this.whoseTurn = this.whoseTurn++ % this.players.length;
        } else {
/*            var pokersPic = {};
            pokers.sort(PG.Poker.comparePoker);
            var count= pokers.length;
            var gap = Math.min((this.game.world.width - PG.PW * 2) / count, PG.PW * 0.36);
            for (var i = 0; i < count; i++) {
                var p = turnPlayer.findAPoker(pokers[i]);
                p.id = pokers[i];
                p.frame = pokers[i];
                p.bringToTop();
                this.game.add.tween(p).to({ x: this.game.world.width/2 + (i - count/2) * gap, y: this.game.world.height * 0.4}, 500, Phaser.Easing.Default, true);

                turnPlayer.removeAPoker(pokers[i]);
                pokersPic[p.id] = p;
            }

            for (var i = 0; i < this.tablePoker.length; i++) {
                var p = this.tablePokerPic[this.tablePoker[i]];
                 p.kill();
                 p.destroy();
            }*/

            var pokersPic = {};
            pokers.sort(PG.Poker.comparePoker);
            var count= pokers.length;
            var gap = 18
            for (var i = 0; i < count; i++) {
                 var p = turnPlayer.findAPoker(pokers[i]);
                 p.id = pokers[i];
                 p.frame = pokers[i];
                 p.bringToTop();
                 this.PlayedCardX += gap;
                 if (this.PlayedCardX > this.game.world.width*0.8) {
                   this.PlayedCardX = 200;
                   this.PlayedCardY += 185;
                 }
                 this.game.add.tween(p).to({ x: this.PlayedCardX, y: this.PlayedCardY}, 500, Phaser.Easing.Default, true);

                 turnPlayer.removeAPoker(pokers[i]);
                 pokersPic[p.id] = p;
                 this.tablePoker.push(p);
            }
            /*for (var i = 0; i < pokers.length; i++) {
              this.tablePoker.push(pokers[i]);
            }*/
            //this.tablePoker = (pokers);
            //this.tablePokerPic.push(pokersPic);

            this.lastPoker = pokers;
            this.lastShotPlayer = turnPlayer;

            var cardsA = PG.Poker.toCards(pokers);
            var valueA = PG.Rule.cardsValue(cardsA);
            if (valueA[2] != 6) {
              this.lastValidPoker = pokers
            }
            turnPlayer.arrangePoker();
        }
        if (turnPlayer.pokerInHand.length > 0) {
            this.whoseTurn = (this.whoseTurn + 1) % this.playerNums;
            if (this.whoseTurn == 0) {
                this.game.time.events.add(1000, this.startPlay, this);
            }
        }
    },

    startCallScore: function(minscore) {
        function btnTouch(btn) {
            this.send_message([PG.Protocol.REQ_CALL_SCORE, btn.score]);
            btn.parent.destroy();
        };

        if (this.whoseTurn == 0) {
            var step = this.game.world.width/6;
            var ss = [1.5, 1, 0.5, 0];
            var sx = this.game.world.width/2 - step * ss[minscore];
            var sy = this.game.world.height * 0.6;
            var group = this.game.add.group();
            var pass = this.game.make.button(sx, sy, "btn", btnTouch, this, 'score_0.png', 'score_0.png', 'score_0.png');
            pass.anchor.set(0.5, 0);
            pass.score = 0;
            group.add(pass);
            sx += step;

            for (var i = minscore + 1; i <= 3; i++) {
                var tn = 'score_' + i + '.png';
                var call = this.game.make.button(sx, sy, "btn", btnTouch, this, tn, tn, tn);
                call.anchor.set(0.5, 0);
                call.score = i;
                group.add(call);
                sx += step;
            }
        } else {
            // TODO show clock on player
        }

    },

    startPlay: function() {
        if (this.isLastShotPlayer()) {
            this.players[0].playPoker([]);
        } else {
            this.players[0].playPoker(this.lastValidPoker);
        }
    },

    finishPlay: function(pokers) {
        this.send_message([PG.Protocol.REQ_SHOT_POKER, pokers]);
    },

    isLastShotPlayer: function() {
        return this.players[this.whoseTurn] == this.lastShotPlayer || this.tablePoker.length == 0;
    },

    createTableLayer: function (tables) {
        //tables.push([-1, 0]);
        if (this.tablelistgroup != null) {
          this.tablelistgroup.destroy();
        }
        this.tablelistgroup = this.game.add.group();
        this.game.world.bringToTop(this.tablelistgroup);
        var gc = this.game.make.graphics(0, 0);
        gc.beginFill(0x00000080);
        gc.endFill();
        this.tablelistgroup.add(gc);
        var style = {font: "22px Arial", fill: "#fff", align: "center"};
        for (var i = 0; i < tables.length; i++) {
            var sx = this.game.world.width * (i%6 + 1)/(6 + 1);
            var sy = this.game.world.height * (Math.floor(i/6) + 1)/(4 + 1);

            var table = this.game.make.button(sx, sy, 'btn', this.onJoin, this, 'table.png', 'table.png', 'table.png');
            table.anchor.set(0.5, 1);
            table.tableId = tables[i][0];
            this.tablelistgroup.add(table);

            var text = this.game.make.text(sx, sy, '房间:' + tables[i][0] + '人数:' + tables[i][1], style);
            text.anchor.set(0.5, 0);
            this.tablelistgroup.add(text);

            /*if (i == tables.length - 1) {
                text.text = '新建房间';
            }*/

        }
    },

    quitGame: function () {
        this.state.start('MainMenu');
    },

    createTitleBar: function() {
        var style = {font: "22px Arial", fill: "#fff", align: "center"};
        this.titleBar = this.game.add.text(this.game.world.centerX, 0, '房间:', style);
    },

    onJoin: function (btn) {
        if (btn.tableId == -1) {
            this.send_message([PG.Protocol.REQ_NEW_TABLE]);
        } else {
            this.send_message([PG.Protocol.REQ_JOIN_TABLE, btn.tableId]);
        }
        btn.parent.destroy();
    },

    onRoomMrg: function () {
        var style = {
            font: '24px Arial', fill: '#000', width: 100, padding: 12,
            borderWidth: 1, borderColor: '#c8c8c8', borderRadius: 2,
            textAlign: 'center', placeHolder: '玩家人数'
            // type: PhaserInput.InputType.password
        };
        this.game.add.plugin(PhaserInput.Plugin);
        var startX = (this.game.world.width) / 8;
        var startY = (this.game.world.height) -80;
        this.inputPlayerNums = this.game.add.inputField(startX, startY, style);

        style.placeHolder = '几副牌';
        this.inputPokerNums = this.game.add.inputField(startX + 140, startY, style);

        var style = {font: "22px Arial", fill: "#f00", align: "center"};
        this.errorText = this.game.add.text(startX + 120, startY - 30, '', style);
        this.errorText.anchor.set(0.5, 0);

        this.login = this.game.add.button(startX + 380, startY +25, 'btn', this.onRegRoom, this, 'score_2.png', 'score_2.png', 'score_2.png');
        this.login.anchor.set(0.5);
    },

    onRmCreateView: function () {
      this.inputPlayerNums.kill();
      this.inputPlayerNums.destroy()
      this.inputPokerNums.kill();
      this.inputPokerNums.destroy()
      this.login.kill();
      this.login.destroy()
      if (this.tablelistgroup != null) {
        this.tablelistgroup.destroy();
      }
    },

    onInitPlayers: function (playerNums) {
      this.needLoadPlayers = 0;
      for (var i = 0; i < playerNums; i++) {
        this.players.push(PG.createPlay(i, this));
      }

      this.players[0].updateInfo(PG.playerInfo.uid, PG.playerInfo.username);

      this.createTitleBar();
    },

    onRegRoom: function () {
        if (!this.inputPlayerNums.value) {
            this.inputPlayerNums.startFocus();
            this.errorText.text = '请输入玩家人数';
            return;
        }
        if (this.inputPlayerNums.value > 10) {
            this.inputPlayerNums.startFocus();
            this.errorText.text = '玩家人数太多';
            return;
        }
        if (!this.inputPokerNums.value) {
            this.inputPokerNums.startFocus();
            this.errorText.text = '请输入需要几副扑克';
            return;
        }
        if (this.inputPokerNums.value > 4) {
            this.inputPokerNums.startFocus();
            this.errorText.text = '扑克数量太多';
            return;
        }

        this.send_message([PG.Protocol.REQ_NEW_TABLE, Number(this.inputPlayerNums.value), Number(this.inputPokerNums.value)]);
        /*var httpRequest = new XMLHttpRequest();
        var that = this;
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                if (httpRequest.status === 200) {
                    if (httpRequest.responseText == '1') {
                        that.errorText.text = '该用户名已经被占用';
                    } else {
                        PG.playerInfo = JSON.parse(httpRequest.responseText);
                        that.state.start('MainMenu');
                    }
                } else {
                    console.log('Error:' + httpRequest.status);
                    that.errorText.text = httpRequest.responseText;
                }
            }
        };
        httpRequest.open('POST', '/reg', true);
        httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        httpRequest.setRequestHeader('X-Csrftoken', PG.getCookie("_xsrf"));

        var req = 'username=' + encodeURIComponent(this.username.value) + '&password=' + encodeURIComponent(this.password.value);
        httpRequest.send(req);*/
    }
};
