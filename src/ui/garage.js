function syncVehicleUI(){
 const model=vehicleModel();$('selectedVehicleName').textContent=model.name;$('selectedVehicleKind').textContent=model.kind;
 $('garageOpen').setAttribute('aria-label','Открыть гараж. Выбрана '+model.name);
 for(const button of document.querySelectorAll('[data-vehicle]')){
  const active=button.dataset.vehicle===vehicleId;button.setAttribute('aria-pressed',String(active));
  $('vehicleStatus-'+button.dataset.vehicle).textContent=active?'ВЫБРАНА':'ВЫБРАТЬ →';
 }
 drawVehiclePreview($('selectedCarPreview'),model);
}
function selectVehicle(id){
 const model=FLEET.find(item=>item.id===id);if(!model)return false;
 vehicleId=id;if(car)car.modelId=id;
 try{localStorage.setItem('crash-vehicle',id)}catch{}
 syncVehicleUI();return true;
}
function openGarage(){
 if(garageOpen||mapOpen)return;garageWasPlaying=state==='playing';
 if(garageWasPlaying)pause();clearInput();garageOpen=true;
 syncVehicleUI();$('garageDialog').showModal();
}
function closeGarage(){if(garageOpen)$('garageDialog').close()}
function finishGarageClose(){
 garageOpen=false;clearInput();
 const resume=garageWasPlaying;garageWasPlaying=false;
 if(resume&&state==='paused')start();
}
function setupGarage(){
 for(const model of FLEET)drawVehiclePreview($('garagePreview-'+model.id),model);
 syncVehicleUI();
 $('garageOpen').onclick=openGarage;$('garageToolbar').onclick=openGarage;$('garageClose').onclick=closeGarage;
 $('garageDialog').addEventListener('close',finishGarageClose);
 for(const button of document.querySelectorAll('[data-vehicle]'))button.onclick=()=>{selectVehicle(button.dataset.vehicle);closeGarage()};
}
