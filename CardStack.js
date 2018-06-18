import React, { Component } from 'react';
import PropTypes from 'prop-types'
import {
  StyleSheet,
  View,
  Animated,
  PanResponder,
  Dimensions,
  Text,
  Platform
} from 'react-native';

const { height, width } = Dimensions.get('window');

export default class CardStack extends Component {


  static distance(x, y) {
    const a = Math.abs(x);
    const b = Math.abs(y);
    const c = Math.sqrt((a * a) + (b * b));
    return c;
  }

  constructor(props) {
    super(props);
    this.state ={
      drag: new Animated.ValueXY({x: 0, y: 0}),
      dragDistance: new Animated.Value(0),
      sindex: 0, // index to the next card to be renderd mod card.length
      cardA: null,
      cardB: null,
      topCard: 'cardA',
      cards: [],
      touchStart: 0,
      slideGesture: false
    };
    this.distance = this.constructor.distance;
  }


  componentWillMount() {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => (parseInt(gestureState.dx) !== 0 && parseInt(gestureState.dy) !== 0),
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => (parseInt(gestureState.dx) !== 0 && parseInt(gestureState.dy) !== 0),
      onPanResponderGrant: (evt, gestureState) => {
        this.setState({ touchStart: new Date().getTime() });
      },
      onPanResponderMove: (evt, gestureState) => {
        const { verticalSwipe, horizontalSwipe } = this.props;
        const dragDistance = this.distance((horizontalSwipe) ? gestureState.dx : 0, (verticalSwipe) ? gestureState.dy : 0 );
        this.state.dragDistance.setValue(dragDistance);
        this.state.drag.setValue({x: (horizontalSwipe) ? gestureState.dx : 0, y: (verticalSwipe) ? gestureState.dy : 0});

        //Catch tap events
        const onTapCardDeadZone = 5;
        if (
            gestureState.dx < -onTapCardDeadZone ||
            gestureState.dx > onTapCardDeadZone ||
            gestureState.dy < -onTapCardDeadZone ||
            gestureState.dy > onTapCardDeadZone
        ) {
          //must be directly set, because second card is zoom to 0.95
          this.state.slideGesture = true;
        }
      },
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {

        const currentTime = new Date().getTime();
        const swipeDuration = currentTime-this.state.touchStart;
        const { sindex } = this.state;
        const { verticalThreshold,
                horizontalThreshold,
                disableTopSwipe,
                disableLeftSwipe,
                disableRightSwipe,
                disableBottomSwipe,
              } = this.props;


        if (((Math.abs(gestureState.dy) > verticalThreshold)  ||
            ( Math.abs(gestureState.dy) > verticalThreshold*0.8 &&
              swipeDuration < 150)
            ) && this.props.verticalSwipe)
        {

          const swipeDirection = (gestureState.dy < 0) ? height * -1 : height;
          if(swipeDirection < 0 && !disableTopSwipe)
          {

            this._nextCard('top', gestureState.dx, swipeDirection, 200);
          }
          else if (swipeDirection > 0 && !disableBottomSwipe)
          {
            this._nextCard('bottom', gestureState.dx, swipeDirection, 200);
          }
          else
          {
            this._resetCard();
          }
        }else if (((Math.abs(gestureState.dx) > horizontalThreshold) ||
                  (Math.abs(gestureState.dx) > horizontalThreshold*0.6 &&
                  swipeDuration < 150)
                ) && this.props.horizontalSwipe) {

          const swipeDirection = (gestureState.dx < 0) ? width * -1 : width;
          if (swipeDirection < 0 && !disableLeftSwipe)
          {
            this._nextCard('left', swipeDirection, gestureState.dy, 200);
          }
          else if(swipeDirection > 0 && !disableRightSwipe)
          {
            this._nextCard('right', swipeDirection, gestureState.dy, 200);
          }
          else
          {
            this._resetCard();
          }
        }
        else
        {
          this._resetCard();
        }

        if (!this.state.slideGesture && swipeDuration < 300) {
          this.props.onTap((this.state.sindex - 2));
        }
        //must be directly set, because second card is zoom to 0.95
        this.state.slideGesture = false;
      },
      onPanResponderTerminate: (evt, gestureState) => {
      },
      onShouldBlockNativeResponder: (evt, gestureState) => {
        return true;
      },
    });
  }

  componentDidMount(){

    // check if we only have 1 child
    if(typeof this.props.children !== 'undefined' && !Array.isArray(this.props.children)){
      this.setState({
        cards: [this.props.children],
        cardA: this.props.children,
        cardB: null,
        sindex: 2,
      });
    }else if(Array.isArray(this.props.children)){
      this.setState({
        cards: this.props.children,
        cardA: this.props.children[0],
        cardB: this.props.children[1],
        sindex: 2,
      });
    }

  }

  componentWillReceiveProps(nextProps){
    if (nextProps.children !== this.props.children) {
      this.setState({
        cards: nextProps.children,
        cardA: nextProps.children[(this.state.topCard=='cardA')? this.state.sindex-2 : this.state.sindex-1],
        cardB: nextProps.children[(this.state.topCard=='cardB')? this.state.sindex-2 : this.state.sindex-1]
      });
    }
  }

  _resetCard(){

    Animated.timing(
      this.state.dragDistance,
      {
        toValue: 0,
        duration: 200,
      }
    ).start();
    Animated.spring(
      this.state.drag,
      {
        toValue: {x: 0, y: 0},
        duration: 200,
      }
    ).start();

  }


  goBackFromTop(){
    this._goBack('top');
  }

  goBackFromRight(){
    this._goBack('right');
  }

  goBackFromLeft(){
    this._goBack('left');
  }

  goBackFromBottom(){
    this._goBack('bottom');
  }

  mod(n, m) {
    return ((n % m) + m) % m;
  }

  _goBack(direction){
    const {cardA, cardB, cards, sindex, topCard} = this.state;

    if((sindex-3) < 0 && !this.props.loop) return;

    const previusCardIndex = this.mod(sindex-3, cards.length)
    let update = {};
    if(topCard === 'cardA'){
      update = {
        ...update,
        cardB: cards[previusCardIndex]

      }
    }else{
      update = {
        ...update,
        cardA: cards[previusCardIndex],
      }
    }

    this.setState({
      ...update,
      topCard: (topCard === 'cardA') ? 'cardB' : 'cardA',
      sindex: sindex-1
    }, () => {

      switch (direction) {
        case 'top':
          this.state.drag.setValue({x: 0, y: -height});
          this.state.dragDistance.setValue(height);
          break;
        case 'left':
          this.state.drag.setValue({x: -width, y: 0});
          this.state.dragDistance.setValue(width);
          break;
        case 'right':
          this.state.drag.setValue({x: width, y: 0});
          this.state.dragDistance.setValue(width);
          break;
        case 'bottom':
          this.state.drag.setValue({x: 0, y: height});
          this.state.dragDistance.setValue(width);
          break;
        default:

      }

      Animated.spring(
        this.state.dragDistance,
        {
          toValue: 0,
          duration: 400,
        }
      ).start();

      Animated.spring(
        this.state.drag,
        {
          toValue: {x: 0, y: 0},
          duration: 400,
        }
      ).start();
    })
  }



  swipeTop(duration){
    this._nextCard('top', 0, -height, duration);
  }

  swipeBottom(duration){
    this._nextCard('bottom', 0, height, duration);
  }

  swipeRight(duration){
    this._nextCard('right', width, 0, duration);
  }

  swipeLeft(duration){
    this._nextCard('left', -width, 0, duration);
  }

  _nextCard(direction, x, y, duration=400){
    const { verticalSwipe, horizontalSwipe, loop } = this.props;
    const { sindex, cards, topCard } = this.state;

    // index for the next card to be renderd
    const nextCard = (loop) ? (Math.abs(sindex) % cards.length) : sindex;

    // index of the swiped card
    const index = (loop) ? this.mod(nextCard-2, cards.length) : nextCard - 2;

    if((sindex-2 < cards.length) || (loop) ){
      Animated.spring(
        this.state.dragDistance,
        {
          toValue: 220,
          duration,
        }
      ).start();

      Animated.timing(
        this.state.drag,
        {
          toValue: { x: (horizontalSwipe) ? x : 0, y: (verticalSwipe) ? y : 0 },
          duration,
        }
      ).start(() => {

        const newTopCard =  (topCard === 'cardA') ? 'cardB' : 'cardA';

        let update = {};
        if(newTopCard === 'cardA') {
          update = {
            ...update,
            cardB: cards[nextCard]
          };
        }
        if(newTopCard === 'cardB') {
          update = {
            ...update,
            cardA: cards[nextCard],
          };
        }
        this.state.drag.setValue({x: 0, y: 0});
        this.state.dragDistance.setValue(0);
        this.setState({
          ...update,
          topCard: newTopCard,
          sindex: nextCard+1
        });

        this.props.onSwiped(index);
        switch (direction) {
          case 'left':
            this.props.onSwipedLeft(index);
            this.state.cards[index].props.onSwipedLeft();
            break;
          case 'right':
            this.props.onSwipedRight(index);
            this.state.cards[index].props.onSwipedRight();
            break;
          case 'top':
            this.props.onSwipedTop(index);
            this.state.cards[index].props.onSwipedTop();
            break;
          case 'bottom':
            this.props.onSwipedBottom(index);
            this.state.cards[index].props.onSwipedBottom();
            break;
          default:
        }
      });

    }
  }


  render() {

    const { secondCardZoom } = this.props;
    const { drag, dragDistance, cardA, cardB, topCard, sindex } = this.state;

    const SC = dragDistance.interpolate({
      inputRange: [0,10, 220],
      outputRange: [secondCardZoom,secondCardZoom,1],
      extrapolate: 'clamp',
    });
    const rotate = drag.x.interpolate({
      inputRange: [-320,0,320],
      outputRange: this.props.outputRotationRange,
      extrapolate: 'clamp',
    });

    return (
        <View {...this._panResponder.panHandlers} style={[{position:'relative'},this.props.style]}>
          <Animated.View style={{
                position: 'absolute',
                ...Platform.select({
                  ios: {
                    zIndex: (topCard === 'cardB') ? 3 : 2,
                  },
                  android: {
                    elevation: (topCard === 'cardB') ? 3 : 2,
                  }
                }),
                transform: [
                  { rotate: (topCard === 'cardB') ? rotate: '0deg' },
                  {translateX: (topCard === 'cardB') ? drag.x: 0},
                  {translateY: (topCard === 'cardB') ? drag.y: 0},
                  { scale: (topCard === 'cardB') ? 1 : SC},
                ]
              }}>
              {cardB}
          </Animated.View>
          <Animated.View style={{
                position: 'absolute',
                ...Platform.select({
                  ios: {
                    zIndex: (topCard === 'cardA') ? 3 : 2,
                  },
                  android: {
                    elevation: (topCard === 'cardA') ? 3 : 2,
                  }
                }),
                transform: [
                  { rotate: (topCard === 'cardA') ? rotate: '0deg' },
                  {translateX: (topCard === 'cardA') ? drag.x: 0},
                  {translateY: (topCard === 'cardA') ? drag.y: 0},
                  { scale: (topCard === 'cardA') ? 1 : SC},
                ]
              }}>
              {cardA}
          </Animated.View>

          {this.props.renderNoMoreCards()}

        </View>
    );
  }
}

