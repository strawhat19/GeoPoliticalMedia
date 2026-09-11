// Native Higgsedit assembly. Run after prepare_picture.py inside the media sandbox.
export default async ({ project, text, rect }) => {
  const p = await project({ dir: `${process.cwd()}/edit`, size: '720x1280', fps: 24, background: '#08192f' });
  const shots = [
    ['01_hammer', 56], ['02_tail', 75], ['03_hero', 40],
    ['04_quench', 79], ['05_stress', 168], ['06_snip', 43], ['07_fracture', 72],
  ];
  const assets = {};
  for (const [name, frames] of shots) {
    assets[name] = await p.add(`${process.cwd()}/prepared/${name}.mp4`);
  }
  // The opening demonstrates the paradox before the explanatory replay.
  const cuts = [
    ['01_hammer', 0, 56, 0],
    ['02_tail', 30, 24, 56],
    ['06_snip', 31, 9, 80],
    ['07_fracture', 0, 42, 89],
    ['03_hero', 0, 40, 131],
    ['04_quench', 0, 79, 171],
    ['05_stress', 0, 168, 250],
    ['06_snip', 0, 43, 418],
    ['07_fracture', 0, 72, 461],
  ];
  for (const [name, from, frames, at] of cuts) {
    p.cut(assets[name], { from: from / 24, dur: frames / 24, at: at / 24, fit: 'contain' });
  }
  const label = (content, color, at, dur, y = 155) => {
    p.compose(text(content, {
      x: 80, y, width: 560, height: 60,
      fontFamily: 'Montserrat', fontWeight: 700, fontSize: 28,
      align: 'center', color,
      shadow: { x: 0, y: 2, blur: 6, color: '#00000080' },
      animate: [{ property: 'opacity', from: 0, to: 1, duration: .10 }],
    }), { at, dur, name: content });
  };
  label("PRINCE RUPERT'S DROP", '#e2f7ff', 5.5, 1.5);
  label('RAPID COOLING', '#d3f2ff', 7.2, 3.0);
  label('TRAPPED STRESS', '#e2f7ff', 10.5, 3.3);
  label('COMPRESSED SHELL', '#8be7ff', 14.0, 1.8);
  label('TENSION INSIDE', '#ffbf75', 16.0, 1.3);
  p.compose(text('SLOW MOTION', {
    x: 80, y: 168, width: 240, height: 38,
    fontFamily: 'Montserrat', fontWeight: 700, fontSize: 19,
    color: '#d4e8f7', letterSpacing: 1.5,
  }), { at: 17.4166667, dur: 4.7916666, name: 'Fracture time scale' });
  p.compose(text('GEO LABS', {
    x: 80, y: 100, width: 300, height: 38,
    fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20,
    color: '#c0d5e5', letterSpacing: 2,
  }), { at: 20.5, dur: 1.7083333, name: 'End signature' });
  await p.render('renders/picture.mp4', { depth: 8, bitrate: 6000000, concurrency: 2 });
};

