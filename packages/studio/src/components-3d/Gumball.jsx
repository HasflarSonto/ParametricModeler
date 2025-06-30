import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const Gumball = ({ 
  selectedShape, 
  mode = 'translate',
  size = 0.5 
}) => {
  const controlsRef = useRef();
  const { camera } = useThree();
  const initialTransformRef = useRef(null);
  const isDraggingRef = useRef(false);

  if (!selectedShape) return null;

  const logTransformCommand = (transformType, values) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Generated Transform Command:`);
    console.log(`// ${transformType} command for selected shape`);
    
    switch (transformType) {
      case 'translate':
        const [x, y, z] = values;
        console.log(`shape.translate([${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]);`);
        break;
      case 'rotate':
        const [angle, rotateCenter, axis] = values;
        console.log(`shape.rotate(${angle.toFixed(2)}, [${rotateCenter[0].toFixed(2)}, ${rotateCenter[1].toFixed(2)}, ${rotateCenter[2].toFixed(2)}], [${axis[0].toFixed(2)}, ${axis[1].toFixed(2)}, ${axis[2].toFixed(2)}]);`);
        break;
      case 'scale':
        const [scale, scaleCenter] = values;
        console.log(`shape.scale([${scaleCenter[0].toFixed(2)}, ${scaleCenter[1].toFixed(2)}, ${scaleCenter[2].toFixed(2)}], ${scale.toFixed(2)});`);
        break;
    }
    console.log('---');
  };

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    // Store initial transform state
    initialTransformRef.current = {
      position: selectedShape.position.clone(),
      rotation: selectedShape.rotation.clone(),
      scale: selectedShape.scale.clone(),
      matrix: selectedShape.matrix.clone()
    };
    console.log('Transform started - initial state captured');
  };

  const handleChange = () => {
    // Don't log during dragging, just track the changes
    // The final result will be logged in handleMouseUp
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current && initialTransformRef.current) {
      const current = selectedShape;
      const initial = initialTransformRef.current;

      // Log the final cumulative result
      switch (mode) {
        case 'translate':
          const totalDisplacement = new THREE.Vector3();
          totalDisplacement.subVectors(current.position, initial.position);
          
          if (totalDisplacement.length() > 0.01) {
            logTransformCommand('translate', [totalDisplacement.x, totalDisplacement.y, totalDisplacement.z]);
          }
          break;

        case 'rotate':
          const totalRotation = new THREE.Euler();
          totalRotation.x = current.rotation.x - initial.rotation.x;
          totalRotation.y = current.rotation.y - initial.rotation.y;
          totalRotation.z = current.rotation.z - initial.rotation.z;
          
          const totalAngleX = THREE.MathUtils.radToDeg(totalRotation.x);
          const totalAngleY = THREE.MathUtils.radToDeg(totalRotation.y);
          const totalAngleZ = THREE.MathUtils.radToDeg(totalRotation.z);
          
          if (Math.abs(totalAngleX) > 1 || Math.abs(totalAngleY) > 1 || Math.abs(totalAngleZ) > 1) {
            const maxAngle = Math.max(Math.abs(totalAngleX), Math.abs(totalAngleY), Math.abs(totalAngleZ));
            let axis, angle;
            if (Math.abs(totalAngleX) === maxAngle) {
              axis = [1, 0, 0];
              angle = totalAngleX;
            } else if (Math.abs(totalAngleY) === maxAngle) {
              axis = [0, 1, 0];
              angle = totalAngleY;
            } else {
              axis = [0, 0, 1];
              angle = totalAngleZ;
            }
            logTransformCommand('rotate', [angle, [0, 0, 0], axis]);
          }
          break;

        case 'scale':
          const totalScaleX = current.scale.x / initial.scale.x;
          const totalScaleY = current.scale.y / initial.scale.y;
          const totalScaleZ = current.scale.z / initial.scale.z;
          const totalScaleFactor = (totalScaleX + totalScaleY + totalScaleZ) / 3;
          
          if (Math.abs(totalScaleFactor - 1) > 0.01) {
            logTransformCommand('scale', [totalScaleFactor, [0, 0, 0]]);
          }
          break;
      }

      console.log('Transform completed');
      isDraggingRef.current = false;
      initialTransformRef.current = null;
    }
  };

  return (
    <TransformControls
      ref={controlsRef}
      object={selectedShape}
      mode={mode}
      size={size}
      showX={true}
      showY={true}
      showZ={true}
      onMouseDown={handleMouseDown}
      onChange={handleChange}
      onMouseUp={handleMouseUp}
    />
  );
};

export default Gumball; 