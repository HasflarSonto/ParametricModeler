// Comprehensive test for CodeUpdater fixes
const { CodeUpdater } = require('./packages/studio/src/components-3d/gumball/CodeUpdater.js');

// Mock store for testing
const mockStore = {
  code: {
    current: '',
    update: (code, flag) => { mockStore.code.current = code; }
  },
  updateCode: (code) => { mockStore.code.current = code; },
  process: (params) => console.log('Process called with:', params)
};

const codeUpdater = new CodeUpdater(mockStore);

// Test cases
const testCases = [
  {
    name: 'Simple vase with existing defaultParams',
    code: `const { draw } = replicad;

const defaultParams = {
  height: 100,
  baseWidth: 20,
  wallThickness: 5,
  lowerCircleRadius: 1.5,
  lowerCirclePosition: 0.25,
  higherCircleRadius: 0.75,
  higherCirclePosition: 0.75,
  topRadius: 0.9,
  topFillet: true,
  bottomHeavy: true,
};

const main = (
  r,
  {
    height,
    baseWidth,
    wallThickness,
    lowerCirclePosition,
    lowerCircleRadius,
    higherCircleRadius,
    higherCirclePosition,
    topRadius,
    topFillet,
    bottomHeavy,
  }
) => {
  const splinesConfig = [
    { position: lowerCirclePosition, radius: lowerCircleRadius },
    {
      position: higherCirclePosition,
      radius: higherCircleRadius,
      startFactor: bottomHeavy ? 3 : 1,
    },
    { position: 1, radius: topRadius, startFactor: bottomHeavy ? 3 : 1 },
  ];

  const sketchVaseProfile = draw().hLine(baseWidth);

  splinesConfig.forEach(({ position, radius, startFactor, endFactor }) => {
    sketchVaseProfile.smoothSplineTo([baseWidth * radius, height * position], {
      endTangent: [0, 1],
      startFactor,
      endFactor,
    });
  });

  let vase = sketchVaseProfile
    .lineTo([0, height])
    .close()
    .sketchOnPlane("XZ")
    .revolve();

  if (wallThickness) {
    vase = vase.shell(wallThickness, (f) => f.containsPoint([0, 0, height]));
  }

  if (topFillet) {
    vase = vase.fillet(wallThickness / 3, (e) => e.inPlane("XY", height));
  }

  return vase;
};`
  },
  {
    name: 'Simple example without defaultParams',
    code: `const { draw } = replicad;

const main = () => {
  const shape = draw().hLine(10).vLine(10).hLine(-10).close().sketchOnPlane().extrude(5);
  return shape;
};`
  }
];

function testCodeUpdater() {
  console.log('=== Testing CodeUpdater Fixes ===\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(50));
    
    // Set the test code
    mockStore.code.current = testCase.code;
    
    try {
      // Test adding transform parameters
      console.log('1. Testing addTransformParametersToCode...');
      codeUpdater.addTransformParametersToCode();
      
      // Check if defaultParams was added/updated
      const hasDefaultParams = /const\s+defaultParams\s*=\s*{/.test(mockStore.code.current);
      const hasTransformParams = /x_translate:\s*0/.test(mockStore.code.current);
      
      console.log(`   ✓ defaultParams exists: ${hasDefaultParams}`);
      console.log(`   ✓ transform parameters added: ${hasTransformParams}`);
      
      // Test adding transform to main function
      console.log('2. Testing addTransformToMainFunction...');
      codeUpdater.addTransformToMainFunction();
      
      // Check if transforms were added
      const hasTranslate = /\.translate\(\[defaultParams\.x_translate/.test(mockStore.code.current);
      const hasRotate = /\.rotate\(defaultParams\.angle/.test(mockStore.code.current);
      
      console.log(`   ✓ translate added: ${hasTranslate}`);
      console.log(`   ✓ rotate added: ${hasRotate}`);
      
      // Test syntax validity
      console.log('3. Testing syntax validity...');
      try {
        new Function(mockStore.code.current);
        console.log('   ✓ Generated code has valid syntax');
      } catch (error) {
        console.log(`   ✗ Syntax error: ${error.message}`);
      }
      
      // Test translation update
      console.log('4. Testing translation update...');
      const translationSuccess = codeUpdater.updateTranslationParams({ x: 10, y: 20, z: 30 });
      console.log(`   ✓ Translation update: ${translationSuccess}`);
      
      // Test rotation update
      console.log('5. Testing rotation update...');
      const rotationSuccess = codeUpdater.updateRotationParams(45, [0, 0, 1]);
      console.log(`   ✓ Rotation update: ${rotationSuccess}`);
      
      // Final syntax check
      try {
        new Function(mockStore.code.current);
        console.log('   ✓ Final code has valid syntax');
      } catch (error) {
        console.log(`   ✗ Final syntax error: ${error.message}`);
      }
      
      console.log('\n');
      
    } catch (error) {
      console.log(`   ✗ Test failed: ${error.message}\n`);
    }
  });
}

testCodeUpdater(); 