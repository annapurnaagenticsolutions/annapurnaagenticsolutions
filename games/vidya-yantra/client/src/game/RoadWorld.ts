// Chapter II design reminder: Nadi Corridor is a sunlit, diagonal river journey where skills turn study into public usefulness.
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { HudBridge, type TraitKey } from "./HudBridge";
import { InputManager } from "./InputManager";
import { Player, buildNpcFigure, createPortraitBillboard, type NpcFigure, type PortraitBillboard } from "./Player";
import { SoundFeedback } from "./SoundFeedback";
import { CinematicCamera } from "./CinematicCamera";
import { AmbientLife } from "./AmbientLife";
import { assets } from "./assets";
import type { JourneyContext } from "./scene";

type RouteMarker = { root: TransformNode; core: Mesh; found: boolean; title: string };
type Pulse = { ring: Mesh; motes: Mesh[]; age: number };
type FieldNote = { root: TransformNode; label: string; note: string };
const saffron = Color3.FromHexString("#F26B38");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const parchment = Color3.FromHexString("#D7B77D");

export class RoadWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private markers: RouteMarker[] = [];
  private fieldNotes: FieldNote[] = [];
  private pulses: Pulse[] = [];
  private tara: TransformNode;
  private taraFigure!: NpcFigure;
  private taraBillboard!: PortraitBillboard;
  private collected = 0;
  private stage: "survey" | "speak" | "choose" | "complete" = "survey";
  private pulseCooldown = 0;
  private time = 0;
  private traits = { viveka: 48, sahas: 36, karuna: 42 };
  private materials = { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: 0, saltLeaf: 0 };
  private boat!: Mesh;
  private sail!: Mesh;
  private routeSeal!: Mesh;
  private soundingStone!: Mesh;
  private selectedStance: TraitKey | null = null;
  private ferryShared = false;
  private soundingRecovered = false;
  private returnThread?: Mesh;
  private conditionCues: Mesh[] = [];
  private newPlus = false;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.newPlus = context?.journeyMode === "new-plus";
    this.createCorridor();
    this.tara = this.createTara();
    this.player = new Player(scene, new Vector3(-7.2, 0, 5.5), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "road", () => this.hud.reducedMotion);
    this.ambient = new AmbientLife(scene, "road", () => this.hud.reducedMotion);
    this.createRouteMarkers();
    this.createFieldNotes();
    this.createReactiveCues();
    const returning = Boolean(context?.routeComplete);
    if (returning) {
      this.stage = "complete";
      this.collected = 3;
      this.markers.forEach((marker, index) => { marker.found = true; marker.core.material = this.mat(`return-route-core-${index}`, jade, jade); });
      this.routeSeal.setEnabled(true);
      this.soundingRecovered = Boolean(context?.taraQuest);
      this.soundingStone.setEnabled(!this.soundingRecovered);
    }
    this.hud.patch({ chapter: "Chapter II · Nadi Corridor", questTitle: returning ? "The river remembers its promise" : "The Road of Many Arts", questDetail: returning ? "The crossing now responds to the consequence you carried. Listen for Tara’s route call, inspect a field note, or take the ferry again." : this.newPlus ? "New Journey+ · echo mode: guidance arrives in fragments. Listen to the river and the field notes to infer the rest." : "Use Star-thread Sight near the three route markers, then speak with Tara Vaidyi at Nadi Bazaar.", glyphs: returning ? 3 : 0, glyphGoal: 3, season: "Sharad · clear river", timeOfDay: "River morning", notice: returning ? this.returnNotice() : this.newPlus ? this.echo("The river is wider than a map, but every map begins when someone looks closely enough.") : "The river is wider than a map, but every map begins when someone looks closely enough.", materials: this.materials, routeComplete: returning, routeConsequence: context?.routeConsequence ?? "", taraBond: context?.taraBond ?? 0, taraQuest: context?.taraQuest ?? 0 });
  }

  private mat(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) { const material = new StandardMaterial(name, this.scene); material.diffuseColor = color; material.emissiveColor = emissive; material.specularColor = Color3.Black(); material.alpha = alpha; return material; }
  private createCorridor() {
    const ground = MeshBuilder.CreateGround("nadi-corridor-ground", { width: 28, height: 24, subdivisions: 12 }, this.scene); ground.material = this.mat("nadi-earth", Color3.FromHexString("#B77843"));
    const river = MeshBuilder.CreateGround("nadi-river", { width: 6.1, height: 28, subdivisions: 8 }, this.scene); river.position.x = 3.1; river.rotation.y = -0.18; river.position.y = 0.02; river.material = this.mat("nadi-water", Color3.FromHexString("#3992A7"), Color3.FromHexString("#164E60"), .92);
    const bank = MeshBuilder.CreateLines("nadi-bank-thread", { points: [new Vector3(.2,.08,-13),new Vector3(1.3,.08,0),new Vector3(.4,.08,13)]}, this.scene); bank.color = parchment;
    this.boat = MeshBuilder.CreateBox("tara-boat", { width: 1.35, height: .32, depth: 3.1 }, this.scene); this.boat.position = new Vector3(3.45,.35,4.6); this.boat.rotation.y = -.18; this.boat.material = this.mat("boat-copperwood", Color3.FromHexString("#70402A"));
    const mast = MeshBuilder.CreateCylinder("boat-mast", { height: 1.9, diameter: .05 }, this.scene); mast.position = new Vector3(3.45,1.2,4.6); mast.material = this.mat("mast-mat", parchment);
    this.sail = MeshBuilder.CreatePlane("boat-sail", { width: 1.25, height: 1.05 }, this.scene); this.sail.position = new Vector3(3.48,1.52,4.59); this.sail.rotation.y = -.18; this.sail.material = this.mat("sail-jade", jade);
    for (let index=0; index<7; index+=1) { const tree=MeshBuilder.CreateSphere(`nadi-tree-${index}`,{diameter:1.55+(index%2)*.4,segments:8},this.scene); tree.scaling.y=1.25; tree.position=new Vector3(-10+(index*2.7),1.2,-8+((index*4.1)%16)); tree.material=this.mat(`nadi-leaf-${index}`, Color3.FromHexString(index%2?"#4D714F":"#326556")); const trunk=MeshBuilder.CreateCylinder(`nadi-trunk-${index}`,{height:1.55,diameter:.16},this.scene); trunk.position=new Vector3(tree.position.x,.76,tree.position.z); trunk.material=this.mat(`nadi-trunk-mat-${index}`,Color3.FromHexString("#513620")); }
    [-7.8,-5.2,-2.6].forEach((x,index)=>{ const stall=MeshBuilder.CreateBox(`bazaar-stall-${index}`,{width:1.6,height:1.15,depth:1.25},this.scene); stall.position=new Vector3(x,.58,-4.5+(index%2)*.7); stall.material=this.mat(`bazaar-cloth-${index}`,index===1?jade:Color3.FromHexString("#C58548")); const roof=MeshBuilder.CreateBox(`bazaar-roof-${index}`,{width:1.9,height:.14,depth:1.5},this.scene); roof.position=new Vector3(x,1.25,-4.5+(index%2)*.7); roof.material=this.mat(`bazaar-roof-mat-${index}`,Color3.FromHexString("#223A51")); });
    const cross = MeshBuilder.CreateCylinder("open-crossing", {diameter:3.2,height:.14,tessellation:32},this.scene); cross.position=new Vector3(-4.4,.08,4.5); cross.material=this.mat("crossing-mat",Color3.FromHexString("#6E4A31"));
    [4.4,3.2,2.1].forEach((diameter,index)=>{ const ring=MeshBuilder.CreateTorus(`road-yantra-${index}`,{diameter,thickness:.07,tessellation:36},this.scene); ring.position=new Vector3(-4.4,.3+index*.08,4.5); ring.rotation.x=Math.PI/2; ring.rotation.z=index*.65; ring.material=this.mat(`road-yantra-mat-${index}`,index===1?jade:copper, index===1?Color3.FromHexString("#173E36"):Color3.FromHexString("#321A0B")); });
    this.routeSeal = MeshBuilder.CreateTorus("tara-route-seal", { diameter: 0.72, thickness: 0.07, tessellation: 28 }, this.scene);
    this.routeSeal.position = new Vector3(3.45, 0.75, 4.6);
    this.routeSeal.rotation.x = Math.PI / 2;
    this.routeSeal.material = this.mat("tara-route-seal-mat", saffron, saffron);
    this.routeSeal.setEnabled(false);
    this.soundingStone = MeshBuilder.CreateSphere("tara-missing-sounding", { diameter: 0.42, segments: 10 }, this.scene);
    this.soundingStone.position = new Vector3(5.55, 0.28, -6.3);
    this.soundingStone.material = this.mat("tara-missing-sounding-mat", parchment, saffron);
    const soundingRing = MeshBuilder.CreateTorus("tara-sounding-ring", { diameter: 0.82, thickness: 0.045, tessellation: 24 }, this.scene);
    soundingRing.position = new Vector3(5.55, 0.12, -6.3);
    soundingRing.rotation.x = Math.PI / 2;
    soundingRing.material = this.mat("tara-sounding-ring-mat", jade, Color3.FromHexString("#123A35"));
  }
  private createTara() { const root=new TransformNode("tara-vaidyi",this.scene); root.position=new Vector3(-6.1,0,-1.3); this.taraFigure=buildNpcFigure({scene:this.scene,root,name:"tara",robeColor:Color3.FromHexString("#192B50"),robeHeight:1.2,robeDiameterTop:0.36,robeDiameterBottom:0.68,robeEmissive:Color3.FromHexString("#192B50").scale(0.05),skinColor:Color3.FromHexString("#8E5C42"),eyeColor:jade,shawlColor:jade,shawlWidth:0.62,propColor:copper,propType:"oar",propHeight:1.25,propRotationZ:-0.52,reducedMotion:()=>this.hud.reducedMotion}); const rope=MeshBuilder.CreateTorus("tara-rope-coil",{diameter:.32,thickness:.04,tessellation:16},this.scene); rope.parent=root; rope.position=new Vector3(-.23,.5,.11); rope.rotation.x=Math.PI/2; rope.material=this.mat("tara-rope-mat",parchment); this.taraBillboard=createPortraitBillboard(this.scene,root,assets.taraPortrait,()=>this.hud.reducedMotion); return root; }
  private createRouteMarkers(){ [[new Vector3(-7.5,.2,-5.9),"Nadi Bazaar measure"],[new Vector3(-1.8,.2,6.1),"Reedbank Ferry route"],[new Vector3(-6.0,.2,5.8),"Floodplain crossing"]].forEach(([position,title],index)=>{ const root=new TransformNode(`route-marker-${index}`,this.scene); root.position=(position as Vector3).clone(); const base=MeshBuilder.CreateCylinder(`route-base-${index}`,{height:.16,diameter:.78,tessellation:12},this.scene);base.parent=root;base.position.y=.1;base.material=this.mat(`route-base-mat-${index}`,Color3.FromHexString("#3A463B"));const core=MeshBuilder.CreateSphere(`route-core-${index}`,{diameter:.34,segments:8},this.scene);core.parent=root;core.position.y=.57;core.material=this.mat(`route-core-mat-${index}`,parchment,parchment);this.markers.push({root,core,found:false,title:title as string}); }); }
  private createFieldNotes(){[[new Vector3(-8.2,.16,1.8),"Reed gauge","A river measure is not only a tool. It is an agreement about when a neighbor needs warning."],[new Vector3(-3.9,.16,-5.6),"Bazaar ledger","Mitra’s ledger records repairs as carefully as trade. Every material has a person waiting behind it."],[new Vector3(.2,.16,7.5),"Ferry knot","Tara’s knot marks a return route, not merely a departure. A safe crossing plans for the way back."]].forEach(([position,label,note],index)=>{const root=new TransformNode(`field-note-${index}`,this.scene);root.position=(position as Vector3).clone();const plinth=MeshBuilder.CreateCylinder(`field-note-plinth-${index}`,{height:.14,diameter:.56,tessellation:10},this.scene);plinth.parent=root;plinth.position.y=.08;plinth.material=this.mat(`field-note-plinth-mat-${index}`,Color3.FromHexString("#37454A"));const tablet=MeshBuilder.CreateBox(`field-note-tablet-${index}`,{width:.35,height:.42,depth:.05},this.scene);tablet.parent=root;tablet.position.y=.38;tablet.rotation.x=-.22;tablet.material=this.mat(`field-note-tablet-mat-${index}`,parchment,parchment.scale(.08));this.fieldNotes.push({root,label:label as string,note:note as string});});}
  private createReactiveCues() {
    if (this.context?.routeComplete) {
      this.returnThread = MeshBuilder.CreateLines("return-route-thread", { points: [new Vector3(-8.4, 0.16, 3.7), new Vector3(-4.3, 0.22, 4.6), new Vector3(3.45, 0.42, 4.6)] }, this.scene);
      this.returnThread.material = this.mat("return-route-thread-mat", this.context.routeConsequence.includes("Shared") ? jade : this.context.routeConsequence.includes("ferry") ? saffron : parchment, Color3.Black(), 0.76);
    }
    [-6.8, -4.8, -2.8].forEach((x, index) => {
      const cue = MeshBuilder.CreatePlane(`river-condition-banner-${index}`, { width: 0.42, height: 1.08 }, this.scene);
      cue.position = new Vector3(x, 1.85, -2.8 + index * 0.6);
      cue.rotation.y = 0.12;
      cue.material = this.mat(`river-condition-banner-mat-${index}`, this.context?.taraBond ? jade : parchment, this.context?.taraBond ? jade.scale(0.18) : Color3.Black(), 0.82);
      this.conditionCues.push(cue);
    });
  }
  private returnNotice() {
    if (!this.context?.routeConsequence) return "The river recognizes an unfinished promise. Tara’s route seal is waiting at the ferry.";
    const bond = this.context.taraBond >= 2 ? " Tara’s returned sounding carries a shelter note beneath the waterline." : " Tara listens for how the crossing has changed.";
    const coast = this.context.stewardshipChoice ? ` The coast has answered: ${this.context.stewardshipChoice}` : "";
    const memory = this.context.memoryStewardship ? ` The Salt Library now carries an open-margin record: ${this.context.memoryStewardship}` : "";
    const confluence = this.context.confluenceComplete ? ` The Confluence Table now carries a public return condition: ${this.context.publicRouteChoice}` : "";
    const observatory = this.context.returnObservatoryComplete ? ` The Return Observatory now keeps the earlier crossing beside its changed condition: ${this.context.amendmentChoice}` : "";
    return `${this.context.routeConsequence}${bond}${coast}${memory}${confluence}${observatory}`;
  }
  private echo(text: string): string { if (!this.newPlus) return text; const sentences = text.split(". "); const fragments = sentences.map((s) => { const words = s.trim().split(" "); if (words.length <= 3) return s; const keep = Math.max(2, Math.ceil(words.length * 0.45)); return words.slice(0, keep).join(" ") + " …"; }); return fragments.join(". ").trim(); }
  update(delta:number){const step=Math.min(delta,.05);const calm=this.hud.reducedMotion;this.time+=step;this.pulseCooldown=Math.max(0,this.pulseCooldown-step);this.player.move(this.input.movement(),step,4.7);this.player.update(step);if(!this.demo&&this.input.consumePulse())this.pulse();if(!this.demo&&this.input.consumeInteract())this.interact();this.ambient.update(step);this.markers.forEach((marker,index)=>{if(!marker.found)marker.root.position.y=calm?.2:.2+Math.sin(this.time*2+index)*.09;});this.boat.position.y=calm?.35:.35+Math.sin(this.time*1.4)*.07;this.sail.rotation.z=calm?0:Math.sin(this.time*.8)*.075;if(this.ferryShared){const follow=this.player.root.position.add(new Vector3(-1.05,0,1.05));this.tara.position.x+=(follow.x-this.tara.position.x)*Math.min(1,step*2.1);this.tara.position.z+=(follow.z-this.tara.position.z)*Math.min(1,step*2.1);}this.tara.position.y=calm?0:Math.sin(this.time*1.65)*.025;this.taraFigure.update(step,this.time);this.taraBillboard.update(this.player.root.position,this.camera.position);if(this.routeSeal.isEnabled()){this.routeSeal.rotation.z+=calm?step*.3:step*1.4;this.routeSeal.position.y=calm?.75:.75+Math.sin(this.time*2.1)*.08;}this.pulses=this.pulses.filter((pulse)=>{pulse.age+=step;pulse.ring.scaling.setAll(1+pulse.age*7);(pulse.ring.material as StandardMaterial).alpha=Math.max(0,.86-pulse.age*.86);pulse.motes.forEach((mote,index)=>{const a=Math.PI*2*index/pulse.motes.length;mote.position.x+=Math.cos(a)*step*2;mote.position.z+=Math.sin(a)*step*2;mote.position.y+=step*.65;mote.scaling.setAll(Math.max(.05,1-pulse.age));});if(pulse.age>1){pulse.ring.dispose();pulse.motes.forEach((mote)=>mote.dispose());return false;}return true;});this.cameraMotion.update(step,this.player,this.stage==="speak"||this.stage==="choose"?this.tara.position:this.stage==="complete"&&!this.ferryShared?this.boat.position:undefined,this.input);this.hud.patch({pulseReady:this.pulseCooldown<=0});}
  private pulse(){if(this.pulseCooldown>0)return;this.pulseCooldown=1.5;const ring=MeshBuilder.CreateTorus("road-star-thread",{diameter:.82,thickness:.06,tessellation:36},this.scene);ring.position=this.player.root.position.clone();ring.position.y=.25;ring.rotation.x=Math.PI/2;ring.material=this.mat("road-pulse-mat",saffron,saffron,.88);const motes=Array.from({length:12},(_,index)=>{const mote=MeshBuilder.CreateSphere(`road-mote-${index}`,{diameter:.09,segments:6},this.scene);const angle=Math.PI*2*index/12;mote.position=ring.position.add(new Vector3(Math.cos(angle)*.45,.04,Math.sin(angle)*.45));mote.material=this.mat(`road-mote-mat-${index}`,saffron,saffron);return mote;});this.pulses.push({ring,motes,age:0});this.feedback.pulse();const nearby=this.markers.find((marker)=>!marker.found&&Vector3.Distance(marker.root.position,this.player.root.position)<4.15);if(!nearby){this.hud.patch({notice:this.echo("Star-thread Sight catches only when you stand close enough to a route marker.")});return;}nearby.found=true;nearby.core.material=this.mat("found-route",saffron,saffron);this.collected+=1;this.materials.mapFragment=this.collected;this.feedback.collect();this.hud.patch({glyphs:this.collected,materials:this.materials,notice:this.echo(`Route recorded: ${nearby.title}. A map fragment slots into Ila’s damaged field compass.`)});if(this.collected===3){this.stage="speak";this.hud.patch({questTitle:"Tara’s River Question",questDetail:"All three routes are charted. Speak with Tara Vaidyi near the market stalls.",notice:this.echo("The field compass points toward Nadi Bazaar. Tara has been watching the route threads gather.")});}}
  private interact(){if(this.ferryShared&&!this.soundingRecovered&&Vector3.Distance(this.player.root.position,this.soundingStone.position)<=2.4){this.soundingRecovered=true;this.soundingStone.setEnabled(false);this.feedback.align();this.hud.patch({taraBond:2,taraQuest:1,milestone:"Tara’s quest · Missing Sounding",questTitle:"The river gives its measure",questDetail:"Tara’s missing sounding has been returned. Her river call can now point out a safe shelter during storm travel.",notice:this.echo("Tara: The river does not speak in one voice. Thank you for bringing back the one I had forgotten to hear.")});return;}const fieldNote=this.fieldNotes.find((entry)=>Vector3.Distance(this.player.root.position,entry.root.position)<=2.1);if(fieldNote){this.feedback.speak();this.hud.patch({milestone:`Field note · ${fieldNote.label}`,notice:this.echo(fieldNote.note)});return;}if(this.stage==="speak"&&Vector3.Distance(this.player.root.position,this.tara.position)<=3.3){this.stage="choose";this.feedback.speak();this.hud.patch({choiceOpen:true,questTitle:"The Open Crossing",questDetail:"Tara asks which river need should receive the repaired route first.",notice:this.echo("Tara Vaidyi: A path always privileges someone. Say who you will refuse to leave behind.")});return;}if(this.stage==="complete"&&!this.ferryShared&&Vector3.Distance(this.player.root.position,this.boat.position)<=3.5){this.ferryShared=true;const line=this.selectedStance==="viveka"?"Tara: Keep the river chart honest, even when the quicker story is easier to carry.":this.selectedStance==="sahas"?"Tara: Courage is a ferry too—make sure someone else can step aboard after you.":"Tara: A route becomes real when the people most exposed to it can still use it.";this.feedback.speak();this.hud.patch({taraBond:1,milestone:"Tara joins the river road",questTitle:"Ferry Departure",questDetail:"Tara’s Route Seal turns over the water. The Silent Courtyard is now a direction with a human cost behind it.",notice:this.echo(line)});}}
  chooseStance=(trait:TraitKey)=>{if(this.stage!=="choose")return;this.stage="complete";this.selectedStance=trait;this.traits[trait]=Math.min(100,this.traits[trait]+14);this.materials.copperFitting=1;this.materials.waterReed=1;this.materials.shelterCloth=1;this.routeSeal.setEnabled(true);const outcome={viveka:"The flood-line is marked with care, making the crossing safer to read.",sahas:"A temporary ferry opens for the isolated floodplain before dusk.",karuna:"Shared water access is protected before trade traffic resumes."}[trait];this.feedback.align();this.hud.patch({choiceOpen:false,traits:this.traits,materials:this.materials,routeComplete:true,routeSeal:true,routeConsequence:outcome,questTitle:"Nadi Bazaar Opens",questDetail:"Tara’s Route Seal is waiting at the ferry. Visit it before carrying the repaired compass to the Silent Courtyard.",notice:this.echo(`${outcome} Tara places a Route Seal beside the compass and points toward the ferry.`)});};
  advanceSeason=()=>{const season=this.ambient.advanceSeason();const color=season.includes("Varsha")?Color3.FromHexString("#93C8DD"):season.includes("Grishma")?saffron:season.includes("Sharad")?parchment:jade;this.conditionCues.forEach((cue)=>{(cue.material as StandardMaterial).diffuseColor=color;});this.hud.patch({season,notice:this.echo(`${season}: the riverbank shifts in color. ${this.context?.taraBond ? "Tara’s river call marks the safer current." : "Copper route markers change visibility with the light."}`)});};advanceTime=()=>{const time=this.ambient.advanceTime();this.hud.patch({timeOfDay:time,notice:this.echo(`${time} changes the river light and the visibility of copper route markers.`)});};inquireGuide=(guide:"rishi"|"muni"|"raja")=>{const notes={rishi:"Aruna’s road note: a line on paper becomes a promise when others organize their lives around it.",muni:"Laya’s road note: find a rhythm that can hold even when the boat rocks.",raja:"Somavrat’s road note: a crossing is fair only if the people with the least power can still use it."};this.hud.patch({notice:this.echo(`${notes[guide]}${this.context?.routeComplete?` ${this.returnNotice()}`:""}`)});};dispose(){this.input.dispose();this.player.dispose();this.feedback.dispose();this.ambient.dispose();this.taraBillboard.dispose();this.pulses.forEach((pulse)=>{pulse.ring.dispose();pulse.motes.forEach((mote)=>mote.dispose());});}
}
