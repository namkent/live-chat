<template>
  <div class="avatar-stage">
    <div ref="container" class="stage-container"></div>
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading Avatar ({{ loadingProgress }}%)...</p>
    </div>
    <div class="controls">
      <button @click="showConfigModal = true; syncConfigFromScene();" class="config-btn">⚙️ Layout</button>
      <select v-model="currentBg" @change="switchBackground(currentBg)" class="avatar-select">
        <option v-for="b in backgroundsList" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
      <select v-model="currentAvatar" @change="switchAvatar()" class="avatar-select">
        <option v-for="a in avatarsList" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </div>

    <!-- Layout Config Modal -->
    <div v-if="showConfigModal" class="config-modal-overlay">
      <div class="config-modal">
        <div class="modal-header">
          <h3>Layout Configuration</h3>
          <button @click="showConfigModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="config-section">
            <h4>Avatar Position</h4>
            <label>X: <input type="range" min="-50" max="50" step="0.1" v-model.number="currentConfig.avatarX" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.avatarX" @input="applyConfigValues"></label>
            <label>Y: <input type="range" min="-50" max="50" step="0.1" v-model.number="currentConfig.avatarY" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.avatarY" @input="applyConfigValues"></label>
            <label>Z: <input type="range" min="-50" max="50" step="0.1" v-model.number="currentConfig.avatarZ" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.avatarZ" @input="applyConfigValues"></label>
            <label>Rot: <input type="range" min="-3.14" max="3.14" step="0.01" v-model.number="currentConfig.avatarRotY" @input="applyConfigValues"><input type="number" step="0.01" v-model.number="currentConfig.avatarRotY" @input="applyConfigValues"></label>
          </div>
          <div class="config-section">
            <h4>Camera (View & Target)</h4>
            <label>Cam X: <input type="range" min="-50" max="50" step="0.1" v-model.number="currentConfig.cameraX" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.cameraX" @input="applyConfigValues"></label>
            <label>Cam Y: <input type="range" min="-50" max="50" step="0.1" v-model.number="currentConfig.cameraY" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.cameraY" @input="applyConfigValues"></label>
            <label>Cam Z: <input type="range" min="-50" max="100" step="0.1" v-model.number="currentConfig.cameraZ" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.cameraZ" @input="applyConfigValues"></label>
            <label>Tar X: <input type="range" min="-50" max="50" step="0.1" v-model.number="currentConfig.targetX" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.targetX" @input="applyConfigValues"></label>
            <label>Tar Y: <input type="range" min="-50" max="50" step="0.1" v-model.number="currentConfig.targetY" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.targetY" @input="applyConfigValues"></label>
            <label>Tar Z: <input type="range" min="-50" max="50" step="0.1" v-model.number="currentConfig.targetZ" @input="applyConfigValues"><input type="number" step="0.1" v-model.number="currentConfig.targetZ" @input="applyConfigValues"></label>
          </div>
          <div class="config-section save-section">
            <input type="text" v-model="newConfigName" placeholder="Tên layout..." />
            <button @click="saveConfig" class="save-btn">Lưu Layout</button>
          </div>
          <div class="saved-configs">
            <h4>Saved Layouts</h4>
            <div v-for="cfg in savedConfigs" :key="cfg.id" class="cfg-item">
              <span>{{ cfg.name }}</span>
              <button @click="loadConfig(cfg)">Load</button>
              <button @click="deleteConfig(cfg.id)" class="del-btn">X</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TalkingHead } from '@met4citizen/talkinghead';
import { LipsyncEn } from '@met4citizen/talkinghead/modules/lipsync-en.mjs';
import { HeadAudio } from '@/headaudio/headaudio.min.mjs';
import { MotionEngine } from '@/lib/motion-engine/MotionEngine.js';
import motionsData from '@/lib/motion-engine/motions.json';

const container = ref(null);
const isLoading = ref(true);
const loadingProgress = ref(0);
const currentAvatar = ref('david');
const currentBg = ref('none');

