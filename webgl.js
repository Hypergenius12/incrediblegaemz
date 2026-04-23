document.addEventListener('DOMContentLoaded', () => {
    const bgCanvas = document.querySelector('#webgl-canvas');
    const bgScene = new THREE.Scene();

    const bgCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    bgCamera.position.z = 40;

    const bgRenderer = new THREE.WebGLRenderer({
        canvas: bgCanvas,
        alpha: true, 
        antialias: true
    });
    bgRenderer.setSize(window.innerWidth, window.innerHeight);
    bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    let composer, renderPass, bloomPass;
    if (typeof THREE.EffectComposer !== 'undefined') {
        renderPass = new THREE.RenderPass(bgScene, bgCamera);
        bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85);
        
        composer = new THREE.EffectComposer(bgRenderer);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
    }

    let particles = [];
    const particleCount = 500; 

    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.05);
    const colors = [0xFF8A00, 0x9D00FF, 0x4A5568, 0xFFE5D0];

    for (let i = 0; i < particleCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: Math.random() * 0.5 + 0.2 
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.x = (Math.random() - 0.5) * 100;
        mesh.position.y = (Math.random() - 0.5) * 100;
        mesh.position.z = (Math.random() - 0.5) * 50;

        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;

        mesh.userData = {
            baseX: mesh.position.x,
            baseY: mesh.position.y,
            rotSpeedX: (Math.random() - 0.5) * 0.02,
            rotSpeedY: (Math.random() - 0.5) * 0.02,
            driftSpeedY: (Math.random() * 0.03) + 0.01,
            driftSpeedX: (Math.random() - 0.5) * 0.01,
            velocity: new THREE.Vector3(0,0,0),
            isBurstParticle: false
        };

        bgScene.add(mesh);
        particles.push(mesh);
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playSatisfyingClick() {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    }

    const allForms = document.querySelectorAll('form');
    allForms.forEach(form => {
        form.addEventListener('submit', () => {
            playSatisfyingClick();
            
            const burstCount = 200;
            for (let i = 0; i < burstCount; i++) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                const material = new THREE.MeshBasicMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: 1.0 
                });

                const burstMesh = new THREE.Mesh(geometry, material);
                burstMesh.position.set(0, -30, 10);
                
                const angle = (Math.random() * Math.PI) / 2 + Math.PI / 4; 
                const speed = (Math.random() * 4) + 2.0; 

                burstMesh.userData = {
                    velocity: new THREE.Vector3(
                        Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1), 
                        Math.sin(angle) * speed, 
                        (Math.random() - 0.5) * 2 
                    ),
                    rotSpeedX: (Math.random() - 0.5) * 0.6,
                    rotSpeedY: (Math.random() - 0.5) * 0.6,
                    driftSpeedY: 0,
                    driftSpeedX: 0,
                    isBurstParticle: true, 
                    life: 1.5 
                };

                bgScene.add(burstMesh);
                particles.push(burstMesh);
            }
        });
    });

    const logoContainer = document.getElementById('hero-logo-container');
    let logoMesh = null;
    let logoScene, logoCamera, logoRenderer;
    let logoUniforms = null; 
    
    let globalVelX = 0;
    let globalVelY = 0;
    let globalLastMouseX = 0;
    let globalLastMouseY = 0;
    let smoothedShaderSpeed = 0.0;

    const logoRaycaster = new THREE.Raycaster();
    const logoMouse = new THREE.Vector2(0, 0);

    if (logoContainer) {
        logoScene = new THREE.Scene();
        
        const logoAspect = logoContainer.clientWidth / logoContainer.clientHeight;
        logoCamera = new THREE.PerspectiveCamera(45, logoAspect, 0.1, 1000);
        logoCamera.position.z = 15; 

        logoRenderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        logoRenderer.setSize(logoContainer.clientWidth, logoContainer.clientHeight);
        logoRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        logoContainer.appendChild(logoRenderer.domElement);

        logoContainer.addEventListener('mousemove', (event) => {
            const rect = logoContainer.getBoundingClientRect();
            logoMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            logoMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; 
        });

        const logoResizeObserver = new ResizeObserver(() => {
            if (logoCamera && logoRenderer && logoContainer.clientWidth > 0) {
                logoCamera.aspect = logoContainer.clientWidth / logoContainer.clientHeight;
                logoCamera.updateProjectionMatrix();
                logoRenderer.setSize(logoContainer.clientWidth, logoContainer.clientHeight);
            }
        });
        logoResizeObserver.observe(logoContainer);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            'LOGO.png',
            function (texture) {
                const imgAspect = texture.image.width / texture.image.height;
                const planeHeight = 14; 
                const planeWidth = planeHeight * imgAspect;

                const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
                
                logoUniforms = {
                    tDiffuse: { value: texture },
                    time: { value: 0.0 },
                    uMouse: { value: new THREE.Vector2(0.5, 0.5) }, 
                    uHoverState: { value: 0.0 },
                    uVelocity: { value: 0.0 } 
                };

                const planeMaterial = new THREE.ShaderMaterial({
                    uniforms: logoUniforms,
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D tDiffuse;
                        uniform float time;
                        uniform vec2 uMouse;
                        uniform float uHoverState;
                        uniform float uVelocity;
                        varying vec2 vUv;
                        void main() {
                            vec2 uv = vUv;
                            
                            float dist = distance(uv, uMouse);
                            
                            float ripple = sin(dist * 40.0 - time * 15.0) * 0.015 * uHoverState * uVelocity;
                            ripple *= smoothstep(0.4, 0.0, dist);
                            
                            uv.x += ripple;
                            uv.y += ripple;

                            uv.x += sin(uv.y * 15.0 + time * 2.0) * 0.003;
                            
                            vec4 texColor = texture2D(tDiffuse, uv);
                            
                            float scanline = sin(uv.y * 80.0 - time * 3.0) * 0.04;
                            texColor.rgb += scanline;

                            texColor.r += sin(time + uv.x * 10.0) * 0.02;
                            texColor.b += cos(time + uv.y * 10.0) * 0.02;
                            
                            float glow = smoothstep(0.25, 0.0, dist) * uHoverState * uVelocity * 0.15;
                            texColor.rgb += vec3(glow * 1.0, glow * 0.5, glow * 0.1);

                            if(texColor.a < 0.1) discard;
                            gl_FragColor = texColor;
                        }
                    `,
                    transparent: true,
                    side: THREE.DoubleSide
                });

                logoMesh = new THREE.Mesh(planeGeometry, planeMaterial);
                logoMesh.userData = { targetScale: 1.0 };
                logoScene.add(logoMesh);
            },
            undefined,
            function (err) {}
        );
    }

    if (logoContainer) {
        logoContainer.addEventListener('click', () => {
            playSatisfyingClick();

            if (logoMesh) {
                logoMesh.userData.targetScale = 1.3; 
            }

            particles.forEach(p => {
                const dx = p.position.x;
                const dy = p.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                const blastForce = (Math.random() * 1.5) + 0.5;
                p.userData.velocity.x += (dx / distance) * blastForce;
                p.userData.velocity.y += (dy / distance) * blastForce;
                
                p.userData.rotSpeedX += (Math.random() - 0.5) * 0.5;
                p.userData.rotSpeedY += (Math.random() - 0.5) * 0.5;
            });

            const burstCount = 150;
            for (let i = 0; i < burstCount; i++) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                const material = new THREE.MeshBasicMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: 1.0 
                });

                const burstMesh = new THREE.Mesh(geometry, material);
                burstMesh.position.set(0, 0, 10);
                
                const angle = Math.random() * Math.PI * 2;
                const speed = (Math.random() * 3) + 1.5; 

                burstMesh.userData = {
                    velocity: new THREE.Vector3(
                        Math.cos(angle) * speed, 
                        Math.sin(angle) * speed, 
                        (Math.random() - 0.5) * 2 
                    ),
                    rotSpeedX: (Math.random() - 0.5) * 0.4,
                    rotSpeedY: (Math.random() - 0.5) * 0.4,
                    driftSpeedY: 0,
                    driftSpeedX: 0,
                    isBurstParticle: true, 
                    life: 1.0 
                };

                bgScene.add(burstMesh);
                particles.push(burstMesh);
            }
        });
    }

    let gameLogoScenes = [];
    function initGameLogo(containerId, imageSrc, tilt, planeHeightOverride) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 15;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const localMouse = new THREE.Vector2(-999, -999);
        container.addEventListener('mousemove', (event) => {
            const rect = container.getBoundingClientRect();
            localMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            localMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        });

        const gameResizeObserver = new ResizeObserver(() => {
            if (camera && renderer && container.clientWidth > 0) {
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            }
        });
        gameResizeObserver.observe(container);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(imageSrc, (texture) => {
            const imgAspect = texture.image.width / texture.image.height;
            const planeHeight = planeHeightOverride || 12; 
            const planeWidth = planeHeight * imgAspect;

            const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
            
            const uniforms = {
                tDiffuse: { value: texture },
                time: { value: 0.0 },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uHoverState: { value: 0.0 },
                uVelocity: { value: 0.0 }
            };

            const material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float time;
                    uniform vec2 uMouse;
                    uniform float uHoverState;
                    uniform float uVelocity;
                    varying vec2 vUv;
                    void main() {
                        vec2 uv = vUv;
                        
                        float dist = distance(uv, uMouse);
                        
                        float ripple = sin(dist * 30.0 - time * 10.0) * 0.025 * uHoverState * uVelocity;
                        ripple *= smoothstep(0.5, 0.0, dist);
                        
                        uv.x += ripple;
                        uv.y += ripple;
                        
                        uv.y += sin(uv.x * 5.0 + time * 1.5) * 0.005;
                        uv.x += cos(uv.y * 5.0 + time * 1.5) * 0.005;
                        
                        vec4 texColor = texture2D(tDiffuse, uv);
                        if(texColor.a < 0.1) discard;
                        
                        float glow = smoothstep(0.3, 0.0, dist) * uHoverState * uVelocity * 0.1;
                        texColor.rgb += vec3(glow);
                        
                        gl_FragColor = texColor;
                    }
                `,
                transparent: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            
            if (tilt) {
                mesh.rotation.z = -0.104; 
            }
            
            scene.add(mesh);
            gameLogoScenes.push({ scene, camera, renderer, mesh, uniforms: uniforms, container, localMouse });
        });
    }

    initGameLogo('rack-logo-container', 'logo eack-jukebox-bg-removed.png', true, 16);
    initGameLogo('stick-logo-container', 'STICKWARS (1).png', false, 13);

    const contactBtn = document.getElementById('contact-email-btn');
    if (contactBtn) {
        let hoverInterval;
        
        contactBtn.addEventListener('mouseenter', () => {
            hoverInterval = setInterval(() => {
                const color = colors[Math.floor(Math.random() * colors.length)];
                const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1.0 });
                const spark = new THREE.Mesh(geometry, material);
                
                spark.position.set((Math.random() - 0.5) * 60, -35, 10);
                
                spark.userData = {
                    velocity: new THREE.Vector3((Math.random() - 0.5) * 1, Math.random() * 2 + 1.5, (Math.random() - 0.5) * 2),
                    rotSpeedX: (Math.random() - 0.5) * 0.4,
                    rotSpeedY: (Math.random() - 0.5) * 0.4,
                    driftSpeedY: 0, driftSpeedX: 0,
                    isBurstParticle: true, life: 1.2 
                };
                bgScene.add(spark);
                particles.push(spark);
            }, 30); 
        });
        
        contactBtn.addEventListener('mouseleave', () => {
            clearInterval(hoverInterval);
        });

        contactBtn.addEventListener('click', (e) => {
            playSatisfyingClick();
            
            for (let i = 0; i < 300; i++) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1.0 });
                const burstMesh = new THREE.Mesh(geometry, material);
                
                burstMesh.position.set(0, -30, 15);
                
                const angle = Math.random() * Math.PI * 2; 
                const speed = (Math.random() * 5) + 3.0; 

                burstMesh.userData = {
                    velocity: new THREE.Vector3(
                        Math.cos(angle) * speed, 
                        Math.sin(angle) * speed, 
                        (Math.random() - 0.5) * 4 
                    ),
                    rotSpeedX: (Math.random() - 0.5) * 0.8,
                    rotSpeedY: (Math.random() - 0.5) * 0.8,
                    driftSpeedY: 0, driftSpeedX: 0,
                    isBurstParticle: true, life: 1.5 
                };

                bgScene.add(burstMesh);
                particles.push(burstMesh);
            }
        });
    }

    let mouseX = 0;
    let mouseY = 0;
    let normalizedMouseX = 0;
    let normalizedMouseY = 0;
    
    let mouseWorldX = 0;
    let mouseWorldY = 0;
    
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    let currentScrollY = window.scrollY;
    let lastScrollY = window.scrollY;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);

        normalizedMouseX = (event.clientX / window.innerWidth) * 2 - 1;
        normalizedMouseY = (event.clientY / window.innerHeight) * 2 - 1;

        mouseWorldX = normalizedMouseX * 50;
        mouseWorldY = -normalizedMouseY * 30;

        globalVelX = event.clientX - globalLastMouseX;
        globalVelY = event.clientY - globalLastMouseY;
        globalLastMouseX = event.clientX;
        globalLastMouseY = event.clientY;
    });

    let targetX = 0;
    let targetY = 0;

    function animate() {
        requestAnimationFrame(animate);

        const rawSpeed = Math.sqrt(globalVelX*globalVelX + globalVelY*globalVelY);
        smoothedShaderSpeed += (rawSpeed - smoothedShaderSpeed) * 0.1;
        globalVelX *= 0.5; 
        globalVelY *= 0.5;
        
        const clampedShaderSpeed = Math.min(smoothedShaderSpeed * 0.02, 1.5);

        if (logoUniforms) {
            logoUniforms.time.value += 0.02;
            logoUniforms.uVelocity.value = clampedShaderSpeed;
        }

        currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;
        lastScrollY = currentScrollY;

        targetX = mouseX * 0.005;
        targetY = mouseY * 0.005;
        bgCamera.position.x += (targetX - bgCamera.position.x) * 0.05;
        bgCamera.position.y += (-targetY - bgCamera.position.y) * 0.05;
        bgCamera.lookAt(bgScene.position);

        let survivingParticles = [];

        particles.forEach(p => {
            p.rotation.x += p.userData.rotSpeedX;
            p.rotation.y += p.userData.rotSpeedY;
            
            if (!p.userData.isBurstParticle) {
                const scrollParallax = scrollDelta * 0.03;
                p.userData.baseY += scrollParallax;
                p.position.y += scrollParallax;
                p.userData.velocity.y += scrollDelta * 0.002;

                p.userData.baseX += p.userData.driftSpeedX;
                p.userData.baseY += p.userData.driftSpeedY;

                if (p.userData.baseY > 50) {
                    p.userData.baseY = -50;
                    p.userData.baseX = (Math.random() - 0.5) * 100;
                    p.position.y = p.userData.baseY;
                    p.position.x = p.userData.baseX;
                } else if (p.userData.baseY < -50) {
                    p.userData.baseY = 50;
                    p.position.y = p.userData.baseY;
                }

                const dx = p.position.x - mouseWorldX;
                const dy = p.position.y - mouseWorldY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 15) {
                    const force = (15 - distance) / 15;
                    p.userData.velocity.x += (dx / distance) * force * 0.3;
                    p.userData.velocity.y += (dy / distance) * force * 0.3;
                }

                const homeDx = p.userData.baseX - p.position.x;
                const homeDy = p.userData.baseY - p.position.y;
                
                p.userData.velocity.x += homeDx * 0.02;
                p.userData.velocity.y += homeDy * 0.02;
            }

            p.position.x += p.userData.velocity.x;
            p.position.y += p.userData.velocity.y;
            p.position.z += p.userData.velocity.z || 0; 

            p.userData.velocity.x *= 0.90;
            p.userData.velocity.y *= 0.90;
            if (p.userData.velocity.z) p.userData.velocity.z *= 0.92;

            p.userData.rotSpeedX *= 0.98;
            p.userData.rotSpeedY *= 0.98;

            if (p.userData.isBurstParticle) {
                p.userData.velocity.y -= 0.02; 
                p.userData.life -= 0.015; 
                p.material.opacity = p.userData.life; 

                if (p.userData.life > 0) {
                    survivingParticles.push(p);
                } else {
                    bgScene.remove(p);
                    p.material.dispose();
                    p.geometry.dispose();
                }
            } else {
                survivingParticles.push(p);
            }
        });

        particles = survivingParticles;
        
        if (composer) {
            composer.render();
        } else {
            bgRenderer.render(bgScene, bgCamera);
        }

        if (logoScene && logoCamera && logoRenderer && logoMesh) {
            
            logoRaycaster.setFromCamera(logoMouse, logoCamera);
            const intersects = logoRaycaster.intersectObject(logoMesh);
            
            if (intersects.length > 0) {
                const uv = intersects[0].uv;
                logoUniforms.uMouse.value.x += (uv.x - logoUniforms.uMouse.value.x) * 0.15; 
                logoUniforms.uMouse.value.y += (uv.y - logoUniforms.uMouse.value.y) * 0.15;
                logoUniforms.uHoverState.value += (1.0 - logoUniforms.uHoverState.value) * 0.1;
            } else {
                logoUniforms.uHoverState.value += (0.0 - logoUniforms.uHoverState.value) * 0.05;
            }

            const targetRotationX = normalizedMouseY * 0.35; 
            const targetRotationY = normalizedMouseX * 0.35; 

            logoMesh.rotation.x += (targetRotationX - logoMesh.rotation.x) * 0.1;
            logoMesh.rotation.y += (targetRotationY - logoMesh.rotation.y) * 0.1;

            logoMesh.scale.x += (logoMesh.userData.targetScale - logoMesh.scale.x) * 0.1;
            logoMesh.scale.y += (logoMesh.userData.targetScale - logoMesh.scale.y) * 0.1;
            logoMesh.scale.z += (logoMesh.userData.targetScale - logoMesh.scale.z) * 0.1;

            if (logoMesh.userData.targetScale > 1.0) {
                logoMesh.userData.targetScale -= 0.02;
                if (logoMesh.userData.targetScale < 1.0) {
                    logoMesh.userData.targetScale = 1.0;
                }
            }

            logoRenderer.render(logoScene, logoCamera);
        }

        gameLogoScenes.forEach(obj => {
            if (obj.uniforms) {
                obj.uniforms.time.value += 0.02;
                obj.uniforms.uVelocity.value = clampedShaderSpeed; 
            }
            
            logoRaycaster.setFromCamera(obj.localMouse, obj.camera);
            const intersects = logoRaycaster.intersectObject(obj.mesh);
            
            if (intersects.length > 0) {
                const uv = intersects[0].uv;
                obj.uniforms.uMouse.value.x += (uv.x - obj.uniforms.uMouse.value.x) * 0.15; 
                obj.uniforms.uMouse.value.y += (uv.y - obj.uniforms.uMouse.value.y) * 0.15;
                obj.uniforms.uHoverState.value += (1.0 - obj.uniforms.uHoverState.value) * 0.1;
            } else {
                obj.uniforms.uHoverState.value += (0.0 - obj.uniforms.uHoverState.value) * 0.05;
            }

            const targetRotX = normalizedMouseY * 0.15; 
            const targetRotY = normalizedMouseX * 0.15; 
            obj.mesh.rotation.x += (targetRotX - obj.mesh.rotation.x) * 0.1;
            obj.mesh.rotation.y += (targetRotY - obj.mesh.rotation.y) * 0.1;
            
            obj.renderer.render(obj.scene, obj.camera);
        });
    }

    animate();

    window.addEventListener('resize', () => {
        bgCamera.aspect = window.innerWidth / window.innerHeight;
        bgCamera.updateProjectionMatrix();
        bgRenderer.setSize(window.innerWidth, window.innerHeight);
        
        if (composer) {
            composer.setSize(window.innerWidth, window.innerHeight);
        }
    });
});
