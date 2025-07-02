const { draw } = replicad;

const defaultParams = {
  width: 50,
  height: 50,
  depth: 50,
};

const main = (r, { width, height, depth }) => {
  const box = draw()
    .hLine(width)
    .vLine(height)
    .hLine(-width)
    .close()
    .sketchOnPlane()
    .extrude(depth);
  return box;
}; 