const backgroundsList = [
  { id: 'none', name: 'Nền Mặc Định (Gradient)' },
  { id: 'room', name: 'Phòng 3D (room.glb)' },
  { id: 'basic_skybox', name: 'Bầu trời (basic_skybox.glb)' },
  { id: 'corporate_event_stage', name: 'Corporate Event Stage' },
  { id: 'every_gig_ever', name: 'Every Gig Ever' },
  { id: 'kda_evelynn_dance_stage_moonlight_edition', name: 'KDA Dance Stage' },
  { id: 'nightclub_stage_with_bar__stage_tubes', name: 'Nightclub Stage' },
  { id: 'single_stage', name: 'Single Stage' },
  { id: 'the_voice_kids_stage', name: 'The Voice Kids' },
  { id: 'the_voice_stage', name: 'The Voice' },
  { id: 'venue_stage_for_great_events', name: 'Venue Stage' }
];

const avatarsList = [
  { id: 'david', name: 'David (Male)', voice: 'Minh Quân' },
  { id: 'julia', name: 'Julia (Female)', voice: 'Mỹ Duyên' },
  { id: 'andra', name: 'Andra (Female)', voice: 'Mỹ Duyên' },
  { id: 'chen', name: 'Chen', voice: 'Minh Quân' },
  { id: 'cyberpunk_girl', name: 'Cyberpunk Girl', voice: 'Mỹ Duyên' },
  { id: 'cyborg', name: 'Cyborg', voice: 'Minh Quân' },
  { id: 'RPM_animation', name: 'RPM Animation', voice: 'Minh Quân' },
  { id: 'c812ea12-1e83-42b8-9d48-c040d12eedb9', name: 'RPM Model 1', voice: 'Mỹ Duyên' },
  { id: 'ca235a8f-8cc3-4dcf-b202-c69a0c1a0565', name: 'RPM Model 2', voice: 'Mỹ Duyên' },
  { id: 'f5d0c392-bf4b-4897-b00f-b369dfcb0274', name: 'RPM Model 3', voice: 'Mỹ Duyên' },
  { id: 'test', name: 'Test (Converted)', voice: 'Minh Quân' },
  { id: '3', name: 'Avatar 3', voice: 'Mỹ Duyên' }
];

// Use shallowRef for complex Three.js/TalkingHead instances to avoid Vue reactivity proxy issues
const head = shallowRef(null);
const motionEngine = shallowRef(null);
let controls = null;
let animationFrameId = null;

const showConfigModal = ref(false);
const savedConfigs = ref([]);
const newConfigName = ref('');
const currentConfig = ref({
  avatarX: 0, avatarY: 0, avatarZ: 0, avatarRotY: 0,
  cameraX: 0, cameraY: 1.2, cameraZ: 7.5,
  targetX: 0, targetY: 1.0, targetZ: 0
});

const loadConfigsFromDB = async () => {
  try {
    const res = await fetch('/api/configs');
    savedConfigs.value = await res.json();
  } catch (e) {
    console.error(e);
  }
};

const applyConfigValues = () => {
  if (!head.value) return;
  const cfg = currentConfig.value;
  if (head.value.armature) {
    head.value.armature.position.set(cfg.avatarX, cfg.avatarY, cfg.avatarZ);
    head.value.armature.rotation.y = cfg.avatarRotY;
  }
  if (head.value.camera && controls) {
    head.value.camera.position.set(cfg.cameraX, cfg.cameraY, cfg.cameraZ);
    controls.target.set(cfg.targetX, cfg.targetY, cfg.targetZ);
  }
};

