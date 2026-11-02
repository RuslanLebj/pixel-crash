const PROP_KINDS={
 chainFence:{w:40,h:8,hp:1.2,threshold:48,points:30,pieces:7,colors:['#819486','#94a28d','#73877b']},
 baggageCart:{w:30,h:18,hp:1,threshold:35,points:55,pieces:7,colors:['#d8b263','#9fac91','#b48256']},
 generator:{w:28,h:22,hp:1.5,threshold:65,points:85,pieces:9,colors:['#bd9956','#829f8d','#997452']},
 bench:{w:28,h:12,hp:.8,threshold:30,points:25,pieces:6,colors:['#a58a57','#b39763','#84764c']},
 bin:{w:12,h:15,hp:.7,threshold:28,points:20,pieces:5,colors:['#5b8770','#829274','#657c75']},
 rock:{w:20,h:16,hp:1.5,threshold:72,points:30,pieces:8,colors:['#898878','#a09a83','#777d70']},
 pipe:{w:36,h:16,hp:1.6,threshold:65,points:50,pieces:8,colors:['#8c9b91','#a6aaa0','#7b8a82']},
 bollard:{w:10,h:12,hp:1.2,threshold:52,points:25,pieces:4,colors:['#a29a74','#878d78','#6b7c74']},
 cone:{w:10,h:12,hp:.5,threshold:20,points:15,pieces:3,colors:['#df7e42','#e69850','#c86b3f']},
 barrier:{w:36,h:10,hp:1.2,threshold:45,points:40,pieces:6,colors:['#b5ae85','#c7bd93','#9e9d7c']},
 pallet:{w:26,h:24,hp:1,threshold:38,points:80,pieces:8,colors:['#ac824c','#b99460','#967245']},
 container:{w:80,h:34,hp:2.4,threshold:90,points:180,pieces:16,colors:['#518b80','#bd784f','#778e63']},
 parkedCar:{w:44,h:22,hp:2.1,threshold:80,points:160,pieces:12,colors:['#a0aa76','#a55945','#648a98']},
 sign:{w:24,h:12,hp:.7,threshold:28,points:35,pieces:5,colors:['#7c9a78','#a5ab83','#b99b59']},
 fuelTank:{w:40,h:40,hp:2,threshold:75,points:240,pieces:14,explosive:true,colors:['#bec2a8','#a9b49a','#8f9f8c']},
 plane:{w:112,h:128,hp:4,threshold:110,points:450,pieces:24,explosive:true,colors:['#c1c7b6','#b8c7bd','#cbd0be']},
 machine:{w:54,h:34,hp:2.2,threshold:85,points:180,pieces:14,colors:['#d3a74f','#d69940','#c6b066']}
};
function addProp(x,y,type,tone){const spec=PROP_KINDS[type],o=add(x,y,type,spec.w,spec.h);if(tone!==undefined)o.tone=tone;return o}
