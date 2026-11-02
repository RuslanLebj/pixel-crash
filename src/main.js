function frame(t){const dt=Math.min(.033,(t-last)/1000||.016);last=t;update(dt);updateEnvironment(dt);updateCamera(dt);draw(t);drawSpeedometer(dt);drawMinimap();requestAnimationFrame(frame)}
setupGarage();setupMapChooser();setupLightingControls();syncMusicButton();loadBest();syncSettings();ready();requestAnimationFrame(frame);
