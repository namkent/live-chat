<script setup>
import { ref } from 'vue';
import AvatarStage from './components/AvatarStage.vue';
import ChatInterface from './components/ChatInterface.vue';

const avatarStageRef = ref(null);

// Tắt/bật khung chat debug ở đây (true = hiển thị lịch sử chat & text input, false = chỉ hiển thị nút thu âm)
const SHOW_DEBUG_CHAT = ref(true);

const handleSpeak = async (text, lang) => {
  if (avatarStageRef.value) {
    await avatarStageRef.value.speak(text, lang);
  }
};
</script>

<template>
  <main class="app-main">
    <!-- Fullscreen Avatar Stage -->
    <div class="stage-fullscreen">
      <AvatarStage ref="avatarStageRef" />
    </div>
    
    <!-- Header overlay -->
    <header class="app-header glass-panel">
      <h1>MES Audio Studio</h1>
      <span class="badge">Pro Max UI</span>
    </header>

    <!-- Floating Chat / Mic Interface -->
    <div class="chat-overlay" :class="{ 'minimal': !SHOW_DEBUG_CHAT }">
      <ChatInterface :onSpeak="handleSpeak" :debugMode="SHOW_DEBUG_CHAT" />
    </div>
  </main>
</template>

<style scoped>
.app-main {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.stage-fullscreen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.app-header {
  position: absolute;
  top: 24px;
  left: 24px;
  padding: 12px 24px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  background: linear-gradient(135deg, #c084fc, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.badge {
  background: rgba(124, 58, 237, 0.2);
  color: #c084fc;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(124, 58, 237, 0.3);
}

.chat-overlay {
  position: absolute;
  bottom: 32px;
  right: 32px;
  width: 400px;
  z-index: 10;
  transition: all 0.3s ease;
}

.chat-overlay.minimal {
  width: auto;
  right: 50%;
  transform: translateX(50%);
}

@media (max-width: 768px) {
  .chat-overlay {
    width: 90%;
    right: 5%;
    bottom: 16px;
  }
}
</style>
