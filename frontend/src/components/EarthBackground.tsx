import { memo, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

interface EarthBackgroundProps {
  targetLocation?: string;
}

/**
 * React.memo prevents this heavy WebGL component from re-rendering
 * when parent state changes (typing in search, sidebar toggling, etc.)
 * It will only re-render when `targetLocation` actually changes.
 */
const EarthBackground = memo(function EarthBackground({ targetLocation }: EarthBackgroundProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const isAutoRotating = useRef(true);
  const rotateCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMzhjYjc0Yy01ZTQzLTQwODQtODBiOS04ZjhhMzRjMWIxZTciLCJpZCI6NDUyNzIwLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODMyNjY4ODF9.6LpVh_yXbhyrct1kinKpYLolhBjSY17rqXz8TCnvxf4';

    // Initialize Viewer with minimal UI
    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      timeline: false,
      animation: false,
      geocoder: false,
      baseLayerPicker: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
      requestRenderMode: true,       // Only render when something changes (massive perf gain)
      maximumRenderTimeChange: Infinity, // Let preUpdate drive renders
    });

    viewerRef.current = viewer;

    // Force continuous rendering since we have auto-rotation
    viewer.scene.requestRenderMode = false;

    // LIVE PHYSICS: Sync clock perfectly to real-world system time
    viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK;
    viewer.clock.multiplier = 1.0;

    // Remove the default Cesium logo/credit container
    if (viewer.creditDisplay && viewer.creditDisplay.container) {
      (viewer.creditDisplay.container as HTMLElement).style.display = 'none';
    }

    // Enable dynamic lighting (terminator)
    viewer.scene.globe.enableLighting = true;

    // Reduce tile detail for background use (improves load speed + reduces GPU load)
    viewer.scene.globe.maximumScreenSpaceError = 4; // default is 2, higher = less detail = faster

    // Disable camera controls for passive background
    viewer.scene.screenSpaceCameraController.enableInputs = false;
    viewer.scene.screenSpaceCameraController.enableZoom = false;

    // Set initial camera view to see a low-earth orbit/surface view
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-90, 40, 500000),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-30.0),
        roll: 0.0
      }
    });

    // Cinematic Auto-Rotation
    const rotateCamera = () => {
      if (isAutoRotating.current) {
        viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0005);
      }
    };
    rotateCallbackRef.current = rotateCamera;
    viewer.scene.preUpdate.addEventListener(rotateCamera);

    return () => {
      if (rotateCallbackRef.current) {
        viewer.scene.preUpdate.removeEventListener(rotateCallbackRef.current);
      }
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Handle Location Changes (Live Camera Flights)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (!targetLocation) {
      isAutoRotating.current = true;
      return;
    }

    let cancelled = false;

    const flyToLocation = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(targetLocation)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'AtmosphereWeatherApp/1.0' } }
        );
        const data = await res.json();

        if (cancelled || !data || data.length === 0) return;

        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        // Stop auto-rotation so we stay focused on the city
        isAutoRotating.current = false;

        // Perform cinematic flight
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, 500000),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-30.0),
            roll: 0.0
          },
          duration: 4.0
        });
      } catch (err) {
        console.error('Geocoding failed for camera flight', err);
      }
    };

    flyToLocation();

    return () => {
      cancelled = true;
    };
  }, [targetLocation]);

  return (
    <div className="earth-background-wrapper">
      <div ref={cesiumContainer} className="cesium-container" />
      <div className="earth-overlay" />
    </div>
  );
});

export default EarthBackground;