const syncConfigFromScene = () => {
  if (!head.value) return;
  if (head.value.armature) {
    currentConfig.value.avatarX = head.value.armature.position.x;
    currentConfig.value.avatarY = head.value.armature.position.y;
    currentConfig.value.avatarZ = head.value.armature.position.z;
    currentConfig.value.avatarRotY = head.value.armature.rotation.y;
  }
  if (head.value.camera && controls) {
    currentConfig.value.cameraX = head.value.camera.position.x;
    currentConfig.value.cameraY = head.value.camera.position.y;
    currentConfig.value.cameraZ = head.value.camera.position.z;
    currentConfig.value.targetX = controls.target.x;
    currentConfig.value.targetY = controls.target.y;
    currentConfig.value.targetZ = controls.target.z;
  }
};

const saveConfig = async () => {
  if (!newConfigName.value) return alert('Vui lòng nhập tên layout!');
  try {
    const payload = {
      name: newConfigName.value,
      avatarId: currentAvatar.value,
      backgroundId: currentBg.value,
      ...currentConfig.value
    };
    await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await loadConfigsFromDB();
    alert('Đã lưu Layout thành công!');
    newConfigName.value = '';
  } catch(e) { console.error(e); }
};

const loadConfig = async (cfg) => {
  currentAvatar.value = cfg.avatarId || 'david';
  currentBg.value = cfg.backgroundId || 'none';
  currentConfig.value = {
    avatarX: cfg.avatarX, avatarY: cfg.avatarY, avatarZ: cfg.avatarZ, avatarRotY: cfg.avatarRotY,
    cameraX: cfg.cameraX, cameraY: cfg.cameraY, cameraZ: cfg.cameraZ,
    targetX: cfg.targetX, targetY: cfg.targetY, targetZ: cfg.targetZ
  };
  
  await switchBackground(currentBg.value);
  await loadAvatar(currentAvatar.value, true);
  showConfigModal.value = false;
};

const deleteConfig = async (id) => {
  if(!confirm('Xóa layout này?')) return;
  try {
    await fetch(`/api/configs/${id}`, { method: 'DELETE' });
    await loadConfigsFromDB();
  } catch(e) { console.error(e); }
};

