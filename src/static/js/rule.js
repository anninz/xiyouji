PG.Poker = function (game, id, frame) {

    Phaser.Sprite.call(this, game, game.world.width / 2, game.world.height * 0.4, 'poker', frame);

    this.anchor.set(0.5);
    this.id = id;
    this.played = 0;

    return this;
};

PG.Poker.prototype = Object.create(Phaser.Sprite.prototype);
PG.Poker.prototype.constructor = PG.Poker;

PG.Poker.comparePoker = function (a, b) {

    if (a instanceof Array) {
        a = a[0];
        b = b[0];
    }


    if (a >= 52 || b >= 52) {
        return -(a - b);
    }
    a = a % 13;
    b = b % 13;
    if (a == 1 || a == 0) {
        a += 13;
    }
    if (b == 1 || b == 0) {
        b += 13;
    }
    return -(a - b);
};

PG.Poker.toCards = function (pokers) {
    var cards = [];
    for (var i = 0; i < pokers.length; i++) {
        var pid = pokers[i];
        if (pid instanceof Array) {
            pid = pid[0];
        }
        if (pid == 53) {
            cards.push('W');
        } else if (pid == 52) {
            cards.push('w');
        } else {
            cards.push("A234567890JQK"[pid % 13]);
        }
    }
    return cards;

};

PG.Poker.canCompare = function (pokersA, pokersB) {
    var cardsA = this.toCards(pokersA);
    var cardsB = this.toCards(pokersB);
    return PG.Rule.cardsValue(cardsA)[0] == PG.Rule.cardsValue(cardsB)[0];
};

PG.Poker.toPokers = function (pokerInHands, cards) {
    var pokers = [];
    for (var i = 0; i < cards.length; i++) {
        var candidates = this.toPoker(cards[i]);
        for (var j = 0; j < candidates.length; j++) {
            if (pokerInHands.indexOf(candidates[j]) != -1 && pokers.indexOf(candidates[j]) == -1) {
                pokers.push(candidates[j]);
                break
            }
        }
    }
    return pokers;
};

PG.Poker.toPoker = function (card) {

    var cards = "A234567890JQK";
    for (var i = 0; i < 13; i++) {
        if (card == cards[i]) {
            return [i, i + 13, i + 13 * 2, i + 13 * 3];
        }
    }
    if (card == 'W') {
        return [53];
    } else if (card == 'w') {
        return [52];
    }
    return [54];

};

PG.Rule = {};

PG.Rule.cardsAbove = function (handCards, turnCards) {

    var turnValue = this.cardsValue(turnCards);
    if (turnValue[0] == '') {
        return '';
    }
    handCards.sort(this.sorter);
    var oneRule = PG.RuleList[turnValue[0]];
    //console.log('cardsAbove', handCards, turnCards, turnValue[0],turnValue[1],oneRule);
    for (var i = 0; i < oneRule.length; i++) {
      var valueA = this.cardsValue(oneRule[i]);
      if (this.compare_poker_1(valueA,turnValue)) {
        if (this.containsAll(handCards, oneRule[i])) {
            return oneRule[i];
        }
      }
    }
/*
    for (var i = turnValue[1] + 1; i < oneRule.length; i++) {
        if (this.containsAll(handCards, oneRule[i])) {
            return oneRule[i];
        }
    }

    if (turnValue[1] < 1000) {
        oneRule = PG.RuleList['four'];
        for (var i = 0; i < oneRule.length; i++) {
            if (this.containsAll(handCards, oneRule[i])) {
                return oneRule[i];
            }
        }
        if (this.containsAll(handCards, 'wW')) {
            return 'wW';
        }
    }*/

    return '';
};

