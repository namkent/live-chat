<template>
  <div class="chat-interface" :class="{ 'glass-panel': debugMode, 'minimal': !debugMode }">
    <div v-if="debugMode" class="chat-history" ref="historyContainer">
      <div v-for="(msg, index) in messages" :key="index" :class="['message-wrapper', msg.role]">
        <div class="message-bubble">{{ msg.content }}</div>
      </div>
      
      <div v-if="isProcessing" class="message-wrapper assistant processing">
        <div class="message-bubble">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    </div>
    
    <div class="input-area" :class="{ 'centered': !debugMode }">
      <!-- Input Text -->
      <div v-if="debugMode" class="text-input-wrapper">
        <input 
          type="text" 
          v-model="inputText" 
          @keydown.enter="sendTextMessage"
          placeholder="Type a message..." 
          :disabled="isProcessing"
          class="chat-input"
        />
        <button 
          class="send-btn" 
          @click="sendTextMessage"
          :disabled="!inputText.trim() || isProcessing"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>

      <!-- Microphone Button -->
      <button 
        class="mic-btn" 
        :class="{ recording: isRecording }" 
        @mousedown="startRecording" 
        @mouseup="stopRecording"
        @mouseleave="stopRecording"
        @touchstart.prevent="startRecording"
        @touchend.prevent="stopRecording"
        :disabled="isProcessing"
        title="Giữ để nói"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

const props = defineProps({
  onSpeak: {
    type: Function,
    required: true
  },
  debugMode: {
    type: Boolean,
    default: true
  }
});

const messages = ref([
  { role: 'assistant', content: 'Xin chào! Tôi có thể giúp gì cho bạn?' }
]);
const historyContainer = ref(null);
const inputText = ref('');
const isRecording = ref(false);
const isProcessing = ref(false);

let mediaRecorder = null;
let audioChunks = [];

onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      audioChunks = [];
      await processAudio(audioBlob);
    };
  } catch (err) {
    console.warn('Không thể truy cập microphone, có thể sử dụng nhập liệu bằng văn bản.', err);
  }
});

const scrollToBottom = () => {
  nextTick(() => {
    if (historyContainer.value) {
      historyContainer.value.scrollTop = historyContainer.value.scrollHeight;
    }
  });
};

const startRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'inactive' && !isProcessing.value) {
    audioChunks = [];
    mediaRecorder.start();
    isRecording.value = true;
  }
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    isRecording.value = false;
  }
};

const sendTextMessage = async () => {
  if (!inputText.value.trim() || isProcessing.value) return;
  
  const text = inputText.value.trim();
  inputText.value = '';
  
  messages.value.push({ role: 'user', content: text });
  scrollToBottom();
  
  await triggerLLM();
};

const processAudio = async (audioBlob) => {
  isProcessing.value = true;
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    
    const sttRes = await fetch('/api/stt', {
      method: 'POST',
      body: formData
    });
    const sttData = await sttRes.json();
    const userText = sttData.text;
    
    if (!userText || userText.trim() === '') {
      isProcessing.value = false;
      return;
    }
    
    messages.value.push({ role: 'user', content: userText });
    scrollToBottom();
    
    await triggerLLM();
  } catch (error) {
    console.error('Lỗi khi STT:', error);
    isProcessing.value = false;
  }
};

const triggerLLM = async () => {
  isProcessing.value = true;
  try {
    const chatRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value.map(m => ({ role: m.role, content: m.content }))
      })
    });
    if (!chatRes.ok) {
      throw new Error('Server lỗi 500');
    }

    const reader = chatRes.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    const botMessageInfo = { role: 'assistant', content: '' };
    messages.value.push(botMessageInfo);
    
    let sentenceBuffer = "";
    const sentenceQueue = [];
    let isSpeaking = false;

    const processSpeakQueue = async () => {
      if (isSpeaking) return;
      isSpeaking = true;
      while (sentenceQueue.length > 0) {
        const sentence = sentenceQueue.shift();
        const isVietnamese = /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỵỷỹ]/i.test(sentence);
        const lang = isVietnamese ? 'vi' : 'en';
        if (props.onSpeak) {
          await props.onSpeak(sentence, lang);
        }
      }
      isSpeaking = false;
    };
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content || "";
            if (content) {
              botMessageInfo.content += content;
              sentenceBuffer += content;
              scrollToBottom();
              
              // Check for sentences
              while (true) {
                const match = sentenceBuffer.match(/([^.!?]+[.!?]+[\s\n]*)/);
                if (!match) break;
                
                const sentenceToSpeak = match[1].trim();
                sentenceBuffer = sentenceBuffer.substring(match.index + match[0].length);
                
                if (sentenceToSpeak) {
                   sentenceQueue.push(sentenceToSpeak);
                   processSpeakQueue();
                }
              }
            }
          } catch (e) {
            // Ignore parse errors from incomplete chunks
          }
        }
      }
    }
    
    // Speak any remaining text
    if (sentenceBuffer.trim()) {
       sentenceQueue.push(sentenceBuffer.trim());
       processSpeakQueue();
    }
  } catch (error) {
    console.error('Lỗi khi Chat:', error);
    messages.value.push({ role: 'assistant', content: `Xin lỗi, đã xảy ra lỗi: ${error.message}` });
    scrollToBottom();
  } finally {
    isProcessing.value = false;
  }
};
</script>

<style scoped>
.chat-interface {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-interface.glass-panel {
  height: 400px;
  max-height: 50vh;
  padding: 16px;
}

.chat-interface.minimal {
  align-items: center;
  justify-content: center;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 8px;
}

.message-wrapper {
  display: flex;
  width: 100%;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 20px;
  line-height: 1.5;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user .message-bubble {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-bottom-right-radius: 4px;
}

.assistant .message-bubble {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-foreground);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom-left-radius: 4px;
}

.input-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-area.centered {
  justify-content: center;
}

.text-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.chat-input {
  width: 100%;
  padding: 14px 48px 14px 20px;
  border-radius: 24px;
  border: 1px solid var(--color-border);
  background: rgba(15, 23, 42, 0.5);
  color: var(--color-foreground);
  font-family: inherit;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s;
}

.chat-input:focus {
  border-color: var(--color-primary);
  background: rgba(15, 23, 42, 0.8);
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
}

.send-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--color-primary);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.1);
}

.send-btn:disabled {
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.mic-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: var(--color-destructive);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
}

.mic-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.mic-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.mic-btn.recording {
  animation: pulse-mic 1.5s infinite;
  background: #BE185D;
}

.mic-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  box-shadow: none;
  cursor: not-allowed;
}

@keyframes pulse-mic {
  0% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.6); }
  70% { box-shadow: 0 0 0 16px rgba(236, 72, 153, 0); }
  100% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0); }
}

/* Typing indicator dots */
.processing .message-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 20px;
}

.dot {
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
