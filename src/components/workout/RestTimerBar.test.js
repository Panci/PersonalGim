const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Render the actual timer effects with a controlled clock and Web Audio output.
const timerHarness = () => {
  const tones = [];
  const hooks = [];
  let cursor = 0;
  let pending = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (value) => { hooks[index] = value; }];
    },
    useRef: (initial) => {
      const index = cursor++;
      return hooks[index] || (hooks[index] = { current: initial });
    },
    useEffect: (effect, deps) => {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || deps.some((value, position) => value !== previous.deps[position])) {
        pending.push(() => { previous?.cleanup?.(); hooks[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  class AudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    createOscillator() {
      const tone = {};
      return { frequency: { setValueAtTime: () => {} }, connect: () => {},
        start: (time) => { tone.start = time; tones.push(tone); }, stop: (time) => { tone.end = time; } };
    }
    createGain() { return { connect: () => {}, gain: {
      setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {},
    } }; }
  }
  const state = { restSecondsLeft: 0, totalRestSeconds: 60, isRestTimerRunning: false,
    pauseRestTimer: () => { state.isRestTimerRunning = false; },
    resumeRestTimer: () => { state.isRestTimerRunning = true; },
    adjustRestTimer: (seconds) => { state.restSecondsLeft += seconds; },
    stopRestTimer: () => { state.restSecondsLeft = 0; state.isRestTimerRunning = false; },
    tickRestTimer: () => {},
  };
  const scope = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'RestTimerBar.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(source, { module: scope, exports: scope.exports,
    window: { AudioContext, navigator: { vibrate: () => {} } },
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {},
    require: (name) => {
      if (name === 'react') return { ...react, default: react };
      if (name === 'react-native') return { View: 'View', Text: 'Text', TouchableOpacity: 'Button',
        Platform: { OS: 'web' }, StyleSheet: { create: (styles) => styles } };
      if (name === '@expo/vector-icons') return { Ionicons: 'Icon' };
      if (name === '../../theme/colors') return { COLORS: { primary: 'green' } };
      if (name === '../../store/workoutStore') return { useWorkoutStore: () => state };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const render = (seconds, running = seconds > 0) => {
    state.restSecondsLeft = seconds; state.isRestTimerRunning = running;
    cursor = 0; pending = [];
    const tree = scope.exports.RestTimerBar();
    pending.forEach((effect) => effect());
    return tree;
  };
  const find = (node, label) => {
    if (node?.props?.accessibilityLabel === label) return node;
    for (const child of node?.children || []) { const match = find(child, label); if (match) return match; }
    return null;
  };
  return { tones, render, find };
};

test('rest countdown sounds once at ten seconds and twice at zero, with silence in between', () => {
  const timer = timerHarness();
  for (let seconds = 60; seconds >= 11; seconds--) timer.render(seconds);
  assert.equal(timer.tones.length, 0);
  timer.render(10);
  assert.equal(timer.tones.length, 1);
  timer.render(10, false);
  timer.render(10, true);
  assert.equal(timer.tones.length, 1, 'pause/resume must not repeat the warning');
  for (let seconds = 9; seconds >= 1; seconds--) timer.render(seconds);
  assert.equal(timer.tones.length, 1);
  timer.render(0);
  assert.equal(timer.tones.length, 3);
  assert.ok(timer.tones[2].start > timer.tones[1].end, 'the final beeps must be separate');
  timer.render(0);
  assert.equal(timer.tones.length, 3, 'finishing must not replay the alert');
});

test('skipping the last second does not sound the completion alert', () => {
  const timer = timerHarness();
  timer.render(2);
  const tree = timer.render(1);
  timer.find(tree, 'Omitir descanso').props.onPress();
  timer.render(0);
  assert.equal(timer.tones.length, 0);
});

test('a new rest or an extended rest can warn at ten seconds again', () => {
  const timer = timerHarness();
  timer.render(11); timer.render(10);
  timer.render(40); timer.render(11); timer.render(10);
  assert.equal(timer.tones.length, 2);
  timer.render(1); timer.render(0);
  timer.render(11); timer.render(10);
  assert.equal(timer.tones.length, 5);
});