PG.Rule.bestShot = function (handCards) {

    handCards.sort(this.sorter);
    var shot = '';
    var len = this._CardsType.length;
    for (var i = 0; i < len; i++) {
        var oneRule = PG.RuleList[this._CardsType[i]];
        for (var j = 0; j < oneRule.length; j++) {
            if (oneRule[j].length > shot.length && this.containsAll(handCards, oneRule[j])) {
                shot = oneRule[j];
            }
        }
    }
/*
    if (shot == '') {
        oneRule = PG.RuleList['four'];
        for (var i = 0; i < oneRule.length; i++) {
            if (this.containsAll(handCards, oneRule[i])) {
                return oneRule[i];
            }
        }
        if (this.containsAll(handCards, 'wW'))
            return 'wW';
    }*/

    return shot;
};

PG.Rule._CardsType = [
    'single', 'pair', 'trio', 'four', 'five',
    'six', 'seven', 'eight'];

PG.Rule.sorter = function (a, b) {
    var card_str = '34567890JQKA2wW';
    return card_str.indexOf(a) - card_str.indexOf(b);
};

PG.Rule.index_of = function (array, ele) {
    if (array[0].length != ele.length) {
        return -1;
    }
    for (var i = 0, l = array.length; i < l; i++) {
        if (array[i] == ele) {
            return i;
        }
    }
    return -1;
};

PG.Rule.containsAll = function (parent, child) {
    var index = 0;
    for (var i = 0, l = child.length; i < l; i++) {
        index = parent.indexOf(child[i], index);
        if (index == -1) {
            return false;
        }
        index += 1;
    }
    return true;
};

PG.Rule.cardsValue = function (cards) {

    if (typeof(cards) != 'string') {
        cards.sort(this.sorter);
        cards = cards.join('');
    }

/*    if (cards == 'wW')
        return ['rocket', 2000];
    var index = this.index_of(PG.RuleList['four'], cards);
    if (index >= 0)
        return ['four', 1000 + index];*/

    var length = this._CardsType.length;
    for (var i = 0; i < length; i++) {
        var typeName = this._CardsType[i];
        //console.log('socket connect onerror',PG.RuleList[typeName],cards);
        var index = this.index_of(PG.RuleList[typeName], cards);
        if (index >= 0) {
          return [typeName, index, this.get_cards_attr(index)];
        }
    }
    console.log('Error: UNKNOWN TYPE ', cards);
    return ['', 0, -1];
};

PG.Rule.get_cards_attr = function (index) {
  var type = 0;
  switch(index)
  {
    case 10:
        type = 6;
        break;
    case 9:
        type = 5;
        break;
    case 8:
        type = 4;
        break;
    case 7:
        type = 3;
        break;
    case 4:
    case 5:
    case 6:
        type = 2;
        break;
    case 0:
    case 1:
    case 2:
    case 3:
        type = 1;
        break;
    default:
        type = 1;
  }
  return type;
};

PG.Rule.compare_poker_1 = function (valueA, valueB) {

  if (valueA[2] == valueB[2] && valueA[1] > valueB[1]) {
      return 1;
  } else if(valueB[2] == 3 && valueA[2] != 2) {
      return 1;
  } else if(valueB[2] == 1) {
      if (valueA[2] != 3 && valueA[2] != 1) {
          return 1;
      }
  } else if (valueA[2] > valueB[2]) {
      return 1;
  }
  return 0;
};

PG.Rule.compare = function (cardsA, cardsB) {

    if (cardsA.length == 0 && cardsB.length == 0) {
        return 0;
    }
    if (cardsA.length == 0) {
        return -1;
    }
    if (cardsB.length == 0) {
        return 1;
    }

    var valueA = this.cardsValue(cardsA);
    var valueB = this.cardsValue(cardsB);

    if ((valueA[1] < 1000 && valueB[1] < 1000) && (valueA[0] != valueB[0])) {
        console.log('Error: Compare ', cardsA, cardsB);
    }

    return valueA[1] - valueB[1];
};

PG.Rule.shufflePoker = function () {
    var pokers = [];
    for (var i = 0; i < 54; i++) {
        pokers.push(i);
    }

    var currentIndex = pokers.length, temporaryValue, randomIndex;
    while (0 != currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = pokers[currentIndex];
        pokers[currentIndex] = pokers[randomIndex];
        pokers[randomIndex] = temporaryValue;
    }
    return pokers;
}
;
