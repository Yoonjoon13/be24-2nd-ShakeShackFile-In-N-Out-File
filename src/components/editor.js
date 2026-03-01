import { ref, onUnmounted, computed, watch, shallowRef } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Placeholder from '@tiptap/extension-placeholder'
import postApi from '@/api/postApi'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// [공유 상태] Quill 대신 Tiptap Editor 객체를 저장 (shallowRef 권장)
const editor = shallowRef(null)
const title = ref('') 
const hasContent = ref(false) 
const remoteMice = ref({})

export function useEditorSocket() {
  let ydoc = null
  let provider = null

  const colorPalette = [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF',
    '#4B0082', '#8B00FF', '#FF1493', '#00CED1', '#ADFF2F',
  ]

  const myNumber = Math.floor(Math.random() * 10) 
  const myColor = colorPalette[myNumber]
  const myName = `사용자 ${myNumber + 1}`

  const handleMouseMove = (e) => {
    if (provider?.awareness) {
      provider.awareness.setLocalStateField('mouse', {
        left: e.clientX,
        top: e.clientY,
      })
    }
  }

  const initEditor = (elementId, roomName = 'default-room') => {
    if (!roomName) roomName = 'default-room'

    // 수정 포인트 1: elementId에서 '#' 제거 (ID로 찾기 위해)
    const targetId = elementId.startsWith('#') ? elementId.substring(1) : elementId
    const element = document.getElementById(targetId)

    if (!element) {
      console.error('에디터 요소를 찾을 수 없습니다:', targetId)
      return
    }

    ydoc = new Y.Doc()
    provider = new WebsocketProvider(
      'wss://www.innoutfile.kro.kr/edit/', 
      roomName,
      ydoc,
    )

    editor.value = new Editor({
      element: element,
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        // 수정 포인트 2: Placeholder가 가끔 렌더링을 방해할 수 있어 설정을 명확히 함
        Placeholder.configure({
          placeholder: '내용을 입력하세요...',
          emptyEditorClass: 'is-editor-empty',
        }),
        Collaboration.configure({
          document: ydoc,
        }),
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: myName,
            color: myColor,
          },
        }),
      ],
      // 수정 포인트 3: 에디터가 바로 포커스 되도록 설정
      autofocus: true,
      onUpdate({ editor }) {
        // getText()가 비어있어도 구조(JSON)는 있을 수 있으므로 체크 방식 보완
        const text = editor.getText().trim()
        hasContent.value = text.length > 0
      },
    })

    // 2. 제목 실시간 동기화 (기존 로직 유지)
    const yTitle = ydoc.getText('title')
    yTitle.observe(() => {
      if (title.value !== yTitle.toString()) title.value = yTitle.toString()
    })
    watch(title, (newVal) => {
      if (yTitle.toString() !== newVal) {
        ydoc.transact(() => {
          yTitle.delete(0, yTitle.length)
          yTitle.insert(0, newVal)
        })
      }
    })

    // 3. [마우스 커서 로직] (기존 로직 유지)
    provider.awareness.setLocalStateField('user', {
      name: myName,
      color: myColor,
    })

    window.addEventListener('mousemove', handleMouseMove)

    provider.awareness.on('update', () => {
      const states = provider.awareness.getStates()
      const mice = {}
      states.forEach((state, clientID) => {
        if (clientID !== ydoc.clientID && state.mouse && state.user) {
          mice[clientID] = {
            left: state.mouse.left,
            top: state.mouse.top,
            name: state.user.name,
            color: state.user.color
          }
        }
      })
      remoteMice.value = mice
    })
  }

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    if (provider?.awareness) {
        provider.awareness.setLocalState(null)
    }
    if (editor.value) editor.value.destroy() // 에디터 정리
    if (provider) provider.destroy()
    if (ydoc) ydoc.destroy()
  })

  return {
    initEditor,
    title,
    remoteMice,
    editor, // 툴바 구현 시 필요
  }
}

export function save() {
  const isFormValid = computed(() => {
    return title.value.trim().length > 0 && hasContent.value
  })

  const savePost = async () => {
    if (!isFormValid.value) return

    const payload = {
      title: title.value,
      // Tiptap은 getJSON()을 사용하여 구조화된 데이터를 저장합니다.
      content: JSON.stringify(editor.value.getJSON()),
      updatedAt: new Date().toISOString(),
    }

    try {
      await postApi.savePost(payload)
      alert('저장되었습니다!')
    } catch (err) {
      console.error('저장 실패:', err)
    }
  }

  return {
    isFormValid,
    savePost,
  }
}