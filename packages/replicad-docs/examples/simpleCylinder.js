const { makeCylinder } = replicad;

const defaultParams = {
  radius: 25,
  height: 50,
};

const main = (r, { radius, height }) => {
  const cylinder = makeCylinder(radius, height);
  return cylinder;
}; 