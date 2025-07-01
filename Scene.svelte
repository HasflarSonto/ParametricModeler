<script lang="ts">
    import { T } from '@threlte/core'
    import { OrbitControls, 
        MeshLineMaterial,
        MeshLineGeometry,
        TransformControls,
        interactivity } from '@threlte/extras'
    import { leapfrog } from '$lib/mathutils3d.js'
    import { MeshStandardMaterial, SphereGeometry, Mesh, Vector3, PointsMaterial, Color, Quaternion } from 'three'
    interactivity()





    // CODE FOR SETUP FROM +page.svelte

    let {instructions, addModeFunc, resetFunc, resetNewParticleCoords, modifyNewParticleCoords} = $props()

    let resetVal = $derived(instructions.reset)

    let addMode = $derived(instructions.addMode)

    let charge = $derived(instructions.charge)

    let showTrace = $derived(instructions.showTrace)

    let newParticleCoords = $derived(instructions.newParticleCoords)

    let confirmAddChoice = $derived(instructions.confirmAddChoice)

    let showVf = $derived(instructions.showVf)

    $inspect(instructions)


    interface Particle {
        x: number
        y: number
        z: number
        charge: number
    }

    interface DynParticle extends Particle {
        vx: number
        vy: number
        vz: number
    }

    let puck: DynParticle = $state({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        charge: 1
    })

    


  
    let particles = $state([
        { id: 1, x: 0, y: 2, z: 0, charge: -0.001 }
    ])  

    $inspect(particles)


    let puckPosition: [number, number, number] = $derived([puck.x, puck.y, puck.z]);

    //$inspect("puck pos: " + puckPosition)


    let decay = $state(2)
    const RADIUS = 2

    function vf(x: number, y: number, z: number): [number, number, number] {
  const vec = [0, 0, 0];

  for (const p of particles) {
    // Use ghost position if particle is being edited
    const px = (editMode && p.id === editingParticleId)
      ? editingLivePosition.x
      : p.x;
    const py = (editMode && p.id === editingParticleId)
      ? editingLivePosition.y
      : p.y;
    const pz = (editMode && p.id === editingParticleId)
      ? editingLivePosition.z
      : p.z;

    const dx = x - px;
    const dy = y - py;
    const dz = z - pz;
    const r = Math.hypot(dx, dy, dz);

    const factor = r < RADIUS
      ? Math.pow(r / RADIUS, 2) / Math.pow(r, decay + 1)
      : 1 / Math.pow(r, decay + 1);

    vec[0] += 10 * p.charge * dx * factor;
    vec[1] += 10 * p.charge * dy * factor;
    vec[2] += 10 * p.charge * dz * factor;
  }

  return vec as [number, number, number];
}


    const PUCKX = 0;
	const PUCKY = 0;
    const PUCKZ = 0;

    let points: Vector3[] = $state([new Vector3(PUCKX, PUCKY, PUCKZ)]);


	// let traceString = $derived(
	// 	`M${PUCKX},${PUCKY},${PUCKZ} ` +
	// 		puckTrace.map(([x, y, z]) => `L${x},${y},${z} `).reduce((p = '', c = '') => p + c),
	// );

    let go = $derived(instructions.play)
    let last: number | undefined
    let req: number | undefined
    let clock = $state(0)

    function updatePuck(dt: number) {
        let runningTime = 0
        let v = [puck.x, puck.y, puck.z, puck.vx, puck.vy, puck.vz]
        while (runningTime < dt) {
            let h = Math.max(1e-8, dt / Math.max(10, Math.hypot(v[3], v[4], v[5])))
            h = Math.min(h, dt - runningTime)
            runningTime += h

            for (let i = 0; i < 10; i++) {
                v = leapfrog(
                    (x, y, z) => vf(x, y, z).map(c => c * Math.pow(10, decay)),
                    [v[3], v[4], v[5]],
                    [v[0], v[1], v[2]],
                    h
                )
            }
        }
        puck.x = v[0]
        puck.y = v[1]
        puck.z = v[2]
        puck.vx = v[3]
        puck.vy = v[4]
        puck.vz = v[5]
       
        points.push(new Vector3(v[0], v[1], v[2]))

    }

    function animate(t = 0) {
        if (!go) {
            last = undefined;
            return;
        }
        if (!last) last = t
        const dt = (t - last) / 1000
        last = t
        updatePuck(dt)
        clock += dt;
        req = requestAnimationFrame(animate)
    }

    // CODE FOR ANIMATION

    $effect(() => {
        
        if (go) {
  
            req = requestAnimationFrame(animate)

        } else if (req) {
            cancelAnimationFrame(req)
            req = undefined
            last = undefined
        }
    })

    $effect(() => {
        if (resetVal) {
            if (req) cancelAnimationFrame(req);
            clock = 0;
            last = undefined;

            // no longer in edit mode
            stopEditing()

      
            // cannot reassign to puck var, must mutate fields
            puck.x = 0;
            puck.y = 0;
            puck.z = 0;
            puck.vx = 0;
            puck.vy = 0;
            puck.vz = 0;
            
     

            points.length = 0;
   
            particles = [{ id: 1, x: 0, y: 2, z: 0, charge: -0.001 }]

            

            // to mutate the isReset in +page.svelte to be false so that this code block only runs once
            resetFunc()
      
        }
    })

    // CODE FOR ADDING PARTICLES

    let chargeRef : Mesh | undefined = $state(undefined)

    //$inspect(chargeRef)

    let particle_num = $derived(particles.length > 0 ? particles[particles.length - 1].id + 1: 1)

    function addParticle([x, y, z]: [number, number, number]) {
        particles = [...particles, {
            id: particle_num, 
            x,
            y,
            z,
            charge: charge
        }]
    }



    // runs when user confirms add and gets world position of object at the end

    function confirmAdd() {
        resetNewParticleCoords()
        if (chargeRef) {
            const world = new Vector3()
            chargeRef.getWorldPosition(world)
            addParticle([world.x, world.y, world.z])
        }
        addModeFunc()
        newParticleCoords = [0,0,0]
    }

    $effect(() => {
        if (confirmAddChoice) {
            confirmAdd()
            confirmAddChoice = false // redundant but for good measure
        }
    })  



    // CODE FOR EDITING PARTICLES

    let editMode = $state(false)
    let editChargeRef : Mesh | undefined = $state(undefined)
    let editingParticleId: number | null = $state(null)

    function startEditing(particleId: number) {
        editingParticleId = particleId;
        editMode = true;

        // Get the initial position from that particle
        const p = particles.find(p => p.id === particleId);
        if (p) {
            lastEditPosition.set(p.x, p.y, p.z);
        }
    }


    function stopEditing() {
        editingParticleId = null
        editMode = false
    }


    function confirmEdit() {
        if (editingParticleId) {
            particles = particles.map(p =>
            p.id === editingParticleId
                ? { ...p, x: editingLivePosition.x, y: editingLivePosition.y, z: editingLivePosition.z }
                : p
            );
        }

        newParticleCoords = [0, 0, 0];
    }



    let clickTimeout: ReturnType<typeof setTimeout>;

    function handleSingleClick(particleId: number) {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
            if (!editMode) {
            startEditing(particleId);
            }
        }, 250);
    }

    function handleDoubleClickConfirmEdit() {
        clearTimeout(clickTimeout);
        confirmEdit();
        stopEditing();
    }

    function handleDoubleClickDelete(particleId: number) {
        clearTimeout(clickTimeout);
        particles = particles.filter(part => part.id !== particleId);
    }


    let lastEditPosition = new Vector3(); // initial dummy value





    let editingLivePosition = new Vector3();


    let editPositionTick = $state(0);

  
    function updateLiveEditPosition() {
        if (editChargeRef) {
            editChargeRef.getWorldPosition(editingLivePosition);

            // Only trigger vectorField update if moved enough
            if (editingLivePosition.distanceTo(lastEditPositionForField) > vectorFieldUpdateThreshold) {
            lastEditPositionForField.copy(editingLivePosition);
            editPositionTick += 1; // triggers reactive update
            }
        }
    }














    // vector field for particles (defined in 10 x 10 x 10 grid)

    type Vec3 = [number, number, number];

    let fieldPoints: Vec3[] = $state([]);
    let FIELD_STEP = 2;
    let FIELD_BOUND = 11;

    for (let x = -FIELD_BOUND; x <= FIELD_BOUND; x += FIELD_STEP) {
        for (let y = 0; y <= 2 * FIELD_BOUND; y += FIELD_STEP) {
            for (let z = -FIELD_BOUND; z <= FIELD_BOUND; z += FIELD_STEP) {
                fieldPoints.push([x, y, z]);
            }
        }
    }


    

    // update the vector field after edited particle has moved by some amount


    let lastEditPositionForField = new Vector3();
    const vectorFieldUpdateThreshold = 0.5;



    let vectorField = $derived.by(() => {
  editPositionTick; // <-- This makes the vectorField recompute when it changes

  return fieldPoints.map(([x, y, z]) => {
    const [fx, fy, fz] = vf(x, y, z);
    const fieldMag = Math.hypot(fx, fy, fz);
    const scale = 1.5 / (fieldMag || 1);
    const dir = new Vector3(fx, fy, fz).multiplyScalar(scale);
    const dirNorm = dir.clone().normalize();

    const originVec = new Vector3(x, y, z);
    const shaftPos = originVec.clone().add(dirNorm.clone().multiplyScalar(dir.length() * 0.4));
    const headPos = originVec.clone().add(dirNorm.clone().multiplyScalar(dir.length()));

    const defaultDir = new Vector3(0, 1, 0);
    const quaternion = new Quaternion().setFromUnitVectors(defaultDir, dirNorm).toArray() as [number, number, number, number];

    // Distance-based opacity
    let minDist = Infinity;
    for (const p of particles) {
      const px = (editMode && p.id === editingParticleId) ? editingLivePosition.x : p.x;
      const py = (editMode && p.id === editingParticleId) ? editingLivePosition.y : p.y;
      const pz = (editMode && p.id === editingParticleId) ? editingLivePosition.z : p.z;

      const dx = x - px;
      const dy = y - py;
      const dz = z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDist) minDist = dist;
    }

    const opacity = Math.min(1, 5 / (minDist ** 2 + 0.1));

    return {
      shaftPos: shaftPos.toArray() as [number, number, number],
      headPos: headPos.toArray() as [number, number, number],
      quaternion,
      length: dir.length(),
      opacity
    };
  });
});




