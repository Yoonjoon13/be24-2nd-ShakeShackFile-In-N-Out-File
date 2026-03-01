<script setup>
import { onMounted } from 'vue'
import { BubbleMenu, FloatingMenu } from '@tiptap/vue-3'
import { useEditorSocket, save } from '@/components/editor' 

const { initEditor, title, remoteMice, editor } = useEditorSocket()
const { isFormValid, savePost } = save()

onMounted(() => {
  initEditor('#editor')
})
</script>

<template>
  <div class="flex flex-col h-screen max-w-4xl mx-auto p-6 bg-white overflow-hidden">
    
    <div class="flex items-end justify-between border-b border-gray-200 pb-2 mb-4 shrink-0">
      <input
        v-model="title"
        type="text"
        placeholder="제목을 입력하세요"
        class="w-full text-4xl font-bold outline-none placeholder:text-gray-300 bg-transparent text-gray-900"
      />
      <button
        :disabled="!isFormValid"
        @click="savePost()"
        class="ml-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0"
      >
        저장하기
      </button>
    </div>

    <div class="flex-1 relative overflow-y-auto">
      
      <bubble-menu 
        v-if="editor" 
        :editor="editor" 
        :tippy-options="{ duration: 100, zIndex: 99 }"
        class="notion-menu"
      >
        <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'active': editor.isActive('bold') }">B</button>
        <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'active': editor.isActive('italic') }">I</button>
        <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'active': editor.isActive('strike') }">S</button>
      </bubble-menu>

      <floating-menu 
        v-if="editor" 
        :editor="editor" 
        :tippy-options="{ duration: 100, zIndex: 99 }"
        class="notion-menu"
      >
        <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'active': editor.isActive('heading', { level: 1 }) }">H1</button>
        <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'active': editor.isActive('heading', { level: 2 }) }">H2</button>
        <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'active': editor.isActive('bulletList') }">List</button>
      </floating-menu>

      <div id="editor" class="h-full"></div>
    </div>
  </div>

  <div v-for="(mouse, id) in remoteMice" :key="id" class="mouse" :style="{ left: mouse.left + 'px', top: mouse.top + 'px', '--mouse-color': mouse.color }">
    <svg class="mouse-pointer" viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19011L11.7116 12.3673H5.65376Z" fill="var(--mouse-color)" stroke="white" stroke-width="1"/></svg>
    <div class="mouse-name">{{ mouse.name }}</div>
  </div>
</template>

<style scoped>
/* 노션 스타일 플로팅 메뉴 디자인 */
.notion-menu {
  display: flex;
  background-color: #ffffff;
  padding: 4px;
  border-radius: 6px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15); /* 부드러운 그림자 */
  border: 1px solid #e2e8f0;
  gap: 2px;
}

.notion-menu button {
  background: none;
  border: none;
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.notion-menu button:hover {
  background-color: #f7fafc;
}

.notion-menu button.active {
  color: #3182ce;
  background-color: #ebf8ff;
}

/* 에디터 내부 여백 및 높이 */
#editor {
  min-height: 100%;
}

:deep(.tiptap) {
  min-height: 500px;
  outline: none;
  padding: 10px 0;
  color: #1a202c;
}

/* Placeholder 스타일 */
:deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #cbd5e0;
  pointer-events: none;
  height: 0;
}

.mouse { position: fixed; pointer-events: none; z-index: 10000; transition: all 0.1s ease-out; will-change: left, top; }
.mouse-pointer { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); }
.mouse-name { position: absolute; top: 18px; left: 10px; background-color: var(--mouse-color); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; }
</style>