const initTalkingHead = async () => {
  if (!container.value) return;

  try {
    // 1. Initialize TalkingHead instance
    const headInstance = new TalkingHead(container.value, {
      ttsEndpoint: '/api/tts', // We'll set this up later
      cameraView: 'full', // Đổi sang 'full' để hiển thị toàn thân
      lipsyncModules: [], // Disable dynamic imports
    });
    
    // Inject English lipsync statically to avoid Vite dev server 404
    headInstance.lipsync = {
      en: new LipsyncEn()
    };

    head.value = headInstance;

    // Thêm chức năng Load Model Background (nếu có)
    try {
      const loader = new GLTFLoader();
      const bgGltf = await loader.loadAsync('/backgrounds/room.glb');
      
      // Chỉnh lại tỷ lệ và vị trí của căn phòng cho phù hợp
      bgGltf.scene.position.set(0, 0, 0); 
      // Tùy theo model phòng mà bạn có thể cần scale lên/xuống
      // bgGltf.scene.scale.set(1.5, 1.5, 1.5);
      
      headInstance.scene.add(bgGltf.scene);
    } catch (e) {
      console.log('Chưa có file background room.glb hoặc tải thất bại. Bỏ qua.');
    }

    // 2. Initialize HeadAudio Worklet
    await headInstance.audioCtx.audioWorklet.addModule("/headaudio/headworklet.min.mjs");
    
    const headaudio = new HeadAudio(headInstance.audioCtx, {
      processorOptions: { },
      parameterData: {
        vadGateActiveDb: -40,
        vadGateInactiveDb: -60
      }
    });

    // 3. Load pre-trained model for HeadAudio
    await headaudio.loadModel("/headaudio/model-en-mixed.bin");

    // 4. Connect Audio nodes
    headInstance.audioSpeechGainNode.connect(headaudio);

    // Add slight delay to match latency
    const delayNode = new DelayNode(headInstance.audioCtx, { delayTime: 0.1 });
    headInstance.audioSpeechGainNode.disconnect(headInstance.audioReverbNode);
    headInstance.audioSpeechGainNode.connect(delayNode);
    delayNode.connect(headInstance.audioReverbNode);

    // 5. Connect viseme updates to Avatar
    headaudio.onvalue = (key, value) => {
      if (headInstance.mtAvatar && headInstance.mtAvatar[key]) {
        Object.assign(headInstance.mtAvatar[key], { newvalue: value, needsUpdate: true });
      }
    };

    // 6. Initialize MotionEngine
    const engine = new MotionEngine(headInstance);
    engine.registerMotions(motionsData);
    motionEngine.value = engine;

    // 7. Link HeadAudio and MotionEngine to TalkingHead update loop
    headInstance.opt.update = (dt) => {
      headaudio.update(dt);
      engine.update(dt);
    };
    
    // Store headaudio reference if needed later
    headInstance.headaudio = headaudio;

    // --- SETUP ORBIT CONTROLS (SMOOTH PAN, ZOOM, ROTATE) ---
    controls = new OrbitControls(headInstance.camera, headInstance.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.0, 0); // Tập trung nhìn vào ngực/eo nhân vật
    controls.minDistance = 0.5; // Zoom in tối đa
    controls.maxDistance = 100; // Tăng giới hạn zoom out để nhìn thấy toàn cảnh
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Không cho lật camera xuống dưới mặt đất quá sâu
    
    // Nới rộng góc nhìn FOV của camera (TalkingHead mặc định là 10, hơi hẹp)
    headInstance.camera.fov = 30;
    headInstance.camera.updateProjectionMatrix();

    // Vòng lặp liên tục để update độ mượt (damping) của OrbitControls
    const animate = () => {
      if (controls) controls.update();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // --- SETUP SHADOWS (ĐỔ BÓNG ĐẸP) ---
    headInstance.renderer.shadowMap.enabled = true;
    headInstance.renderer.shadowMap.type = THREE.PCFShadowMap;

    if (headInstance.lightDirect) {
      headInstance.lightDirect.castShadow = true;
      headInstance.lightDirect.shadow.mapSize.width = 2048;
      headInstance.lightDirect.shadow.mapSize.height = 2048;
      headInstance.lightDirect.shadow.bias = -0.0005;
      
      // Fix khung chiếu bóng đổ (quan trọng để bóng hiện ra)
      const d = 3;
      headInstance.lightDirect.shadow.camera.left = -d;
      headInstance.lightDirect.shadow.camera.right = d;
      headInstance.lightDirect.shadow.camera.top = d;
      headInstance.lightDirect.shadow.camera.bottom = -d;
      headInstance.lightDirect.shadow.camera.near = 0.1;
      headInstance.lightDirect.shadow.camera.far = 100;
      headInstance.lightDirect.shadow.camera.updateProjectionMatrix();

      // Dịch chuyển đèn ra xa một chút để chiếu chéo
      headInstance.lightDirect.position.set(2, 3, 2);
    }

    // Thêm mặt sàn tàng hình để hứng bóng đổ (Shadow Catcher)
    const floorGeo = new THREE.PlaneGeometry(15, 15);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.5 }); 
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    headInstance.scene.add(floor);

    // Lưu reference bg
    headInstance.bgModel = null;

    // Chạy ngầm định kỳ 1s/lần để ép mọi vật thể (avatar, quần áo, background) phải đổ bóng
    setInterval(() => {
      headInstance.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, 1000);
    // --------------------------------------------------------

    // 8. Load the initial avatar
    await loadConfigsFromDB();
    await loadAvatar(currentAvatar.value);

  } catch (error) {
    console.error("Failed to initialize TalkingHead:", error);
  }
};

