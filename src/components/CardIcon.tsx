import type { CardId } from '../game/types';

const PALETTE: Record<string, string> = {
  '#': '#2b1d14',
  w: '#f5efe2',
  r: '#c0392b',
  k: '#4a3426',
  b: '#5b8fd6',
  B: '#2f5ea8',
  g: '#5bbf6a',
  y: '#e8b84a',
  s: '#9aa4ad',
  p: '#e58fb0',
};

const ICONS: Record<CardId, string[]> = {
  argument: [
    '..########..',
    '.#wwwwwwww#.',
    '#wwwwrrwwww#',
    '#wwwwrrwwww#',
    '#wwwwrrwwww#',
    '#wwwwrrwwww#',
    '#wwwwwwwwww#',
    '#wwwwrrwwww#',
    '.#wwwwwwww#.',
    '..###w####..',
    '....#w#.....',
    '....##......',
  ],
  critical_point: [
    '....####....',
    '..##rrrr##..',
    '.#rrwwwwrr#.',
    '.#rwwrrwwr#.',
    '#rwwrrrrwwr#',
    '#rwrrkkrrwr#',
    '#rwrrkkrrwr#',
    '#rwwrrrrwwr#',
    '.#rwwrrwwr#.',
    '.#rrwwwwrr#.',
    '..##rrrr##..',
    '....####....',
  ],
  evidence: [
    '.#######....',
    '.#wwwww##...',
    '.#wwwww#w#..',
    '.#wkkkw####.',
    '.#wwwwwwww#.',
    '.#wkkkkkkw#.',
    '.#wwwwwwww#.',
    '.#wkkkkkkw#.',
    '.#wwwwwwww#.',
    '.#wkkkwwgw#.',
    '.#wwwwwggw#.',
    '.##########.',
  ],
  strong_evidence: [
    '############',
    '#BbbbbbbbbB#',
    '#bbbbwwbbbb#',
    '#bbbbwwbbbb#',
    '#bbwwwwwwbb#',
    '#bbwwwwwwbb#',
    '#bbbbwwbbbb#',
    '.#bbbwwbbb#.',
    '.#bbbbbbbb#.',
    '..#bbbbbb#..',
    '...#bbbb#...',
    '....####....',
  ],
  additional_experiment: [
    '....####....',
    '....#ww#....',
    '....#ww#....',
    '....#ww#....',
    '...#wwww#...',
    '..#wwwwww#..',
    '.#wwwwwwww#.',
    '.#gggggwgg#.',
    '#gggwgggggg#',
    '#ggggggwggg#',
    '#gwgggggggg#',
    '.##########.',
  ],
  revision: [
    '........###.',
    '.......#ppp#',
    '......#yy#p#',
    '.....#yyy##.',
    '....#yyy#...',
    '...#yyy#....',
    '..#yyy#.....',
    '.#wyy#......',
    '.#ww#.......',
    '#kw#........',
    '##..........',
    '............',
  ],
  investigation: [
    '..#####.....',
    '.#bbbbb#....',
    '#bwwbbbb#...',
    '#bwbbbbb#...',
    '#bbbbbbb#...',
    '#bbbbbbb#...',
    '.#bbbbb#....',
    '..######....',
    '......#kk...',
    '.......#kk..',
    '........#kk.',
    '.........##.',
  ],
};

export function CardIcon({ id, size = 48 }: { id: CardId; size?: number }) {
  const rows = ICONS[id];
  const rects: JSX.Element[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const fill = PALETTE[c];
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} />);
    }
  });
  return (
    <svg
      className="card-icon"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects}
    </svg>
  );
}
