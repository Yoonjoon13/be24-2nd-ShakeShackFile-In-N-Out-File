// useEditor.js
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Quote from '@editorjs/quote'
import Table from '@editorjs/table'
import CodeTool from '@editorjs/code'
import Embed from '@editorjs/embed'
import ImageTool from '@editorjs/image'
import LinkTool from '@editorjs/link'
import InlineCode from '@editorjs/inline-code'
import Delimiter from '@editorjs/delimiter'
import Marker from '@editorjs/marker'
import Warning from '@editorjs/warning'

// Alignment tune and YouTube embed (community tools)
import AlignmentTuneTool from 'editorjs-text-alignment-blocktune'
import YouTubeEmbed from 'editorjs-youtube-embed'

// Yjs
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// Vue reactivity helpers
import { ref, reactive } from 'vue'

/**
 * initEditor(holderElement, room = 'default-room')
 * - holderElement: HTMLElement (div) where Editor.js will mount
 * - room: y-websocket room name
 *
 * Returns a Promise resolving to:
 * { editor, destroy, remoteCursorsRef, bindTitleRef, savePost }
 */
export async function initEditor(holderElement, room = 'default-room') {
  if (!holderElement) throw new Error('holderElement is required')

  // Yjs setup
  const ydoc = new Y.Doc()
  const provider = new WebsocketProvider('wss://demos.yjs.dev', room, ydoc)
  const yText = ydoc.getText('contents')   // store Editor.js JSON as string
  const yTitle = ydoc.getText('title')    // store title string

  // awareness presence for mouse & selection
  const awareness = provider.awareness

  // remote cursors reactive store
  const remoteCursorsRef = ref({}) // maps clientId -> { name, color, style }

  // local user identity
  const colors = ['#FF6B6B','#6BCB77','#4D96FF','#FF7BD1','#FFD93D','#8E6BFF']
  const myId = Math.floor(Math.random() * colors.length)
  const myColor = colors[myId]
  const myName = `사용자 ${myId + 1}`

  // set initial local presence
  awareness.setLocalState({ user: { name: myName, color: myColor } })

  // Alignment tune config tool will add `data-align` to block
  const tools = {
    header: {
      class: Header,
      tunes: ['alignment'],
      config: { levels: [1,2,3,4], defaultLevel: 1 }
    },
    list: { class: List, inlineToolbar: true, tunes: ['alignment'] },
    quote: { class: Quote, inlineToolbar: true, tunes: ['alignment'] },
    table: { class: Table, inlineToolbar: true },
    code: { class: CodeTool },
    embed: { class: Embed, inlineToolbar: false },
    image: { class: ImageTool },
    linkTool: { class: LinkTool },
    inlineCode: { class: InlineCode },
    delimiter: Delimiter,
    marker: Marker,
    warning: Warning,
    alignment: {
      class: AlignmentTuneTool,
      config: { default: 'left' }
    },
    youtube: {
      class: YouTubeEmbed
    }
  }

  // EditorJS instance
  let editor = null
  let suppressLocal = false

  // helper: render incoming Yjs content into Editor.js without loops
  async function renderFromY(yval) {
    if (!editor) return
    if (!yval) return
    try {
      const parsed = JSON.parse(yval)
      // render blocks (if content was saved as Editor.js JSON)
      if (parsed && parsed.blocks) {
        suppressLocal = true
        await editor.blocks.render(parsed.blocks)
        suppressLocal = false
      }
    } catch (e) {
      console.warn('failed to parse yval', e)
    }
  }

  // Initialize EditorJS
  editor = new EditorJS({
    holder: holderElement,
    placeholder: '명령어 "/" 로 블록 추가',
    tools,
    onReady: async () => {
      // load initial content from yText
      const initial = yText.toString()
      if (initial) {
        await renderFromY(initial)
      }
    },
    onChange: async () => {
      if (suppressLocal) return
      try {
        const saved = await editor.save()
        suppressLocal = true
        // store JSON as string to yText
        ydoc.transact(() => {
          yText.delete(0, yText.length)
          yText.insert(0, JSON.stringify(saved))
        })
        suppressLocal = false
      } catch (err) {
        console.error('editor save failed', err)
      }
    }
  })

  // sync title from yTitle -> caller can bind a local ref via bindTitleRef()
  function bindTitleRef(titleRef) {
    if (!titleRef) return
    const t0 = yTitle.toString()
    if (t0 && titleRef.value !== t0) titleRef.value = t0

    yTitle.observe(() => {
      const t = yTitle.toString()
      if (titleRef.value !== t) titleRef.value = t
    })

    titleRef.__updateOnLocal = (val) => {
      const current = yTitle.toString()
      if (current !== val) {
        ydoc.transact(() => {
          yTitle.delete(0, yTitle.length)
          yTitle.insert(0, val)
        })
      }
    }
  }

  /** 수정된 savePost 함수 **/
  async function savePost() {
    // 1. 에디터 인스턴스 존재 여부 확인
    if (!editor) {
      console.error('에디터 인스턴스가 존재하지 않습니다.');
      return;
    }

    try {
      // 2. 에디터가 완전히 로드될 때까지 대기
      await editor.isReady;

      // 3. Editor.js 데이터 추출
      const savedData = await editor.save(); 
      
      // 4. yTitle 안전하게 가져오기
      // 만약 yTitle이 유효하지 않으면 '제목 없음'으로 대체
      const postTitle = (typeof yTitle !== 'undefined' && yTitle !== null) 
                        ? yTitle.toString() 
                        : '제목 없음';

      // 5. 백엔드 전송용 페이로드 구성
      // const payload = {
      //   title: postTitle,
      //   contents: savedData,
      //   updatedAt: new Date().toISOString()
      // };

      // console.log('보내는 데이터:', payload);

      // 6. 백엔드 API 호출
      // ⚠️ 주의: 실제 백엔드 주소가 없다면 이 부분에서 404 에러가 날 수 있습니다.
      // 테스트 중이라면 이 fetch 블록을 주석 처리하고 console.log만 확인하세요.
      // const token = localStorage.getItem('token');
      const formdata = new FormData();
      formdata.append('title', yTitle.toString());
      formdata.append('contents', JSON.stringify(savedData));

      const response = await fetch('/api/workspace/save', {
        method: 'POST',
        // headers: {
        //   'Authorization': `Bearer ${token}`
        // },
        body: formdata
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('저장 성공!', result);
      return result;

    } catch (e) {
      // 여기서 에러를 잡아서 콘솔에 출력하므로 [Vue warn]이 더 이상 발생하지 않습니다.
      console.error('savePost 실행 중 예외 발생:', e);
      // 사용자에게 알림을 띄우는 로직을 추가하면 더 좋습니다 (예: alert)
    }
  }

  // awareness listeners (remote cursors / selections)
  awareness.on('update', () => {
    const states = awareness.getStates()
    const remotes = {}
    states.forEach((state, clientId) => {
      if (!state || !state.user) return
      if (clientId === ydoc.clientID) return
      const mouse = state.mouse || {}
      const user = state.user || {}
      remotes[clientId] = {
        name: user.name || `user-${clientId}`,
        color: user.color || '#888',
        style: {
          position: 'fixed',
          left: mouse.x ? `${mouse.x}px` : '-9999px',
          top: mouse.y ? `${mouse.y}px` : '-9999px',
          transform: 'translate(-50%, -120%)'
        }
      }
    })
    remoteCursorsRef.value = remotes
  })

  yText.observe(event => {
    if (suppressLocal) return
    const val = yText.toString()
    renderFromY(val)
  })

  function handleMouseMove(e) {
    awareness.setLocalStateField('mouse', { x: e.clientX, y: e.clientY })
  }

  function reportSelection() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    let node = range.startContainer
    while (node && node !== holderElement) {
      if (node.classList && node.classList.contains('ce-block')) break
      node = node.parentNode
    }
    let blockIndex = null
    if (node && node !== holderElement) {
      const blocks = Array.from(holderElement.querySelectorAll('.ce-block'))
      blockIndex = blocks.indexOf(node)
    }
    awareness.setLocalStateField('selection', { blockIndex, offset: range.startOffset })
  }

  window.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('selectionchange', reportSelection)

  function destroy() {
    window.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('selectionchange', reportSelection)
    try { editor?.destroy && editor.destroy() } catch (e) {}
    try { provider?.destroy && provider.destroy() } catch (e) {}
    try { ydoc && ydoc.destroy && ydoc.destroy() } catch (e) {}
  }

  function updateTitleFromLocal(val) {
    const current = yTitle.toString()
    if (current !== val) {
      ydoc.transact(() => {
        yTitle.delete(0, yTitle.length)
        yTitle.insert(0, val)
      })
    }
  }

  return {
    editor,
    destroy,
    remoteCursorsRef,
    bindTitleRef,
    updateTitleFromLocal,
    savePost
  }
}