const loadAvatar = async (avatarName, applySavedConfig = false) => {
  if (!head.value) return;
  
  isLoading.value = true;
  loadingProgress.value = 0;
  
  try {
    const avatarUrl = `/avatars/${avatarName}.glb`;
    
    await head.value.showAvatar({
      url: avatarUrl,
      body: 'M',
      avatarMood: 'neutral',
      ttsLang: 'en',
      ttsVoice: 'en-US-Standard-A',
      lipsyncLang: 'en',
      cameraView: 'full'
    }, (ev) => {
      if (ev.lengthComputable) {
        let val = Math.round((ev.loaded / ev.total) * 100);
        loadingProgress.value = val;
      }
    });

    if (applySavedConfig) {
      applyConfigValues();
    } else {
      // Default: Ép Camera chiếm 2/3 tỷ lệ hiển thị
      if (head.value.camera && controls) {
        head.value.camera.position.set(0, 1.2, 7.5); 
        controls.target.set(0, 1.0, 0); 
      }
      syncConfigFromScene();
    }
    if (controls) controls.update();

    currentAvatar.value = avatarName;
  } catch (error) {
    console.error(`Failed to load avatar ${avatarName}:`, error);
    alert(`Không thể tải Avatar "${avatarName}".\n\nLý do: Model này không chuẩn (thiếu xương Hips hoặc không có ARKit blendshapes).\n\nVui lòng chỉ sử dụng các model .glb được tạo chuẩn từ trang web ReadyPlayer.me!`);
  } finally {
    isLoading.value = false;
  }
};

const switchAvatar = async () => {
  await loadAvatar(currentAvatar.value);
};

const switchBackground = async (bgId) => {
  if (!head.value) return;

  // Xóa bg cũ nếu có
  if (head.value.bgModel) {
    head.value.scene.remove(head.value.bgModel.scene);
    head.value.bgModel = null;
  }

  if (bgId !== 'none') {
    isLoading.value = true;
    try {
      const loader = new GLTFLoader();
      const bgGltf = await loader.loadAsync(`/backgrounds/${bgId}.glb`);
      
      // Tinh chỉnh bg cơ bản
      bgGltf.scene.position.set(0, 0, 0);
      
      head.value.scene.add(bgGltf.scene);
      head.value.bgModel = bgGltf;
    } catch (e) {
      console.log('Lỗi tải BG:', e);
      alert('Không tìm thấy file ' + bgId + '.glb trong public/backgrounds/');
      currentBg.value = 'none';
    }
    isLoading.value = false;
  }
};

let speakChain = Promise.resolve();

const speak = async (text, lang = 'vi') => {
  if (!head.value) return;
  if (!text) return; // Prevent TypeError on match
  
  // Parse simple emotion/action tags like [happy] or [nod]
  let cleanText = text;
  const tagMatch = text.match(/^\[([a-zA-Z0-9_-]+)\]\s*/);
  if (tagMatch) {
    const motionName = tagMatch[1];
    cleanText = text.replace(tagMatch[0], '').trim();
    
    // Play the motion
    if (motionEngine.value) {
      motionEngine.value.play(motionName);
    }
  }
  
  if (lang === 'vi') {
    try {
      const currentAvatarConfig = avatarsList.find(a => a.id === currentAvatar.value) || avatarsList[0];
      
      // 1. Fetch và Decode ngay lập tức (chạy ngầm, không chờ các câu trước nói xong)
      const fetchAndDecodePromise = (async () => {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: cleanText, 
            lang, 
            voice: currentAvatarConfig.voice
          })
        });
        
        if (!response.ok) throw new Error('TTS Failed');
        
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return await audioContext.decodeAudioData(arrayBuffer);
      })();

      // 2. Chèn vào hàng đợi phát âm thanh (đảm bảo thứ tự)
      speakChain = speakChain.then(async () => {
        try {
          const audioBuffer = await fetchAndDecodePromise;
          await head.value.speakAudio({ audio: audioBuffer });
        } catch (err) {
          console.error("Lỗi khi phát Audio trong chuỗi:", err);
        }
      });

      return fetchAndDecodePromise;
    } catch (err) {
      console.error("Lỗi khi chuẩn bị Audio tiếng Việt:", err);
    }
  } else {
    // Ngôn ngữ khác
    const speakTextPromise = (async () => {
      // Dummy promise that resolves immediately since we don't need to fetch
    })();

    speakChain = speakChain.then(async () => {
      try {
        await head.value.speakText(cleanText);
      } catch (err) {
        console.error("Lỗi khi phát Web Speech API:", err);
      }
    });

    return speakTextPromise;
  }
};

