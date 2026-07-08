import { memo, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

interface EarthBackgroundProps {
  targetLocation?: string;
}

const EarthBackground = memo(function EarthBackground({ targetLocation }: EarthBackgroundProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const isAutoRotating = useRef(true);
  const rotateCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMzhjYjc0Yy01ZTQzLTQwODQtODBiOS04ZjhhMzRjMWIxZTciLCJpZCI6NDUyNzIwLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODMyNjY4ODF9.6LpVh_yXbhyrct1kinKpYLolhBjSY17rqXz8TCnvxf4';

    
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
      scene3DOnly: true,
      contextOptions: {
        webgl: {
          alpha: true,
          antialias: true,
          powerPreference: "high-performance"
        }
      }
    });

    viewerRef.current = viewer;

    
    viewer.scene.msaaSamples = 4;

    
    
    viewer.resolutionScale = window.devicePixelRatio > 1 ? 0.75 : 1.0;
    
    
    if (viewer.scene.postProcessStages.fxaa) {
      viewer.scene.postProcessStages.fxaa.enabled = false;
    }

    
    viewer.targetFrameRate = 60;

    
    viewer.scene.requestRenderMode = false;

    
    viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK;
    viewer.clock.multiplier = 1.0;

    
    if (viewer.creditDisplay && viewer.creditDisplay.container) {
      (viewer.creditDisplay.container as HTMLElement).style.display = 'none';
    }

    
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.dynamicAtmosphereLighting = true; 
    viewer.scene.globe.showWaterEffect = false; 
    viewer.scene.globe.depthTestAgainstTerrain = false; 

    
    Cesium.IonImageryProvider.fromAssetId(3812).then((provider) => {
      if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
      const nightLayer = viewerRef.current.imageryLayers.addImageryProvider(provider);
      nightLayer.dayAlpha = 0.0; 
      nightLayer.nightAlpha = 1.0; 
    }).catch(err => console.warn('Failed to load night imagery', err));

    
    viewer.scene.globe.tileCacheSize = 1000;

    
    viewer.scene.screenSpaceCameraController.enableInputs = false;
    viewer.scene.screenSpaceCameraController.enableZoom = false;

    
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-90, 40, 500000),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-30.0),
        roll: 0.0
      }
    });

    
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

        
        isAutoRotating.current = false;

        
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

