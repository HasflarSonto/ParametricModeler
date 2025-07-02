// Comprehensive test for CodeUpdater fixes
import { CodeUpdater } from './packages/studio/src/components-3d/gumball/CodeUpdater.js';
import { CodeAnalyzer } from './packages/studio/src/components-3d/gumball/CodeAnalyzer.js';

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
const codeAnalyzer = new CodeAnalyzer();

// Test cases covering different patterns
const testCases = [
  {
    name: 'Simple vase with existing defaultParams (simpleVase.js pattern)',
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
    name: 'Wavy vase with multi-line defaultParams (wavyVase.js pattern)',
    code: `const { drawCircle, drawPolysides, polysideInnerRadius } = replicad;

const defaultParams = {
  height: 150,
  radius: 40,
  sidesCount: 12,
  sideRadius: -2,
  sideTwist: 6,
  endFactor: 1.5,
  topFillet: 0,
  bottomFillet: 5,

  holeMode: 1,
  wallThickness: 2,
};

const main = (
  r,
  {
    height,
    radius,
    sidesCount,
    sideRadius,
    sideTwist,
    endFactor,
    topFillet,
    bottomFillet,
    holeMode,
    wallThickness,
  }
) => {
  const extrusionProfile = endFactor
    ? { profile: "s-curve", endFactor }
    : undefined;
  const twistAngle = (360 / sidesCount) * sideTwist;

  let shape = drawPolysides(radius, sidesCount, -sideRadius)
    .sketchOnPlane()
    .extrude(height, {
      twistAngle,
      extrusionProfile,
    });

  if (bottomFillet) {
    shape = shape.fillet(bottomFillet, (e) => e.inPlane("XY"));
  }

  if (holeMode === 1 || holeMode === 2) {
    const holeHeight = height - wallThickness;

    let hole;
    if (holeMode === 1) {
      const insideRadius =
        polysideInnerRadius(radius, sidesCount, sideRadius) - wallThickness;

      hole = drawCircle(insideRadius).sketchOnPlane().extrude(holeHeight, {
        extrusionProfile,
      });

      shape = shape.cut(
        hole
          .fillet(
            Math.max(wallThickness / 3, bottomFillet - wallThickness),
            (e) => e.inPlane("XY")
          )
          .translate([0, 0, wallThickness])
      );
    } else if (holeMode === 2) {
      shape = shape.shell(wallThickness, (f) => f.inPlane("XY", height));
    }
  }

  if (topFillet) {
    shape = shape.fillet(topFillet, (e) => e.inPlane("XY", height));
  }
  return shape;
};`
  },
  {
    name: 'Watering can with empty defaultParams and complex return (watering-can.js pattern)',
    code: `const { makePlane, makeCylinder, draw, drawCircle } = replicad;

const defaultParams = {};

const main = () => {
  // Building the body
  const profile = draw()
    .hLine(20)
    .line(10, 5)
    .vLine(3)
    .lineTo([8, 100])
    .hLine(-8)
    .close();

  const body = profile.sketchOnPlane("XZ").revolve([0, 0, 1]);

  // Building the filler
  const topPlane = makePlane().pivot(-20, "Y").translate([-35, 0, 135]);
  const topCircle = drawCircle(12).sketchOnPlane(topPlane);

  const middleCircle = drawCircle(8).sketchOnPlane("XY", 100);

  const bottomPlane = makePlane().pivot(20, "Y").translateZ(80);
  const bottomCircle = drawCircle(9).sketchOnPlane(bottomPlane);

  const filler = topCircle.loftWith([middleCircle, bottomCircle], {
    ruled: false,
  });

  // Building the spout
  const spout = makeCylinder(5, 70)
    .translateZ(100)
    .rotate(45, [0, 0, 100], [0, 1, 0]);

  let wateringCan = body
    .fuse(filler)
    .fillet(30, (e) => e.inPlane("XY", 100))
    .fuse(spout)
    .fillet(10, (e) => e.inBox([20, 20, 100], [-20, -20, 120]));

  const spoutOpening = [
    Math.cos((45 * Math.PI) / 180) * 70,
    0,
    100 + Math.sin((45 * Math.PI) / 180) * 70,
  ];

  wateringCan = wateringCan.shell(-1, (face) =>
    face.either([
      (f) => f.containsPoint(spoutOpening),
      (f) => f.inPlane(topPlane),
    ])
  );

  return {
    shape: wateringCan,
    name: "Watering Can",
  };
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

function testCodeAnalyzer() {
  console.log('=== Testing CodeAnalyzer ===\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(60));
    
    try {
      // Test code analysis
      const analysis = codeAnalyzer.analyzeCode(testCase.code);
      
      console.log('📋 Analysis results:');
      console.log(`  Variables: ${analysis.variables.length}`);
      analysis.variables.forEach(v => {
        console.log(`    - ${v.name} (${v.type})`);
      });
      
      console.log(`  Return statements: ${analysis.returnStatements.length}`);
      analysis.returnStatements.forEach((ret, i) => {
        console.log(`    - Return ${i + 1}: ${ret.type} - ${ret.value}`);
      });
      
      // Test object selection
      const selectedObject = codeAnalyzer.determineSelectedObject(analysis, null, false, false);
      console.log(`🎯 Selected object: ${selectedObject}`);
      
      // Test object path
      const objectPath = codeAnalyzer.determineObjectPath(analysis, selectedObject);
      console.log(`🎯 Object path: ${objectPath || 'none'}`);
      
      console.log('\n');
      
    } catch (error) {
      console.log(`   ✗ Test failed: ${error.message}\n`);
    }
  });
}

function testCodeUpdater() {
  console.log('=== Testing CodeUpdater ===\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(60));
    
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

function testSelectionAwareUpdates() {
  console.log('=== Testing Selection-Aware Updates ===\n');
  
  // Test with watering can pattern (complex return)
  const wateringCanCode = testCases[2].code;
  mockStore.code.current = wateringCanCode;
  
  console.log('Testing complex return statement update...');
  
  try {
    // First add transform parameters
    codeUpdater.addTransformParametersToCode();
    codeUpdater.addTransformToMainFunction();
    
    // Test selection-aware update
    const success = codeUpdater.updateSelectedObjectTransform(
      'wateringCan',  // object name
      'shape',        // object path
      'translate',    // transform type
      [10, 20, 30]    // values
    );
    
    console.log(`✓ Selection-aware update: ${success}`);
    
    // Check if the update was applied correctly - look in the assignment
    const hasTransform = /wateringCan\s*=\s*[^;]+\.translate\(10, 20, 30\)/.test(mockStore.code.current);
    console.log(`✓ Transform found in assignment: ${hasTransform}`);
    
    // Also check if the transform appears anywhere in the code
    const hasTransformAnywhere = /\.translate\(10, 20, 30\)/.test(mockStore.code.current);
    console.log(`✓ Transform found anywhere in code: ${hasTransformAnywhere}`);
    
    // Test syntax
    try {
      new Function(mockStore.code.current);
      console.log('✓ Updated code has valid syntax');
    } catch (error) {
      console.log(`✗ Syntax error: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`✗ Test failed: ${error.message}`);
  }
  
  console.log('\n');
}

// Run all tests
console.log('🧪 Running Comprehensive Gumball System Tests\n');

testCodeAnalyzer();
testCodeUpdater();
testSelectionAwareUpdates();

console.log('✅ All tests completed!'); 