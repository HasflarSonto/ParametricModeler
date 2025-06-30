import * as React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

export default function Stage({ children, center, ...props }) {
  const camera = useThree((state) => state.camera);
  const { invalidate } = useThree();
  const outer = React.useRef(null);
  const inner = React.useRef(null);
  const hasUserMovedCamera = React.useRef(false);

  const [{ radius, previousRadius, top }, set] = React.useState({
    previousRadius: null,
    radius: 0,
    top: 0,
  });

  // Track if user has moved the camera
  React.useEffect(() => {
    const handleCameraChange = () => {
      hasUserMovedCamera.current = true;
    };
    
    // Listen for camera changes from OrbitControls
    camera.addEventListener('change', handleCameraChange);
    
    return () => {
      camera.removeEventListener('change', handleCameraChange);
    };
  }, [camera]);

  React.useLayoutEffect(() => {
    outer.current.updateWorldMatrix(true, true);
    const box3 = new THREE.Box3().setFromObject(inner.current, true, (object) => {
      // Exclude TransformControls from bounding box calculation
      return !(object.type === 'TransformControls' || object.userData?.isTransformControl);
    });

    if (center) {
      const centerPoint = new THREE.Vector3();
      box3.getCenter(centerPoint);
      outer.current.position.set(
        outer.current.position.x - centerPoint.x,
        outer.current.position.y - centerPoint.y,
        outer.current.position.z - centerPoint.z
      );
    }

    const sphere = new THREE.Sphere();
    box3.getBoundingSphere(sphere);

    set({ radius: sphere.radius, previousRadius: radius, top: box3.max.z });
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  React.useLayoutEffect(() => {
    if (previousRadius && previousRadius !== radius) {
      const ratio = radius / previousRadius;
      
      // If the radius change is very small (like when gumball appears), preserve camera position
      if (Math.abs(ratio - 1) < 0.1) {
        // Don't reset camera for small changes
        camera.far = Math.max(5000, radius * 4);
        invalidate();
        return;
      }
      
      // Only adjust camera position if user hasn't manually moved it
      if (!hasUserMovedCamera.current) {
        camera.position.set(
          camera.position.x * ratio,
          camera.position.y * ratio,
          camera.position.z * ratio
        );
      }

      camera.far = Math.max(5000, radius * 4);

      invalidate();
      return;
    }

    // Only set initial camera position if we don't have a previous radius
    // This prevents camera reset during the first few gumball activations
    if (!previousRadius) {
      camera.position.set(
        radius * 0.25,
        -radius * 1.5,
        Math.max(top, radius) * 1.5
      );
      camera.near = 0.1;
      camera.far = Math.max(5000, radius * 4);
      camera.lookAt(0, 0, 0);

      if (camera.type === "OrthographicCamera") {
      camera.position.set(
        radius,
        -radius,
        radius
      );

        camera.zoom = 5;
        camera.near = Math.max(0.1, radius * 0.1);
        camera.far = Math.max(5000, radius * 4);
        camera.updateProjectionMatrix();
      }
    }

    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, top, previousRadius]);

  return (
    <group {...props}>
      <group ref={outer}>
        <group ref={inner}>{children}</group>
      </group>
    </group>
  );
}