</script>



<!-- Scene contents -->
<T.PerspectiveCamera makeDefault position={[20, 10, 15]} fov={45}>
    <OrbitControls target={[0, 0, 0]} enableDamping />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.5} />
<T.DirectionalLight position={[5, 10, 7]} />
<T.AxesHelper args={[5]} />
<T.GridHelper args={[20, 20, 'gray', 'lightgray']} rotation={[0, 0, 0]} />
<T.GridHelper args={[20, 20, 'gray', 'lightgray']} rotation={[Math.PI /2 , 0, 0]} position={[0,10,-10]}/>
<T.GridHelper args={[20, 20, 'gray', 'lightgray']} rotation={[0 , 0, Math.PI/2]} position={[-10,10,0]}/>

<!-- Render particles -->
{#each particles as p (p.id)}
    <T.Group 
        position={[p.x, p.y, p.z]}
        onclick={() => handleSingleClick(p.id)}

        >

        {#if editMode && editingParticleId === p.id}
            <TransformControls
            onchange={() => updateLiveEditPosition()}
        >
                <T.Mesh bind:ref={editChargeRef} ondblclick={handleDoubleClickConfirmEdit}>
                    <T.SphereGeometry args={[0.25, 32, 32]} />
                    <T.MeshStandardMaterial color={p.charge > 0 ? 'red' : 'blue'} />
                </T.Mesh>
            </TransformControls>
        {:else}
            <T.Mesh
            ondblclick ={() => handleDoubleClickDelete(p.id)}>
                <T.SphereGeometry args={[0.25, 32, 32]} />
                <T.MeshStandardMaterial color={p.charge > 0 ? 'red' : 'blue'} />
            </T.Mesh>
        {/if}
    </T.Group>
{/each}


<!-- Render puck -->
<T.Mesh position={puckPosition}>
    <T.SphereGeometry args={[0.25, 32, 32]} />
    <T.MeshStandardMaterial color="black" />
</T.Mesh>


<!--moving charges in 3d space (add mode)-->
{#if addMode}

    
    
    <!-- charge to be added -->
    <TransformControls 
        position = {newParticleCoords}
        onchange={() => {
            if (chargeRef) {
                const world = new Vector3()
                chargeRef.getWorldPosition(world)
                modifyNewParticleCoords([world.x, world.y, world.z])
            }
        }}
    >
        <T.Mesh
            bind:ref={chargeRef}
            ondblclick={confirmAdd}
        >
            <T.SphereGeometry args={[0.3, 32, 32]} />
            <T.MeshStandardMaterial color={charge > 0 ? 'red' : 'blue'} />
        </T.Mesh>
    </TransformControls>
{/if}

<!-- showing trace of puck -->

{#if showTrace && points.length > 1}
<T.Mesh>
    <MeshLineGeometry {points} />
    <MeshLineMaterial
        width={0.05}
        color="black"
        dashArray = {1}
        dashRatio={0.5}
        dashOffest = {0}
        transparent
        depthTest={false}
    />
  </T.Mesh>
{/if}



<!-- vector field for particles -->
 {#if showVf}

    {#each vectorField as { shaftPos, headPos, quaternion, length, opacity }, i (i)}
        <!-- Shaft -->
        <T.Mesh position={shaftPos} quaternion={quaternion}>
            <T.CylinderGeometry args={[0.02, 0.02, length * 0.8, 8]} />
            <T.MeshBasicMaterial color={0xffcc00} transparent opacity={opacity} />
        </T.Mesh>

        <!-- Arrowhead -->
        <T.Mesh position={headPos} quaternion={quaternion}>
            <T.ConeGeometry args={[0.05, length * 0.2, 8]} />
            <T.MeshBasicMaterial color={0xffcc00} transparent opacity={opacity} />
        </T.Mesh>
    {/each}

{/if}