CardStack.propTypes = {

  children: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,

  style: PropTypes.oneOfType([PropTypes.number, PropTypes.object, PropTypes.array]),
  secondCardZoom: PropTypes.number,
  loop: PropTypes.bool,
  renderNoMoreCards: PropTypes.func,
  onSwiped: PropTypes.func,
  onSwipedLeft: PropTypes.func,
  onSwipedRight:PropTypes.func,
  onSwipedTop: PropTypes.func,
  onSwipedBottom: PropTypes.func,
  onSwiped: PropTypes.func,
  onSwipedAll: PropTypes.func,
  onTap: PropTypes.func,

  disableBottomSwipe: PropTypes.bool,
  disableLeftSwipe: PropTypes.bool,
  disableRightSwipe: PropTypes.bool,
  disableTopSwipe: PropTypes.bool,
  verticalSwipe: PropTypes.bool,
  verticalThreshold: PropTypes.number,

  horizontalSwipe: PropTypes.bool,
  horizontalThreshold: PropTypes.number,
  outputRotationRange: PropTypes.array,

}

CardStack.defaultProps = {

  style:{},
  secondCardZoom: 0.95,
  loop: false,
  renderNoMoreCards: () => { return (<Text>No More Cards</Text>)},
  onSwiped: () => {},
  onSwipedLeft: () => {},
  onSwipedRight: () => {},
  onSwipedTop: () => {},
  onSwipedBottom: () => {},
  onSwipedAll: () => {
    console.log('onSwipedAll')
  },
  onTap: () => {},

  disableBottomSwipe: false,
  disableLeftSwipe: false,
  disableRightSwipe: false,
  disableTopSwipe: false,
  verticalSwipe: true,
  verticalThreshold: height/4,
  horizontalSwipe: true,
  horizontalThreshold: width/2,
  outputRotationRange: ['-15deg','0deg','15deg'],
}
