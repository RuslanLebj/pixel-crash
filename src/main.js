function frame(t){const dt=Math.min(.033,(t-last)/1000||.016);last=t;update(dt);updateCamera(dt);draw(t);drawSpeedometer(dt);drawMinimap();requestAnimationFrame(frame)}
setupGarage();setupMapChooser();syncMusicButton();loadBest();syncSettings();ready();requestAnimationFrame(frame);