// Expose the speak method so parent component can call it
defineExpose({
  speak
});

onMounted(() => {
  initTalkingHead();
});

onBeforeUnmount(() => {
  if (head.value) {
    // Cleanup if talkinghead provides a destroy method, else let garbage collection handle it
    // head.value.destroy();
  }
});
</script>

<style scoped>
.avatar-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  
  /* Thêm nền cho Avatar (bạn có thể thay bằng ảnh tùy thích) */
  background: radial-gradient(circle at 50% 50%, #2a2a40 0%, #09090b 100%);
  /* Ví dụ dùng ảnh: background: url('/hinh-nen.jpg') center/cover; */
}

.stage-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 20;
}

.spinner {
  border: 3px solid rgba(124, 58, 237, 0.2);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.controls {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

button {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

button:disabled {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-on-primary);
  cursor: default;
  opacity: 1;
}

.avatar-select {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-weight: 500;
  font-size: 0.875rem;
  outline: none;
}
.avatar-select:hover {
  background: rgba(255, 255, 255, 0.1);
}
.avatar-select option {
  background: var(--color-background);
  color: var(--color-foreground);
}

/* --- Layout Config Modal --- */
.config-btn {
  background: var(--color-primary) !important;
  color: white !important;
  border-color: var(--color-primary);
  font-weight: bold;
}

.config-modal-overlay {
  position: absolute;
  top: 70px;
  right: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.config-modal {
  background: rgba(9, 9, 11, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 320px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px 12px 0 0;
}

.modal-header h3 { 
  margin: 0; 
  color: var(--color-foreground);
  font-size: 1rem;
}

.modal-header button { 
  background: none !important; 
  border: none !important; 
  font-size: 1.2rem; 
  padding: 0; 
  color: #888 !important;
  cursor: pointer;
}
.modal-header button:hover { color: white !important; transform: none; }

.modal-body { padding: 16px; }

.config-section {
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
}

.config-section h4 { 
  margin-top: 0; 
  margin-bottom: 12px; 
  color: var(--color-primary); 
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.config-section label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.8rem;
  color: #ccc;
}

.config-section label:last-child { margin-bottom: 0; }

.config-section input[type="range"] {
  flex: 1;
  height: 4px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.config-section input[type="number"] {
  width: 50px;
  padding: 4px;
  font-size: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  border-radius: 4px;
  text-align: center;
  outline: none;
}
.config-section input[type="number"]:focus {
  border-color: var(--color-primary);
}

.save-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: transparent;
  padding: 0;
  border: none;
}

.save-section input[type="text"] {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-border);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  outline: none;
  font-family: inherit;
  font-size: 0.85rem;
  box-sizing: border-box;
}
.save-section input[type="text"]:focus {
  border-color: var(--color-primary);
}

.save-btn { 
  background: var(--color-primary) !important; 
  color: white !important; 
  border: none !important;
  font-weight: 600;
  border-radius: 6px !important;
  width: 100%;
  padding: 8px !important;
}

.saved-configs h4 {
  color: var(--color-foreground);
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.cfg-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: rgba(0,0,0,0.2);
  margin-bottom: 6px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.2s ease;
}
.cfg-item:hover {
  background: rgba(255,255,255,0.1);
}

.cfg-item span { 
  flex: 1; 
  font-weight: 500;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cfg-item button {
  padding: 4px 8px;
  font-size: 0.75rem;
  border-radius: 4px;
}

.del-btn { 
  background: rgba(255, 71, 87, 0.2) !important; 
  color: #ff4757 !important; 
  border: 1px solid rgba(255, 71, 87, 0.5) !important;
}
.del-btn:hover {
  background: #ff4757 !important;
  color: white !important;
}
</style>
